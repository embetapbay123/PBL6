import {OrderItemIdentity} from './OrderPresentation';
import './InspectionSummary.css';

type InspectionLine={order_item_id:string;received_quantity:number;resellable_quantity:number;damaged_quantity:number;pending_quantity:number};
type OriginalItem={order_item_id:string;product_snapshot:Record<string,unknown>;sku_snapshot?:string;quantity?:number;unit_price_vnd?:number};
type Props={lines:readonly InspectionLine[];items:readonly OriginalItem[];heading:string;headingLevel?:3|4};
const counts=[['received_quantity','Thực nhận'],['resellable_quantity','Bán lại được'],['damaged_quantity','Hỏng / không bán lại'],['pending_quantity','Chờ kiểm / xử lý']] as const;

/** Read only: original identity comes from the order snapshot; counts come from this inspection. */
export function InspectionSummary({lines,items,heading,headingLevel=3}:Props){
 if(!lines.length)return null;
 const Heading=headingLevel===4?'h4':'h3';
 return <div className="inspection-summary">
  <Heading>{heading}</Heading>
  <ul className="inspection-summary-list" aria-label={heading}>{lines.map((line,index)=>{
   const item=items.find(original=>original.order_item_id===line.order_item_id);
   return <li key={line.order_item_id}>
    {item?<OrderItemIdentity item={{...item,id:item.order_item_id}}/>:<p role="status">Chưa đối chiếu được dòng đơn gốc cho mục kiểm hàng {index+1}. Cần kiểm tra biên bản với Store; không suy thông tin từ sản phẩm hiện tại.</p>}
    <dl className="inspection-summary-counts">{counts.map(([field,label])=><div key={field}><dt>{label}</dt><dd>{Number.isSafeInteger(line[field])&&line[field]>=0?line[field].toLocaleString('vi-VN'):'Chưa có dữ liệu'}</dd></div>)}</dl>
   </li>;
  })}</ul>
 </div>;
}
