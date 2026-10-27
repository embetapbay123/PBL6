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
      {canOpenEditor(product)
        ? <Link to={`/seller/products/${product.id}/edit`}>Sửa sản phẩm</Link>
        : <span role="note">Chưa sửa được: chỉ sản phẩm đang bán mới mở được form.</span>}
    </article>)}</div>
    {data && data.items.length===0 && <Empty>Store chưa có sản phẩm nào.</Empty>}
    {data && data.items.length>0 && <Pagination page={page} size={data.size} total={data.total} onPage={setPage}/>}
  </section>;
}
