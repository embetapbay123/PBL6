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
    <h2>Sản phẩm của Store</h2>
    <p><small>Bao gồm cả sản phẩm nháp, đã dừng bán và đang bị ẩn.</small></p>
    <p><Link to="/seller/products/new">Tạo sản phẩm</Link></p>
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
