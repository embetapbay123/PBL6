import {Link} from 'react-router-dom';
import {useQuery} from '@tanstack/react-query';
import {callOperation} from '../../api/operations';
import type {OperationOutputs} from '../../api/operations.generated';
import {ErrorView} from '../../bootstrap/components';
import {useStoreAccess} from '../../live/useLiveData';
import {useProductTypes} from './useProductTypes';
import {attributeProblemCodes} from './AttributeFields';
import {variantLabel} from '../../components/variant-identity';

/** Saved catalog facts and scoped inventory, never a claim that checkout has succeeded. */
export function ProductReadiness({product}:{product:OperationOutputs['getOwnStoreProduct']}){
 const access=useStoreAccess(),types=useProductTypes(),canStock=access.can('inventory.store.read_adjust');
 const inventory=useQuery({queryKey:['store-inventory','product-readiness',product.id],enabled:canStock,queryFn:({signal})=>callOperation('listStoreInventory',{query:{product_id:product.id,page:1,size:100}},{signal})});
 const variants=product.variants??[],active=variants.filter(item=>item.status==='ACTIVE');
 const type=types.data?.find(item=>item.id===product.product_type_id),present=(value:unknown)=>value!==undefined&&value!==null&&(typeof value!=='string'||!!value.trim());
 const missing=type?.attribute_definitions.filter(item=>item.required&&!item.variant_axis&&!present(product.attributes?.[item.code]))??[];
 const priceReady=active.length>0&&active.every(item=>!!item.sku.trim()&&Number.isSafeInteger(item.price_vnd)&&item.price_vnd>=0);
 const invalidAxes=type?active.filter(item=>attributeProblemCodes(type.attribute_definitions.filter(d=>d.variant_axis),item.variant_values).length>0):[];
 const balances=new Map(inventory.data?.items.map(item=>[item.variant_id,item])??[]);
 const known=!!inventory.data&&!inventory.error&&active.every(item=>!!item.id&&balances.has(item.id));
 const stocked=known?active.filter(item=>!!item.id&&(balances.get(item.id)?.available_quantity??0)>0).length:undefined;
 const publicProduct=product.status==='ACTIVE'&&product.moderation_status==='VISIBLE';
 return <section className="boot-card product-readiness" aria-labelledby="product-readiness-title"><h2 id="product-readiness-title">Hoàn thiện sản phẩm để bán</h2><p>Kiểm tra dữ liệu đã lưu. Các thay đổi đang nhập chưa được tính; ACTIVE không đồng nghĩa còn hàng mua được.</p><ol>
  <li><strong>Thông tin:</strong> {types.isLoading?'Đang kiểm tra thuộc tính…':types.error?'Chưa đọc được cấu hình thuộc tính.':!type?'Loại sản phẩm không còn khả dụng.':missing.length?'Còn thiếu '+missing.map(item=>item.name).join(', '):'Đã có thông tin bắt buộc.'} <a href="#product-attributes">Kiểm tra thuộc tính</a></li>
  <li><strong>Phân loại và giá:</strong> {types.isLoading?'Đang kiểm tra cấu hình phân loại…':types.error||!type?'Chưa đủ cấu hình để xác nhận phân loại hợp lệ.':invalidAxes.length?'Cần sửa trục phân loại của '+invalidAxes.map(v=>v.sku).join(', ')+'.':priceReady?active.length+' phân loại đang bán có SKU và giá hợp lệ.':'Cần ít nhất một phân loại đang bán, có SKU và giá hợp lệ.'} <a href="#product-variants">Kiểm tra phân loại</a></li>
  <li><strong>Ảnh:</strong> {product.images?.length?product.images.length+' ảnh đã lưu.':'Chưa thêm ảnh; nên bổ sung để khách nhận ra món.'} <a href="#product-images">Kiểm tra ảnh</a></li>
  <li><strong>Kho:</strong> {!canStock?'Bạn chưa có quyền kho. Nhờ Owner hoặc nhân viên kho nhập đúng SKU bên dưới.':inventory.isLoading?'Đang đọc tồn khả dụng…':inventory.error?'Chưa đọc được tồn; chưa kết luận mua được.':!known?'Chưa đủ dữ liệu của tất cả phân loại đang bán.':stocked?stocked+'/'+active.length+' phân loại đang bán còn tồn khả dụng.':'Các phân loại đang bán chưa có tồn khả dụng.'} {canStock&&<Link to={'/seller/inventory?product_id='+product.id}>Mở kho đúng sản phẩm</Link>}</li>
  <li><strong>Hiển thị:</strong> {product.moderation_status==='HIDDEN'?'Đang bị ẩn bởi kiểm duyệt; mở bán không tự khôi phục hiển thị.':product.status==='DRAFT'?'Bản nháp chưa xuất hiện cho khách.':product.status==='STOPPED'?'Sản phẩm đang dừng bán.':'Sản phẩm đang mở bán và không bị ẩn.'} <a href="#product-general">Kiểm tra trạng thái bán</a></li>
 </ol>{inventory.error&&<ErrorView error={inventory.error} onRetry={()=>void inventory.refetch()}/>}{types.error&&<ErrorView error={types.error} onRetry={()=>void types.refetch()}/>}
 <details><summary>Đối chiếu {variants.length} phân loại theo món / SKU</summary><ul>{variants.map(item=><li key={item.id??item.sku}><strong>{variantLabel(item.variant_values)}</strong> · SKU {item.sku} · {item.price_vnd.toLocaleString('vi-VN')} ₫ · {item.status==='ACTIVE'?'Đang bán':'Dừng bán'}{canStock&&item.id&&<> · <Link to={'/seller/inventory?variant_id='+item.id}>Nhập / kiểm kho phân loại này</Link></>}</li>)}</ul></details>
 {publicProduct&&<p><Link to={'/products/'+product.id}>Xem trang khách</Link>. Kiểm tra đúng phân loại có tồn trước khi mua thử; checkout vẫn xác minh giá, tồn và cấu hình Store.</p>}</section>;
}
