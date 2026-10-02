"""Generate editable Mermaid ERDs and the matching 2.0 data dictionary.

Each field is specified once below. --force is required to replace authored output.
"""
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'
DIR=OUT/'diagrams'/'erd'

# field syntax: name:type:flags. Flags: PK, FK (inside DB), REF (other service), UQ, ? (nullable).
GROUPS={
 '01-identity-access':('M3',{
  'User':'id:uuid:PK email:varchar:UQ email_verified_at:timestamptz:? password_hash:varchar: status:varchar: created_at:timestamptz: version:int:',
  'CustomerProfile':'id:uuid:PK user_id:uuid:FK display_name:varchar: phone:varchar:? updated_at:timestamptz:',
  'Address':'id:uuid:PK customer_user_id:uuid:FK recipient_name:varchar: phone:varchar: line1:varchar: ward:varchar: district:varchar: city:varchar: is_default:boolean: status:varchar:',
  'Role':'id:uuid:PK code:varchar:UQ scope:varchar: status:varchar:',
  'Permission':'id:uuid:PK code:varchar:UQ resource:varchar: action:varchar:',
  'RolePermission':'role_id:uuid:FK,PK permission_id:uuid:FK,PK',
  'UserRole':'user_id:uuid:FK,PK role_id:uuid:FK,PK granted_at:timestamptz:',
  'RefreshSession':'id:uuid:PK user_id:uuid:FK token_hash:varchar: expires_at:timestamptz: revoked_at:timestamptz:?',
  'OneTimeToken':'id:uuid:PK user_id:uuid:FK purpose:varchar: token_hash:varchar: expires_at:timestamptz: consumed_at:timestamptz:? created_at:timestamptz:',
  'M3Audit':'id:uuid:PK actor_user_id:uuid:FK,? target_type:varchar: target_id:uuid: action:varchar: reason:text:? request_id:varchar: before_json:jsonb:? after_json:jsonb:? created_at:timestamptz:',
 },['User ||--o| CustomerProfile','User ||--o{ Address','User ||--o{ RefreshSession','User ||--o{ OneTimeToken','User ||--o{ UserRole','Role ||--o{ UserRole','Role ||--o{ RolePermission','Permission ||--o{ RolePermission']),
 '02-store-membership':('M3',{
  'StoreApplication':'id:uuid:PK applicant_user_id:uuid:FK proposed_name:varchar: contact:varchar: status:varchar: decision_reason:text:? decided_by_user_id:uuid:FK,? submitted_at:timestamptz: decided_at:timestamptz:? version:int:',
  'Store':'id:uuid:PK application_id:uuid:FK name:varchar: slug:varchar:UQ description:text:? logo_url:varchar:? contact:varchar: shipping_fee_vnd:bigint: status:varchar: version:int:',
  'StoreMembership':'id:uuid:PK store_id:uuid:FK user_id:uuid:FK role:varchar: status:varchar: joined_at:timestamptz: version:int:',
  'StaffInvitation':'id:uuid:PK store_id:uuid:FK invited_email:varchar: invited_user_id:uuid:FK,? invited_by_user_id:uuid:FK status:varchar: token_hash:varchar: expires_at:timestamptz: version:int:',
  'MembershipPermission':'membership_id:uuid:FK,PK permission_id:uuid:FK,PK granted_at:timestamptz: version:int:',
 },['User ||--o{ StoreApplication','StoreApplication ||--o| Store','Store ||--o{ StoreMembership','User ||--o{ StoreMembership','Store ||--o{ StaffInvitation','StoreMembership ||--o{ MembershipPermission','Permission ||--o{ MembershipPermission']),
 '03-catalog-review':('M1',{
  'Category':'id:uuid:PK parent_id:uuid:FK,? name:varchar: slug:varchar:UQ status:varchar:',
  'ProductType':'id:uuid:PK category_id:uuid:FK name:varchar: status:varchar:',
  'AttributeDefinition':'id:uuid:PK product_type_id:uuid:FK code:varchar: name:varchar: data_type:varchar: required:boolean: variant_factor:boolean: allowed_values:jsonb:? unit:varchar:?',
  'Product':'id:uuid:PK store_id:uuid:REF product_type_id:uuid:FK title:varchar: description:text:? attributes_json:jsonb: status:varchar: moderation_status:varchar: version:int:',
  'ProductVariant':'id:uuid:PK product_id:uuid:FK store_id:uuid:REF sku:varchar: price_vnd:bigint: variant_values_json:jsonb: variant_signature:varchar: is_default:boolean: status:varchar:',
  'ProductImage':'id:uuid:PK product_id:uuid:FK variant_id:uuid:FK,? url:varchar: position:int: status:varchar:',
  'Review':'id:uuid:PK product_id:uuid:FK order_item_id:uuid:REF customer_user_id:uuid:REF rating:int: body:text:? status:varchar: hidden_reason:text:? created_at:timestamptz: updated_at:timestamptz: version:int:',
  'ReviewAudit':'id:uuid:PK review_id:uuid:FK actor_user_id:uuid:REF action:varchar: reason:text:? created_at:timestamptz:',
  'M1Audit':'id:uuid:PK actor_user_id:uuid:REF target_type:varchar: target_id:uuid: action:varchar: reason:text:? request_id:varchar: before_json:jsonb:? after_json:jsonb:? created_at:timestamptz:',
 },['Category ||--o{ ProductType','ProductType ||--o{ AttributeDefinition','ProductType ||--o{ Product','Product ||--o{ ProductVariant','Product ||--o{ ProductImage','ProductVariant ||--o{ ProductImage','Product ||--o{ Review','Review ||--o{ ReviewAudit']),
 '04-inventory':('M1',{
  'Inventory':'id:uuid:PK variant_id:uuid:FK store_id:uuid:REF quantity:int: reserved_quantity:int: version:int:',
  'InventoryReservation':'id:uuid:PK order_id:uuid:REF purchase_group_id:uuid: status:varchar: expires_at:timestamptz: created_at:timestamptz:',
  'ReservationItem':'id:uuid:PK reservation_id:uuid:FK inventory_id:uuid:FK quantity:int: status:varchar:',
  'StockMovement':'id:uuid:PK inventory_id:uuid:FK reservation_item_id:uuid:FK,? order_id:uuid:REF,? operation_id:uuid:UQ delta_quantity:int: delta_reserved:int: reason:varchar: actor_user_id:uuid:REF created_at:timestamptz:',
 },['ProductVariant ||--|| Inventory','InventoryReservation ||--|{ ReservationItem','Inventory ||--o{ ReservationItem','Inventory ||--o{ StockMovement','ReservationItem ||--o{ StockMovement']),
 '05-cart-checkout':('M2',{
  'Cart':'id:uuid:PK customer_user_id:uuid:REF updated_at:timestamptz:',
  'CartItem':'id:uuid:PK cart_id:uuid:FK variant_id:uuid:REF store_id:uuid:REF quantity:int: added_at:timestamptz:',
  'IdempotencyRecord':'id:uuid:PK customer_user_id:uuid:REF key:varchar: payload_hash:varchar: purchase_group_id:uuid: response_json:jsonb:? expires_at:timestamptz:',
 },['Cart ||--o{ CartItem']),
 '06-order-shipping':('M2',{
  'Order':'id:uuid:PK purchase_group_id:uuid: customer_user_id:uuid:REF store_id:uuid:REF address_snapshot:jsonb: status:varchar: payment_method:varchar: payment_expires_at:timestamptz:? goods_vnd:bigint: store_discount_vnd:bigint: platform_discount_vnd:bigint: shipping_vnd:bigint: payable_vnd:bigint: version:int: created_at:timestamptz:',
  'OrderItem':'id:uuid:PK order_id:uuid:FK product_id:uuid:REF variant_id:uuid:REF product_snapshot:jsonb: sku_snapshot:varchar: unit_price_vnd:bigint: quantity:int: line_total_vnd:bigint:',
  'OrderStatusHistory':'id:uuid:PK order_id:uuid:FK from_status:varchar:? to_status:varchar: actor_user_id:uuid:REF reason:text:? operation_id:uuid:UQ created_at:timestamptz:',
  'Shipment':'id:uuid:PK order_id:uuid:FK status:varchar: tracking_code:varchar:? shipped_at:timestamptz:? delivered_at:timestamptz:?',
 },['Order ||--|{ OrderItem','Order ||--o{ OrderStatusHistory','Order ||--o| Shipment']),
 '07-payment-voucher':('M2',{
  'Payment':'id:uuid:PK order_id:uuid:FK,UQ method:varchar: status:varchar: payable_vnd:bigint: collectible_vnd:bigint: collected_vnd:bigint: refunded_vnd:bigint: version:int:',
  'PaymentAttempt':'id:uuid:PK payment_id:uuid:FK provider_reference:varchar:UQ status:varchar: amount_vnd:bigint: created_at:timestamptz:',
  'PaymentEvent':'id:uuid:PK attempt_id:uuid:FK provider_event_id:varchar:UQ event_type:varchar: payload_hash:varchar: received_at:timestamptz:',
  'Refund':'id:uuid:PK payment_id:uuid:FK order_id:uuid:FK amount_vnd:bigint: status:varchar: operation_id:uuid:UQ created_at:timestamptz:',
  'CODCollection':'id:uuid:PK order_id:uuid:FK amount_due_vnd:bigint: amount_collected_vnd:bigint: status:varchar: operation_id:uuid:UQ collected_at:timestamptz:?',
  'Voucher':'id:uuid:PK code:varchar:UQ scope:varchar: store_id:uuid:REF,? owner_user_id:uuid:REF discount_type:varchar: discount_value:bigint: max_discount_vnd:bigint:? min_goods_vnd:bigint: starts_at:timestamptz: ends_at:timestamptz: usage_limit:int: per_customer_limit:int: status:varchar: version:int:',
  'VoucherReservation':'id:uuid:PK voucher_id:uuid:FK purchase_group_id:uuid: customer_user_id:uuid:REF store_id:uuid:REF,? status:varchar: discount_vnd:bigint: expires_at:timestamptz:',
  'VoucherRedemption':'id:uuid:PK voucher_id:uuid:FK purchase_group_id:uuid: order_id:uuid:FK customer_user_id:uuid:REF discount_vnd:bigint: redeemed_at:timestamptz:',
  'M2Audit':'id:uuid:PK actor_user_id:uuid:REF,? target_type:varchar: target_id:uuid: action:varchar: reason:text:? request_id:varchar: before_json:jsonb:? after_json:jsonb:? created_at:timestamptz:',
 },['Payment ||--o{ PaymentAttempt','PaymentAttempt ||--o{ PaymentEvent','Payment ||--o{ Refund','Voucher ||--o{ VoucherReservation','Voucher ||--o{ VoucherRedemption']),
 '08-ai':('M4',{
  'ChatSession':'id:uuid:PK user_id:uuid:REF,? anonymous_key:varchar:? status:varchar: created_at:timestamptz:',
  'ChatMessage':'id:uuid:PK session_id:uuid:FK role:varchar: content:text: product_refs:jsonb:? created_at:timestamptz:',
  'SearchHistory':'id:uuid:PK user_id:uuid:REF query:text: created_at:timestamptz:',
  'RecommendationInteraction':'id:uuid:PK user_id:uuid:REF product_id:uuid:REF event_id:varchar:UQ event_type:varchar: weight:int: occurred_at:timestamptz:',
  'PersonalizationConsent':'id:uuid:PK user_id:uuid:REF status:varchar: source:varchar: changed_at:timestamptz: version:int:',
  'UserPreference':'id:uuid:PK user_id:uuid:REF profile_json:jsonb: updated_at:timestamptz:',
  'ProductEmbedding':'id:uuid:PK product_id:uuid:REF source_version:int: vector:vector: status:varchar: updated_at:timestamptz:',
  'ModelVersion':'id:uuid:PK algorithm:varchar: version:varchar:UQ artifact_uri:varchar: status:varchar: trained_at:timestamptz:',
  'TrainingRun':'id:uuid:PK model_version_id:uuid:FK dataset_version:varchar: split_spec:jsonb: status:varchar: started_at:timestamptz: finished_at:timestamptz:?',
  'ModelEvaluation':'id:uuid:PK training_run_id:uuid:FK baseline_name:varchar: k:int: precision_at_k:numeric: recall_at_k:numeric: ndcg_at_k:numeric: evaluated_at:timestamptz:',
 },['ChatSession ||--o{ ChatMessage','ModelVersion ||--o{ TrainingRun','TrainingRun ||--o{ ModelEvaluation']),
}

REL_LABELS={
 ('User','CustomerProfile'):'có hồ sơ',('User','Address'):'lưu địa chỉ',('User','RefreshSession'):'mở phiên',
 ('User','OneTimeToken'):'yêu cầu mã',('User','UserRole'):'được gán vai trò',('Role','UserRole'):'được gán cho',
 ('Role','RolePermission'):'gồm quyền',('Permission','RolePermission'):'được cấp qua',
 ('User','StoreApplication'):'gửi đơn mở Store',('StoreApplication','Store'):'được duyệt thành',
 ('Store','StoreMembership'):'có thành viên',('User','StoreMembership'):'tham gia Store qua',
 ('Store','StaffInvitation'):'gửi lời mời',('StoreMembership','MembershipPermission'):'được cấp quyền',
 ('Category','ProductType'):'phân loại',('ProductType','AttributeDefinition'):'định nghĩa thuộc tính',
 ('ProductType','Product'):'là kiểu của',('Product','ProductVariant'):'có biến thể',
 ('Product','ProductImage'):'có ảnh',('ProductVariant','ProductImage'):'có ảnh riêng',
 ('Product','Review'):'nhận đánh giá',('Review','ReviewAudit'):'có lịch sử kiểm duyệt',
 ('ProductVariant','Inventory'):'có tồn kho',('InventoryReservation','ReservationItem'):'gồm hàng giữ',
 ('Inventory','ReservationItem'):'được giữ bởi',('Inventory','StockMovement'):'có biến động',
 ('ReservationItem','StockMovement'):'phát sinh biến động',('Cart','CartItem'):'chứa dòng hàng',
 ('Order','OrderItem'):'gồm dòng hàng',('Order','OrderStatusHistory'):'ghi lịch sử trạng thái',
 ('Order','Shipment'):'có giao hàng',('Payment','PaymentAttempt'):'có lần thử',
 ('PaymentAttempt','PaymentEvent'):'nhận sự kiện',('Payment','Refund'):'có hoàn tiền',
 ('Voucher','VoucherReservation'):'được giữ lượt',('Voucher','VoucherRedemption'):'được sử dụng',
 ('ChatSession','ChatMessage'):'chứa tin nhắn',('ModelVersion','TrainingRun'):'được huấn luyện qua',
 ('TrainingRun','ModelEvaluation'):'được đánh giá bằng',
}

UNIQUES={
 'StoreMembership':'unique active user_id; unique active OWNER per store_id',
 'StoreApplication':'unique pending applicant_user_id',
 'ProductVariant':'unique (store_id, sku); unique (product_id, variant_signature) với signature chuẩn hóa từ variant_values_json; store_id phải khớp Product.store_id',
 'CustomerProfile':'unique user_id',
 'ProductType':'unique (category_id, name)',
 'AttributeDefinition':'unique (product_type_id, code)',
 'Inventory':'unique variant_id; check quantity >= 0 and reserved_quantity between 0 and quantity',
 'ReservationItem':'unique (reservation_id, inventory_id); quantity > 0',
 'InventoryReservation':'unique order_id; reserve bằng ID dự kiến và release nếu tạo Order lỗi',
 'Cart':'unique customer_user_id', 'CartItem':'unique (cart_id, variant_id); quantity > 0',
 'IdempotencyRecord':'unique (customer_user_id, key); key giữ tối thiểu 24 giờ',
 'Order':'unique (purchase_group_id, store_id); payable_vnd >= 0; cùng nhóm tạo nguyên tập',
 'OrderItem':'quantity > 0; snapshot bất biến, không FK đến CartItem có thể bị xóa',
 'Payment':'unique order_id; payable_vnd = Order.payable_vnd; collected_vnd <= collectible_vnd <= payable_vnd',
 'PaymentAttempt':'partial unique successful attempt per payment_id',
 'Refund':'order_id bắt buộc, Payment.order_id = Refund.order_id; unique successful refund per Order; không vượt số đã thu',
 'CODCollection':'unique order_id; amount_collected_vnd <= amount_due_vnd',
 'VoucherReservation':'unique (voucher_id, purchase_group_id, store_id); platform store_id NULL; khóa lượt khi tạo Order',
 'VoucherRedemption':'unique (voucher_id, order_id); voucher toàn sàn đếm một lượt theo purchase_group_id',
 'Review':'unique order_item_id; rating between 1 and 5; VISIBLE/HIDDEN, ReviewAudit ghi cả ẩn/hiện lại',
 'ProductEmbedding':'unique (product_id, source_version)',
 'UserPreference':'unique user_id',
 'ModelEvaluation':'unique (training_run_id, baseline_name, k)',
 'OneTimeToken':'unique token_hash; purpose EMAIL_VERIFY hoặc PASSWORD_RESET; chỉ lưu hash',
 'PersonalizationConsent':'unique user_id; không dùng hành vi cá nhân khi chưa opt-in',
}
PURPOSES={
 'User':'Danh tính đăng nhập toàn hệ thống','CustomerProfile':'Thông tin cá nhân phục vụ mua hàng','Address':'Địa chỉ giao hàng do Customer quản lý',
 'Role':'Nhóm quyền ở cấp hệ thống','Permission':'Thao tác được hệ thống cho phép','RolePermission':'Gán permission cho role hệ thống','UserRole':'Gán role cho User','RefreshSession':'Phiên refresh có thể revoke','OneTimeToken':'Token xác minh email hoặc reset mật khẩu đã băm','M3Audit':'Audit khóa User/Store, duyệt Store và quyền nhân viên',
 'StoreApplication':'Đơn xin mở Store và quyết định Admin','Store':'Gian hàng có trạng thái bán và phí giao cố định','StoreMembership':'Tư cách Owner/Seller của User tại Store','StaffInvitation':'Lời mời Seller cần chấp nhận','MembershipPermission':'Quyền Seller được Owner cấp trong giới hạn',
 'Category':'Phân cấp danh mục dùng chung','ProductType':'Kiểu sản phẩm với bộ thuộc tính riêng','AttributeDefinition':'Định nghĩa kiểu, bắt buộc, tập giá trị và biến thể','Product':'Thông tin sản phẩm thuộc Store; status bán tách moderation_status','ProductVariant':'SKU bán được và giá bán','ProductImage':'Ảnh Product hoặc Variant có thứ tự','Review':'Đánh giá sau mua gắn OrderItem','ReviewAudit':'Lịch sử sửa/ẩn/hiện lại đánh giá','M1Audit':'Audit kiểm duyệt Product và chỉnh sửa nhạy cảm',
 'Inventory':'Tồn vật lý và phần giữ theo Variant','InventoryReservation':'Nhóm hàng giữ cho một checkout','ReservationItem':'Lượng SKU cụ thể trong reservation','StockMovement':'Bút toán tồn kho có mã thao tác chống lặp',
 'Cart':'Giỏ của Customer','CartItem':'Variant và lượng chưa xác nhận mua','IdempotencyRecord':'Bản ghi kỹ thuật chống gửi lặp, giữ purchase_group_id và response trong 24 giờ',
 'Order':'Đơn của đúng một Store trong checkout','OrderItem':'Snapshot dòng hàng đã mua','OrderStatusHistory':'Lịch sử chuyển trạng thái và actor','Shipment':'Theo dõi vận chuyển mô phỏng của Order',
 'Payment':'Nghĩa vụ tiền riêng một Order','PaymentAttempt':'Một lần gọi cổng sandbox cho Order','PaymentEvent':'Callback đã nhận và deduplicate','Refund':'Hoàn tiền mock của một Order trả trước','CODCollection':'Khoản cần thu/đã thu của Order COD','Voucher':'Điều kiện và mức giảm của mã ưu đãi','VoucherReservation':'Lượt dùng đang giữ lúc tạo nhóm Order','VoucherRedemption':'Giảm giá chụp trên Order, lượt voucher sàn đếm theo nhóm','M2Audit':'Audit voucher, thanh toán, hoàn tiền và đơn',
 'ChatSession':'Phiên chat của Customer hoặc Guest','ChatMessage':'Lượt hội thoại và card liên quan','SearchHistory':'Truy vấn của Customer phục vụ AI','RecommendationInteraction':'Implicit feedback gồm view/cart/purchase đã dedup','PersonalizationConsent':'Opt-in/withdrawal của User cho cá nhân hóa','UserPreference':'Hồ sơ sở thích suy ra từ hành vi','ProductEmbedding':'Vector Product có source version','ModelVersion':'Phiên bản mô hình và artifact','TrainingRun':'Một lần huấn luyện với dataset/split','ModelEvaluation':'Metric Top-K so baseline cho một run',
}
INDEXES={
 '01-identity-access':'User(email), Address(customer_user_id, is_default), RefreshSession(user_id, expires_at), OneTimeToken(user_id, purpose, expires_at)',
 '02-store-membership':'StoreApplication(applicant_user_id, status), StoreMembership(user_id, status), StoreMembership(store_id, role, status), StaffInvitation(store_id, status)',
 '03-catalog-review':'Product(store_id, status, moderation_status), GIN Product(attributes_json), ProductVariant(product_id, status), Review(product_id, status, created_at)',
 '04-inventory':'Inventory(store_id, variant_id), InventoryReservation(order_id, status), StockMovement(order_id, created_at)',
 '05-cart-checkout':'Cart(customer_user_id), CartItem(cart_id, variant_id), IdempotencyRecord(customer_user_id, key)',
 '06-order-shipping':'Order(customer_user_id, created_at), Order(store_id, status, created_at), Order(purchase_group_id, store_id), OrderStatusHistory(order_id, created_at)',
 '07-payment-voucher':'Payment(order_id), PaymentEvent(provider_event_id), Refund(payment_id, order_id, status), Voucher(scope, store_id, status, ends_at), VoucherReservation(voucher_id, purchase_group_id, status)',
 '08-ai':'ChatMessage(session_id, created_at), RecommendationInteraction(user_id, occurred_at), PersonalizationConsent(user_id), ProductEmbedding(product_id, source_version), vector index for ProductEmbedding.vector',
}

DOMAIN_REFS={
 '01-identity-access':'FR-AUTH-01/02/03/05, FR-PROFILE-01, FR-ADDR-01, FR-ADMIN-03; UC-AUTH-REGISTER/LOGIN/RESET, UC-PROFILE-EDIT, UC-ADDR-MANAGE, UC-ADMIN-RBAC',
 '02-store-membership':'FR-STORE-01/02/05/06/07/08; UC-STORE-APPLY/REVIEW/EDIT, UC-STAFF-INVITE/ACCEPT/LOCK',
 '03-catalog-review':'FR-CAT-01, FR-MPROD-02/07/10, FR-REV-01/02/03; UC-CAT-BROWSE, UC-SPROD-CREATE/VARIANT, UC-REV-CREATE/MODERATE',
 '04-inventory':'FR-INV-01/02/03, FR-CHECKOUT-04/05; UC-INV-VIEW/ADJUST/HISTORY, UC-CHECKOUT-CONFIRM',
 '05-cart-checkout':'FR-CART-01/02/03, FR-CHECKOUT-01/02/03/06/07; UC-CART-ADD/EDIT/SELECT, UC-CHECKOUT-QUOTE/CONFIRM',
 '06-order-shipping':'FR-ORDER-01/02/03/04/05, FR-SORDER-01/02/03; UC-ORDER-LIST/CANCEL, UC-SORDER-STATUS/CANCEL/COD',
 '07-payment-voucher':'FR-PAY-01/02/03/04/05, FR-VCH-01/02/03/04; UC-PAY-SANDBOX/COD, UC-VCH-STORE/PLATFORM/APPLY',
 '08-ai':'FR-AI-01/02/03/04/05/06/07/08, FR-REC-01/02/03/04/05/06/07/08/09/10/11; UC-CHAT-TALK/HISTORY, UC-REC-FOR-YOU/RELATED',
}

def fields(spec):
    out=[]
    for token in spec.split():
        parts=token.split(':')
        name, typ=parts[:2]
        flags=parts[2].split(',') if len(parts)>2 and parts[2] else []
        out.append((name,typ,flags))
    return out

def main():
    target=OUT/'data-dictionary.md'
    if target.exists() and '--force' not in sys.argv[1:]:
        raise SystemExit('data-dictionary.md exists; --force required')
    DIR.mkdir(parents=True,exist_ok=True)
    overview=['erDiagram','  User ||--o{ StoreApplication : "gửi đơn mở Store"','  StoreApplication ||--o| Store : "được duyệt thành"','  User ||--o{ StoreMembership : "tham gia Store qua"','  Store ||--o{ StoreMembership : "có thành viên"','  Store ||..o{ Product : "bán sản phẩm"','  Product ||--o{ ProductVariant : "có biến thể"','  ProductVariant ||--|| Inventory : "có tồn kho"','  User ||..o| Cart : "sở hữu giỏ"','  Cart ||--o{ CartItem : "chứa dòng hàng"','  User ||..o{ Order : "đặt đơn"','  Store ||..o{ Order : "xử lý đơn"','  Order ||--|{ OrderItem : "gồm dòng hàng"','  Order ||--|| Payment : "có thanh toán"','  Payment ||--o| Refund : "có hoàn tiền"','  Order ||--o| CODCollection : "có thu COD"','  Voucher ||--o{ VoucherRedemption : "được sử dụng"','  Product ||--o{ Review : "nhận đánh giá"','  User ||..o{ ChatSession : "mở phiên chat"','  User ||..o{ RecommendationInteraction : "tạo tương tác"']
    (DIR/'00-overview.mmd').write_text('\n'.join(overview)+'\n',encoding='utf-8')
    lines = [
        '# Từ điển dữ liệu và ERD 2.0 Draft', '',
        '[ERD tổng quan](diagrams/erd/00-overview.mmd) chỉ thể hiện thực thể nghiệp vụ; tám ERD chi tiết ở dưới. [Hướng dẫn đọc riêng từng sơ đồ](diagrams/erd/README.md) giải thích luồng và quan hệ bằng ví dụ. Nhãn quan hệ trên sơ đồ viết bằng tiếng Việt; tên entity/cột giữ nguyên theo schema để đối chiếu API. Checkout là quy trình tạo Order, không có bảng Checkout/Purchase. Các Order cùng lần xác nhận chia sẻ purchase_group_id UUID; IdempotencyRecord là bảng kỹ thuật có TTL, không là lịch sử mua hàng. Dấu -- là FK cùng database, dấu .. là tham chiếu logic xuyên service.', '',
        '## Quy ước chung', '',
        'customer_user_id luôn tham chiếu User.id của M3, không tham chiếu CustomerProfile.id; CustomerProfile là tùy chọn cho User có Customer context. ID REF không tạo FK xuyên database. Tiền là bigint VND, thời gian UTC. OrderItem và address_snapshot bất biến sau khi tạo Order. CartItem có thể bị xóa sau khi mua nên OrderItem không có FK tới CartItem.', '',
        'OneTimeToken chỉ lưu hash và hạn dùng cho EMAIL_VERIFY/PASSWORD_RESET. Mock mailbox là hạ tầng demo ngoài ERD nghiệp vụ. M1Audit, M2Audit, M3Audit ghi actor/target/hành động/lý do/trước-sau đã lược dữ liệu nhạy cảm. ReviewAudit là lịch sử kiểm duyệt Review. Điểm trung bình Product là truy vấn hoặc cache suy ra từ Review VISIBLE; MVP không lưu cột rating trên Product.', '',
        'Giá nguồn là ProductVariant.price_vnd; available = Inventory.quantity - Inventory.reserved_quantity. Order giữ snapshot tiền hàng/giảm giá/phí; Payment.payable_vnd phải bằng Order.payable_vnd cho cùng order_id. Tổng Order của purchase_group_id bằng quote lúc xác nhận. Voucher toàn sàn phân bổ xuống từng Order, lượt dùng tính một lần theo purchase_group_id; hủy/hết hạn một Order sau tạo không tính lại Order khác.', '',
        'quote_id trỏ bản báo giá tạm trong cache TTL ngắn để giao diện xác nhận; M2 luôn tính lại trước khi ghi Order. Cache quote không là dữ liệu lịch sử mua hàng và không xuất hiện trong ERD. Lịch sử và số tiền chốt nằm trên Order/OrderItem.', '',
        '| Bất biến | Quy tắc |', '| --- | --- |',
        '| Tạo Order | Unique (purchase_group_id, store_id); M2 tạo nguyên tập Order trong một transaction. |',
        '| Payment | Unique order_id; một Payment cho mỗi Order; mỗi Payment sandbox tối đa một Attempt Success. |',
        '| Tồn | 0 <= reserved_quantity <= quantity; reservation theo order_id, command có operation_id chống lặp. |',
        '| Refund | Refund.order_id bắt buộc và phải khớp Payment.order_id; không hoàn vượt tiền đã thu. |',
        '| Review | Unique order_item_id, rating 1–5; eligibility xác minh với M2. |',
        '| Quyền | Một membership active/User và một Owner active/Store; permission thay đổi có version/audit. |',
        '', '## Các miền dữ liệu'
    ]
    for filename,(owner,entities,relationships) in GROUPS.items():
        diagram=['erDiagram']
        for entity,spec in entities.items():
            diagram.append(f'  {entity} {{')
            for name,typ,flags in fields(spec):
                marker=' PK' if 'PK' in flags else (' FK' if 'FK' in flags else '')
                diagram.append(f'    {typ} {name}{marker}')
            diagram.append('  }')
        for rel in relationships:
            # Cross-service references are omitted from detail ERDs. They are in the overview and dictionary.
            left,right=rel.split()[0],rel.split()[2]
            if left in entities and right in entities:
                diagram.append('  '+rel+' : "'+REL_LABELS.get((left,right),'liên kết')+'"')
        (DIR/(filename+'.mmd')).write_text('\n'.join(diagram)+'\n',encoding='utf-8')
        lines += ['',f'### {filename} — {owner}','','[Mã ERD](diagrams/erd/'+filename+'.mmd). Index đề xuất: '+INDEXES[filename]+'. Các mã FR/UC dưới đây là phạm vi dùng chung của miền; [ma trận truy vết](traceability.md) có ánh xạ chính xác theo từng yêu cầu.', '', '| Entity | Mục đích và ràng buộc riêng | FR/UC dùng miền |','| --- | --- | --- |']
        for entity,spec in entities.items():
            lines.append(f'| {entity} | {PURPOSES[entity]}; {UNIQUES.get(entity,"PK/FK nội bộ; status theo quy ước chung")} | {DOMAIN_REFS[filename]} |')
        lines += ['','| Entity.cột | PostgreSQL | NULL | Default/nguồn | Vai trò và quy tắc |','| --- | --- | --- | --- | --- |']
        for entity,spec in entities.items():
            for name,typ,flags in fields(spec):
                nullable='Có' if '?' in flags else 'Không'
                default='gen_random_uuid()' if name=='id' and 'PK' in flags else ('now()' if name in ('created_at','submitted_at','received_at','redeemed_at') else ('0' if name in ('version','reserved_quantity','collected_vnd','refunded_vnd') else '—'))
                role='PK + FK nội bộ' if 'PK' in flags and 'FK' in flags else ('PK' if 'PK' in flags else ('FK nội bộ' if 'FK' in flags else ('ID tham chiếu logic' if 'REF' in flags else ('Duy nhất' if 'UQ' in flags else 'Dữ liệu nghiệp vụ'))))
                if name.endswith('_snapshot'): role += '; bất biến sau checkout'
                if 'password' in name or 'token' in name: role += '; chỉ lưu hash, hạn chế log'
                lines.append(f'| {entity}.{name} | {typ} | {nullable} | {default} | {role} |')
        lines += ['','**Quan hệ:** '+ '; '.join(r+' (FK nội bộ)' for r in relationships if r.split()[0] in entities and r.split()[2] in entities)+'.', '', '**Dẫn chiếu:** [FR/NFR](functional-requirements.md), [Use Case](use-cases.md), [contract](api-spec.md).']
    lines += [
        '', '## Quan hệ xuyên sơ đồ và service', '',
        '| Bên giữ ID | Bên sở hữu | Kiểm tra |', '| --- | --- | --- |',
        '| M1 Product.store_id, Inventory.store_id, Review.customer_user_id | M3 | Kiểm tra Store/User hiện hành; không FK xuyên DB. |',
        '| M1 Review.order_item_id, InventoryReservation.order_id, StockMovement.order_id | M2 | Xác minh qua contract; restock Order chống lặp bằng operation_id. |',
        '| M2 Cart/Order.customer_user_id và Order.store_id | M3 | customer_user_id = User.id; snapshot Order không thay đổi. |',
        '| M2 CartItem/OrderItem.variant_id | M1 | Quote kiểm tra giá/tồn; OrderItem giữ snapshot. |',
        '| M4 user_id/product_id | M3/M1 | Đồng bộ event; kiểm tra Product hiện hành trước gợi ý. |',
        '', 'Quan hệ vật lý cùng M2 nhưng nằm ở hai ERD chi tiết: Order 1—1 Payment; Order 1—0..1 CODCollection; Order 1—0..1 Refund; Payment 1—0..1 Refund; Order 1—0..n VoucherRedemption. Cùng M3: Permission 1—0..n MembershipPermission. Các cạnh này không được vẽ lặp thực thể trên nhiều hình; xem sơ đồ tổng quan và FK ở bảng cột.', '',
        '## Vòng đời và dữ liệu tạm', '',
        'Không có bảng CheckoutSession, CheckoutItem, CheckoutStoreTotal hoặc PaymentAllocation. M2 tạo nguyên tập Order từ các CartItem đã chọn trong một transaction; mỗi Order có Payment riêng và snapshot tiền/địa chỉ. IdempotencyRecord có TTL tối thiểu 24 giờ, lưu cùng key/hash và purchase_group_id để retry trả lại tập Order; nó là dữ liệu kỹ thuật, không quản lý lịch sử mua hàng. Order sandbox AWAITING_PAYMENT giữ tồn có hạn, callback thành công consume hoặc RECOVERING theo chính Order; callback muộn sau EXPIRED hoàn tiền cho Order đó. COD consume khi Order được xác nhận, thu tiền khi giao.', '',
        'Voucher toàn sàn được tính một lần trên tập Store tại xác nhận và phân bổ cố định xuống Order. VoucherRedemption gắn từng Order nhưng usage_limit/per_customer_limit của voucher sàn đếm DISTINCT purchase_group_id. Lỗi trước transaction Order release toàn bộ reservation/lượt giữ; hủy hoặc hết hạn một Order sau tạo không khôi phục lượt đã dùng, không tính lại Order khác. Xóa Product/Variant/Address/Voucher lịch sử chỉ soft-delete hoặc đổi status. Outbox/inbox và audit được triển khai trong database của service sở hữu.'
    ]
    target.write_text('\n'.join(lines)+'\n',encoding='utf-8')
    print(f'Wrote {len(GROUPS)} detailed ERDs, overview and {sum(len(g[1]) for g in GROUPS.values())} entities')

if __name__=='__main__': main()
