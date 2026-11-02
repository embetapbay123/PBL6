import { useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, List, SlidersHorizontal, X, Store } from 'lucide-react';
import { callOperation } from '../../api/operations';
import type { OperationOutputs } from '../../api/operations.generated';
import { Empty, ErrorView, Loading, Pagination } from '../../bootstrap/components';
import { CatalogCard } from '../../live/CatalogCard';
import {Modal} from '../../components/Modal';
import { CustomerRecommendations } from './CustomerRecommendations';

export function MarketplaceHome() {
  const [params, setParams] = useSearchParams();
  const [view,setView]=useState<'grid'|'list'>('grid');
  const [filterOpen,setFilterOpen]=useState(false),[filterCategory,setFilterCategory]=useState('');
  const query = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const location=useLocation();
  useEffect(()=>{if(location.hash==='#danh-muc'&&matchMedia('(max-width:1023px)').matches){setFilterCategory(category);setFilterOpen(true);}},[location.key]);
  const rawPage=Number(params.get('page'));
  const page=Number.isSafeInteger(rawPage)&&rawPage>=1&&rawPage<=1000000?rawPage:1;
  const requestedSort=params.get('sort');
  const sort=requestedSort==='price_asc'||requestedSort==='price_desc'?requestedSort:'title';
  const setFilter = (key: string, value: string) => setParams(current => {
    const next = new URLSearchParams(current);
    next.delete('page');
    value ? next.set(key, value) : next.delete(key);
    return next;
  });
  const products = useQuery({queryKey: ['products', query, category, page, sort], queryFn: () => callOperation('listProducts', {query: {page, size: 20, q: query, ...(category ? {category_id: category} : {}), sort}})});
  const categories = useQuery({queryKey: ['catalog-categories'], queryFn:async({signal})=>{
    const items:OperationOutputs['listCategories']['items']=[];
    for(let page=1;;page++){const result=await callOperation('listCategories',{query:{page,size:100}},{signal});items.push(...result.items);if(!result.items.length||items.length>=result.total)return items;}
  }});
  const leaves = categories.data?.filter(item => !categories.data?.some(child => child.parent_id === item.id)) ?? [];

  return <div className="new-home">
    <nav className="catalog-breadcrumb" aria-label="Breadcrumb"><Link to="/">Trang chủ</Link><span>/</span><span>{query?'Kết quả tìm kiếm':'Khám phá sản phẩm'}</span></nav>
    <header className="catalog-heading"><div><p className="market-eyebrow">KHÁM PHÁ CÙNG PBL6</p><h1>{query?'Kết quả cho “'+query+'”':'Sản phẩm từ các gian hàng'}</h1><p>Lựa chọn sản phẩm, xem phân loại và trao đổi trực tiếp với người bán.</p></div><span className="catalog-total">{products.data?.total ?? '—'} <small>sản phẩm</small></span></header>
    <div className="catalog-layout"><aside id="danh-muc" className="catalog-filters" aria-label="Bộ lọc sản phẩm"><h2>Danh mục</h2><button aria-pressed={!category} onClick={()=>setFilter('category','')}>Tất cả sản phẩm</button>{leaves.map(item=><button key={item.id} aria-pressed={category===item.id} onClick={()=>setFilter('category',item.id)}>{item.name}</button>)}{categories.error&&<ErrorView error={categories.error} onRetry={()=>void categories.refetch()}/>}<div className="catalog-filter-help"><Store size={21}/><h3>Bạn có gian hàng?</h3><p>Quản lý sản phẩm và đơn bán tại kênh người bán.</p><Link to="/customer/store-applications">Mở gian hàng →</Link></div></aside>
    <section id="san-pham" className="new-catalog" aria-label="Danh sách sản phẩm"><div className="new-section-heading"><div><h2>Khám phá sản phẩm<span className="new-count">{products.data?` / ${products.data.total}`:''}</span></h2><p>Từ các gian hàng trên PBL6 Market</p></div><div className="commerce-view-toggle" aria-label="Cách hiển thị sản phẩm"><button type="button" aria-label="Xem dạng lưới" aria-pressed={view==='grid'} onClick={()=>setView('grid')}><LayoutGrid size={18}/></button><button type="button" aria-label="Xem dạng danh sách" aria-pressed={view==='list'} onClick={()=>setView('list')}><List size={19}/></button></div></div>
      <div className="catalog-toolbar"><button className="ui-button ui-button-secondary catalog-filter-trigger" onClick={()=>{setFilterCategory(category);setFilterOpen(true);}}><SlidersHorizontal size={18}/>Bộ lọc</button><div className="catalog-active-filters">{query&&<span>Từ khóa: {query}</span>}{category&&<button className="ui-button ui-button-secondary" onClick={()=>setFilter('category','')}>{leaves.find(item=>item.id===category)?.name ?? 'Danh mục'} <X size={14}/></button>}{(query||category||sort!=='title')&&<button className="ui-button ui-button-secondary" onClick={()=>{setParams({});}}>Xóa bộ lọc</button>}</div><label>Sắp xếp<select value={sort} onChange={event=>setFilter('sort',event.target.value)}><option value="title">Tên sản phẩm</option><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option></select></label></div>
      {products.isFetching&&<Loading/>}{products.error&&<ErrorView error={products.error} onRetry={()=>void products.refetch()} retryBusy={products.isFetching}/>}{!products.isFetching&&!products.error&&<><div className={'market-product-grid'+(view==='list'?' product-list-view':'')}>{products.data?.items.map(product=><CatalogCard key={product.id} product={product}/>)}</div>{products.data?.items.length===0&&<Empty>Không tìm thấy sản phẩm phù hợp. Hãy thử từ khóa hoặc danh mục khác.</Empty>}</>}{products.data&&!products.error&&<Pagination page={page} size={products.data.size} total={products.data.total} onPage={value=>setParams(current=>{const next=new URLSearchParams(current);next.set('page',String(value));return next;})}/>}
    </section>
    </div>
    {filterOpen&&<Modal variant="drawer" label="Bộ lọc sản phẩm" onClose={()=>setFilterOpen(false)}><h2>Lọc theo danh mục</h2><label>Danh mục<select value={filterCategory} onChange={event=>setFilterCategory(event.target.value)}><option value="">Tất cả sản phẩm</option>{leaves.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="ui-actions"><button className="ui-button ui-button-secondary" onClick={()=>setFilterCategory('')}>Xóa lọc</button><button className="ui-button ui-button-primary" onClick={()=>{setFilter('category',filterCategory);setFilterOpen(false);}}>Áp dụng</button><button className="ui-button ui-button-secondary" onClick={()=>setFilterOpen(false)}>Đóng</button></div></Modal>}
    <CustomerRecommendations/>
  </div>;
}
