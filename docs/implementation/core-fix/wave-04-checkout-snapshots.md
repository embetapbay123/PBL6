# F01–F04 / F07 / F14 — phục hồi checkout và snapshot xuyên vai trò

Tiếp nối01/11/2026, stack riêng `pbl6-fe-verify`, gateway18080/frontend3109. Backend hiện là manifest25,263hash khớp; bảy reader/worker cùng image. Không có migration mới. Manifest24 là bước sửa catalog; manifest25 bổ sung Admin reader. Source frontend cuối và test nằm trong `frontend-source-checkout25-final.json`; giữ tất cả manifest/lượt lỗi trước đó.

## Những lỗi mới tái hiện và sửa

| Vấn đề | Bằng chứng trước sửa | Thay đổi |
| --- | --- | --- |
| Mua ngay của A còn trong history state, bị quote bằng tài khoản B sau đổi phiên |`checkout-session-recovery-baseline.json`, ca thứ nhất FAIL|Gắn user và hạn30phút cho lựa chọn CART/BUY_NOW trong router/storage. Bỏ lựa chọn không thuộc user hiện hành; không tự mang lựa chọn A sang B.|
| Đổi tài khoản khi POST đặt hàng chờ làm mất attempt của A |Cùng báo cáo, ca thứ ba FAIL|Giữ nguyên attempt tài chính theo user, body và key khi phiên thay đổi hoặc mất quyền xác thực. TTL của draft không xóa attempt đã gửi.|
| Thiếu tồn409 đã bị từ chối chắc chắn nhưng UI giữ form đóng băng như UNKNOWN |Cùng báo cáo, ca thứ hai FAIL|Phân biệt các mã từ chối chắc chắn từ prepare/FAILED đã bù với conflict chưa xác định; cho sửa lựa chọn sau từ chối. Lỗi mạng/5xx và conflict chưa phân loại vẫn giữ attempt cũ.|
| Đổi chéo tổ hợp variant trong một payload hợp lệ trả500 |`checkout-recovery-runtime-identity.json`|Trong transaction đang khóa Product, tạm giải phóng SKU/signature của đúng variant thuộc Product/Store rồi ghi đủ trạng thái cuối. Giữ ID variant/kho. Trùng ID/tổ hợp bị từ chối; xung đột thật rollback cả transaction và trả409. Không đổi unique index hoặc thêm migration.|
| Admin reader rơi chính sách trả hàng đã lưu |`checkout-recovery-runtime-desktop24-verified.json`|Reader trả policy, completed_at và timeline đã ghi, dùng cùng bộ đọc policy/phân loại actor. Dialog Admin hiển thị chúng; không lộ raw actor ID hoặc dựng policy cho đơn cũ.|
| Customer detail không hiển thị địa chỉ giao hàng đã chốt |`checkout-recovery-runtime-desktop25.json`|Dùng component địa chỉ snapshot chung với phiếu Seller; hiển thị policy trước khi hoàn tất. Đơn COMPLETED tiếp tục dùng panel đổi trả đã có, không lặp policy. Không lấy sổ địa chỉ hiện tại thay lịch sử.|

CR-016 được mở lại trong lượt này vì bằng chứng checkout mới vượt ngoài các ca auth23 đã nghiệm thu. Sau sửa và chạy lại, **CR-016 VERIFIED trên25**; bằng chứng auth23 vẫn giữ cho các nhánh cookie/quyền không đổi source. **CR-001 VERIFIED trên25**. Không tự đóng các finding còn lại của F02/F04/F05/F07/F14 chỉ nhờ các bước trên.

## Nghiệm thu có đối chiếu thật

Thư mục bằng chứng: `artifacts/core-fix/fix-20261030T100153Z/`.

| Kiểm tra | Kết quả | Artifact |
| --- | --- | --- |
| Toàn bộ backend unit |343PASS/50suite|`backend-unit-checkout25.json`|
| SQL catalog batch và Admin reader, hai schema riêng |16PASS|`catalog-admin-integration25-verified.json`|
| Edge fixture checkout/session/auth/packing/order detail |45PASS|`checkout-browser-regression25-final.json`|
| Walkthrough thật1440px |PASS|`checkout-recovery-runtime-desktop25-accepted.json`|
| Walkthrough thật390px |PASS|`checkout-recovery-runtime-mobile25-accepted.json`|
| Ma trận HTTP/SQL/worker giỏ0/2/5, Mua ngay2 |PASS|`direct-buy-matrix-runtime25.json`|
| Đọc lại M1/M2/M3 sau retry và cleanup |PASS|`checkout-final-state25.json`|
| Build backend/frontend; contracts check/drift; docs check |PASS|`checkout-acceptance25.json`|

Mỗi walkthrough dùng cùng đối tượng xuyên các bước:

1. Tìm sản phẩm có12variant; chọn theo “L / Xanh” nhìn thấy trong UI, không dựa SKU khó đoán. Giỏ A có5, BUY_NOW2. Owner lấy bớt tồn sau quote; confirm thật trả409/INSUFFICIENT_STOCK, không có đơn/attempt hoặc giữ tồn. Customer quay lại sửa lượng1, đặt thành công, hủy và đối chiếu hoàn kho.
2. BUY_NOW2 lần tiếp theo commit thật; giữ ACK ở ranh giới HTTP. Tab khác logout A/login B. Checkout B không tự quote lựa chọn A; attempt A còn nguyên. Quay về A rồi retry đúng body/key: chỉ một đơn cho giao dịch đó, tồn chỉ trừ2. Giỏ A5/B3 giữ nguyên, B không có đơn.
3. Sau đặt, đổi tên/giá/SKU và đổi chéo tổ hợp variant, sửa địa chỉ Customer và địa chỉ nhận trả Store. Customer/Seller/Admin API vẫn giữ tên, L/Xanh, SKU cũ, đơn giá100000, lượng2 và cả hai địa chỉ snapshot cũ. Customer detail và dialog Admin đọc đúng dữ liệu này; timeline ghi worker là Hệ thống.
4. SQL sau toàn lượt: A có đúng2đơn (một hủy, một pending), B0; attempt lỗi thiếu tồn trước prepare không tồn tại, attempt commit ởCOMMITTED; kho8/giữ0; money movement0 vì COD chưa thu. Giá/variant hiện hành đã150000/Đen-XL nhưng snapshot đơn vẫn100000/Xanh-L.

Ma trận0/2/5 là **HTTP/database/worker thật, không phải walkthrough UI**. Mỗi trường hợp gửi đồng thời cùng key rồi đọc lại cùng body/key; SQL có đúng3attemptCOMMITTED và3đơn lượng2, mỗi đơn220000, không có tiền thu giả. Giỏ giữ lần lượt0/2/5. Các ca UI riêng đã kiểm reload/Back, đổi phiên, mất ACK và TTL draft.

SQL catalog kiểm đổi chéo SKU/tổ hợp, duplicate ID/tổ hợp, ID Store khác, SKU Product khác, va vào signature của dòng không gửi, cạnh tranh version và create bị từ chối. Transaction lỗi giữ nguyên cả Product/version/variant; không còn identity tạm sau commit/rollback. Admin SQL kiểm policy/timeline/completed_at có bằng chứng và lịch sử thiếu bằng chứng, không tự lấp bằng ngày tạo đơn.

## Phạm vi còn mở và lịch sử test

- Tổng mới: **6/52finding VERIFIED,46finding chưa đóng đầy đủ**. F02 còn ca nhiều Store trùng tên/SKU và toàn bộ biến động snapshot; F04 còn cạnh tranh voucher/tồn nhiều Store và mutation giỏ thực; F07 còn ảnh/UNKNOWN create/validation rộng; F14 còn nghiệp vụ Admin/quyền rộng.
- CH01–CH05 giữ PASS21, CH06 giữ PASS22/hồi quy23. Không lấy walkthrough này thay nghiệm thu lại sáu chuỗi cùng source cuối25.
- Edge1440/390 là viewport trình duyệt; chưa kiểm thiết bị thật, bàn phím ảo, native zoom, screen reader hoặc người tham gia thật. Không đưa các giới hạn này thành PASS.
- User fixture cho lượt này được seed trực tiếp **chỉ trong M3 riêng**, có tag và guard project/adapter; login và commerce vẫn qua handler thật. Không gọi đây là nghiệm thu đăng ký/email. Không tắt/xóa rate limiter.
- Các lượt lỗi do fixture thiếu slug/operation_id, locator L/Xanh và nhầm endpoint Admin được giữ; chúng không phải bug ứng dụng. Lượt unit cũ vướng số đếm164/150 trong gate; cập nhật đúng166operation/152public và kiểm thêm bộ ID fixture khớp contract, vẫn validate từng request/response.
- Sản phẩm/taxonomy fixture được STOPPED; dữ liệu giao dịch/audit giữ lại. Bằng chứng kiểm không còn listing/taxonomy ACTIVE và identity tạm nằm trong SQL final-state. Hồ sơ review gốc không bị sửa để che kết quả cũ.
