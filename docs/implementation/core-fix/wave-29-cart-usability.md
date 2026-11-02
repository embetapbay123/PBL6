# Đợt 55 — Điều khiển giỏ và đổi lựa chọn rõ ràng

**UX-02 đã VERIFIED; F04 hoàn tất trong phạm vi finding đã chốt. Tổng: 40/52 finding gốc VERIFIED, 12 còn mở.** Runtime riêng `Node54b/AI54b/frontend55`; không chạy mobile theo yêu cầu người dùng. Sáu chuỗi common-source cuối và rollback snapshot writer vẫn thuộc F18, chưa nghiệm thu toàn bộ ứng dụng.

## Sửa và tiêu chí

Giữ thành tiền dòng, tổng tạm tính phần chọn và quote server là nguồn xác nhận cuối của các đợt trước. Bổ sung những phần UX-02 chưa được nghiệm thu:

- Mỗi dòng có group và checkbox mang tên sản phẩm cùng màu/size; nút tăng/giảm/xóa có mô tả liên kết tới nội dung đúng dòng. Hai phân loại cùng sản phẩm không còn chỉ có cùng nhãn theo mã product.
- Có đường **Chọn phân loại khác** và hướng dẫn: thêm lựa chọn mới, sau đó xóa dòng cũ trong giỏ. Không thêm mutation thay variant hoặc giao dịch thay dòng ngầm. Link được tạm giữ khi đang ghi hoặc chưa rõ kết quả.
- Sau khi xóa thành công, focus tới checkbox dòng còn lại gần vị trí cũ; nếu hết giỏ thì về heading. Trạng thái cập nhật/xóa và tổng phần chọn có thông báo bất đồng bộ cho công cụ hỗ trợ.
- Khi GET metadata lỗi, tổng tạm tính không dùng giá cache cũ như thể vừa đọc thành công; chưa đọc được phân loại không gọi là phân loại tiêu chuẩn. Có nút đọc lại thông tin hàng, chỉ GET và không tự gửi mutation.

Vùng sửa: `frontend/src/features/customer/CartPage.tsx`, `frontend/src/live/CartProduct.tsx`. Không đổi API, contract, database, worker hoặc chính sách. Sửa selector một test cũ để dùng nhãn người dùng mới, giữ nguyên kỳ vọng tiền/giỏ.

## Bằng chứng

File thuộc `artifacts/core-fix/fix-20261030T100153Z/`:

| Kiểm tra | Kết quả và artifact |
|---|---|
| Baseline nhãn và đường đổi lựa chọn | `cart-usability-baseline54.json`: hai ca FAIL tại thiếu group/link. Ca metadata lượt này chưa tới mục tiêu vì link chưa có; không nhận đó là bằng chứng giá cũ đã tái hiện đầy đủ. |
| Hồi quy Edge desktop | `cart-usability-ui55-final.json`: 26 PASS, gồm 3 ca mới, purchase-intent và nhận diện Store/sản phẩm. |
| Hai phiên Customer, hai Store thật | `cart-usability-runtime55-accepted-final.json`: PASS; `accepted` trước đó cũng PASS nhưng chưa thêm hit-test focus. |
| Đối chiếu SQL độc lập và cleanup | `cart-usability-final-state55.json`: PASS, tất cả bốn lượt. |
| Source/image | `source-match-cart-usability55.json`, `frontend-source-cart-usability55.json`, `runtime-image-cart-usability55.json`: 395 backend/43 AI giữ nguyên source54 và image; 311 file frontend-contract-test-config, 10 image khớp. |

Frontend build 2075 module PASS, còn cảnh báo main chunk lớn có trước. Contract check/drift vẫn 159 public +14 internal DTO/7 event. Backend unit 374, SQL14, Python9 đã qua ở54; không ghi là đã chạy lại trong55 vì source/image backend và AI không đổi.

### Walkthrough thật, từ UI

Store A có Đỏ/M giá100.000đ và Xanh/L giá150.000đ; Store B có món50.000đ. Giỏ ban đầu Đỏ×3, Xanh×1, mónB×2, tổng hàng550.000đ. Hai phiên web độc lập đăng nhập cùng Customer; Customer B có giỏ riêng trống.

Phiên thứ nhất dùng bàn phím bỏ chọn Store B: tổng450.000đ; giảm Đỏ3→2: tổng350.000đ. Theo đường chọn phân loại khác, chọn Xanh/L×2 và thêm: dòng Xanh cũ1 trở thành3, dòng Đỏ2 vẫn giữ tới khi người mua chủ động xóa. Sau xóa, tổng phần chọn450.000đ; mónB×2 vẫn ở giỏ và bỏ chọn. Focus chuyển tới checkbox còn lại, hit-test xác nhận nằm trong viewport và không bị header che. Ảnh desktop đầu trang đã xem tại `cart-usability-runtime55-accepted-final/cart-usability-runtime-UX0-293b8-reflected-in-the-real-order/cart-keyboard-correction-desktop.png`.

Checkout báo470.000đ gồm Xanh×3 và phí20.000đ. Phiên thứ hai còn dữ liệu cũ Xanh×1, tăng thành2 qua PATCH thật. Xác nhận báo giá cũ ở phiên thứ nhất nhận409 QUOTE_CHANGED; chưa tạo đơn. UI đọc lại, hiển thị Xanh×2 và tổng320.000đ trước lần xác nhận mới. Đơn tạo ra đúng Store A, một dòng Xanh/L×2, đơn giá150.000đ, snapshot đúng; mónB×2 còn nguyên ngoài đơn.

Phiên thứ hai tiếp tục checkout từ danh sách cũ chứa dòng đã xóa/đã mua: UI báo các dòng không còn trong giỏ, không render nút xác nhận và có đường quay lại giỏ. Quay lại chỉ còn Store B, tạm tính100.000đ; API vẫn đúng một đơn. Customer B vẫn không có dòng giỏ của Customer A. Checkpoint ghi SETUP, KEYBOARD_BUDGET, CHOICE_CORRECTED, OTHER_TAB_REQUOTE, CONFIRMED_EXACT_SELECTION, STALE_TAB_RECOVERY, CLEANUP; không ghi credential/token.

### Hậu điều kiện và lịch sử thử

SQL của cả bốn lượt: 8 Store LOCKED, 8 product/type/category STOPPED, 4 đơn fixture CANCELLED sau cleanup, 12 variant đều quantity10/reserved0 và ledger10/0. Mỗi đơn chỉ một RESERVE2, một CONSUME2 và một RESTOCK2; không có đơn ở Store bị bỏ chọn, không có money journal/refund, các giỏ fixture đã thu dọn. Giữ lịch sử đơn/ledger; không chỉnh tiền hoặc kho để làm test qua.

Giữ `runtime55-trial` lỗi assertion đặt variant_values sai tầng thay vì product_snapshot; `runtime55-final` kỳ vọng nút disabled trong khi nhánh lỗi không render nút. Sửa test để khớp contract và đường an toàn hiện có, giữ kiểm tra đúng món/lượng/tiền và chỉ một đơn. `accepted` PASS đầy đủ; `accepted-final` bổ sung hit-test focus và ảnh chụp sau scroll về đầu trang. Verifier đầu tham chiếu inventory_status như cột order; bản đúng join order_inventory_state, chỉ đọc dữ liệu.

`cart-usability-ui55-trial.json` có25PASS/1FAIL: cache còn trong10giây nên chưa phát GET lỗi. Bản cuối làm cache hết hạn bằng đồng hồ kiểm thử, rồi xác nhận metadata lỗi → giá chưa xác định → đọc lại GET-only. Báo cáo trial/baseline giữ nguyên, không biến lỗi harness thành bug ứng dụng mới.

## Giới hạn và việc tiếp

Đường sửa phân loại là thêm lựa chọn mới rồi xóa dòng cũ có hướng dẫn, chưa phải thay variant tại chỗ. Đã kiểm bàn phím, accessible name/description, live region và focus hình học; chưa dùng screen reader hoặc người tham gia thật. Không tự ghi PASS cho các công cụ chưa dùng. USER_VALIDATION_PENDING; mobile đã miễn.

F07/F13/F16/F17 còn12finding; F00/F18 và sáu chuỗi cuối vẫn mở. Không đổi bằng chứng baseline cũ, không commit hoặc triển khai production.
