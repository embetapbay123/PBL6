import {Link} from 'react-router-dom';
import type {OperationOutputs} from '../../api/operations.generated';
import {CatalogCard} from '../../live/CatalogCard';
import './storefront.css';
export function StorefrontSections({data,bannerUrl,preview=false}:{data:OperationOutputs['getPublicStorefront'];bannerUrl?:string;preview?:boolean}){
 const {content,products}=data;if(!content.enabled)return null;
 const banner=content.banner,voucher=data.campaign_voucher;
 const chosen=new Map(products.curated.map(p=>[p.id,p]));
 const hasGroups=content.groups.some(g=>g.kind==='CURATED'?g.product_ids.some(id=>chosen.has(id)):g.kind==='NEW'?products.newest.length:products.bestsellers_complete&&products.bestsellers.length);
 if(!banner&&!(content.campaign&&voucher)&&!hasGroups)return null;
 return <div className="storefront-sections">
  {banner&&<Link className="storefront-banner" to={banner.link_type==='PRODUCT'&&banner.product_id?'/products/'+banner.product_id:'#store-products'}>
   <img src={bannerUrl??`/api/v1/stores/${data.store_id}/storefront/banners/${banner.asset_id}/content`} alt="" width={1600} height={600}/>
   <div><span className="new-kicker">TỪ GIAN HÀNG</span><h2>{banner.title}</h2>{banner.subtitle&&<p>{banner.subtitle}</p>}<span className="storefront-banner-link">{banner.link_type==='PRODUCT'?'Xem sản phẩm':'Khám phá sản phẩm'} →</span></div>
  </Link>}
  {content.campaign&&voucher&&<section className="storefront-campaign" aria-label="Ưu đãi đang diễn ra">
   <div><span className="new-kicker">ƯU ĐÃI ĐANG DIỄN RA</span><h2>{content.campaign.title}</h2>
    <p>{voucher.discount_type==='PERCENT'?`Giảm ${voucher.discount_value}%`:`Giảm ${voucher.discount_value.toLocaleString('vi-VN')} ₫`}{voucher.discount_type==='PERCENT'&&voucher.max_discount_vnd!=null?` · tối đa ${voucher.max_discount_vnd.toLocaleString('vi-VN')} ₫`:''}</p>
    <p>Đơn tối thiểu {(voucher.min_goods_vnd??0).toLocaleString('vi-VN')} ₫ · đến {new Date(content.campaign.ends_at).toLocaleString('vi-VN')}</p>
   </div><div className="storefront-voucher-code"><span>Mã tại bước thanh toán</span><strong>{voucher.code}</strong><Link to="#store-products">Chọn sản phẩm →</Link></div>
  </section>}
  {content.groups.map(group=>{
   const items=group.kind==='CURATED'?group.product_ids.flatMap(id=>chosen.has(id)?[chosen.get(id)!]:[]):group.kind==='NEW'?products.newest:products.bestsellers;
   if(!items.length||group.kind==='BEST_SELLING'&&!products.bestsellers_complete)return null;
   return <section key={group.id} className="storefront-product-group" aria-label={group.title}>
    <header><h2>{group.kind==='NEW'?'Mới lên kệ':group.kind==='BEST_SELLING'?'Bán chạy 30 ngày':group.title}</h2><Link to="#store-products">Xem tất cả →</Link></header>
    {group.kind==='BEST_SELLING'&&<p className="storefront-group-note">Theo số lượng trong đơn hoàn tất, trừ hàng trả đã xác nhận nhận.</p>}
    <div className="new-product-grid">{items.slice(0,12).map(product=><CatalogCard key={product.id} product={product} preview={preview}/>)}</div>
   </section>;
  })}
 </div>;
}
