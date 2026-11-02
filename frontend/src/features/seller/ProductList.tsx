import {FormEvent, useState} from 'react';
import {Link,useSearchParams,useLocation} from 'react-router-dom';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {Plus,RefreshCw,Eye,SquarePen,Package,Store} from 'lucide-react';
import {ActionMenu} from '../../components/ActionMenu';
import {Modal} from '../../components/Modal';
import {ProductModerationNotice} from './ProductModerationNotice';
import {useStoreAccess} from '../../live/useLiveData';
import type {OperationOutputs} from '../../api/operations.generated';
import {callOperation} from '../../api/operations';
import {useUnsavedChanges} from '../../components/useUnsavedChanges';
import {ApiError,isUncertainMutation} from '../../api/client';
import {Loading,Empty,ErrorView,Pagination} from '../../bootstrap/components';
import {SellerSubNav} from '../../live/SellerWorkspace';
import {AttributeFields} from './AttributeFields';
import {useProductTypes} from './useProductTypes';

type ManagedProduct=OperationOutputs['listOwnStoreProducts']['items'][number];
export function SellerProductList(){
  const [params,setParams]=useSearchParams(),access=useStoreAccess(),cache=useQueryClient(),location=useLocation();
  const parsed=Number(params.get('page')),page=Number.isSafeInteger(parsed)&&parsed>=1?parsed:1;
  const setPage=(value:number)=>setParams(current=>{const next=new URLSearchParams(current);next.set('page',String(value));return next;});
  const search=params.get('q')??'',status=params.get('status')??'';
  const setFilter=(key:string,value:string)=>setParams(current=>{const next=new URLSearchParams(current);next.delete('page');if(value)next.set(key,value);else next.delete(key);return next;},{replace:true});
  const returnTo=location.pathname+location.search;
  const [inspect,setInspect]=useState<ManagedProduct>(),[decision,setDecision]=useState<ManagedProduct>(),[busy,setBusy]=useState(false),[blocked,setBlocked]=useState(false),[actionError,setActionError]=useState<unknown>();
  const {data,isFetching,error,refetch}=useQuery({queryKey:['own-store-products',page,search,status],queryFn:({signal})=>callOperation('listOwnStoreProducts',{query:{page,size:20,...(search?{q:search}:{}),...(status?{status:status as 'ACTIVE'|'DRAFT'|'STOPPED'}:{})}},{signal})});
  const showCreate=params.get('create')==='1',canWrite=access.can('product.store.read_write');
  function create(open:boolean){setParams(current=>{const next=new URLSearchParams(current);if(open)next.set('create','1');else next.delete('create');return next;});}
  const items=data?.items??[];
  async function changeStatus(){
    if(!decision?.id||decision.version===undefined||busy||blocked)return;setBusy(true);setActionError(undefined);
    try{await callOperation('updateProduct',{path:{id:decision.id},body:{status:decision.status==='ACTIVE'?'STOPPED':'ACTIVE',expected_version:decision.version}});await Promise.all([refetch(),cache.invalidateQueries({queryKey:['own-store-product',decision.id]}),cache.invalidateQueries({queryKey:['products']}),cache.invalidateQueries({queryKey:['public-store-products']})]);setDecision(undefined);}
    catch(e){setActionError(e);if(!(e instanceof ApiError)||e.status===0||e.status===409||e.status>=500)setBlocked(true);}finally{setBusy(false);}
  }
  return <section>
    <SellerSubNav/>
    <div className="seller-products-toolbar"><div><h1>Sản phẩm của Store</h1><p>Quản lý sản phẩm, phân loại và trạng thái hiển thị.</p></div><div><button className="ui-button ui-button-secondary" onClick={()=>void refetch()} disabled={isFetching}><RefreshCw size={15}/>Làm mới</button>{access.id&&<Link className="ui-button ui-button-secondary" to={'/stores/'+access.id}><Store size={15}/>Xem gian hàng</Link>}<button className="ui-button ui-button-primary" disabled={!canWrite} onClick={()=>create(true)}><Plus size={17}/>Thêm sản phẩm mới</button></div></div>
    {showCreate&&canWrite&&<CreateProductModal close={()=>create(false)} onCreated={()=>{create(false);void refetch();}}/>}
    <div className="seller-product-filters"><input type="search" maxLength={200} aria-label="Tìm tên hoặc SKU trong Store" placeholder="Tìm tên hoặc SKU trong toàn Store" value={search} onChange={event=>setFilter('q',event.target.value)}/><select aria-label="Trạng thái sản phẩm trong Store" value={status} onChange={event=>setFilter('status',event.target.value)}><option value="">Tất cả trạng thái</option><option value="ACTIVE">Đang bán</option><option value="DRAFT">Bản nháp</option><option value="STOPPED">Dừng bán</option></select><span>{data?data.total.toLocaleString('vi-VN')+' sản phẩm trong gian hàng':'Đang tải danh sách'}</span></div>
    {isFetching&&<Loading/>}{error&&<ErrorView error={error} onRetry={()=>void refetch()} retryBusy={isFetching}/>}
    {data&&<><div className="market-table-scroll" tabIndex={0} role="region" aria-label="Bảng sản phẩm Store, cuộn ngang để xem đủ cột"><table><thead><tr><th scope="col">Sản phẩm</th><th scope="col">Giá bán</th><th scope="col">Phân loại</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead><tbody>{items.map(product=><tr key={product.id}><td><div className="seller-product-title">{product.images?.[0]?.image_url?<img src={product.images[0].image_url} alt="" loading="lazy"/>:<span className="seller-product-placeholder"><Package size={20}/></span>}<div><strong>{product.title}</strong><small>{product.images?.length ?? 0} ảnh sản phẩm</small></div></div></td><td>{product.variants?.length?Math.min(...product.variants.map(variant=>variant.price_vnd)).toLocaleString('vi-VN')+' ₫':'Chưa có giá'}</td><td>{product.variants?.length ?? 0} biến thể</td><td><span className="market-badge">{product.status==='ACTIVE'?'Đang bán':product.status==='DRAFT'?'Bản nháp':'Dừng bán'}</span>{product.moderation_status==='HIDDEN'&&<small>Đang bị ẩn</small>}</td><td><div className="seller-row-actions"><Link className="ui-button ui-button-secondary" state={{returnTo}} to={'/seller/products/'+product.id+'/edit'}><SquarePen size={13}/>Sửa sản phẩm</Link><ActionMenu label={'Thao tác '+product.title}><button className="ui-button ui-button-secondary" aria-label={'Chi tiết '+product.title} onClick={()=>setInspect(product)}><Eye size={13}/>Chi tiết</button><button className="ui-button ui-button-secondary" disabled={!canWrite||product.version===undefined||(product.status!=='ACTIVE'&&product.moderation_status==='HIDDEN')} aria-label={(product.status==='ACTIVE'?'Dừng bán ':'Mở bán ')+product.title} onClick={()=>{setDecision(product);setBlocked(false);setActionError(undefined);}}>{product.status==='ACTIVE'?'Dừng bán':product.status==='DRAFT'?'Đăng bán':'Mở bán'}</button></ActionMenu></div></td></tr>)}</tbody></table></div>{!items.length&&<Empty>{search||status?'Không có sản phẩm phù hợp với bộ lọc trong Store.':'Store chưa có sản phẩm nào.'}</Empty>}<Pagination page={page} size={data.size} total={data.total} onPage={setPage}/></>}
    {inspect&&<Modal label={'Chi tiết '+inspect.title} onClose={()=>setInspect(undefined)}><h2>{inspect.title}</h2><p>{inspect.description||'Chưa có mô tả.'}</p><p>Trạng thái: {inspect.status} · Kiểm duyệt: {inspect.moderation_status}</p><ProductModerationNotice product={inspect}/><div className="market-moderation-images">{inspect.images?.map(image=><img key={image.id} src={image.image_url} alt={inspect.title}/>)}</div><h3>Biến thể</h3><ul>{inspect.variants?.map(variant=><li key={variant.id}>{variant.sku} · {variant.price_vnd.toLocaleString('vi-VN')} ₫ · {variant.status}</li>)}</ul><div className="ui-actions"><button className="ui-button ui-button-secondary" onClick={()=>setInspect(undefined)}>Đóng</button><Link className="ui-button ui-button-primary" state={{returnTo}} to={'/seller/products/'+inspect.id+'/edit'}>Chỉnh sửa sản phẩm</Link></div></Modal>}
    {decision&&<Modal label={decision.status==='ACTIVE'?'Dừng bán sản phẩm':'Mở bán sản phẩm'} busy={busy} onClose={()=>setDecision(undefined)}><h2>{decision.status==='ACTIVE'?'Dừng bán sản phẩm?':'Mở bán sản phẩm?'}</h2><p>{decision.title}</p><p>{decision.status==='ACTIVE'?'Sản phẩm sẽ ngừng xuất hiện trong danh sách mua sắm.':'Sản phẩm và biến thể cần đáp ứng điều kiện bán hàng của hệ thống.'}</p>{actionError!==undefined&&<ErrorView error={actionError}/>}<div className="ui-actions"><button className="ui-button ui-button-secondary" disabled={busy} onClick={()=>setDecision(undefined)}>Quay lại</button>{blocked?<button className="ui-button ui-button-primary" onClick={()=>void refetch().then(result=>{if(!result.error)setDecision(undefined);})}>Tải lại danh sách</button>:<button className="ui-button ui-button-primary" disabled={busy} onClick={()=>void changeStatus()}>{busy?'Đang cập nhật…':decision.status==='ACTIVE'?'Xác nhận dừng bán':'Xác nhận mở bán'}</button>}</div></Modal>}
  </section>;
}

function CreateProductModal({ close, onCreated }: { close: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [productTypeId, setProductTypeId] = useState('');
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const [status, setStatus] = useState<'DRAFT'|'ACTIVE'>('DRAFT');
  const [createdId, setCreatedId] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const types = useProductTypes();
  const selectedType = types.data?.find(type => type.id === productTypeId);
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState(100000);
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();

  const releaseUnsaved=useUnsavedChanges(!createdId&&!uncertain&&!!(title||sku||description||imageUrl||productTypeId));
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || uncertain || createdId || !selectedType) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const prod = await callOperation('createProduct', {
        body: {
          product_type_id: productTypeId,
          title: title.trim(),
          description: description.trim() || undefined,
          attributes,
          variants: [{sku: sku.trim(), price_vnd: price, variant_values: Object.fromEntries((selectedType?.attribute_definitions ?? []).filter(definition=>definition.variant_axis&&attributes[definition.code]!==undefined).map(definition=>[definition.code,attributes[definition.code]])), is_default: true}],
          status,
        },
      });

      const prodId = prod.id;
      if (!prodId) throw new Error('Máy chủ không trả về mã sản phẩm. Kiểm tra danh sách trước khi thử lại.');
      setCreatedId(prodId);
      if (prodId && imageUrl.trim()) {
        await callOperation('addProductImage', {
          path: { id: prodId },
          body: {
            image_url: imageUrl.trim(),
            position: 0,
          },
        });
      }

      releaseUnsaved();onCreated();
    } catch (err) {
      if(err instanceof ApiError&&['INVALID_VARIANT_ATTRIBUTES','INVALID_ATTRIBUTES','INVALID_PRODUCT_TYPE'].includes(err.code))await types.refetch();
      if (isUncertainMutation(err)) setUncertain(true);
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal label="Thêm sản phẩm mới" onClose={close} busy={submitting}><div>
      <h3>Thêm sản phẩm mới</h3>
      {error !== undefined && <ErrorView error={error} />}
      {createdId && <p role="status">Sản phẩm đã được tạo (mã {createdId}). Nếu thêm ảnh thất bại, không tạo sản phẩm lần nữa. <Link to={'/seller/products/'+createdId+'/edit'}>Tiếp tục hoàn thiện sản phẩm</Link></p>}
      {uncertain && <p role="alert">Chưa xác định được kết quả. Đóng form và kiểm tra danh sách sản phẩm trước khi tạo lại để tránh trùng.</p>}
      <form onSubmit={handleSubmit}><fieldset disabled={submitting||uncertain||!!createdId}>
        <label>Loại sản phẩm *
          <select required value={productTypeId} onChange={e=>{setProductTypeId(e.target.value);setAttributes({});}}>
            <option value="">Chọn loại sản phẩm</option>
            {types.data?.filter(type=>type.status !== 'STOPPED').map(type=><option key={type.id} value={type.id}>{type.name}</option>)}
          </select>
        </label>
        {types.isLoading && <Loading/>}
        {types.error && <ErrorView error={types.error} onRetry={()=>{void types.refetch();}}/>}
        {selectedType&&<AttributeFields definitions={selectedType.attribute_definitions} values={attributes} onChange={setAttributes} disabled={submitting}/>}
        <label>Trạng thái ban đầu<select value={status} onChange={e=>setStatus(e.target.value as 'DRAFT'|'ACTIVE')}><option value="DRAFT">Nháp</option><option value="ACTIVE">Đang bán</option></select></label>
        <p>Biến thể mới có tồn kho bằng 0. Hãy nhập kho trước khi bán.</p>
        <label>
          Tên sản phẩm *
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Mô tả
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <label>
            SKU phân loại mặc định *
            <input required value={sku} placeholder="VD: SKU-SP-01" onChange={(e) => setSku(e.target.value)} />
          </label>
          <label>
            Giá bán (VNĐ) *
            <input
              type="number"
              min={0}
              max={Number.MAX_SAFE_INTEGER}
              step={1}
              required
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </label>
        </div>
        <label>
          Link ảnh sản phẩm
          <input
            type="url"
            placeholder="https://images.unsplash.com/..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </label>
        </fieldset><div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button type="submit" disabled={submitting || !!createdId || uncertain || !selectedType}>
            {submitting ? 'Đang tạo...' : 'Tạo sản phẩm'}
          </button>
          <button type="button" onClick={close} disabled={submitting}>
            Hủy
          </button>
        </div>
      </form>
    </div></Modal>
  );
}
