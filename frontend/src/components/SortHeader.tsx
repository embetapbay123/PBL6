import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
export function SortHeader({label,value,ascending,descending,onChange}:{label:string;value?:string;ascending:string;descending:string;onChange:(value:string)=>void}){
 const active=value===ascending||value===descending;
 return <th scope="col" aria-sort={active?(value===ascending?'ascending':'descending'):'none'}><button className="table-sort" type="button" onClick={()=>onChange(value===ascending?descending:ascending)} aria-label={'Sắp xếp '+label+(value===ascending?' giảm dần':' tăng dần')}>{label}{active?(value===ascending?<ArrowUp size={14}/>:<ArrowDown size={14}/>):<ArrowUpDown size={14}/>}</button></th>;
}
