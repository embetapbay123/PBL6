import { database } from '../../../shared/src/database';
import { config } from '../../../shared/src/config';
import { audit } from '../../../shared/src/audit';
import { emitEvent } from '../../../shared/src/events';
import { ApiError } from '../../../shared/src/errors';
import { CatalogRepository } from './catalog.repository';
import type { OperationInputs, OperationOutputs } from '../../../shared/src/operations.generated';
import { InternalClients } from '../../../shared/src/internal-clients';
import { optionalUserId, recordInteraction } from './catalog.telemetry';
import { moneyNumber } from '../../../shared/src/money';
import { createHash } from 'node:crypto';

/**
 * `product_variant.variant_signature` is NOT NULL and unique per Product, so the same combination of
 * attribute values cannot be inserted twice. Keys are sorted first so `{a,b}` and `{b,a}` hash alike.
 */
function variantSignatureOf(values:Record<string,unknown>):string {
  const canonical=Object.keys(values).sort().map(key=>[key,values[key] as unknown]);
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

const UNIQUE_CONFLICTS:Record<string,{code:string;message:string}> = {
  sku_store_unique:{code:'SKU_CONFLICT',message:'SKU đã tồn tại trong Store.'},
  variant_signature_unique:{code:'VARIANT_DUPLICATE',message:'Product đã có Variant với cùng bộ thuộc tính.'},
  variant_default_unique:{code:'VARIANT_DEFAULT_CONFLICT',message:'Variant mặc định vừa thay đổi bởi yêu cầu khác. Vui lòng thử lại.'},
};

/**
 * A race that slips past the pre-checks must still answer a business status. By the time the unique
 * index fires the transaction has already aborted, so translating PostgreSQL 23505 on a known
 * constraint into the documented 409 is the only remaining honest response; anything else would
 * surface a raw driver error as a 500.
 */
function uniqueConflictError(error:unknown):ApiError|undefined {
  const source=error as any;
  const databaseError=source?.driverError ?? source;
  if(databaseError?.code!=='23505')return undefined;
  const mapped=UNIQUE_CONFLICTS[String(databaseError.constraint)];
  return mapped ? new ApiError(409,mapped.code,mapped.message) : undefined;
}

export class CatalogService {
  private async stores(correlation:string) {
    const c=config('M1');return (await new InternalClients('M1',c.internalKeys.M1,{M1:c.catalogUrl,M2:'',M3:c.identityUrl}).call('ActiveStores',undefined,correlation)).ids;
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
   * Write scope for catalogue mutations. Store comes from the resolved membership, the permission
   * from the live context, and the Store must still be sellable before anything is written.
   */
  private async storeForWrite(context:any,correlation:string):Promise<{storeId:string;actorUserId:string}> {
    const membership=context?.store_membership;
    if(!membership?.store_id)throw new ApiError(403,'FORBIDDEN','Tài khoản không thuộc Store đang hoạt động nào.');
    const permissions:string[]=membership.permissions ?? [];
    if(membership.role!=='OWNER' && !permissions.includes('product.store.*') && !permissions.some(code=>code.startsWith('product.store.')))
      throw new ApiError(403,'FORBIDDEN','Cần quyền quản lý sản phẩm của Store.');
    if(!(await this.stores(correlation)).includes(membership.store_id))
      throw new ApiError(403,'STORE_UNAVAILABLE','Store không được phép bán.');
    return {storeId:membership.store_id,actorUserId:context.user_id};
  }

  /**
   * createVariant — thêm một Variant cho Product đã có.
   *
   * Variant mới luôn bắt đầu với tồn kho 0 nên inventory và quote thấy ngay, nhưng chưa bán được
   * cho tới khi Seller nhập hàng. Variant đầu tiên của Product tự thành mặc định; một Variant mặc
   * định mới sẽ bỏ cờ của Variant cũ vì `variant_default_unique` chỉ cho một.
   */
  async createVariant(id:string,input:OperationInputs['createVariant']['body'],context:any,correlation:string):
  Promise<OperationOutputs['createVariant']> {
    const {storeId,actorUserId}=await this.storeForWrite(context,correlation);
    return database.transaction(async manager=>{
      const repository=new CatalogRepository(manager);
      // Lock the Product before reading or changing its Variants. `updateProduct` locks the same row
      // first, so the two write paths share one lock order.
      const product=await repository.lockProductForVariants(id,storeId);
      if(!product)throw new ApiError(404,'NOT_FOUND','Không tìm thấy sản phẩm trong Store.');
      try {
        if(await repository.skuUsedInStore(storeId,input.sku))
          throw new ApiError(409,'SKU_CONFLICT','SKU đã tồn tại trong Store.',[{field:'sku:'+input.sku}]);
        const signature=variantSignatureOf(input.variant_values);
        if(await repository.signatureUsedInProduct(id,signature))
          throw new ApiError(409,'VARIANT_DUPLICATE','Product đã có Variant với cùng bộ thuộc tính.');
        const existing=await repository.variantRowsOfProduct(id);
        const isDefault=input.is_default ?? existing.length===0;
        if(isDefault)await repository.unsetDefaultVariants(id);
        const variant=await repository.addVariantRow({productId:id,storeId,sku:input.sku,priceVnd:input.price_vnd,
          variantValues:input.variant_values,signature,isDefault,status:'ACTIVE'});
        await repository.addInventoryRow(variant.id,storeId);
        const after=await repository.touchProductRow(id);
        await audit(manager,'M1',actorUserId,'Product',id,'VARIANT_ADD',correlation,
          {version:product.version},{variant_id:variant.id,sku:variant.sku,version:after.version});
        await emitEvent(manager,'ProductChanged',{product_id:id,store_id:storeId,version:after.version,
          sale_status:after.status,moderation_status:after.moderation_status},correlation);
        return {id:variant.id,sku:variant.sku,price_vnd:moneyNumber(variant.price_vnd),
          variant_values:variant.variant_values,is_default:variant.is_default,status:variant.status};
      } catch(error) {
        // The Product lock serialises writes for one Product, but a SKU is unique across the whole
        // Store, so another Product can still take it first and a unique violation can escape the
        // pre-checks. The transaction has already aborted at that point, so answer the documented
        // conflict rather than letting a raw driver error become a 500.
        throw uniqueConflictError(error) ?? error;
      }
    });
  }

  /**
   * addProductImage — gắn ảnh vào Product, hoặc vào một Variant nếu `variant_id` được gửi.
   *
   * Ảnh không đổi giá hay tồn kho nên **không** tăng `version` và không phát `ProductChanged`; chỉ
   * ghi audit. Nhờ vậy thêm ảnh không làm mọi client phải tải lại vì một thay đổi không liên quan
   * tới giá. `position` bỏ trống thì ảnh được nối vào cuối.
   */
  async addProductImage(id:string,input:OperationInputs['addProductImage']['body'],context:any,correlation:string):
  Promise<OperationOutputs['addProductImage']> {
    const {storeId,actorUserId}=await this.storeForWrite(context,correlation);
    return database.transaction(async manager=>{
      const repository=new CatalogRepository(manager);
      const product=await repository.productForWrite(id,storeId);
      if(!product)throw new ApiError(404,'NOT_FOUND','Không tìm thấy sản phẩm trong Store.');
      if(input.variant_id) {
        const variants=await repository.variantRowsOfProduct(id);
        if(!variants.some((row:any)=>row.id===input.variant_id))
          throw new ApiError(404,'VARIANT_NOT_FOUND','Variant không thuộc sản phẩm này.');
      }
      const position=input.position ?? await repository.nextImagePosition(id);
      const image=await repository.addImageRow({productId:id,variantId:input.variant_id ?? null,
        url:input.image_url,position});
      await audit(manager,'M1',actorUserId,'Product',id,'IMAGE_ADD',correlation,
        {version:product.version},{image_id:image.id,position:image.position});
      return {id:image.id,product_id:image.product_id,image_url:image.image_url,position:image.position};
    });
  }

  async update(id:string,input:OperationInputs['updateProduct']['body'],context:any,correlation:string) {
    const membership=context.store_membership;
    if(!membership || (membership.role!=='OWNER' && !membership.permissions.includes('product.store.*')))throw new ApiError(403,'FORBIDDEN','Không có quyền quản lý sản phẩm.');
    if(Object.entries(input).some(([key,value])=>value!==undefined && !['title','description','expected_version'].includes(key)))throw new ApiError(501,'FEATURE_NOT_IMPLEMENTED','Mẫu Product chỉ hỗ trợ title/description; owner hoàn thiện các trường còn lại.');
    if(input.title===undefined && input.description===undefined)throw new ApiError(422,'VALIDATION_FAILED','Cần trường thay đổi.');
    const active=await this.stores(correlation);
    if(!active.includes(membership.store_id))throw new ApiError(403,'STORE_UNAVAILABLE','Store không được phép bán.');
    return database.transaction(async manager=>{
      const repository=new CatalogRepository(manager);
      const before=await repository.lockProduct(id,membership.store_id);
      if(!before)throw new ApiError(404,'NOT_FOUND','Không tìm thấy sản phẩm trong Store.');
      if(before.version!==input.expected_version)throw new ApiError(409,'VERSION_CONFLICT','Dữ liệu đã thay đổi. Vui lòng tải lại.');
      const after=await repository.updateText(id,input.title,input.description);
      await audit(manager,'M1',context.user_id,'Product',id,'BOOTSTRAP_UPDATE',correlation,before,{id,title:after.title,description:after.description,version:after.version});
      await emitEvent(manager,'bootstrap.example.v1',{product_id:id,version:after.version},correlation);
      return (await repository.withRelations([after]))[0];
    });
  }
}
