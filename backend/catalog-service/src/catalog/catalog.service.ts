import { database } from '../../../shared/src/database';
import { config } from '../../../shared/src/config';
import { audit } from '../../../shared/src/audit';
import { emitEvent } from '../../../shared/src/events';
import { ApiError } from '../../../shared/src/errors';
import { CatalogRepository } from './catalog.repository';
import { attributeErrors, defaultVariantCount, variantSignature } from './catalog.validation';
import type { OperationInputs, OperationOutputs } from '../../../shared/src/operations.generated';
import { InternalClients } from '../../../shared/src/internal-clients';
import { optionalUserId, recordInteraction } from './catalog.telemetry';

type VariantPayload = NonNullable<OperationInputs['createProduct']['body']['variants']>[number];

export class CatalogService {
  private async stores(correlation:string) {
    const c=config('M1');return (await new InternalClients('M1',c.internalKeys.M1,{M1:c.catalogUrl,M2:'',M3:c.identityUrl}).call('ActiveStores',undefined,correlation)).ids;
  }

  /**
   * Write scope for catalogue mutations. Store comes from the resolved membership, the permission
   * from the live context (so a revoked grant stops working on the next call), and the Store itself
   * must still be sellable before anything is written.
   */
  private async writableStore(context:any,correlation:string):Promise<{storeId:string;actorUserId:string}> {
    const membership=context?.store_membership;
    if(!membership?.store_id)throw new ApiError(403,'FORBIDDEN','Tài khoản không thuộc Store đang hoạt động nào.');
    const permissions:string[]=membership.permissions ?? [];
    if(membership.role!=='OWNER' && !permissions.includes('product.store.*') && !permissions.some(code=>code.startsWith('product.store.')))
      throw new ApiError(403,'FORBIDDEN','Cần quyền quản lý sản phẩm của Store.');
    if(!(await this.stores(correlation)).includes(membership.store_id))
      throw new ApiError(403,'STORE_UNAVAILABLE','Store không được phép bán.');
    return {storeId:membership.store_id,actorUserId:context.user_id};
  }

  /** A Product may only use an active Product type, and its attributes must match that taxonomy. */
  private async validateTaxonomy(repository:CatalogRepository,productTypeId:string,
    attributes:Record<string,unknown>|undefined):Promise<void> {
    const type=await repository.productTypeForWrite(productTypeId);
    if(!type || type.status!=='ACTIVE')throw new ApiError(422,'INVALID_PRODUCT_TYPE','Product type không tồn tại hoặc đã ngừng dùng.');
    if(attributes===undefined)return;
    const problems=attributeErrors(attributes,await repository.attributeDefinitions(productTypeId));
    if(problems.length)throw new ApiError(422,'INVALID_ATTRIBUTES','Thuộc tính không khớp taxonomy của Product type.',problems.map(field=>({field})));
  }

  private validateVariantPayload(variants:VariantPayload[]|undefined):void {
    if(!variants)return;
    const skus=new Set<string>();
    for(const variant of variants) {
      if(skus.has(variant.sku))throw new ApiError(422,'DUPLICATE_SKU','SKU trùng trong cùng một Product.',[{field:'sku:'+variant.sku}]);
      skus.add(variant.sku);
    }
    if(defaultVariantCount(variants)>1)throw new ApiError(422,'MULTIPLE_DEFAULT_VARIANTS','Chỉ một Variant được là mặc định.');
  }

  /** Insert or update the submitted Variants and give every new Variant a zero-stock inventory row. */
  private async writeVariants(repository:CatalogRepository,productId:string,storeId:string,
    variants:VariantPayload[],markSoleDefault:boolean):Promise<void> {
    if(!variants.length)return;
    if(variants.some(variant=>variant.is_default===true))await repository.clearDefaultVariants(productId);
    for(const [index,variant] of variants.entries()) {
      if(await repository.skuTakenInStore(storeId,variant.sku,variant.id ?? null))
        throw new ApiError(409,'SKU_CONFLICT','SKU đã tồn tại trong Store.',[{field:'sku:'+variant.sku}]);
      if(variant.id) {
        await repository.updateVariantFields(variant.id,productId,storeId,{sku:variant.sku,priceVnd:variant.price_vnd,
          variantValues:variant.variant_values,signature:variantSignature(variant.variant_values),
          isDefault:variant.is_default,status:variant.status});
      } else {
        const row=await repository.insertVariant({productId,storeId,sku:variant.sku,priceVnd:variant.price_vnd,
          variantValues:variant.variant_values,signature:variantSignature(variant.variant_values),
          isDefault:variant.is_default ?? (markSoleDefault && index===0),status:variant.status ?? 'ACTIVE'});
        await repository.insertInventoryForVariant(row.id,storeId);
      }
    }
  }

  /**
   * Public list. Store visibility comes from M3 `ActiveStores`, so a locked Store disappears from
   * the catalog even though its rows still exist. Search telemetry is only written for an
   * authenticated caller with a non-empty query: guests never produce personal behaviour, and a
   * telemetry failure can never fail the read.
   */
  async list(query:OperationInputs['listProducts']['query'],authorization:unknown,correlation:string):Promise<OperationOutputs['listProducts']> {
    // The contract applies page/size defaults in the request DTO; the generated type keeps them
    // optional, so the boundary normalises them once before they reach the repository.
    const page=await new CatalogRepository(database.manager).page(await this.stores(correlation),
      {...query,page:query.page ?? 1,size:query.size ?? 20});
    const userId=await optionalUserId(authorization,correlation);
    if(userId && query.q) await recordInteraction('SearchRecorded',{user_id:userId,query:query.q},correlation);
    return page;
  }

  /** A hidden Product, a locked Store and an unknown id all answer 404 without leaking which one it was. */
  async detail(id:string,authorization:unknown,correlation:string):Promise<OperationOutputs['getProduct']> {
    const product=await new CatalogRepository(database.manager).publicProduct(id,await this.stores(correlation));
    if(!product)throw new ApiError(404,'NOT_FOUND','Không tìm thấy sản phẩm.');
    const userId=await optionalUserId(authorization,correlation);
    if(userId) await recordInteraction('InteractionRecorded',{user_id:userId,product_id:id,event_type:'VIEW'},correlation);
    return product;
  }

  /** Taxonomy lookups are public reference data; only ACTIVE rows are exposed. */
  async listCategories(query:OperationInputs['listCategories']['query']):Promise<OperationOutputs['listCategories']> {
    return new CatalogRepository(database.manager).pageCategories(query.page ?? 1,query.size ?? 20);
  }

  async listProductTypes(query:OperationInputs['listProductTypes']['query']):Promise<OperationOutputs['listProductTypes']> {
    return new CatalogRepository(database.manager).pageProductTypes(query.page ?? 1,query.size ?? 20);
  }

  /**
   * createProduct — tạo Product (và Variant đi kèm) trong một transaction.
   *
   * Product mới mặc định `DRAFT` để Seller soạn xong mới đăng bán. Product, Variant, tồn kho 0,
   * audit và outbox `ProductChanged` cùng commit hoặc cùng rollback, nên không có Product "mồ côi"
   * hay một event báo thay đổi cho thứ chưa được lưu.
   */
  async createProduct(input:OperationInputs['createProduct']['body'],context:any,correlation:string):
  Promise<OperationOutputs['createProduct']> {
    const {storeId,actorUserId}=await this.writableStore(context,correlation);
    this.validateVariantPayload(input.variants);
    // Creating a Product must never address an existing Variant. `ProductCreate.variants` reuses the
    // `ProductVariant` schema, so the runtime contract accepts an `id`; letting it through would let
    // one Store rewrite another Store's Variant by id. An existing Variant is only editable through
    // updateProduct, which proves ownership first, and the repository scopes the SQL as well.
    if(input.variants?.some(variant=>variant.id!==undefined))
      throw new ApiError(422,'VARIANT_ID_NOT_ALLOWED','Tạo Product không nhận Variant có id; chỉ gửi Variant mới.');
    return database.transaction(async manager=>{
      const repository=new CatalogRepository(manager);
      await this.validateTaxonomy(repository,input.product_type_id,input.attributes);
      const created=await repository.insertProduct({storeId,productTypeId:input.product_type_id,title:input.title,
        description:input.description ?? null,attributes:input.attributes,status:input.status ?? 'DRAFT'});
      const variants=input.variants ?? [];
      await this.writeVariants(repository,created.id,storeId,variants,variants.length===1);
      await audit(manager,'M1',actorUserId,'Product',created.id,'CREATE',correlation,null,
        {id:created.id,title:created.title,status:created.status,version:created.version});
      await emitEvent(manager,'ProductChanged',{product_id:created.id,store_id:storeId,version:created.version,
        sale_status:created.status,moderation_status:created.moderation_status},correlation);
      return (await repository.withAllVariants([created]))[0];
    });
  }

  /**
   * updateProduct — sửa Product đầy đủ (không còn giới hạn title/description).
   *
   * `expected_version` chống ghi đè khi hai người sửa cùng lúc. `variants` là **tập thay thế**:
   * Variant có `id` được cập nhật, không có `id` thì thêm mới theo SKU, và Variant biến mất khỏi
   * payload bị **STOPPED** chứ không xoá — xoá sẽ phá lịch sử reservation và stock movement.
   */
  async updateProduct(id:string,input:OperationInputs['updateProduct']['body'],context:any,correlation:string):
  Promise<OperationOutputs['updateProduct']> {
    const {storeId,actorUserId}=await this.writableStore(context,correlation);
    this.validateVariantPayload(input.variants);
    return database.transaction(async manager=>{
      const repository=new CatalogRepository(manager);
      const before=await repository.lockProduct(id,storeId);
      if(!before)throw new ApiError(404,'NOT_FOUND','Không tìm thấy sản phẩm trong Store.');
      if(before.version!==input.expected_version)throw new ApiError(409,'VERSION_CONFLICT','Dữ liệu đã thay đổi. Vui lòng tải lại.');
      const current=await repository.productRowForStore(id,storeId);
      // Validate the state that will actually be stored: changing only `product_type_id` keeps the
      // current attribute map, so validating `input.attributes` alone would let a Product end up
      // missing a required attribute of its new type, or keeping keys that belong only to the old one.
      const finalProductTypeId=input.product_type_id ?? current.product_type_id;
      const finalAttributes=input.attributes ?? current.attributes;
      await this.validateTaxonomy(repository,finalProductTypeId,finalAttributes);

      const after=await repository.updateProductFields(id,{productTypeId:input.product_type_id,title:input.title,
        description:input.description,attributes:input.attributes,status:input.status});

      if(input.variants) {
        const existing=await repository.variantsOfProduct(id);
        const owned=new Set(existing.map((row:any)=>row.id));
        for(const variant of input.variants) if(variant.id && !owned.has(variant.id))
          throw new ApiError(404,'VARIANT_NOT_FOUND','Variant không thuộc sản phẩm này.');
        await this.writeVariants(repository,id,storeId,input.variants,input.variants.length===1);
        const keptIds=new Set(input.variants.map(variant=>variant.id).filter(Boolean));
        const keptSkus=new Set(input.variants.map(variant=>variant.sku));
        for(const row of existing) {
          if(keptIds.has(row.id) || keptSkus.has(row.sku)) continue;
          if(row.status!=='STOPPED') await repository.stopVariant(row.id,id,storeId);
        }
      }

      await audit(manager,'M1',actorUserId,'Product',id,'UPDATE',correlation,
        {product_type_id:current.product_type_id,title:current.title,description:current.description,
          attributes:current.attributes,status:current.status,version:current.version},
        {product_type_id:after.product_type_id,title:after.title,description:after.description,
          attributes:after.attributes,status:after.status,version:after.version});
      await emitEvent(manager,'ProductChanged',{product_id:id,store_id:storeId,version:after.version,
        sale_status:after.status,moderation_status:after.moderation_status},correlation);
      return (await repository.withAllVariants([after]))[0];
    });
  }
}
