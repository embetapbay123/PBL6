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
import {availableUnits,variantCanOrder} from '../components/variant-availability';
import {VariantPicker} from '../components/VariantPicker';
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
 function purchase(){
  if(!canBuy)return;
  if(variants.length===1){
    if(!session){
      const variantId = variants[0].id!;
      rememberAuthReturn('/products/' + product.id + '?variant=' + encodeURIComponent(variantId), { variant_id: variantId });
      navigate('/login');
      return;
    }
    void add(variants[0].id!);
  } else {
    const searchParams = new URLSearchParams(window.location.search);
    const minRaw = searchParams.get('min'), maxRaw = searchParams.get('max');
    const minVal = minRaw !== null && minRaw !== '' && !isNaN(Number(minRaw)) ? Number(minRaw) : undefined;
    const maxVal = maxRaw !== null && maxRaw !== '' && !isNaN(Number(maxRaw)) ? Number(maxRaw) : undefined;
    const inRange = (v: (typeof variants)[number]) =>
      (minVal === undefined || v.price_vnd >= minVal) &&
      (maxVal === undefined || v.price_vnd <= maxVal);
    const inRangeOrderable = (minVal !== undefined || maxVal !== undefined) ? orderable.filter(inRange) : [];
    const pool = inRangeOrderable.length ? inRangeOrderable : orderable;
    const defaultChoice = pool.find(v=>v.is_default) ?? pool[0] ?? variants[0];
    setSelected(defaultChoice?.id ?? '');
    setChoose(true);
  }
 }
 async function favorite(){
  if(!session){navigate('/login');return;}if(saving||!product.id)return;setSaving(true);setError(undefined);
  try{await favoriteState.toggle();}catch(e){setError(e);}finally{setSaving(false);}
 }
 const permitted=!session||!!session.context?.roles.includes('CUSTOMER');
 const selectedVariant=variants.find(v=>v.id===selected);
 const selectedUnits=availableUnits(selectedVariant);
 const selectedCanOrder=selectedVariant?variantCanOrder(selectedVariant):false;
 return <>
  <div className="product-card-actions"><UiButton variant="secondary" className="product-add-button" type="submit" disabled={!canBuy||busy||uncertain||!permitted} onClick={purchase}><ShoppingCart size={16}/>{busy?'Đang thêm…':added?'Thêm lần nữa':variants.length>1?'Chọn phân loại':'Thêm vào giỏ'}</UiButton><UiButton variant="icon" type="submit" aria-label={(saved?'Bỏ yêu thích ':'Yêu thích ')+product.title} aria-pressed={favoriteState.ready?saved:undefined} disabled={saving||favoriteState.busy||!permitted||favoriteState.loading||!favoriteState.ready} onClick={()=>void favorite()}><Heart size={18} fill={saved?'currentColor':'none'}/></UiButton></div>
  {added&&<p role="status" className="product-card-feedback"><Check size={14}/>Đã thêm vào giỏ. <Link to="/cart">Xem giỏ hàng</Link></p>}
  {(error??favoriteState.error)!=null&&!choose&&<ErrorView error={error??favoriteState.error} onRetry={()=>void favoriteState.retry()}/>}{uncertain&&<p className="product-card-feedback">Kiểm tra <Link to="/cart">giỏ hàng</Link> trước khi thêm lại.</p>}
  {choose&&<Modal label={'Chọn phân loại '+product.title} onClose={()=>setChoose(false)} busy={busy}>
    <h2>Chọn phân loại</h2>
    <p style={{margin:'4px 0 14px',color:'#666'}}>{product.title}</p>
    <VariantPicker variants={variants} axes={product.variant_axes} value={selected} disabled={busy||uncertain} onChange={setSelected}/>
    <div className="variant-choice-footer" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'16px',marginTop:'20px',flexWrap:'wrap'}}>
      <div className="variant-choice-details" style={{display:'flex',alignItems:'baseline',gap:'8px'}}>
        {selectedVariant&&(<>
          <span style={{fontSize:'18px',fontWeight:600,color:'#b91c1c'}}>{selectedVariant.price_vnd.toLocaleString('vi-VN')} ₫</span>
          <span style={{fontSize:'13px',color:selectedCanOrder?'#666':'#dc2626'}}>
            {selectedUnits===0||!selectedCanOrder?'Hết hàng':selectedUnits!==undefined?`Còn ${selectedUnits.toLocaleString('vi-VN')} sản phẩm`:'Còn hàng'}
          </span>
        </>)}
      </div>
      <div className="ui-actions" style={{display:'flex',gap:'8px',margin:0}}>
        <UiButton variant="secondary" type="button" disabled={busy} onClick={()=>setChoose(false)}>Đóng</UiButton>
        <UiButton variant="primary" type="button" disabled={busy||uncertain||!selectedCanOrder} onClick={()=>{
          if (!session) {
            rememberAuthReturn('/products/' + product.id + '?variant=' + encodeURIComponent(selected), { variant_id: selected });
            navigate('/login');
            return;
          }
          void add(selected);
        }}>
          {busy?'Đang thêm…':'Thêm vào giỏ'}
        </UiButton>
      </div>
    </div>
    {error!==undefined&&<ErrorView error={error}/>}
  </Modal>}
 </>;
}
