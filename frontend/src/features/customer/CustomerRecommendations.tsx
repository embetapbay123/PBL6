import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {getCustomerRecommendations,getRelatedProducts} from '../../api/recommendationsChat';
import {callOperation} from '../../api/operations';
import {ApiError} from '../../api/client';
import type {OperationOutputs} from '../../api/operations.generated';
import {useAuth} from '../../api/auth-context';
import {ErrorView,Loading,Pagination} from '../../bootstrap/components';
import {CatalogCard} from '../../live/CatalogCard';
export function CustomerRecommendations({productId}:{productId?:string}){
 const {session}=useAuth();const customer=session?.context?.roles.includes('CUSTOMER')?session.context.user_id:undefined;
 if(!productId&&!customer)return null;
 return <Recommendations key={(productId??'for-you')+':'+(customer??'guest')} productId={productId}/>;
}
function Recommendations({productId}:{productId?:string}){
 const [products,setProducts]=useState<OperationOutputs['getProduct'][]>([]),[error,setError]=useState<unknown>(),[loading,setLoading]=useState(true),[source,setSource]=useState(''),[page,setPage]=useState(1),[total,setTotal]=useState(0),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError(undefined);setProducts([]);
  (async()=>{
   if(productId){const result=await getRelatedProducts(productId,page);if(active){setProducts(result.items);setTotal(result.total)}}
   else{const result=await getCustomerRecommendations();const values=await Promise.all(result.product_ids.map(async id=>{try{return await callOperation('getProduct',{path:{id}})}catch(e){if(e instanceof ApiError&&e.status===404)return undefined;throw e}}));if(active){setProducts(values.filter((v):v is OperationOutputs['getProduct']=>!!v&&v.status==='ACTIVE'));setSource(result.source)}}
  })().catch(e=>{if(active)setError(e)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false};
 },[productId,page,retry]);
 return <section className="boot-card" aria-label={productId?'Sản phẩm liên quan':'Dành cho bạn'}><h3>{productId?'Sản phẩm liên quan':'Dành cho bạn'}</h3>
  {loading?<Loading/>:error?<ErrorView error={error} onRetry={()=>setRetry(n=>n+1)}/>:<>{source&&<small>Nguồn gợi ý: {source}</small>}{!products.length&&<p>Chưa có gợi ý phù hợp.</p>}
   <div className="market-product-grid">{products.map(p=><CatalogCard key={p.id} product={p}/>)}</div>
   {productId&&<Pagination page={page} size={4} total={total} onPage={setPage}/>}</>}
 </section>;
}
