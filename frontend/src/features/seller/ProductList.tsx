import {FormEvent, useState} from 'react';
import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {callOperation} from '../../api/operations';
import {Loading,Empty,ErrorView,Pagination} from '../../bootstrap/components';
import {SellerSubNav} from '../../live/SellerWorkspace';

/**
 * Seller catalogue management list.
 *
 * Uses `listOwnStoreProducts`, which is scoped to the caller's Store and returns the management
 * view: DRAFT/STOPPED Products and HIDDEN ones are listed on purpose so the Seller can act on
 * them, unlike the public catalogue. The Store never comes from the URL, so there is nothing to
 * tamper with.
 *
 * The editor is offered for every row, including DRAFT/STOPPED/HIDDEN ones: `ProductEdit` reads the
 * public route first and falls back to this management list, so a non-public Product is reachable
 * without pretending the public route can serve it.
 */

export function SellerProductList(){
  const [page,setPage]=useState(1);
  const {data,isFetching,error,refetch}=useQuery({queryKey:['own-store-products',page],
    queryFn:()=>callOperation('listOwnStoreProducts',{query:{page,size:20}})});

  return <section>
    <SellerSubNav />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <h2>Sản phẩm của Store</h2>
        <p><small>Bao gồm cả sản phẩm nháp, đã dừng bán và đang bị ẩn.</small></p>
      </div>
      <Link to="/seller/products/new">Tạo sản phẩm</Link>
    </div>

    {isFetching && <Loading/>}
    {error && <ErrorView error={error} onRetry={()=>{void refetch();}} retryBusy={isFetching}/>}
    <div className="boot-grid">{data?.items.map(product=><article key={product.id} className="boot-card">
      {product.images?.[0]?.image_url&&<img src={product.images[0].image_url} alt={product.title} loading="lazy" style={{width:'100%',aspectRatio:'4 / 3',objectFit:'cover',borderRadius:12,marginBottom:16}}/>}
      <small>{product.status ?? '—'} · {product.moderation_status ?? '—'}</small>
      <h3>{product.title}</h3>
      <p>{product.description}</p>
      <small>{product.variants?.length ?? 0} biến thể · {product.images?.length ?? 0} ảnh</small>
      {product.status&&product.moderation_status
        ? <Link to={`/seller/products/${product.id}/edit`}>Sửa sản phẩm</Link>
        : null}
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
