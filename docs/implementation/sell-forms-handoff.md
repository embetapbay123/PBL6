# #9 / #10 — Form Seller tạo Product, Variant và ảnh

**Issue:** [#9](https://github.com/embetapbay123/PBL6/issues/9) · [#10](https://github.com/embetapbay123/PBL6/issues/10) · **Nhánh:** `feat/sell-forms` · phần UI còn thiếu

## File đã code

| File | Việc |
| --- | --- |
| [ProductCreate.tsx](../../frontend/src/bootstrap/ProductCreate.tsx) *(mới)* | Form tạo Product: chọn Product type, thuộc tính động theo taxonomy, trạng thái, biến thể đầu tiên |
| [ProductEdit.tsx](../../frontend/src/bootstrap/ProductEdit.tsx) | Thêm mục **Biến thể** (`createVariant`) và **Ảnh** (`addProductImage`) |
| [routes.tsx](../../frontend/src/features/seller/routes.tsx) | Route `/seller/products/new` |
| [ProductList.tsx](../../frontend/src/features/seller/ProductList.tsx) | Link "Tạo sản phẩm" |
| [seller-forms.spec.ts](../../frontend/tests/seller-forms.spec.ts) *(mới)* | 3 test Playwright |

## Đã làm được gì

- **Tạo Product trên UI thật**, không còn phải gọi API tay: chọn loại → form tự hiện đúng các attribute của loại đó → lưu là chuyển sang trang sửa của Product vừa tạo.
- **Thêm Variant và ảnh** ngay trong trang sửa, danh sách lấy lại từ server sau mỗi lần thêm.
- Lỗi từ server hiện nguyên văn (`role="alert"`), và **không điều hướng** sang editor khi tạo thất bại.

## Cách làm — 2 điểm chính

1. **Form theo taxonomy, không hardcode**: field thuộc tính sinh từ `attribute_definitions` của Product type đang chọn; đổi loại thì reset map thuộc tính.
2. **Key thuộc tính suy ra giống server** (`snake_case`) vì projection `AttributeDefinition` công khai **không** trả `code`. Đây là điểm nên sửa ở contract — đã ghi trong code và PR.

## Kiểm chứng

```powershell
npm run build
npm --prefix frontend run test:e2e
```

Kết quả: build FE đạt · **69 test Playwright đạt** (2 skip), gồm 3 test mới: form sinh field theo loại + payload đúng (`attributes: {kich_thuoc:'M'}`, `variants[...]`, `status: DRAFT`) · lỗi 422 hiện alert và giữ nguyên trang · thêm Variant/ảnh gửi đúng body và hiện thông báo.

## Còn lại

- `code` của attribute chưa có trong contract → client phải suy ra từ `name`.
- Các màn Seller khác (`StoreInventory`, `StoreOrders`, `StoreReports`, `VoucherPanel`, `StaffPage`) đã có trên `main`.
