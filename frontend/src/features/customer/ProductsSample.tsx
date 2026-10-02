import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '../../api/auth-context';
import {callOperation} from '../../api/operations';
import {Loading,Empty,ErrorView,Pagination} from '../../bootstrap/components';
export function ProductsSample(){
  const auth=useAuth();const [search,setSearch]=useState('');const [page,setPage]=useState(1);const {data,isLoading,error}=useQuery({queryKey:['products',search,page],queryFn:()=>callOperation('listProducts',{query:{page,size:20,q:search}})});
  return <section><h2>Sản phẩm từ M1</h2><label>Tìm sản phẩm<input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label>{isLoading && <Loading/>}{error && <ErrorView error={error}/>}<div className="boot-grid">{data?.items.map(p=><article key={p.id} className="boot-card"><small>{p.status}</small><h3>{p.title}</h3><p>{p.description}</p><strong>{p.variants?.[0]?.price_vnd?.toLocaleString('vi-VN')} ₫</strong>{auth.session?.context?.roles.some(r=>['SELLER','STORE_OWNER'].includes(r)) && <Link to={`/seller/products/${p.id}/edit`}>Sửa sản phẩm</Link>}</article>)}</div>{data?.items.length===0 && <Empty>Chưa có sản phẩm phù hợp.</Empty>}{data && <Pagination page={page} size={data.size} total={data.total} onPage={setPage}/>}</section>;
}
