export const auditFieldLabels: Record<string,string> = {
  variants:'Các phân loại',variant_values:'Thuộc tính phân loại',variant_values_json:'Thuộc tính phân loại',attributes:'Thuộc tính',title:'Tên sản phẩm',sku:'SKU',price_vnd:'Giá bán',quantity:'Tồn thương mại',reserved_quantity:'Đang giữ',state:'Trạng thái xử lý kho',method:'Phương thức thanh toán',collectible_vnd:'Còn phải thu',collected_vnd:'Đã thu',refunded_vnd:'Đã hoàn',disposition:'Kết quả đối soát',provider:'Bộ xử lý thanh toán',delta_quantity:'Thay đổi tồn',delta_reserved:'Thay đổi giữ hàng',status:'Trạng thái',version:'Phiên bản',permissions:'Quyền',role:'Vai trò',reason:'Lý do',shipping_fee_vnd:'Phí giao hàng',amount_vnd:'Số tiền',payable_vnd:'Phải trả',inventory_status:'Tình trạng kho',type:'Loại yêu cầu',fault_party:'Trách nhiệm',fee_payer:'Bên chịu phí',
};
const permissions: Record<string,string> = {'product.store.read_write':'Quản lý sản phẩm','inventory.store.read_adjust':'Xem / điều chỉnh kho','order.store.read_status_cancel':'Xử lý đơn hàng','cod.store.collect':'Ghi nhận COD'};
const states: Record<string,string> = {ACTIVE:'Đang hoạt động',LOCKED:'Đã khóa',STOPPED:'Dừng hoạt động',DRAFT:'Bản nháp',PENDING:'Đang chờ',CONFIRMED:'Đã xác nhận',PROCESSING:'Đang xử lý',SHIPPED:'Đã bàn giao',COMPLETED:'Hoàn tất',CANCELLED:'Đã hủy',EXPIRED:'Hết hạn',REVOKED:'Đã thu hồi',ACCEPTED:'Đã chấp nhận',REQUESTED:'Đã gửi yêu cầu',UNKNOWN:'Chưa rõ kết quả',SUCCEEDED:'Đã xác nhận thành công',FAILED:'Thất bại',CONSUMED:'Đã trừ tồn',RESERVED:'Đang giữ',HELD:'Đang giữ',RELEASED:'Đã nhả giữ',RESTOCKED:'Đã hoàn tồn',APPLIED:'Đã áp dụng',SETTLING:'Đang đối chiếu',CLOSED:'Đã đóng',OPEN:'Đang mở',RECEIVED:'Đã nhận hàng'};
const attributes = new Set(['attributes','variant_values','variant_values_json']);
/** Translate controlled fields only. SKU, reasons and custom attribute values are literal evidence. */
export function auditValueText(value:unknown, key='', literal=false):string {
  const custom=literal||attributes.has(key);
  if(value===null||value===undefined)return '—';
  if(typeof value==='boolean')return value?'Có':'Không';
  if(Array.isArray(value))return value.map(item=>auditValueText(item,key,custom)).join('; ');
  if(typeof value==='object')return Object.entries(value).map(([name,item])=>(custom?name:auditFieldLabels[name]??name)+': '+auditValueText(item,name,custom)).join(' · ');
  const text=String(value);
  if(!custom){
    if(key==='permissions')return permissions[text]??text;
    const label=key==='status'||key==='state'||key.endsWith('_status')?states[text]:key==='role'?({OWNER:'Chủ Store',SELLER:'Nhân viên'} as Record<string,string>)[text]:key==='method'?({COD:'Thu hộ COD',SANDBOX:'Thanh toán online'} as Record<string,string>)[text]:undefined;
    if(label)return label+' ('+text+')';
  }
  return text;
}
