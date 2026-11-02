import {Button as UiButton} from '../components/ui/Button';
import {useFavorite} from '../features/customer/favorite-state';
import {useToast} from '../components/ToastProvider';
import {useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {useQueryClient} from '@tanstack/react-query';
import {Check,Heart,ShoppingCart} from 'lucide-react';
import {useAuth} from '../api/auth-context';
import {ApiError} from '../api/client';
import {callOperation} from '../api/operations';
import type {OperationOutputs} from '../api/operations.generated';
import {Modal} from '../components/Modal';
import {ErrorView} from '../bootstrap/components';
import {variantLabel} from '../components/variant-identity';
import {availableUnits,variantCanOrder,variantAxisDescription} from '../components/variant-availability';
import {rememberAuthReturn} from '../features/customer/auth/auth-return';

export function ProductCardActions({product}:{product:OperationOutputs['getProduct']}){
 const notify=useToast();
 const {session}=useAuth(),navigate=useNavigate(),cache=useQueryClient(),flight=useRef(false);
 const [busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[added,setAdded]=useState(false),[uncertain,setUncertain]=useState(false),[error,setError]=useState<unknown>(),[choose,setChoose]=useState(false),[selected,setSelected]=useState('');
 const favoriteState=useFavorite(product.id??''),saved=favoriteState.saved;
 const variants=product.variants?.filter(variant=>variant.id&&variant.status==='ACTIVE') ?? [],orderable=variants.filter(variantCanOrder),canBuy=product.status==='ACTIVE'&&orderable.length>0;
 async function add(variantId:string){
  if(flight.current||uncertain||!product.id||!canBuy||!orderable.some(v=>v.id===variantId))return;flight.current=true;setBusy(true);setError(undefined);setAdded(false);
  try{await callOperation('addCartItem',{body:{product_id:product.id,variant_id:variantId,quantity:1}});setAdded(true);setChoose(false);notify('Đã thêm vào giỏ hàng');await cache.invalidateQueries({queryKey:['cart-summary']});}
  catch(e){setError(e);if(!(e instanceof ApiError)||e.status===0||e.status===408||e.status>=500)setUncertain(true);}finally{flight.current=false;setBusy(false);}
 }
 function purchase(){if(!canBuy)return;if(!session){rememberAuthReturn('/products/'+product.id);navigate('/login');return;}if(variants.length===1)void add(variants[0].id!);else {setSelected((orderable.find(v=>v.is_default) ?? orderable[0])?.id ?? '');setChoose(true);}}
 async function favorite(){
  if(!session){navigate('/login');return;}if(saving||!product.id)return;setSaving(true);setError(undefined);
  try{await favoriteState.toggle();}catch(e){setError(e);}finally{setSaving(false);}
 }
 const permitted=!session||!!session.context?.roles.includes('CUSTOMER');
 return <>
  <div className="product-card-actions"><UiButton variant="secondary" className="product-add-button" type="submit" disabled={!canBuy||busy||uncertain||!permitted} onClick={purchase}><ShoppingCart size={16}/>{busy?'Đang thêm…':added?'Thêm lần nữa':'Thêm vào giỏ'}</UiButton><UiButton variant="icon" type="submit" aria-label={(saved?'Bỏ yêu thích ':'Yêu thích ')+product.title} aria-pressed={favoriteState.ready?saved:undefined} disabled={saving||favoriteState.busy||!permitted||favoriteState.loading||!favoriteState.ready} onClick={()=>void favorite()}><Heart size={18} fill={saved?'currentColor':'none'}/></UiButton></div>
  {added&&<p role="status" className="product-card-feedback"><Check size={14}/>Đã thêm vào giỏ. <Link to="/cart">Xem giỏ hàng</Link></p>}
  {(error??favoriteState.error)!=null&&!choose&&<ErrorView error={error??favoriteState.error} onRetry={()=>void favoriteState.retry()}/>}{uncertain&&<p className="product-card-feedback">Kiểm tra <Link to="/cart">giỏ hàng</Link> trước khi thêm lại.</p>}
  {choose&&<Modal label={'Chọn phân loại '+product.title} onClose={()=>setChoose(false)} busy={busy}><h2>Chọn phân loại</h2><p>{product.title}</p><p>{product.variant_axes?.map(axis=>axis.name).join(' / ')||'Chọn phân loại theo thông tin bên dưới'}. Tồn được kiểm tra lại khi đặt hàng.</p><label>Phân loại<select value={selected} disabled={busy||uncertain} onChange={event=>setSelected(event.target.value)}>{variants.map(variant=><option key={variant.id} value={variant.id} disabled={!variantCanOrder(variant)}>{variantLabel(variant.variant_values,variant.sku)} · {variant.price_vnd.toLocaleString('vi-VN')} ₫ · {availableUnits(variant)===0?'Hết hàng':availableUnits(variant)!==undefined?'Khả dụng '+availableUnits(variant):'Chưa có số tồn'}</option>)}</select></label><div className="ui-actions"><UiButton variant="secondary" type="submit" disabled={busy} onClick={()=>setChoose(false)}>Đóng</UiButton><UiButton variant="primary" type="submit" disabled={busy||uncertain||!orderable.some(v=>v.id===selected)} onClick={()=>void add(selected)}>{busy?'Đang thêm…':'Thêm vào giỏ hàng'}</UiButton></div>{variantAxisDescription(variants.find(v=>v.id===selected)?.variant_values,product.variant_axes)&&<p>{variantAxisDescription(variants.find(v=>v.id===selected)?.variant_values,product.variant_axes)}</p>}{error!==undefined&&<ErrorView error={error}/>}</Modal>}
 </>;
}
