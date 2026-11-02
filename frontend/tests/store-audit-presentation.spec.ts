import {test,expect} from '@playwright/test';
import {auditValueText} from '../src/features/seller/store-audit-presentation';
test('controlled state, role and permissions are readable without relabeling an opaque SKU or reason',()=>{
 expect(auditValueText('LOCKED','status')).toBe('Đã khóa (LOCKED)');expect(auditValueText('SELLER','role')).toBe('Nhân viên (SELLER)');expect(auditValueText(['inventory.store.read_adjust'],'permissions')).toBe('Xem / điều chỉnh kho');expect(auditValueText('product.store.read_write','sku')).toBe('product.store.read_write');expect(auditValueText('ACTIVE','reason')).toBe('ACTIVE');
});
test('custom attributes named status or permissions remain literal while variant lifecycle status is translated',()=>{
 const text=auditValueText([{sku:'product.store.read_write',status:'ACTIVE',variant_values:{status:'LOCKED',permissions:'cod.store.collect'},price_vnd:'100500'}],'variants');expect(text).toContain('SKU: product.store.read_write');expect(text).toContain('Trạng thái: Đang hoạt động (ACTIVE)');expect(text).toContain('status: LOCKED');expect(text).toContain('permissions: cod.store.collect');expect(text).not.toContain('Đã khóa');expect(text).not.toContain('Ghi nhận COD');expect(text).toContain('Giá bán: 100500');
});
test('missing data, zeros and an unrecognized historical code retain their distinction',()=>{
 expect(auditValueText(0,'collected_vnd')).toBe('0');expect(auditValueText(null,'collected_vnd')).toBe('—');expect(auditValueText('OLD_CODE','status')).toBe('OLD_CODE');expect(auditValueText(false)).toBe('Không');
});
