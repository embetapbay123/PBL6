import {useId,useState,type FormEvent} from 'react';
export function CatalogPriceFilter({min,max,onApply}:{min?:number;max?:number;onApply:(min:string,max:string)=>void}){
 const [error,setError]=useState(''),id=useId();
 function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget),from=String(data.get('min')??'').trim(),to=String(data.get('max')??'').trim();
  if(from&&to&&Number(from)>Number(to)){setError('Giá từ không được lớn hơn giá đến.');return;}setError('');onApply(from,to);
 }
 return <form className="catalog-price-filter" onSubmit={submit}><h3>Khoảng giá <span>₫</span></h3><div><label>Giá từ<input name="min" type="number" inputMode="numeric" min="0" max={Number.MAX_SAFE_INTEGER} step="1" defaultValue={min??''} placeholder="0" aria-describedby={error?id:undefined} aria-invalid={error?true:undefined}/></label><label>Giá đến<input name="max" type="number" inputMode="numeric" min="0" max={Number.MAX_SAFE_INTEGER} step="1" defaultValue={max??''} placeholder="Max" aria-describedby={error?id:undefined} aria-invalid={error?true:undefined}/></label></div>{error&&<p role="alert" id={id}>{error}</p>}<button type="submit">Áp dụng</button></form>;
}
