import {useState,type ImgHTMLAttributes} from 'react';
import {ImageOff} from 'lucide-react';
type Props=ImgHTMLAttributes<HTMLImageElement>&{name:string;retry?:boolean};
/** A changed source gets independent error/retry state; failed loads never say no image exists. */
export function ProductImage(props:Props){return <Image key={props.src??'missing'} {...props}/>;}
function Image({name,retry=false,src,...props}:Props){
 const [failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 if(!src||failed)return <div className="product-image-empty"><div role="img" aria-label={(!src?'Chưa có ảnh cho ':'Không tải được ảnh của ')+name}><ImageOff aria-hidden="true" size={32}/><span>{src?'Ảnh chưa tải được':'Chưa có ảnh sản phẩm'}</span></div>{src&&retry&&<button type="button" onClick={()=>{setAttempt(value=>value+1);setFailed(false);}}>Thử tải lại ảnh</button>}</div>;
 return <img {...props} key={attempt} src={src} onError={event=>{setFailed(true);props.onError?.(event);}}/>;
}
