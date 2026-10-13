# Customer Web — Product detail, Cart và client checkout

Owner: Hatsaphone / `HATSAPHONE`. [PR #96](https://github.com/embetapbay123/PBL6/pull/96); WEB-02 #62, phần đầu WEB-05 #65 và WEB-06 #66. Đây là bàn giao client; endpoint nghiệp vụ vẫn giữ trạng thái theo contract/backend của owner.

## File và luồng chạy

- `frontend/src/features/customer/ProductDetail.tsx`: `/products/:id`, generated types, ảnh/Variant đang bán, quantity trong giới hạn DB, loading/404/error/retry; thêm giỏ qua `addCartItem` thật. Link detail và Cart có trên trang list.
- `CartPage.tsx` và `cart-data.ts`: `/cart` yêu cầu Customer; đọc hết trang Cart, update/remove qua API, chặn thao tác trùng, phân biệt lỗi với empty state. Không tạo giá giả; enrich title/giá từ Catalog còn thuộc WEB-05.
- `CheckoutPage.tsx`: `/checkout` yêu cầu Customer và selection từ Cart. Đọc Cart/Address thật, tạo `payment_methods` theo Store UUID, quote theo address/selection hiện hành. Đổi selection/address loại quote cũ; expiry chặn confirm. Retry transport giữ nguyên payload/key trong attempt đang mở, 409 yêu cầu quote mới, 501 không hiện thành công.
- `routes.tsx`: nối route thật qua `ProtectedRoute`; dùng chung AuthProvider/client và các component loading/error của nền code.
- `frontend/tests/customer.spec.ts`: lỗi dependency khác 404, session guard, Cart error khác empty, payload COD theo Store, retry 503 cùng key, 501 chặn confirm, unavailable Variant/mobile và addCart API thật. Test mutation khôi phục quantity/item sau chạy.

## Kiểm chứng

```powershell
docker compose --env-file infrastructure/.env -f infrastructure/compose.yaml build
npm run infra:up
python scripts/wait_local.py
npm --prefix frontend run test:e2e
```

14 Web e2e đạt cùng các scenario nền. Test response lỗi dùng route fixture có chủ đích; addCart, login/profile và sửa Product dùng API thật. API lỗi không tự chuyển sang fixture.

## Phạm vi còn lại

WEB-05 #65: Catalog title/giá/Store display, item không resolve được và nghiệm thu Cart UI đầy đủ. WEB-06 #66: nghiệm thu confirm nhiều Store với backend Hoa, vouchers, online Payment, order read/navigation và persisted recovery khi reload/mất phản hồi. Client hiện giữ key trong component, chưa chứng minh recovery sau đóng trang. Không coi `PREPARING`/`RECOVERING` hay Payment pending là đã thanh toán. Order/Payment/Voucher/Inventory vẫn giữ owner backend hiện có.
