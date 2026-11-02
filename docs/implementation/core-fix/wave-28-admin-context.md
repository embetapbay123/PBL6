# Đợt 54 — Ngữ cảnh trước quyết định Admin

**UX-16 đã VERIFIED; F14 hoàn tất trong phạm vi finding đã chốt. Tổng: 39/52 finding gốc VERIFIED, 13 còn mở.** Runtime riêng `Node54b/AI54b/frontend54`; chưa nghiệm thu toàn bộ marketplace hoặc sáu chuỗi trên cùng source cuối. Không chạy mobile theo yêu cầu người dùng.

## Vấn đề và thay đổi

Baseline `admin-context-baseline53.json` có ba ca FAIL: sản phẩm chỉ có mã Store; yêu cầu đổi trả thiếu nhãn khách/Store và ngữ cảnh đơn/tiền; lỗi đọc danh tính chưa ngăn quyết định thiếu thông tin. Người quản trị có thể nhầm hai món cùng tên/SKU hoặc hai yêu cầu cùng số tiền.

- `AdminParties.tsx` đọc tên/trạng thái Store và tên/email/trạng thái khách qua directory Admin hiện có. Mỗi trang tối đa một request cho từng loại đối tượng, tập ID chính xác, tối đa 100 UUID; không tìm trong 100 bản ghi đầu hoặc gọi public Store để nhận diện Store đã khóa.
- `listStores`/`listUsers` bổ sung query `ids`, giao với các điều kiện tìm/lọc/phân trang hiện có. ID rỗng/sai/quá giới hạn bị 422, không mở rộng thành toàn directory. Quyền Admin hiện hành vẫn bắt buộc.
- Kiểm duyệt sản phẩm hiển thị Store hiện tại, trạng thái, mã nhận diện và liên kết directory. Search/filter/page nằm trong URL; vào Store rồi Back giữ truy vấn. Thiếu danh tính/version hoặc đang đọc lại thì chưa cho quyết định; lỗi GET có đường thử lại. Kết quả mutation chưa rõ không được coi là thành công.
- Danh sách đổi trả Admin có `admin_context` từ chính đơn và payment: Store, khách, ngày tạo đơn, trạng thái đơn/tiền, khoản thu/hoàn đã đối chiếu. Thiếu payment hiển thị chưa xác định, không dựng số 0. Customer/Store không nhận trường ngữ cảnh Admin.
- Nhãn tài khoản/Store được ghi rõ là dữ liệu hiện tại; món, phân loại, lượng, giá và chính sách vẫn là snapshot đơn. Có đường mở đúng đơn nguồn. Thiếu ngữ cảnh ở dữ liệu cũ vẫn cho tra đơn, chưa cho quyết định mù.

Không thêm endpoint, migration, enum hoặc chính sách kinh doanh. Không dùng số tiền hoặc tên trùng làm khóa lựa chọn. Phân trang Returns vẫn là state cục bộ; đợt này không tuyên bố đã giữ URL mọi trang Returns.

## Bằng chứng và hồi quy

Các file dưới thuộc `artifacts/core-fix/fix-20261030T100153Z/`:

| Kiểm tra | Bằng chứng | Kết quả |
|---|---|---|
| Node unit, toàn bộ bộ hiện có | `backend-unit-admin-context54b.json` | 374 PASS / 51 suite |
| SQL M2/M3 riêng, exact IDs, quyền, legacy/payment thiếu | `admin-context-sql54b.json` | 14 PASS / 3 suite |
| Edge desktop: context, metadata lỗi, legacy, Customer/Seller/UNKNOWN hồi quy | `admin-context-ui54-final.json` | 13 PASS |
| Python contract trên AI54b | `ai-contracts54b.xml` | 9 PASS |
| Hai Store thật qua UI/API/worker | `admin-context-runtime54-accepted-final.json` | 1 hành trình PASS, checkpoint riêng |
| Đối chiếu độc lập và cleanup | `admin-context-final-state54.json` | PASS |
| Source triển khai | `image-source-match-54.json`, `ai-image-source-match54.json`, `frontend-source-admin-context54.json`, `runtime-image-admin-context54.json` | 395 backend / 43 AI / 309 frontend-contract-test-config / 10 image khớp |

Contract OpenAPI: 139 public path, 14 internal path; generator/drift 159 public + 14 internal DTO, 7 event qua. Public/internal typings đối chiếu nội dung mới với bản hiện hành qua. Frontend build 2075 module qua, giữ cảnh báo main chunk lớn có trước. Node54b và AI54b build thành công; AI reader được bật trước Node writer. Không DDL nên không có rollback migration; cần giữ reader hiểu query/context mới khi tắt UI mới. Rollback snapshot writer37 vẫn là việc F18 riêng.

### Walkthrough và hậu điều kiện thật

Hai Store Hà Nội/Huế có sản phẩm cùng tên, cùng SKU khó đoán. Hai khách có cùng display name, email khác; hai đơn COD hoàn tất đều 120.000đ và hai yêu cầu EXCHANGE. Store Huế bị khóa sau khi nhận yêu cầu để kiểm tra hỗ trợ ca cũ.

Admin đi từ menu kiểm duyệt, tìm hai món, mở đúng Store rồi Back, ẩn đúng sản phẩm Huế; sản phẩm Hà Nội vẫn VISIBLE. Từ menu Returns, đối chiếu khách/Store/ngày/tiền, mở đúng đơn nguồn và quay lại; từ chối đúng yêu cầu Huế với version 0. API xác nhận yêu cầu Hà Nội vẫn REQUESTED trước cleanup. SQL xác nhận đúng một audit PRODUCT_HIDDEN ở Store Huế, đúng request/version/actor và lịch sử REQUESTED → REJECTED.

Hai Customer không nhận `admin_context`; Store Hà Nội chỉ đọc yêu cầu đúng scope và không nhận ngữ cảnh Admin. Store Huế đã khóa bị 403 theo quyền hiện hành, không gọi đó là kiểm tra payload Store thành công. Owner đọc directory Admin và Customer đọc directory user đều 403. Test SQL bổ sung kiểm Store scope, missing permission và dữ liệu payment chưa có.

Hai ảnh desktop đã xem: `admin-context-runtime54-accepted-final/admin-context-runtime-Admi-6094b-e-deciding-the-exact-target/product-context-desktop.png` và `return-context-desktop.png`. Checkpoint cùng thư mục ghi SETUP, EQUAL_CASES, PRODUCT_TARGET, RETURN_TARGET, PRIVACY, CLEANUP. Ảnh Returns chụp card mục tiêu để tránh ảnh toàn trang rất dài.

### Cleanup và giới hạn tiền/kho

Hai đơn lượt được chấp nhận vẫn COMPLETED; hai yêu cầu cuối REJECTED, đúng một chuyển quyết định mỗi yêu cầu. Thu xác nhận thủ công 240.000đ, hoàn 0đ, hai journal collection. Mỗi variant quantity 9/reserved 0; mỗi đơn một RESERVE và một CONSUME. Từ chối đổi trả không cộng lại tồn hoặc tạo refund.

Cả bốn lượt runtime được đối chiếu: 8 Store LOCKED, 8 product/type/category STOPPED, 8 đơn COMPLETED, 8 yêu cầu REJECTED; 8 collection journal tổng 960.000đ, không refund, không restock. Đây là xác nhận COD trong fixture kiểm thử, không phải bằng chứng tiền thật hoặc ngân hàng. Giữ dữ liệu có tag và lịch sử, không chỉnh tiền/kho để làm test qua.

## Các lượt thử giữ nguyên

`admin-context-runtime54-trial.json` chờ phân trang chưa đủ; `run2` dùng selector label không khớp combobox; `accepted` đã qua PRODUCT_TARGET/RETURN_TARGET nhưng timeout ảnh toàn trang trước privacy; chỉ `accepted-final` là PASS đầy đủ. Cả bốn lượt đều cleanup và hậu kiểm. Không ghi đè báo cáo FAIL.

`backend-unit-admin-context54.json` có fixture ID không hợp regex mới; sửa example UUID hợp lệ, không nới validation. SQL54 fixture tạo payment sau COMPLETED bị guard đúng chặn; sửa thứ tự fixture rồi chạy lại 54b. UI trial sửa assertion vùng alert, không sửa thông báo để khớp test. Build đầu sửa typing test implicit any; image54b chứa source cuối.

## Còn lại

F00/F18 còn mở, 13 finding ở F04/F07/F13/F16/F17 và sáu chuỗi common-source cùng rollback snapshot writer chưa chốt. USER_VALIDATION_PENDING; không nhận đã dùng screen reader, thiết bị thật hoặc provider tiền thật. Mobile được người dùng miễn. Không commit hoặc triển khai production.
