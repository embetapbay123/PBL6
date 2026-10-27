import {FormEvent, useState} from 'react';
import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {callOperation} from '../../api/operations';
import {Loading,Empty,ErrorView,Pagination} from '../../bootstrap/components';

/**
 * Seller catalogue management list.
 *
 * Uses `listOwnStoreProducts`, which is scoped to the caller's Store and returns the management
 * view: DRAFT/STOPPED Products and HIDDEN ones are listed on purpose so the Seller can act on
 * them, unlike the public catalogue. The Store never comes from the URL, so there is nothing to
 * tamper with.
 *
 * The editor is only offered for rows the editor can actually load. `ProductEdit` reads through
 * `getProduct`, the public route, which returns ACTIVE + VISIBLE Products only, so linking a draft
 * or hidden row would 404 on click and on refresh. Those rows are still listed, with the action
 * visibly unavailable, until an authorized management detail route exists.
 */
function canOpenEditor(product:{status?:string;moderation_status?:string}):boolean{
  return product.status==='ACTIVE' && product.moderation_status==='VISIBLE';
}

export function SellerProductList(){
  const [page,setPage]=useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const {data,isFetching,error,refetch}=useQuery({queryKey:['own-store-products',page],
    queryFn:()=>callOperation('listOwnStoreProducts',{query:{page,size:20}})});

  return <section>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h2>Sản phẩm của Store</h2>
        <p><small>Bao gồm cả sản phẩm nháp, đã dừng bán và đang bị ẩn.</small></p>
      </div>
      <button onClick={() => setShowCreate(true)}>+ Thêm sản phẩm mới</button>
    </div>

    {showCreate && <CreateProductModal close={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); void refetch(); }} />}

    {isFetching && <Loading/>}
    {error && <ErrorView error={error} onRetry={()=>{void refetch();}} retryBusy={isFetching}/>}
    <div className="boot-grid">{data?.items.map(product=><article key={product.id} className="boot-card">
      {product.images?.[0]?.image_url&&<img src={product.images[0].image_url} alt={product.title} loading="lazy" style={{width:'100%',aspectRatio:'4 / 3',objectFit:'cover',borderRadius:12,marginBottom:16}}/>}
      <small>{product.status ?? '—'} · {product.moderation_status ?? '—'}</small>
      <h3>{product.title}</h3>
      <p>{product.description}</p>
      <small>{product.variants?.length ?? 0} biến thể · {product.images?.length ?? 0} ảnh</small>
      {canOpenEditor(product)
        ? <Link to={`/seller/products/${product.id}/edit`}>Sửa sản phẩm</Link>
        : <span role="note">Chưa sửa được: chỉ sản phẩm đang bán mới mở được form.</span>}
    </article>)}</div>
    {data && data.items.length===0 && <Empty>Store chưa có sản phẩm nào.</Empty>}
    {data && data.items.length>0 && <Pagination page={page} size={data.size} total={data.total} onPage={setPage}/>}
  </section>;
}

function CreateProductModal({ close, onCreated }: { close: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [productTypeId, setProductTypeId] = useState('type-default');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState(100000);
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(undefined);
    try {
      const prod = await callOperation('createProduct', {
        body: {
          product_type_id: productTypeId,
          title: title.trim(),
          description: description.trim() || undefined,
          attributes: {},
          status: 'ACTIVE',
        },
      });

      const prodId = prod.id;
      if (prodId && sku.trim()) {
        await callOperation('createVariant', {
          path: { id: prodId },
          body: {
            sku: sku.trim(),
            price_vnd: price,
            variant_values: {},
            is_default: true,
          },
        });
      }

      if (prodId && imageUrl.trim()) {
        await callOperation('addProductImage', {
          path: { id: prodId },
          body: {
            image_url: imageUrl.trim(),
            position: 0,
          },
        });
      }

      onCreated();
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="boot-card" style={{ marginBottom: '2rem', border: '2px solid #059669', padding: '1.5rem' }}>
      <h3>Thêm sản phẩm mới</h3>
      {error !== undefined && <ErrorView error={error} />}
      <form onSubmit={handleSubmit}>
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
              min={1000}
              step={1000}
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
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Đang tạo...' : 'Tạo sản phẩm'}
          </button>
          <button type="button" onClick={close} disabled={submitting}>
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
}
