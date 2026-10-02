"""One-time editorial migration of the 2.0 Use Case draft to 2.1.

The existing catalogue, IDs, associations and specific flows are retained. Generic
generator prose is replaced with reviewed, goal-specific descriptions below.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / 'docs/use-cases.md'

# ID | precondition | success condition | input -> output | domain exception
DETAILS = '''
AUTH-REGISTER|Email chưa có User; Guest chưa đăng nhập.|User và CustomerProfile được tạo; email chỉ xác minh sau khi dùng link hợp lệ.|email, mật khẩu, tên → user_id, trạng thái xác minh|Email trùng hoặc link sai/hết hạn/đã dùng: không xác minh; không lộ token qua response.
AUTH-LOGIN|User tồn tại, chưa bị khóa.|Phiên và cặp token hợp lệ được cấp theo User, không gắn một role cố định.|email, mật khẩu → access/refresh token, hồ sơ ngữ cảnh|Sai thông tin hoặc User bị khóa: từ chối và áp dụng rate limit; không tiết lộ email có tồn tại.
AUTH-LOGOUT|User có phiên còn hiệu lực.|Refresh token/phiên tương ứng bị thu hồi; request mới dùng token đó bị từ chối.|refresh token hoặc session_id → xác nhận đăng xuất|Phiên đã thu hồi: trả kết quả an toàn, không khôi phục quyền.
AUTH-RESET|Có yêu cầu đặt lại theo email, chưa cần đăng nhập.|Token một lần được gửi qua mock mailbox; mật khẩu mới chỉ được lưu khi token hợp lệ.|email, token, mật khẩu mới → trạng thái yêu cầu/xác nhận|Email không tồn tại vẫn trả thông điệp như nhau; token sai/hết hạn/đã dùng không đổi mật khẩu.
AUTH-CHANGE|User đăng nhập, mật khẩu cũ hợp lệ.|Mật khẩu hash mới được lưu và các phiên cần thu hồi bị vô hiệu.|mật khẩu cũ, mật khẩu mới → xác nhận đổi|Mật khẩu cũ sai hoặc token hết hiệu lực: giữ mật khẩu cũ.
PROFILE-EDIT|User đăng nhập và chỉ sửa hồ sơ của mình.|Hồ sơ User được cập nhật, không đổi quyền Store.|tên, điện thoại, thuộc tính hồ sơ → hồ sơ mới|Dữ liệu sai hoặc User bị khóa: không cập nhật.
ADDR-MANAGE|Customer đăng nhập và sở hữu Address.|Address được thêm/sửa/xóa hoặc chọn mặc định; snapshot trên Order cũ không đổi.|địa chỉ, address_id, thao tác → danh sách địa chỉ|Address không thuộc Customer hoặc dữ liệu thiếu: từ chối; không sửa Order đã tạo.
CAT-BROWSE|Category công khai và Store/Product đang được phép hiển thị.|Danh sách Category/Product công khai theo bộ lọc được trả.|category_id, trang → danh mục và Product|Category không tồn tại: danh sách rỗng/404 theo contract; không lộ Product ẩn.
SEARCH-QUERY|Người dùng truy cập danh mục công khai.|Trả Product phù hợp từ khóa, có phân trang và giá hiện hành.|query, trang → Product và tổng kết quả|Từ khóa rỗng/quá dài: báo điều kiện nhập; dịch vụ tìm kiếm lỗi: báo lỗi có thể thử lại.
SEARCH-FILTER|Có danh sách tìm kiếm/danh mục và định nghĩa thuộc tính hiện hành.|Trả danh sách sau lọc/sắp xếp, chỉ Product còn hiển thị.|filter theo ProductType, sort, trang → Product|Filter không hợp lệ với ProductType: báo lỗi, không âm thầm bỏ điều kiện.
PROD-DETAIL|Product thuộc Store hoạt động và được công khai.|Hiển thị mô tả, Variant, giá, tồn khả dụng, review và gợi ý hợp lệ.|product_id → thông tin Product/Variant/review|Product bị ẩn/ngừng bán/Store khóa: không hiển thị như hàng có thể mua.
STORE-BROWSE|Store còn công khai.|Hiển thị hồ sơ Store và Product đang bán của Store đó.|store_id, trang → Store và Product|Store khóa/không tồn tại: không hiển thị Product công khai.
CART-ADD|Customer đăng nhập; Variant còn bán.|CartItem của Customer được tạo hoặc tăng số lượng yêu cầu.|variant_id, quantity → CartItem/tổng giỏ tham khảo|Variant hết bán hoặc số lượng sai: không thêm; giá giỏ không được coi là giá chốt.
CART-EDIT|Customer sở hữu CartItem.|Số lượng đổi hoặc CartItem bị xóa trong giỏ của Customer.|cart_item_id, quantity/thao tác → giỏ mới|Item không thuộc Customer hoặc số lượng sai: không thay đổi giỏ.
CART-SELECT|Giỏ của Customer có ít nhất một item.|Các item được chọn và nhóm theo Store cho bước xem giá.|cart_item_ids → nhóm Store/item đã chọn|Danh sách rỗng hoặc có item của Customer khác: từ chối xác nhận.
CHECKOUT-QUOTE|Customer có item đã chọn, Address của mình và phương thức từng Store.|Trả giá/phí/voucher từng Store và tổng tham khảo có hạn; chưa tạo Order.|cart_item_ids, address_id, payment_methods, voucher → quote_id, StoreQuote|Giá/tồn/Store/voucher đổi: trả quote mới hoặc lỗi có mã, chưa giữ lịch sử mua.
CHECKOUT-CONFIRM|Customer xác nhận quote còn hạn với Idempotency-Key hợp lệ.|Tạo nguyên tập Order/Payment riêng Store, snapshot và purchase_group_id; không tạo một phần.|quote_id, cart_item_ids, address_id, payment_methods, voucher, key → OrderBatch|Một SKU/giá/Store không hợp lệ: không tạo Order; retry cùng key trả nhóm cũ, khác payload trả 409.
PAY-SANDBOX|Order SANDBOX của Customer còn AWAITING_PAYMENT và trong hạn.|Payment của Order thành công; Order PENDING sau consume hoặc RECOVERING khi cần phục hồi.|order_id → PaymentAttempt, Payment và trạng thái Order|Callback trùng không thu lặp; Success muộn sau EXPIRED/release tạo Refund, không mở Order.
PAY-COD|Customer chọn COD cho Store trước khi xác nhận giỏ.|Order Store đó có Payment COD và số tiền cần thu riêng; PENDING sau consume.|payment_methods[store_id]=COD → Order/Payment COD|Consume lỗi sau tạo: Order PREPARING, Seller chưa xử lý và worker retry.
ORDER-LIST|Customer đăng nhập.|Chỉ Order của Customer, trạng thái Order/Payment/Refund và tracking được hiển thị.|filter, trang, order_id → danh sách/chi tiết Order|Order thuộc Customer khác: 404; không suy ra Order khác từ purchase_group_id.
ORDER-CANCEL|Customer sở hữu Order ở AWAITING_PAYMENT/PENDING/CONFIRMED.|Chỉ Order được chọn bị CANCELLED; release/hoàn kho và Refund nếu đã trả online.|order_id, expected_version → Order và Refund nếu có|PROCESSING trở đi hoặc version cũ: từ chối; Order khác cùng nhóm giữ nguyên.
REFUND-TRACK|Customer sở hữu Order có Refund.|Trả trạng thái Refund riêng, không đồng nhất với trạng thái Order.|order_id/refund_id → số tiền, trạng thái Refund|Refund không thuộc Customer: 404; chưa có Refund thì hiển thị chưa phát sinh.
VCH-STORE|Owner có membership hiệu lực của Store.|Voucher thuộc Store được tạo/sửa/ngừng hiệu lực theo version.|store_id, điều kiện voucher → voucher/trạng thái|Seller hoặc Owner Store khác bị chặn; số lượt đã dùng không bị sửa ngược.
VCH-PLATFORM|Administrator đang hoạt động.|Voucher toàn sàn được tạo/sửa/ngừng hiệu lực và có audit.|điều kiện voucher sàn → voucher/trạng thái|Actor khác hoặc cấu hình giảm không hợp lệ: từ chối, giữ bản cũ.
VCH-APPLY|Customer xem quote với item và mã voucher hợp lệ.|Giảm Store rồi sàn được phân bổ xuống từng StoreQuote/Order.|mã Store/sàn, item → tiền giảm và payable theo Store|Hết hạn/hết lượt/không đủ minimum: báo mã nào không hợp lệ; không dùng lượt.
VCH-USAGE|Owner xem voucher Store mình hoặc Admin xem voucher sàn.|Trả lượt giữ, đã dùng và giới hạn đúng phạm vi.|voucher_id, filter → số lượt và lịch sử sử dụng|Không đúng phạm vi: 403/404; không lộ Customer ngoài quyền.
REV-BROWSE|Product công khai.|Hiển thị Review VISIBLE và điểm tổng hợp chỉ từ Review VISIBLE.|product_id, trang → Review/rating|Không có Review: hiển thị chưa có đánh giá; Review bị ẩn không tính điểm.
REV-CREATE|Customer sở hữu OrderItem của Order COMPLETED và chưa có Review.|Tạo đúng một Review/OrderItem, điểm 1–5; cập nhật rating suy ra.|order_item_id, điểm, nội dung → Review|Chưa Completed/không sở hữu/đã review: từ chối, không tạo lần hai.
REV-EDIT|Customer sở hữu Review và gửi version hiện hành.|Review được sửa, lịch sử/điểm tổng hợp cập nhật theo trạng thái hiển thị.|review_id, version, điểm/nội dung → Review mới|Version cũ hoặc Review khác chủ: từ chối; review bị ẩn không tự hiện lại.
REV-MODERATE|Admin có quyền kiểm duyệt; Review tồn tại.|Review ẩn/hiện lại có lý do và audit; rating suy ra đổi tương ứng.|review_id, action, reason, version → trạng thái Review|Thiếu lý do/version cũ: không đổi Review hoặc rating.
STORE-APPLY|Customer đăng nhập và chưa có Store membership hoạt động.|StoreApplication PENDING được tạo; chưa có Store/Owner trước khi duyệt.|thông tin Store đề nghị → application_id, trạng thái|Đơn thiếu dữ liệu hoặc đang có đơn PENDING: từ chối; REJECTED có thể nộp đơn mới.
STORE-REVIEW|Admin có quyền; Application PENDING.|APPROVED tạo Store và Owner hoặc REJECTED lưu lý do/audit.|application_id, decision, reason, version → quyết định và Store nếu duyệt|Version cũ hoặc Customer đã có Store hoạt động: không tạo Store thứ hai.
STORE-EDIT|Owner có membership hiệu lực.|Thông tin Store của mình được sửa; Order cũ giữ snapshot.|store_id, version, tên/mô tả/phí → Store mới|Khóa Store hoặc Owner khác: từ chối thay đổi bán mới; không sửa Store khác.
STAFF-INVITE|Owner Store đang hoạt động, email mời hợp lệ.|Lời mời PENDING có hạn, chỉ chứa quyền Seller được phép.|email, quyền, hạn → invitation_id|Email đã thuộc Store active/Owner cấp quyền vượt phạm vi: từ chối.
STAFF-ACCEPT|User đã xác minh email trùng lời mời còn PENDING/hạn.|StoreMembership Seller được tạo và lời mời ACCEPTED.|invitation_id → membership/quyền|Lời mời hết hạn/bị thu hồi hoặc User đã có membership active: từ chối.
STAFF-INBOX|User đã đăng nhập và email xác minh.|Chỉ lời mời gửi đến email của User được hiển thị.|trang → lời mời, Store, quyền, hạn|Email chưa xác minh: không lộ lời mời; lời mời hết hạn không nhận được.
STAFF-LIST|Owner thuộc Store hiện hành.|Danh sách Seller và lời mời của chính Store được hiển thị.|store_id, filter, trang → membership/invitation|Owner Store khác hoặc token cũ sau thu hồi: từ chối.
STAFF-PERMISSIONS|Owner và Seller cùng Store; version hiện hành.|Tập quyền Seller được thay trong giới hạn Owner có thể cấp, có audit.|membership_id, permission_ids, version → quyền mới|Cấp quyền Owner/Admin hoặc version cũ: từ chối, giữ quyền cũ.
STAFF-LOCK|Owner và Seller cùng Store; version hiện hành.|Membership bị khóa/mở; khóa có hiệu lực với request quản trị mới.|membership_id, action, version → trạng thái|Không khóa Owner qua UC này; version cũ/Store khác bị từ chối.
SPROD-LIST|Seller/Owner có membership và quyền đọc Product Store.|Product nháp/đang bán/ngừng bán của đúng Store được trả theo filter.|filter, trang → Product/Variant|Không có quyền/Store khác: 403/404; public list không lộ Product ẩn.
SPROD-CREATE|Seller/Owner có quyền, Store hoạt động, ProductType hợp lệ.|Product nháp với Variant/SKU hợp lệ được tạo; chưa tự công khai nếu thiếu điều kiện.|ProductType, thuộc tính, ảnh, Variant → Product mới|Thuộc tính sai/SKU trùng: không lưu Product bán được một phần.
SPROD-EDIT|Seller/Owner có quyền trên Product Store, version hiện hành.|Thông tin/trạng thái bán mới được lưu; Order cũ giữ snapshot.|product_id, version, trường sửa → Product mới|Bị Admin ẩn, thiếu SKU/giá hoặc version cũ: không ACTIVE.
SPROD-VARIANT|Product thuộc Store và người thao tác có quyền.|Variant có SKU/giá/tổ hợp thuộc tính duy nhất; SKU mặc định khi không có lựa chọn.|product_id, SKU, thuộc tính, giá → Variant|SKU/tổ hợp trùng hoặc giá sai: từ chối, không phá lịch sử OrderItem.
SPROD-IMAGE|Product/Variant thuộc Store và người thao tác có quyền.|Ảnh hợp lệ được gắn/gỡ, ảnh chính sắp thứ tự; Order cũ giữ snapshot.|product_id/variant_id, file, thứ tự → danh sách ảnh|Loại/kích thước file sai hoặc Product khác Store: không nhận upload.
SPROD-HIDE|Seller/Owner có quyền trên Product Store.|Product STOPPED/ngừng bán công khai, Order cũ không đổi.|product_id, version → trạng thái bán|Version cũ hoặc khác Store: từ chối; không gỡ trạng thái ẩn do Admin.
INV-VIEW|Seller/Owner có quyền kho của Store.|Tồn vật lý, đã giữ và khả dụng của Variant được trả.|variant_id/filter, trang → quantity, reserved, available|Store khác: từ chối; số khả dụng không được lưu lệch công thức.
INV-ADJUST|Seller/Owner có quyền kho, Variant thuộc Store.|Tồn được chỉnh có lý do và StockMovement; bất biến không âm vẫn đúng.|variant_id, delta, reason, version → tồn mới/movement|Điều chỉnh làm quantity < reserved hoặc version cũ: từ chối.
INV-HISTORY|Seller/Owner có quyền kho Store.|Lịch sử nhập/xuất/giữ/hoàn kho thuộc Store được trả.|variant_id, thời gian, trang → StockMovement|Variant khác Store: 403/404; không sửa lịch sử.
SORDER-LIST|Seller/Owner có quyền xem Order Store.|Danh sách/chi tiết Order Store kèm trạng thái thanh toán và giao hàng.|filter, trang, order_id → Order/OrderItem|Không thuộc Store: 404; Seller không được xem báo cáo tổng.
SORDER-STATUS|Seller/Owner có quyền; Order ở trạng thái chuyển hợp lệ.|Order chuyển trạng thái với version và lịch sử; COD chỉ Completed khi thu đủ.|order_id, status, version → Order/lịch sử|Version cũ hoặc chuyển trạng thái sai: từ chối, không bỏ qua bước.
SORDER-CANCEL|Seller/Owner có quyền; Order ở PENDING/CONFIRMED.|Order bị hủy có lý do; kho/Refund hoặc nghĩa vụ COD được xử lý riêng.|order_id, reason, version → Order/Refund nếu có|Thiếu lý do, PROCESSING trở đi hoặc version cũ: từ chối.
SORDER-COD|Seller/Owner có quyền; Order COD đã giao.|Ghi thu đủ đúng số tiền Order; Payment COD SUCCEEDED và Order có thể Completed.|order_id, amount, version → CODCollection/Payment|Thu thiếu/trùng hoặc Order khác Store: không ghi SUCCEEDED lần hai.
REP-STORE|Owner thuộc Store.|Báo cáo Store tách doanh thu hàng Completed, tiền đã thu/hoàn và phí.|khoảng thời gian → chỉ số Store|Seller/Owner Store khác không xem được; không cộng Payment toàn nhóm vào mỗi Store.
ADMIN-ACCOUNT|Admin đang hoạt động.|User bị khóa/mở với lý do và audit; khóa chặn request mới.|user_id, action, reason, version → User/trạng thái|Không có lý do/version cũ hoặc tự khóa gây mất quản trị: từ chối.
ADMIN-STORE|Admin đang hoạt động.|Store khóa/mở có audit; hàng công khai bị ẩn khi khóa, Order cũ vẫn xử lý.|store_id, action, reason, version → Store/trạng thái|Thiếu lý do/version cũ: không đổi Store.
ADMIN-TAX|Admin có quyền taxonomy.|Category/ProductType/AttributeDefinition được tạo/sửa/ngừng dùng mà không phá Product cũ.|entity_id, định nghĩa/giới hạn → taxonomy mới|Định nghĩa xung đột Product đang dùng: từ chối xóa phá dữ liệu.
ADMIN-RBAC|Admin có quyền quản trị Role/Permission.|Quyền hệ thống được cập nhật có version và audit; membership Store vẫn giới hạn scope.|role_id, permission_ids, version → Role/quyền|Không cho cấp Owner/Admin qua lời mời Seller; version cũ giữ bản cũ.
ADMIN-PRODUCT|Admin có quyền kiểm duyệt Product.|Product HIDDEN/VISIBLE có lý do/audit; bỏ ẩn không tự chuyển sale status sang ACTIVE.|product_id, action, reason, version → moderation_status|Thiếu lý do hoặc version cũ: không thay đổi khả năng hiển thị.
ADMIN-MONITOR|Admin có quyền giám sát toàn sàn.|Dashboard/Order toàn sàn được trả, tách giá trị đơn, doanh thu, thu và hoàn.|khoảng thời gian, filter, trang → chỉ số/Order|Dữ liệu chưa đối soát hiển thị trạng thái; actor khác không xem toàn sàn.
CHAT-TALK|Guest/Customer gửi câu hỏi trong phiên hợp lệ.|Trả câu trả lời grounded và card Product đã xác minh hiện hành.|session_id, câu hỏi → message, card Product|Thiếu context/LLM lỗi: hỏi thêm hoặc fallback; không bịa giá hay Product.
CHAT-HISTORY|Customer đăng nhập và sở hữu ChatSession.|Lịch sử phiên/message của Customer được trả theo trang.|filter, trang, session_id → chat/message|Session người khác hoặc Guest key không khớp: 404.
REC-FOR-YOU|Customer đăng nhập; trạng thái consent được xác định.|Có consent: trả gợi ý cá nhân còn bán; thiếu consent: chỉ gợi ý chung.|user context, trang → Product gợi ý, nguồn model/fallback|Model lỗi/cold-start: baseline rồi bán chạy/mới; Product ẩn bị loại.
REC-RELATED|Product nguồn công khai.|Trả Product liên quan còn bán theo loại/danh mục/giá/Store.|product_id, trang → Product liên quan|Product nguồn/ứng viên ẩn hoặc Store khóa: không hiển thị.
AIMON-VIEW|Admin có quyền giám sát AI.|Trả tình trạng index, training run, model và metric/log đã khử PII.|filter, khoảng thời gian → trạng thái/metric|Thiếu dữ liệu đánh giá: ghi chưa thực thi, không hiển thị PASS giả.
'''

# Only the 31 sections whose main flow was generated as generic CRUD prose.
FLOWS = '''
AUTH-LOGOUT|User chọn đăng xuất ở phiên hiện tại.|Hệ thống xác định phiên/refresh token tương ứng.|Hệ thống thu hồi phiên và refresh token.|Giao diện xóa token cục bộ, chuyển về trạng thái chưa đăng nhập.
PROFILE-EDIT|User mở hồ sơ của mình và nhập trường muốn sửa.|Hệ thống xác minh User còn hoạt động và kiểm tra định dạng.|Hồ sơ được cập nhật mà không đổi role/membership.|Giao diện hiển thị dữ liệu mới.
ADDR-MANAGE|Customer mở danh sách địa chỉ của mình.|Customer thêm/sửa/xóa hoặc chọn địa chỉ mặc định.|Hệ thống kiểm tra quyền sở hữu và dữ liệu địa chỉ.|Danh sách địa chỉ cập nhật; Order cũ vẫn giữ địa chỉ snapshot.
CAT-BROWSE|Guest/Customer chọn Category hoặc ProductType.|Hệ thống lấy cây danh mục và Product công khai phù hợp.|Hệ thống phân trang, chỉ giữ Product/Store còn hiển thị.|Người dùng thấy danh sách và có thể mở Product.
SEARCH-QUERY|Người dùng nhập từ khóa tìm sản phẩm.|Hệ thống chuẩn hóa từ khóa và tìm Product công khai.|Kết quả được sắp xếp và phân trang cùng giá hiện hành.|Người dùng mở Product từ kết quả.
SEARCH-FILTER|Người dùng chọn bộ lọc và cách sắp xếp.|Hệ thống lấy định nghĩa thuộc tính của ProductType liên quan.|Hệ thống áp điều kiện lên Product công khai, phân trang kết quả.|Giao diện giữ bộ lọc và hiển thị danh sách mới.
PROD-DETAIL|Người dùng mở một Product từ danh mục, tìm kiếm hoặc gợi ý.|Hệ thống kiểm tra Store/Product còn công khai.|Hệ thống lấy Variant, giá/tồn, ảnh và Review VISIBLE.|Trang chi tiết hiển thị lựa chọn mua và gợi ý liên quan hợp lệ.
STORE-BROWSE|Người dùng mở gian hàng công khai.|Hệ thống kiểm tra Store ACTIVE.|Hệ thống lấy hồ sơ Store và Product ACTIVE/VISIBLE của Store.|Giao diện phân trang danh sách sản phẩm.
CART-ADD|Customer chọn Variant và số lượng ở trang Product.|Hệ thống kiểm tra Variant/Store còn bán và số lượng hợp lệ.|CartItem của Customer được tạo hoặc cộng số lượng.|Giao diện hiển thị giỏ mới; giá sẽ được tính lại khi xác nhận.
CART-EDIT|Customer mở giỏ và chọn CartItem của mình.|Customer đổi số lượng hoặc xóa item.|Hệ thống kiểm tra quyền sở hữu và lưu thay đổi giỏ.|Giao diện hiển thị giỏ mới theo Store.
CART-SELECT|Customer đánh dấu CartItem muốn mua ở một hoặc nhiều Store.|Hệ thống kiểm tra các item thuộc giỏ của Customer.|Hệ thống nhóm item theo Store, giữ số lượng đã chọn.|Customer tiếp tục sang bước xem giá.
CHECKOUT-QUOTE|Customer chọn item, một địa chỉ và phương thức cho từng Store.|Hệ thống kiểm tra giá Variant, tồn, Store, voucher và phí mới nhất.|Hệ thống tính giảm Store rồi sàn, phân bổ sàn xuống Store.|Customer thấy StoreQuote, tổng tham khảo và hạn quote trước khi xác nhận.
ORDER-LIST|Customer mở danh sách đơn của mình.|Hệ thống lọc Order theo customer_user_id, trạng thái và trang.|Customer chọn Order để xem item snapshot, Payment, Refund và tracking.|Giao diện có thể nhóm các Order bằng purchase_group_id nhưng không gộp trạng thái.
REFUND-TRACK|Customer mở Order đã hủy có phát sinh Refund.|Hệ thống kiểm tra Order thuộc Customer và tìm Refund của Order.|Hệ thống trả số tiền đã yêu cầu, trạng thái và thời điểm cập nhật.|Giao diện không ghi đã hoàn thành nếu Refund còn PROCESSING/FAILED.
VCH-USAGE|Owner/Admin chọn voucher trong phạm vi quyền.|Hệ thống kiểm tra Store scope hoặc quyền toàn sàn.|Hệ thống tính lượt giữ, đã dùng và các lần redemption.|Giao diện hiển thị số lượt còn dùng, không lộ dữ liệu ngoài phạm vi.
REV-BROWSE|Người dùng mở phần đánh giá Product.|Hệ thống lấy Review VISIBLE theo trang.|Hệ thống tính điểm trung bình/số lượng từ Review VISIBLE.|Giao diện hiển thị điểm và nội dung, hoặc trạng thái chưa có đánh giá.
REV-EDIT|Customer mở Review của OrderItem đã đánh giá.|Customer sửa điểm/nội dung và gửi version hiện hành.|Hệ thống kiểm tra chủ sở hữu, version và điểm 1–5.|Review mới được lưu; rating suy ra cập nhật nếu Review đang VISIBLE.
STORE-EDIT|Owner mở hồ sơ Store của mình.|Owner sửa tên, mô tả, phí hoặc thông tin được phép.|Hệ thống kiểm tra membership/version và lưu Store mới.|Giao diện hiện dữ liệu mới; Order cũ giữ snapshot.
SPROD-IMAGE|Seller/Owner chọn Product/Variant của Store.|Người dùng tải ảnh hoặc đổi ảnh chính/thứ tự.|Hệ thống kiểm tra quyền, loại, kích thước và tên file.|Danh sách ảnh cập nhật; ảnh Order cũ không bị thay đổi.
INV-VIEW|Seller/Owner mở tồn kho Store.|Hệ thống lọc Inventory theo Variant của Store.|Hệ thống tính available = quantity − reserved_quantity.|Giao diện hiển thị tồn vật lý, đã giữ và còn bán.
INV-HISTORY|Seller/Owner chọn Variant hoặc khoảng thời gian.|Hệ thống kiểm tra Variant thuộc Store.|Hệ thống trả StockMovement theo thời gian và trang.|Người dùng đối chiếu thao tác, lý do và Order liên quan nếu có.
SORDER-LIST|Seller/Owner mở danh sách Order của Store.|Hệ thống lọc theo store_id của membership hiệu lực.|Người dùng chọn Order để xem item snapshot, giao hàng và Payment.|Giao diện hiển thị thao tác trạng thái được phép cho Order đó.
REP-STORE|Owner chọn khoảng thời gian báo cáo.|Hệ thống lọc Order của đúng Store.|Hệ thống tính riêng doanh thu hàng Completed, tiền đã thu, hoàn và phí.|Dashboard hiển thị từng chỉ số, không cộng Payment của Store khác.
ADMIN-ACCOUNT|Admin chọn User và hành động khóa/mở.|Admin nhập lý do, gửi version đang xem.|Hệ thống kiểm tra quyền, cập nhật trạng thái và ghi audit.|Request mới của User bị khóa không còn quyền truy cập.
ADMIN-STORE|Admin chọn Store và hành động khóa/mở.|Admin nhập lý do, gửi version đang xem.|Hệ thống lưu trạng thái và audit; cập nhật hiển thị Product công khai.|Order cũ vẫn được xử lý theo quyền vận hành hiện hành.
ADMIN-TAX|Admin chọn Category, ProductType hoặc AttributeDefinition.|Admin nhập kiểu, giới hạn, giá trị, đơn vị hoặc cấu hình mới.|Hệ thống kiểm tra ảnh hưởng đến Product đang dùng và lưu version.|Danh mục/định nghĩa mới được dùng cho Product tiếp theo.
ADMIN-RBAC|Admin chọn Role và tập Permission.|Hệ thống kiểm tra phiên bản và giới hạn quyền.|Hệ thống cập nhật gán quyền, ghi audit và làm mới quyền hiệu lực.|Request tiếp theo áp dụng quyền mới.
ADMIN-MONITOR|Admin chọn dashboard hoặc bộ lọc Order toàn sàn.|Hệ thống lấy số liệu và Order theo khoảng thời gian/trạng thái.|Hệ thống tách giá trị đơn, doanh thu, tiền thu và tiền hoàn.|Admin xem chi tiết để đối soát, không sửa Order tại màn giám sát.
CHAT-HISTORY|Customer mở danh sách phiên chat của mình.|Hệ thống lọc ChatSession theo user_id hiện hành.|Customer chọn phiên để xem các message theo thứ tự.|Giao diện chỉ hiển thị lịch sử của mình.
REC-RELATED|Người dùng mở mục sản phẩm liên quan trên trang Product.|Hệ thống chọn ứng viên cùng loại/danh mục/giá/Store.|Hệ thống kiểm tra lại Product và Store còn bán.|Giao diện hiển thị danh sách hợp lệ hoặc trạng thái rỗng.
AIMON-VIEW|Admin mở dashboard AI.|Hệ thống lấy tình trạng index, training run, model đang phục vụ và lỗi.|Hệ thống trả metric đã có kèm version/dataset, khử PII trong log.|Mục chưa được chạy hiển thị chưa thực thi.
'''

def parse_table(raw, columns):
    result = {}
    for line in raw.strip().splitlines():
        cells = line.split('|')
        if len(cells) != columns:
            raise ValueError((len(cells), line))
        key = 'UC-' + cells[0]
        if key in result:
            raise ValueError(key)
        result[key] = cells[1:]
    return result

details = parse_table(DETAILS, 5)
flows = parse_table(FLOWS, 5)
source = PATH.read_text(encoding='utf-8')
if not source.startswith('# Đặc tả Use Case 2.0 Draft'):
    raise SystemExit('Expected untouched 2.0 source; refusing to overwrite')
prefix, *sections = re.split(r'(?=^<a id="uc-[^"]+"></a>\n### UC-)', source, flags=re.M)
if len(sections) != 64 or set(details) != {re.search(r'### (UC-[A-Z0-9-]+)', s).group(1) for s in sections}:
    raise SystemExit('UC catalogue differs from editorial mapping')
prefix = prefix.replace('# Đặc tả Use Case 2.0 Draft', '# Đặc tả Use Case 2.1 Draft', 1)
prefix += '\n## Sơ đồ Use Case\n\n![Use Case tổng quan](diagrams/use-case/00-overview.svg)\n\nCác sơ đồ nhóm được đặt ngay trước đặc tả đầu tiên của nhóm. Mỗi hình giữ [mã nguồn PlantUML](diagrams/use-case/) để chỉnh sửa.\n\n'
first_by_group = {
    'UC-AUTH-REGISTER': '01-auth-profile', 'UC-CAT-BROWSE': '02-discovery',
    'UC-CART-ADD': '03-cart-checkout', 'UC-ORDER-LIST': '04-payment-customer-order',
    'UC-VCH-STORE': '05-voucher', 'UC-REV-BROWSE': '06-review',
    'UC-STORE-APPLY': '07-store-staff', 'UC-SPROD-LIST': '08-product-management',
    'UC-INV-VIEW': '09-inventory', 'UC-SORDER-LIST': '10-store-orders-report',
    'UC-ADMIN-ACCOUNT': '11-platform-admin', 'UC-CHAT-TALK': '12-ai',
}
out = [prefix]
for section in sections:
    id_ = re.search(r'### (UC-[A-Z0-9-]+)', section).group(1)
    title = re.search(r'^### UC-[A-Z0-9-]+ — (.*)$', section, re.M).group(1)
    actor_line = re.search(r'^- \*\*Actor chính:\*\*.*$', section, re.M).group(0)
    old_meta = re.search(r'^- \*\*Dữ liệu vào/ra:\*\*.*$', section, re.M).group(0)
    refs = old_meta[old_meta.index('**Yêu cầu:**'):]
    main = re.search(r'Luồng chính:\n\n((?:\d+\. .*\n)+)', section).group(1)
    if id_ in flows:
        if 'mở chức năng' not in main:
            raise ValueError(f'Expected generic flow: {id_}')
        main = ''.join(f'{i}. {v}\n' for i,v in enumerate(flows[id_], 1))
    pre, success, io, error = details[id_]
    trigger = re.sub(r'^1\. ', '', main.splitlines()[0]).rstrip('.')
    actor = re.search(r'Actor chính:\*\* ([^.]+)', actor_line).group(1)
    access = ('không cần đăng nhập' if actor.startswith('Guest') or actor == 'Guest/Customer' else 'kiểm tra User và quyền hiệu lực trong phạm vi thao tác')
    failure = 'Không ghi thay đổi nghiệp vụ của UC này; trả lỗi có mã và giữ dữ liệu đã chốt trước đó.'
    if id_ in ('UC-PAY-SANDBOX','UC-CHECKOUT-CONFIRM','UC-PAY-COD','UC-ORDER-CANCEL','UC-SORDER-CANCEL'):
        failure = 'Giữ trạng thái/operation ID để retry hoặc đối soát đúng Order; không tạo đơn, thu tiền hay hoàn tiền lặp.'
    lines = [section.split('Luồng chính:')[0].split('\n- **Actor chính:**')[0]]
    if id_ in first_by_group:
        group = first_by_group[id_]
        out.append(f'### Sơ đồ nhóm {group}\n\n![Use Case {group}](diagrams/use-case/{group}.svg)\n\n')
    lines += [actor_line, f'- **Mục tiêu:** {title}. **Trigger:** {trigger}.',
              f'- **Tiền điều kiện:** {pre} **Quyền:** {access}.',
              f'- **Hậu điều kiện thành công:** {success} **Bảo đảm khi thất bại:** {failure}',
              f'- **Dữ liệu vào/ra:** {io}. {refs}', '', 'Luồng chính:', '', main.rstrip(), '',
              'Luồng thay thế/ngoại lệ:', '',
              f'- Tại bước 1–2, actor mất quyền, User/Store bị khóa hoặc đối tượng không thuộc phạm vi: trả 403/404; không tiết lộ dữ liệu khác phạm vi.',
              f'- Tại bước 2–{len(main.splitlines())}, {error}', '']
    out.append('\n'.join(lines))
PATH.write_text(''.join(out), encoding='utf-8')
print(f'Rewrote {len(sections)} UC sections, {len(flows)} generic main flows')
