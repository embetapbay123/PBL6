import {useState} from 'react';
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
 */
export function SellerProductList(){
  const [page,setPage]=useState(1);
  const {data,isFetching,error,refetch}=useQuery({queryKey:['own-store-products',page],
    queryFn:()=>callOperation('listOwnStoreProducts',{query:{page,size:20}})});
  return <section>
    <h2>Sản phẩm của Store</h2>
    <p><small>Bao gồm cả sản phẩm nháp, đã dừng bán và đang bị ẩn.</small></p>
    {isFetching && <Loading/>}
    {error && <ErrorView error={error} onRetry={()=>{void refetch();}} retryBusy={isFetching}/>}
    <div className="boot-grid">{data?.items.map(product=><article key={product.id} className="boot-card">
      <small>{product.status ?? '—'} · {product.moderation_status ?? '—'}</small>
      <h3>{product.title}</h3>
      <p>{product.description}</p>
      <small>{product.variants?.length ?? 0} biến thể · {product.images?.length ?? 0} ảnh</small>
      <Link to={`/seller/products/${product.id}/edit`}>Sửa sản phẩm</Link>
    </article>)}</div>
    {data && data.items.length===0 && <Empty>Store chưa có sản phẩm nào.</Empty>}
    {data && data.items.length>0 && <Pagination page={page} size={data.size} total={data.total} onPage={setPage}/>}
  </section>;
}
