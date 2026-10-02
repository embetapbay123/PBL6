# Luồng giao diện và danh mục màn hình 2.1 Draft

Mã màn hình dưới đây dùng để đối chiếu với [Use Case](use-cases.md) và [API](api-spec.md). Web/Mobile chia sẻ nghiệp vụ Customer; Portal dùng quyền Store/Admin hiện hành. Đây là thiết kế màn hình, chưa phải bằng chứng UI đã triển khai.

| Kênh | Màn hình | Hành động và trạng thái cần thể hiện |
| --- | --- | --- |
| Client Web/Mobile | Trang chủ, danh mục, tìm kiếm, Product, Store | Filter thuộc tính động, Variant/SKU/giá hiện hành, Review, gợi ý, empty/không bán/Store khóa |
| Client Web/Mobile | Đăng ký, đăng nhập, quên/đổi mật khẩu, hồ sơ, địa chỉ | Xác minh email đăng ký và reset bằng mã/link một lần từ mock mailbox demo; change cần mật khẩu cũ; vai trò và Store context, lỗi xác thực, địa chỉ mặc định |
| Client Web/Mobile | Giỏ, quote và tạo Order | Item nhóm theo Store; quote từng Store; voucher Store + toàn sàn; một địa chỉ, phương thức SANDBOX/COD theo Store; PRICE_CHANGED cần xác nhận lại; tạo một Order/Store |
| Client Web/Mobile | Thanh toán từng Order | Hiển thị Order AWAITING_PAYMENT, hạn trả và nút thanh toán riêng; Order khác có thể COD/đã trả; refresh tra cứu Order ID, không tạo Attempt mới khi đang RECOVERING |
| Client Web/Mobile | Đơn, tracking, Refund | Danh sách từng Order với Store và purchase_group_id để nhóm giao diện; trạng thái Order/Payment/Refund riêng; nút hủy ở AWAITING_PAYMENT/PENDING/CONFIRMED |
| Client Web/Mobile | Review | Chỉ OrderItem Completed mới hiện nút đánh giá; một Review/item; sửa Review; trạng thái bị ẩn được báo cho chủ sở hữu |
| Client Web/Mobile | Chat và Dành cho bạn | LLM loading/fallback, card Product hiện hành, lịch sử Customer, cold-start recommendation |
| Client Web | Đăng ký Store | Gửi đơn, xem PENDING/APPROVED/REJECTED và lý do; nộp lại sau REJECTED |
| Client Web | Lời mời Store của tôi | Danh sách lời mời theo email đã xác minh: Store, tập quyền, thời hạn, PENDING/ACCEPTED/REVOKED/EXPIRED; chỉ PENDING còn hạn mới có nút chấp nhận |
| Seller Portal | Dashboard công việc, danh sách Product (cả nháp/ngừng bán), Variant, ảnh, kho, Order | Đăng bán DRAFT/bật lại STOPPED khi SKU/giá/Store hợp lệ; hiện lý do bị Admin ẩn nhưng không có nút gỡ ẩn; quyền theo membership, lỗi Store khóa khi bán mới; sandbox Completed khi Seller/Owner xác nhận giao |
| Owner Portal | Store, nhân viên, voucher, báo cáo | Xem Seller/lời mời, mời/thu hồi lời mời PENDING, khóa/mở và cập nhật tập quyền cho phép, voucher Store, metric riêng tiền hàng/thu/hoàn/phí |
| Admin Portal | Đơn mở Store, Users/Stores, taxonomy, roles, Product/Review, voucher, dashboard, AI | Duyệt/từ chối có lý do, ẩn/bỏ ẩn Product và Review có audit, voucher toàn sàn, giám sát lỗi/recovery |

Mọi danh sách có loading, empty, lỗi và pagination. Request tạo nhóm Order bắt buộc Idempotency-Key; khi 409 hiển thị trạng thái mới và cho tải lại, không âm thầm ghi đè. Web và Mobile dùng cùng API/quy tắc; Mobile không có màn Seller/Admin.

## Luồng Customer Web/Mobile

| Mã màn | Từ màn → hành động → kết quả | UC | Trạng thái cần thể hiện |
| --- | --- | --- | --- |
| C01 Khám phá | Trang chủ/danh mục → tìm/lọc → Product → chọn Variant | UC-CAT-BROWSE, UC-SEARCH-QUERY/FILTER, UC-PROD-DETAIL | Rỗng, bộ lọc sai, Product/Store ngừng bán, giá/tồn mới |
| C02 Tài khoản | Đăng ký → mock mailbox xác minh → đăng nhập; quên mật khẩu → link một lần → mật khẩu mới | UC-AUTH-REGISTER/LOGIN/RESET | Email đã dùng, token hết hạn/đã dùng, rate limit, User khóa |
| C03 Giỏ | Product → thêm Variant → giỏ nhóm Store → chọn item | UC-CART-ADD/EDIT/SELECT | Item hết bán, số lượng không hợp lệ, giỏ rỗng |
| C04 Xem giá | Giỏ → địa chỉ → phương thức từng Store → voucher → StoreQuote | UC-CHECKOUT-QUOTE, UC-VCH-APPLY | Loading khi tính, mã không hợp lệ, giá/tồn/fee đổi, quote hết hạn |
| C05 Xác nhận | Xem giá → xác nhận một lần → danh sách Order theo Store | UC-CHECKOUT-CONFIRM | Nút chống bấm lặp; lỗi mạng tra cứu nhóm Order bằng key, không gửi payload mới với cùng key |
| C06 Thanh toán | Chi tiết Order SANDBOX → tạo attempt → gateway → tra cứu Order/Payment | UC-PAY-SANDBOX | AWAITING_PAYMENT có hạn, PENDING, RECOVERING, FAILED, EXPIRED và Refund muộn |
| C07 Đơn hàng | Danh sách → Order A/B riêng → tracking → hủy A nếu hợp lệ | UC-ORDER-LIST/CANCEL, UC-REFUND-TRACK | Order/Payment/Refund tách nhãn; B không đổi khi A hủy; 409 version cũ |
| C08 Đánh giá | Order Completed → OrderItem → viết/sửa Review → trang Product | UC-REV-CREATE/EDIT/BROWSE | Chưa đủ điều kiện, đã đánh giá, Review bị Admin ẩn |
| C09 Store | Hồ sơ Customer → nộp đơn → xem PENDING/REJECTED/APPROVED; inbox lời mời | UC-STORE-APPLY, UC-STAFF-INBOX/ACCEPT | Email chưa xác minh, đơn/lời mời hết hạn, đã có membership active |
| C10 AI | Product/chat → card đã xác minh → trang Product; Dành cho bạn và đã xem gần đây | UC-CHAT-TALK/HISTORY, UC-REC-FOR-YOU/RELATED | LLM lỗi/thiếu context, Product ẩn, chưa consent thì đã xem gần đây rỗng, cold-start/fallback |

Màn C04 chỉ hiển thị **tổng tham khảo** và tiền từng Store, không hiển thị một Payment chung. Sau C05, Customer có thể xử lý C06 của một Order mà các Order khác chưa thanh toán hoặc đang COD. Refresh C05/C06 phải đọc trạng thái server, không suy đoán từ lần bấm trước.

## Portal Store và Admin

| Mã màn | Ai thấy | Mục tiêu | UC/điều kiện lỗi |
| --- | --- | --- | --- |
| S01 Product/Variant/ảnh | Seller/Owner có quyền Product | Danh sách cả DRAFT/STOPPED, tạo/sửa/đăng bán, SKU mặc định | UC-SPROD-*; báo thiếu SKU/giá hoặc Product bị Admin ẩn |
| S02 Kho | Seller/Owner có quyền kho | Xem quantity/reserved/available, điều chỉnh có lý do, xem movement | UC-INV-*; từ chối quantity mới nhỏ hơn reserved |
| S03 Đơn Store | Seller/Owner có quyền Order | Xem Order Store, chuyển trạng thái, giao/thu COD, hủy có lý do | UC-SORDER-*; 409 version cũ, không cho COD Completed khi chưa thu đủ |
| S04 Quản lý Store | Owner | Sửa Store, mời/thu hồi lời mời, khóa/cấp quyền Seller | UC-STORE-EDIT, UC-STAFF-*; không cấp Owner/Admin |
| S05 Ưu đãi/báo cáo | Owner | Voucher Store; doanh thu hàng, tiền thu/hoàn/phí và metric recommendation của Store | UC-VCH-STORE/USAGE, UC-REP-STORE, UC-AIMON-VIEW; Seller không thấy, metric chưa chạy ghi chưa thực thi |
| A01 Duyệt và khóa | Administrator | Duyệt Store, khóa User/Store, ghi lý do và audit | UC-STORE-REVIEW, UC-ADMIN-ACCOUNT/STORE; version cũ |
| A02 Taxonomy/kiểm duyệt | Administrator | Category/ProductType/Attribute; Product/Review ẩn/hiện | UC-ADMIN-TAX/PRODUCT, UC-REV-MODERATE; không xóa phá lịch sử |
| A03 Toàn sàn và AI | Administrator | Voucher sàn, đơn/dashboard, log/index/model | UC-VCH-PLATFORM, UC-ADMIN-MONITOR, UC-AIMON-VIEW; số liệu AI chưa chạy hiển thị chưa thực thi |

Mọi màn Portal phải lấy Store context từ membership hiệu lực, không tin `store_id` ở client. Khóa Store chặn đăng bán mới nhưng S03 vẫn cho vận hành Order cũ theo quyền. Khi quyền Seller bị thu hồi, menu và dữ liệu tải lại, API mới phải bị chặn dù token còn hạn. Mỗi màn danh sách có phân trang và bộ lọc; mỗi thao tác ghi có phản hồi thành công, validation, 403/404 và 409 rõ ràng.
