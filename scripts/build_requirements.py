"""Create the 2.0 Draft requirement catalog from SRS 1.1 plus approved scope.

This is a one-way migration helper. Existing canonical files are protected unless
--force is supplied. Review generated prose before changing the baseline.
"""
from pathlib import Path
from docx import Document
import openpyxl
import re
import sys
from build_usecases import CASE_LINKS

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
SOURCE = ROOT / "docs_old"

NEW_FR = [
    ("FR-AUTH-05", "Một User được dùng đồng thời vai trò Customer và vai trò Store theo membership đang hoạt động; quyền được kiểm tra theo ngữ cảnh request.", "Customer/Owner/Seller", "M3", "BR-03/04"),
    ("FR-STORE-05", "Customer gửi, xem trạng thái và gửi lại yêu cầu mở Store sau khi bị từ chối.", "Customer", "M3", "BR-33"),
    ("FR-STORE-06", "Administrator duyệt hoặc từ chối yêu cầu mở Store; duyệt tạo Store và gán Owner trong cùng giao dịch M3.", "Administrator", "M3", "BR-03/33"),
    ("FR-STORE-07", "Owner mời hoặc thu hồi lời mời Seller; người được mời xem lời mời của mình và chấp nhận khi còn hạn, đúng email đã xác minh, trước khi quyền có hiệu lực.", "Owner/Customer", "M3", "BR-35"),
    ("FR-STORE-08", "Khóa Store ngăn bán mới và hiển thị công khai, nhưng cho xử lý Order đang tồn tại.", "Administrator", "M3", "BR-34"),
    ("FR-CHECKOUT-06", "Một lần xác nhận giỏ dùng một địa chỉ và chọn phương thức thanh toán cho từng Store; Order lưu snapshot và chia sẻ purchase_group_id không cần thực thể CheckoutSession.", "Customer", "M2", "BR-16/21"),
    ("FR-CHECKOUT-07", "Order sandbox chưa trả tiền giữ tồn có hạn; thanh toán thành công nhưng consume tồn lỗi phải phục hồi theo chính Order, không thu lại; hết hạn giải phóng tồn.", "System", "M2", "BR-22/23"),
    ("FR-PAY-03", "Customer có thể chọn COD cho từng Order; Order được tạo trước khi thu tiền và có một nghĩa vụ COD riêng.", "Customer", "M2", "BR-17/21"),
    ("FR-PAY-04", "Seller/Owner xác nhận thu đủ COD theo Order tại khi hoàn tất giao hàng mô phỏng.", "Seller/Owner", "M2", "BR-17/25"),
    ("FR-PAY-05", "Khi hủy Order đã trả trước hoặc callback thành công đến sau khi Order hết hạn, hệ thống tạo Refund mock theo số tiền Order gồm phí giao hàng và theo dõi trạng thái riêng.", "System/Customer", "M2", "BR-23/25/26"),
    ("FR-ORDER-05", "Customer và Seller/Owner hủy từng Order ở AWAITING_PAYMENT, Pending hoặc Confirmed; Seller/Owner phải ghi lý do.", "Customer/Seller/Owner", "M2", "BR-24/39"),
    ("FR-ORDER-06", "Order lưu snapshot Product, Variant, địa chỉ, giá, giảm giá và phí để lịch sử không đổi khi nguồn thay đổi.", "System", "M2", "BR-21/36"),
    ("FR-VCH-01", "Owner tạo/cập nhật/ngừng voucher của Store mình; Administrator quản lý voucher toàn sàn.", "Owner/Admin", "M2", "BR-27"),
    ("FR-VCH-02", "Customer áp tối đa một voucher Store cho mỗi Store và một voucher toàn sàn cho checkout; cả hai được cộng dồn theo thứ tự Store rồi toàn sàn.", "Customer", "M2", "BR-27/28"),
    ("FR-VCH-03", "Hệ thống kiểm tra thời hạn, mức tối thiểu, trần giảm, tổng lượt và hạn mức Customer; giữ lượt khi xác nhận giỏ và chốt khi các Order được tạo nguyên tập.", "System", "M2", "BR-28/30"),
    ("FR-VCH-04", "Hệ thống phân bổ giảm toàn sàn theo Store, lưu snapshot trên từng Order; Payment của Order phải bằng payable của chính Order.", "System", "M2", "BR-29/31"),
    ("FR-REV-01", "Customer tạo một đánh giá 1–5 điểm cho mỗi OrderItem đã Completed do mình sở hữu và được sửa đánh giá đó.", "Customer", "M1", "BR-37"),
    ("FR-REV-02", "Guest/Customer xem đánh giá đang hiển thị và điểm tổng hợp của Product.", "Guest/Customer", "M1", "BR-38"),
    ("FR-REV-03", "Administrator ẩn hoặc hiện lại đánh giá kèm lý do và audit; chỉ đánh giá đang hiển thị góp vào điểm tổng hợp.", "Administrator", "M1", "BR-37/38"),
    ("FR-MPROD-10", "Sản phẩm không có lựa chọn biến thể vẫn có một SKU mặc định để mua và quản lý tồn kho.", "Seller/Owner", "M1", "BR-09/36"),
    ("FR-REP-03", "Báo cáo Store tách giá trị Order, doanh thu Completed sau giảm giá, tiền đã thu, tiền đã hoàn và phí giao hàng.", "Owner", "M2", "BR-32"),
]

NEW_NFR = [
    ("NFR-REL-04", "Reservation, consume, release, hoàn kho, callback Payment và Refund có mã thao tác để retry không tạo tác động lặp.", "M1/M2", "BR-10/19/22"),
    ("NFR-DATA-01", "Không tạo khóa ngoại vật lý xuyên DB service; ID tham chiếu được xác minh bằng contract và đối soát.", "M1–M4", "BR-04/21"),
    ("NFR-SEC-10", "Quyền theo role và Store membership hiện hành được kiểm tra tại request; khóa tài khoản/Store có hiệu lực dù token còn hạn.", "M3", "BR-04/34"),
    ("NFR-MONEY-01", "Tiền lưu số nguyên VND; phân bổ giảm giá làm tròn cố định; payable của mỗi Order bằng Payment của Order đó, tổng Order bằng quote đã xác nhận.", "M2", "BR-29/31/40"),
]

GROUPS = {
    "AUTH": ("M3", "Web/Mobile/Portal", "UC-AUTH", "API-AUTH", "TC-AUTH"),
    "PROFILE": ("M3", "Web/Mobile", "UC-PROFILE", "API-PROFILE", "TC-ACC"),
    "ADDR": ("M3", "Web/Mobile", "UC-ADDR", "API-PROFILE", "TC-ACC"),
    "CAT": ("M1", "Web/Mobile", "UC-CAT", "API-CAT", "TC-CAT"),
    "SEARCH": ("M1", "Web/Mobile", "UC-SEARCH", "API-CAT", "TC-CAT"),
    "PROD": ("M1", "Web/Mobile", "UC-PROD", "API-CAT", "TC-CAT"),
    "STOREVIEW": ("M1", "Web/Mobile", "UC-PROD", "API-CAT", "TC-CAT"),
    "CART": ("M2", "Web/Mobile", "UC-CART", "API-CHECKOUT", "TC-CHK"),
    "CHECKOUT": ("M2", "Web/Mobile", "UC-CHECKOUT", "API-CHECKOUT", "TC-CHK"),
    "PAY": ("M2", "Web/Mobile/Portal", "UC-PAY", "API-PAY", "TC-PAY"),
    "ORDER": ("M2", "Web/Mobile", "UC-ORDER", "API-ORDER", "TC-ORD"),
    "REC": ("M4", "Web/Mobile/Portal", "UC-REC", "API-AI", "TC-AI"),
    "AI": ("M4", "Web/Mobile/Portal", "UC-CHAT", "API-AI", "TC-AI"),
    "STORE": ("M3", "Portal/Web", "UC-STORE", "API-STORE", "TC-ACC"),
    "MPROD": ("M1", "Portal", "UC-SPROD", "API-CAT", "TC-CAT"),
    "PTYPE": ("M1", "Portal", "UC-TAX", "API-CAT", "TC-CAT"),
    "CATEGORY": ("M1", "Portal", "UC-TAX", "API-CAT", "TC-CAT"),
    "INV": ("M1", "Portal", "UC-INV", "API-INV", "TC-INV"),
    "SORDER": ("M2", "Portal", "UC-SORDER", "API-ORDER", "TC-ORD"),
    "REP": ("M2", "Portal", "UC-REP", "API-REPORT", "TC-REP"),
    "ADMIN": ("M3", "Portal", "UC-ADMIN", "API-ADMIN", "TC-SEC"),
    "VCH": ("M2", "Web/Mobile/Portal", "UC-VCH", "API-VOUCHER", "TC-VCH"),
    "REV": ("M1", "Web/Mobile/Portal", "UC-REV", "API-REVIEW", "TC-REV"),
}

def story_requirements(code):
    suffix=code[3:]
    group=code.split('-')[1]
    number=int(code.rsplit('-',1)[1])
    if group=='AUTH':
        return ['FR-AUTH-01' if number==1 else ('FR-AUTH-02' if number in (2,3) else 'FR-AUTH-03')]
    if group in ('PROFILE','ADDR'):
        return ['FR-'+group+'-01']
    if group=='CART':
        return ['FR-CART-'+('01' if number==1 else '02' if number in (2,3) else '03')]
    if group=='CHECKOUT':
        return [['FR-CHECKOUT-01','FR-CHECKOUT-06'],['FR-CHECKOUT-03'],['FR-CHECKOUT-02']][number-1]
    if group=='PAY': return [['FR-PAY-01','FR-PAY-03'],['FR-PAY-02']][number-1]
    if group=='ORDER':
        return ['FR-ORDER-'+('01' if number==1 else '02' if number in (2,3) else '03' if number==4 else '04')]
    if group=='REC':
        return [['FR-REC-02'],['FR-REC-04','FR-REC-06'],['FR-REC-05'],['FR-REC-07','FR-REC-11'],['FR-REC-03'],['FR-REC-08'],['FR-ADMIN-07']][number-1]
    if group=='CHAT':
        return [['FR-AI-01'],['FR-AI-02'],['FR-AI-03'],['FR-AI-04','FR-AI-05'],['FR-AI-06'],['FR-AI-07'],['FR-AI-08']][number-1]
    if group=='STORE':
        return ['FR-STORE-'+('01' if number==1 else '02')]
    if group=='ADMIN' and 'STORE' in code: return ['FR-STORE-04']
    if group=='PTYPE': return ['FR-PTYPE-01']
    if group=='CATEGORY': return ['FR-CATEGORY-ADMIN-01']
    if group=='SORDER': return ['FR-SORDER-'+('01' if number in (1,2) else '02')]
    if group=='REP': return ['FR-REP-'+('01' if number==1 else '02')]
    if group=='AIMON': return ['FR-ADMIN-06']
    if group=='STOREVIEW': return ['FR-STOREVIEW-01']
    if group=='PROD': return ['FR-PROD-01']
    candidate='FR-'+suffix
    return [candidate]

STORY_AC = {
    'US-AUTH-01': 'Given Guest đăng ký email chưa dùng; When M3 tạo User; Then gửi link xác minh một lần vào mock mailbox demo và email_verified_at còn null. Given link hợp lệ; When xác minh; Then ghi email_verified_at, cho phép xem/nhận lời mời Store. Given link sai/hết hạn hoặc email chưa xác minh; When xác minh/xem lời mời; Then từ chối, không cấp quyền.',
    'US-AUTH-04': 'Given User chưa đăng nhập; When yêu cầu đặt lại mật khẩu; Then M3 trả phản hồi không tiết lộ email có tồn tại và gửi mã/link một lần vào mock mailbox demo, không trả token trong API. Given mã hợp lệ; When đặt mật khẩu mới; Then hash thay đổi và phiên cũ bị thu hồi. Given mã hết hạn/đã dùng; When gửi lại; Then từ chối, không đổi mật khẩu.',
    'US-AUTH-05': 'Given User đã đăng nhập và biết mật khẩu cũ; When đổi sang mật khẩu mới hợp lệ; Then M3 thay hash và thu hồi phiên khác. Given mật khẩu cũ sai hoặc User bị khóa; When đổi; Then từ chối, không đổi hash. Given token của User khác; When gọi; Then không thể đổi mật khẩu tài khoản này.',
    'US-CHECKOUT-01': 'Given giỏ có hàng của hai Store và tồn/giá còn hợp lệ; When Customer xác nhận một địa chỉ và phương thức cho từng Store; Then M2 tạo đúng hai Order cùng purchase_group_id trong một transaction, mỗi Order có Payment riêng. Given một SKU đổi giá hoặc hết hàng; When xác nhận; Then trả quote mới hoặc lỗi rõ SKU và chưa tạo Order. Given người khác dùng giỏ; When gửi; Then trả 403/404.',
    'US-PAY-01': 'Given Order sandbox AWAITING_PAYMENT đã reserve tồn; When callback thành công hợp lệ; Then Payment của riêng Order đó thành công, tồn được consume và Order chuyển PENDING; Order khác cùng nhóm không đổi. Given callback trùng, muộn hoặc consume lỗi; When M2 xử lý; Then chống lặp, vào RECOVERING hoặc hoàn mock nếu Order đã hết hạn, không thu lần nữa. Given callback sai chữ ký; When nhận; Then từ chối.',
    'US-ORDER-05': 'Given Order của Customer đang AWAITING_PAYMENT/Pending/Confirmed; When Customer hủy; Then chỉ Order đó CANCELLED, release reservation hoặc hoàn kho phù hợp và tạo Refund mock nếu đã trả trước. Given Order đã Processing; When hủy; Then trả 409, không đổi Order. Given Order của người khác; When hủy; Then trả 403/404.',
    'US-STORE-APPLY-01': 'Given Customer chưa thuộc Store đang hoạt động; When gửi đơn mở Store hợp lệ; Then tạo StoreApplication PENDING để theo dõi. Given đơn trước bị từ chối; When gửi lại; Then tạo đơn mới. Given Customer đã thuộc Store hoặc không phải chủ tài khoản; When gửi; Then từ chối và không tạo Store.',
    'US-STORE-APPLY-02': 'Given Admin mở StoreApplication PENDING; When duyệt; Then Store và Owner membership được tạo trong một transaction. Given từ chối; When nhập lý do; Then đơn REJECTED, Customer xem được lý do. Given non-Admin hoặc đơn đã xử lý; When duyệt; Then trả 403/409.',
    'US-STAFF-01': 'Given Owner của Store đang hoạt động; When mời Seller với tập quyền hợp lệ; Then tạo StaffInvitation có hạn, chưa cấp quyền trước khi nhận. Given lời mời PENDING; When Owner thu hồi; Then không thể chấp nhận và có audit. Given Seller khác gửi/thu hồi lời mời; When gọi API; Then trả 403.',
    'US-STAFF-02': 'Given email đã xác minh khớp lời mời; When Customer xem lời mời của mình; Then thấy Store, quyền, hạn và trạng thái, không thấy token hash. Given lời mời còn hạn; When chấp nhận; Then chỉ tạo một membership. Given lời mời hết hạn/thu hồi hoặc thuộc email khác; When chấp nhận; Then từ chối, không cấp quyền.',
    'US-VCH-03': 'Given voucher Store và toàn sàn còn hạn/lượt; When Customer áp trên checkout hai Store; Then giảm Store trước, toàn sàn sau và tổng phân bổ khớp đến đồng VND. Given voucher hết hạn/hết lượt; When xác nhận; Then trả lỗi điều kiện và không giữ lượt. Given voucher Store của Store khác; When áp; Then không áp lên Order không thuộc Store đó.',
    'US-COD-01': 'Given xác nhận giỏ hai Store, Store A chọn COD và Store B chọn sandbox; When tạo Order; Then mỗi Order có Payment riêng, A xử lý không phụ thuộc B đã trả. Given SKU hết hàng; When xác nhận; Then không có Order nào được tạo. Given người khác dùng idempotency key; When gọi; Then không được truy cập nhóm Order.',
    'US-COD-02': 'Given Order COD thuộc Store đang Shipped; When Seller xác nhận giao và thu đủ; Then CODCollection của Order thành COLLECTED và Order Completed, Order khác không đổi. Given chưa giao hoặc số tiền lệch; When xác nhận; Then trả 409/422 và không ghi thu. Given Seller Store khác; When gọi; Then trả 403/404.',
    'US-REFUND-01': 'Given Customer hủy Order trả trước; When xem tiến độ; Then thấy riêng trạng thái Order CANCELLED và Refund PENDING/SUCCEEDED/FAILED theo số tiền snapshot của Order. Given Order COD; When hủy; Then không có Refund. Given Customer khác; When tra cứu; Then trả 403/404.',
    'US-REV-01': 'Given OrderItem thuộc Order Completed của Customer và chưa có Review; When gửi điểm 1–5 cùng nội dung; Then tạo đúng một Review. Given Order chưa Completed hoặc OrderItem đã được đánh giá; When gửi; Then trả 409/422, không tạo thêm. Given OrderItem người khác; When gửi; Then trả 403/404.',
    'US-REV-03': 'Given Admin xem Review; When ẩn hoặc hiện lại kèm lý do; Then ReviewAudit ghi actor/hành động/lý do và điểm tổng hợp chỉ tính Review VISIBLE. Given thiếu lý do hoặc version cũ; When thao tác; Then trả 422/409. Given non-Admin; When gọi; Then trả 403.',
    'US-ADMIN-04': 'Given Admin xem Product; When ẩn hoặc bỏ ẩn kèm lý do; Then M1 ghi audit và chỉ đổi moderation_status, không đổi sale status. Given Product STOPPED; When bỏ ẩn; Then vẫn không công khai. Given Seller tự bỏ ẩn hoặc version cũ; When thao tác; Then trả 403/409.',
    'US-MPROD-05': 'Given Product DRAFT/STOPPED có SKU, giá và Store hợp lệ, moderation VISIBLE; When Seller chuyển ACTIVE; Then Product công khai và Order cũ giữ snapshot. Given thiếu SKU, Store bị khóa hoặc Admin ẩn; When đăng bán; Then từ chối không đổi trạng thái. Given Seller Store khác; When sửa; Then trả 403/404.',
}

def expand_fr_ids(text):
    """Expand compact references such as FR-VCH-02/03/04."""
    result=[]
    for token in text.replace(',', ' ').split():
        token=token.strip(';')
        if not token.startswith('FR-'): continue
        pieces=token.split('/')
        first=pieces[0]
        result.append(first)
        stem=first.rsplit('-',1)[0]+'-'
        for piece in pieces[1:]:
            result.append(piece if piece.startswith('FR-') else stem+piece)
    return result

def safe(text):
    return str(text).replace("|", "\\|").replace("\n", "<br>")

def old_requirements():
    doc = Document(SOURCE / "SRS_v1.2.docx")
    fr, nfr = {}, {}
    for table in doc.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells]
            if len(cells) < 2:
                continue
            code = cells[0]
            if re.fullmatch(r"FR-[A-Z0-9-]+", code):
                fr.setdefault(code, (cells[1], cells[2] if len(cells) > 2 else "System"))
            elif re.fullmatch(r"NFR-[A-Z0-9-]+", code):
                nfr.setdefault(code, cells[2] if len(cells) > 2 else cells[1])
    assert len(fr) == 77 and len(nfr) == 24, (len(fr), len(nfr))
    return fr, nfr

def main():
    outputs = [DOCS / n for n in ("functional-requirements.md", "user-stories.md", "traceability.md", "srs.md", "requirements-acceptance.md")]
    if any(p.exists() for p in outputs) and "--force" not in sys.argv[1:]:
        raise SystemExit("Canonical docs exist; --force is required to regenerate")
    fr, nfr = old_requirements()
    nfr["NFR-ISO-01"] = nfr["NFR-ISO-01"].replace("customer_id", "customer_user_id (User.id)")
    nfr["NFR-PERF-05"] = nfr["NFR-PERF-05"].replace("customer_id", "customer_user_id")
    nfr["NFR-SEC-07"] = nfr["NFR-SEC-07"].replace("customer_id", "customer_user_id")
    # Existing codes keep their meaning except changes explicitly approved in 2.0.
    fr["FR-AUTH-03"] = ("Mọi User có tài khoản được đặt lại mật khẩu khi chưa đăng nhập bằng mã/link một lần gửi vào mock mailbox của demo và đổi mật khẩu khi đã đăng nhập bằng mật khẩu cũ; mã hết hạn/đã dùng và phiên bị thu hồi phải bị từ chối.", "Guest/User đã đăng nhập")
    fr["FR-AUTH-01"] = ("Guest đăng ký tài khoản Customer bằng email; M3 xác minh quyền sở hữu email bằng link một lần qua mock mailbox demo trước khi cho xem/nhận lời mời Store.", "Guest")
    fr["FR-PROFILE-01"] = ("Mọi User đã đăng nhập được xem/cập nhật hồ sơ cá nhân của chính mình; Seller/Owner/Admin không sửa hồ sơ User khác qua chức năng này.", "User đã đăng nhập")
    fr["FR-AUTH-04"] = ("Mọi request quản trị phải kiểm tra quyền hiệu lực từ User và StoreMembership; JWT chỉ xác thực danh tính, không tự quyết định một role cố định.", "Seller/Owner/Admin")
    fr["FR-STORE-03"] = ("Seller thuộc tối đa một Store đang hoạt động; Customer có thể đồng thời là Seller hoặc Owner; dữ liệu Store giới hạn theo membership hiệu lực.", "Seller/Owner")
    fr["FR-PAY-01"] = ("Mỗi Order có phương thức SANDBOX hoặc COD và Payment riêng; Customer có thể trả tiền từng Order ở thời điểm khác nhau.", "Customer")
    fr["FR-PAY-02"] = ("Payment liên kết đúng một Order, theo dõi lần thử sandbox hoặc nghĩa vụ COD, trạng thái thu và hoàn tiền độc lập với trạng thái Order.", "System")
    fr["FR-STORE-02"] = ("Store Owner xem danh sách Seller/lời mời, cập nhật tập quyền trong giới hạn Seller và khóa/mở membership của Seller thuộc Store; quyền chỉ có sau khi nhận lời mời.", "Store Owner")
    fr["FR-STORE-04"] = ("Administrator duyệt yêu cầu mở Store, khóa/mở và quản lý trạng thái Store/Seller ở phạm vi toàn nền tảng.", "Administrator")
    fr["FR-ADMIN-04"] = ("Administrator ẩn hoặc bỏ ẩn Product có lý do và audit; bỏ ẩn không thay đổi trạng thái bán do Store đặt.", "Administrator")
    fr["FR-MPROD-05"] = ("Seller/Owner sửa thông tin và trạng thái bán Product; DRAFT/STOPPED chỉ chuyển ACTIVE khi Store, SKU, giá và kiểm duyệt đều hợp lệ.", "Seller/Owner")
    fr["FR-AI-08"] = ("Customer xem lại lịch sử phiên chat của chính mình trong MVP.", "Customer")
    fr["FR-ORDER-01"] = ("Sau xác nhận giỏ hợp lệ, tạo một Order cho mỗi Store cùng purchase_group_id trong một transaction M2; từng Order có Payment và vòng đời thanh toán độc lập.", "System")
    fr["FR-SORDER-02"] = ("Seller/Owner chuyển Order theo Pending → Confirmed → Processing → Shipped → Completed hoặc hủy ở Pending/Confirmed; với sandbox Seller/Owner xác nhận giao để Completed, với COD phải ghi thu đủ từng Order.", "Seller/Owner")
    fr["FR-CHECKOUT-01"] = ("Customer chọn CartItem thuộc một hoặc nhiều Store trong một lần xác nhận; dùng một địa chỉ và chọn phương thức cho từng Store.", "Customer")
    fr["FR-CHECKOUT-03"] = ("Customer chọn địa chỉ và xác nhận danh sách, tổng tiền từng Store và tổng tham khảo trước khi tạo Order; mỗi Order giữ tiền phải trả riêng.", "Customer")
    fr["FR-CHECKOUT-05"] = ("Hệ thống reserve tồn cho từng Order sandbox chưa trả tiền, consume khi Payment thành công, release khi hết hạn/hủy; Order COD consume khi tạo thành công.", "System")
    fr["FR-ORDER-03"] = ("Customer theo dõi trạng thái AWAITING_PAYMENT/Pending/Confirmed/Processing/Shipped/Completed/Cancelled/Expired của từng Order.", "Customer")
    fr["FR-REC-08"] = ("Store Owner và Administrator xem metric/log recommendation theo phạm vi quyền và dữ liệu có trong MVP.", "Store Owner/Admin")
    for code, text, actor, _, _ in NEW_FR:
        assert code not in fr
        fr[code] = (text, actor)
    new_meta = {x[0]: x[3:] for x in NEW_FR}
    lines = ["# Danh mục yêu cầu 2.0 Draft", "", "Nguồn nền: [SRS 1.1 chuyển đổi](legacy/srs.md). Mã FR cũ được giữ; yêu cầu mới được thêm theo quyết định phạm vi. Tài liệu này là danh mục FR/NFR chi tiết của 2.0. [Quy tắc nghiệp vụ](business-rules.md) và [Test Plan](test-plan.md) làm rõ điều kiện nghiệm thu.", "", f"Tổng: **{len(fr)} FR và {len(nfr)+len(NEW_NFR)} NFR**. `Bắt buộc` là điều kiện MVP; `Có điều kiện` chỉ xuất hiện khi chức năng được bật trong cấu hình demo và phải ghi trong Test Plan.", "", "## Yêu cầu chức năng", "", "| Mã | Yêu cầu | Actor | Ưu tiên | Nền tảng | Service | Quy tắc | Tiêu chí nghiệm thu |", "| --- | --- | --- | --- | --- | --- | --- | --- |"]
    trace = ["# Ma trận truy vết 2.0 Draft", "", "Mỗi dòng FR trỏ đến Story hoặc technical task, Use Case chính xác, OpenAPI operationId và Test Case theo yêu cầu. `—` ở cột API nghĩa là yêu cầu nội bộ/phi chức năng không có endpoint công khai; nếu chưa có UC thì `TASK-FR-*` là đầu việc kỹ thuật, không tạo ca sử dụng giả.", "", "| FR | Story/technical task | Use Case | OpenAPI operationId | Test |", "| --- | --- | --- | --- | --- |"]
    acceptance=["# Tiêu chí nghiệm thu theo từng yêu cầu — 2.0 Draft", "", "Mỗi mã TC-FR/NFR là một kiểm tra dự kiến, trạng thái **chưa thực thi**. Các trường hợp giao dịch quan trọng có bước và dữ liệu cụ thể trong [Test Plan](test-plan.md). Test Case theo yêu cầu phải được điền dữ liệu đầu vào, kết quả chạy và bằng chứng khi triển khai.", "", "| Test | Yêu cầu | Given | When | Then/điều kiện đạt | Trạng thái |", "| --- | --- | --- | --- | --- | --- |"]
    for code, (description, actor) in sorted(fr.items()):
        group = code.split("-")[1]
        service, platform, uc, api, test = GROUPS[group]
        if code in new_meta:
            service, br = new_meta[code]
        else:
            br = "BR-04/05" if group in ("AUTH", "STORE", "ADMIN") else "Xem business-rules.md"
        if code == "FR-ADMIN-04":
            service, br = "M1", "BR-38"
        priority = "Có điều kiện" if code == "FR-SEARCH-04" else "Bắt buộc"
        action = description.rstrip(".")
        criterion = f"Given actor có quyền và dữ liệu hợp lệ; When thực hiện {code}; Then {action[0].lower()+action[1:]} (đối chiếu {test})."
        lines.append("| " + " | ".join(map(safe, (code, description, actor, priority, platform, service, br, criterion))) + " |")
        trace.append(f"| {code} | STORY_PLACEHOLDER | UC_PLACEHOLDER | API_PLACEHOLDER | TC-{code} |")
        acceptance.append("| " + " | ".join(map(safe, ("TC-"+code,code,f"{actor} có quyền hợp lệ; dữ liệu thuộc phạm vi {service}",f"Thực hiện hành vi {code} qua {platform}",description+"; trường hợp không hợp lệ không ghi thay đổi một phần.","Chưa thực thi"))) + " |")
    lines += ["", "## Yêu cầu phi chức năng", "", "| Mã | Yêu cầu | Mức | Service | Quy tắc | Cách kiểm tra |", "| --- | --- | --- | --- | --- | --- |"]
    for code, description in sorted(nfr.items()):
        group = code.split("-")[1]
        lines.append("| " + " | ".join(map(safe, (code, description, "Bắt buộc", "M1–M4 theo endpoint", "Xem business-rules.md", "Đo/kiểm bằng Test Plan nhóm " + group))) + " |")
    for code, desc, service, br in NEW_NFR:
        lines.append("| " + " | ".join(map(safe, (code, desc, "Bắt buộc", service, br, "Kiểm bằng Test Plan và đối soát dữ liệu"))) + " |")
    for code,description in sorted(nfr.items()):
        acceptance.append("| " + " | ".join(map(safe,("TC-"+code,code,"Có môi trường/dữ liệu test cố định và log theo correlation ID","Chạy kiểm thử nhóm "+code.split('-')[1],description,"Chưa thực thi"))) + " |")
    for code,description,_,_ in NEW_NFR:
        acceptance.append("| " + " | ".join(map(safe,("TC-"+code,code,"Có môi trường/dữ liệu test cố định và log theo correlation ID","Chạy kiểm thử nhóm "+code.split('-')[1],description,"Chưa thực thi"))) + " |")
    trace += ["", "NFR được kiểm theo [Test Plan](test-plan.md); các trạng thái lỗi và metric AI được nối với [kiến trúc](architecture.md) và [thiết kế AI](ai-design.md). Bảng này được rà sau mỗi thay đổi mã yêu cầu; dòng không có UC cần technical task và Test Case cụ thể trước khi Approved."]

    workbook = openpyxl.load_workbook(SOURCE / "User_Story.xlsm", data_only=True)
    stories = []
    for row in workbook.active.iter_rows(values_only=True):
        if row[0] and str(row[0]).startswith("US-"):
            stories.append(list(row))
    assert len(stories) == 79
    changes = {
        "US-AUTH-02": ("đăng nhập vào tài khoản ở vai trò Customer, Seller, Owner hoặc Administrator", "tôi truy cập đúng chức năng theo quyền hiện hành"),
        "US-AUTH-03": ("đăng xuất khỏi tài khoản ở bất kỳ vai trò nào", "tôi kết thúc phiên đăng nhập an toàn"),
        "US-AUTH-04": ("đặt lại mật khẩu đã quên bằng mã/link một lần qua mock mailbox demo", "tôi lấy lại quyền truy cập mà không lộ tài khoản"),
        "US-AUTH-05": ("đổi mật khẩu bằng mật khẩu cũ khi đã đăng nhập", "tôi cập nhật thông tin xác thực an toàn"),
        "US-CART-04": ("xem CartItem từ nhiều Store và chọn item muốn mua trong một lần checkout", "tôi biết phân bổ theo Store"),
        "US-CHECKOUT-01": ("checkout CartItem của nhiều Store trong một lần", "tôi nhận một Order riêng cho từng Store"),
        "US-ORDER-01": ("đặt nhiều Order từ một checkout hợp lệ", "tôi mua nhiều Store chỉ qua một lần xác nhận"),
        "US-PAY-01": ("chọn sandbox hoặc COD và trả tiền riêng theo Order", "tôi hoàn tất từng đơn khi phù hợp"),
        "US-STORE-03": ("mời tài khoản hoặc email nhận quyền Seller của Store", "nhân viên chỉ có quyền sau khi chấp nhận lời mời"),
        "US-STORE-04": ("cập nhật trạng thái và thông tin membership Seller trong Store", "quyền nhân viên của Store luôn chính xác"),
        "US-ADMIN-04": ("ẩn hoặc bỏ ẩn Product có lý do", "tôi kiểm soát và khôi phục nội dung vi phạm"),
    }
    for row in stories:
        if row[0] in changes:
            row[3], row[4] = changes[row[0]]
        if row[0] in ("US-AUTH-02", "US-AUTH-03", "US-AUTH-05", "US-PROFILE-01", "US-PROFILE-02"):
            row[2] = "Người dùng đã đăng nhập"
        if row[0] == "US-AUTH-04":
            row[2] = "Người chưa đăng nhập"
        if row[0] != "US-SEARCH-04":
            row[5] = "Bắt buộc"
    extra = [
        ("US-STORE-APPLY-01", "Store", "Customer", "gửi và theo dõi yêu cầu mở Store", "tôi có thể bán hàng sau khi được duyệt", "Bắt buộc", "FR-STORE-05/06"),
        ("US-STORE-APPLY-02", "Store", "Administrator", "duyệt hoặc từ chối đơn mở Store có lý do", "Store mới có Owner được xác minh", "Bắt buộc", "FR-STORE-06"),
        ("US-STAFF-01", "Store", "Store Owner", "mời Seller vào Store của mình", "nhân viên chỉ có quyền sau khi nhận lời", "Bắt buộc", "FR-STORE-07"),
        ("US-STAFF-02", "Store", "Customer", "xem và nhận lời mời Store của mình", "tôi biết lời mời nào còn hiệu lực", "Bắt buộc", "FR-STORE-07"),
        ("US-VCH-01", "Voucher", "Store Owner", "tạo voucher của Store", "tôi chạy ưu đãi cho hàng của mình", "Bắt buộc", "FR-VCH-01"),
        ("US-VCH-02", "Voucher", "Administrator", "tạo voucher toàn sàn", "tôi chạy ưu đãi trên marketplace", "Bắt buộc", "FR-VCH-01"),
        ("US-VCH-03", "Voucher", "Customer", "áp voucher Store và toàn sàn cùng checkout", "tôi thấy tiền giảm và tổng theo Store", "Bắt buộc", "FR-VCH-02/03/04"),
        ("US-COD-01", "COD", "Customer", "chọn COD cho Order của từng Store", "tôi trả tiền khi nhận đúng đơn đó", "Bắt buộc", "FR-PAY-03"),
        ("US-COD-02", "COD", "Seller/Owner", "xác nhận thu COD theo Order", "tôi hoàn tất đơn đã giao", "Bắt buộc", "FR-PAY-04"),
        ("US-REFUND-01", "Refund", "Customer", "xem tiến độ hoàn tiền mock khi hủy đơn trả trước", "tôi biết tiền của đơn đã hủy đang được xử lý", "Bắt buộc", "FR-PAY-05"),
        ("US-REV-01", "Review", "Customer", "đánh giá OrderItem đã hoàn tất", "người mua khác có thông tin tham khảo", "Bắt buộc", "FR-REV-01"),
        ("US-REV-02", "Review", "Customer", "sửa đánh giá của mình", "tôi cập nhật nhận xét", "Bắt buộc", "FR-REV-01"),
        ("US-REV-03", "Review", "Administrator", "ẩn đánh giá vi phạm kèm lý do", "nội dung công khai được kiểm soát", "Bắt buộc", "FR-REV-03"),
    ]
    slines = ["# User Stories 2.0 Draft", "", "Giữ 79 story từ [nguồn chuyển đổi](legacy/user-stories.md), cập nhật checkout và thêm story cho phạm vi mới. Mỗi acceptance criteria phải được bổ sung bằng Test Case tương ứng trong [ma trận](traceability.md).", "", "| Mã | Nhóm | Vai trò | Mong muốn | Lợi ích | Ưu tiên | FR | Acceptance criteria |", "| --- | --- | --- | --- | --- | --- | --- | --- |"]
    for row in stories:
        code, group, actor, wish, benefit, priority = row
        match = ', '.join(story_requirements(code))
        ac = STORY_AC.get(code, f"Given {actor} có quyền và dữ liệu hợp lệ; When {wish}; Then hệ thống thực hiện đúng {match} và phản hồi kết quả; trường hợp dữ liệu/quyền không hợp lệ bị từ chối, không tạo tác động một phần.")
        slines.append("| " + " | ".join(map(safe, (code, group, actor, wish, benefit, priority, match, ac))) + " |")
    for code, group, actor, wish, benefit, priority, ids in extra:
        exact_ids=', '.join(expand_fr_ids(ids))
        ac = STORY_AC.get(code, f"Given {actor} có quyền; When {wish}; Then trạng thái/dữ liệu đúng {exact_ids} và BR liên quan; nếu quyền hoặc điều kiện không hợp lệ thì bị từ chối và không thay đổi dữ liệu.")
        slines.append("| " + " | ".join(map(safe, (code, group, actor, wish, benefit, priority, exact_ids, ac))) + " |")
    reverse={key:[] for key in fr}
    for row in stories:
        for key in story_requirements(row[0]):
            if key in reverse: reverse[key].append(row[0])
    for code,_,_,_,_,_,ids in extra:
        for key in expand_fr_ids(ids):
            if key in reverse: reverse[key].append(code)
    usecases={key:[] for key in fr}
    operations={key:[] for key in fr}
    for uc_code,(ids,ops) in CASE_LINKS.items():
        for key in ids.split(','):
            if key in usecases:
                usecases[key].append(uc_code)
                operations[key].extend(ops.split(','))
    resolved=[]
    for line in trace:
        if 'STORY_PLACEHOLDER' not in line:
            resolved.append(line)
            continue
        key=re.match(r'\| (FR-[A-Z0-9-]+) \|',line).group(1)
        resolved.append(line.replace('STORY_PLACEHOLDER', ', '.join(reverse[key]) or 'TASK-'+key).replace('UC_PLACEHOLDER', ', '.join(usecases[key]) or '—').replace('API_PLACEHOLDER', ', '.join(sorted(set(operations[key]))) or '—'))
    trace=resolved
    slines += ["", "Các story trên là đầu vào backlog. Luồng nhiều nhánh, voucher phân bổ, COD, thanh toán phục hồi và kiểm thử quyền dùng acceptance criteria chi tiết trong [Use Case](use-cases.md) và [Test Plan](test-plan.md); tiêu chí một câu ở đây không thay cho các bảng đó."]

    srs = ["# Đặc tả yêu cầu phần mềm 2.0 Draft", "", "Ngày: 28/09/2026. Bản nền: [SRS 1.1 chuyển đổi](legacy/srs.md). Phạm vi mới đã được xác nhận trong [scope](scope.md). Đây là SRS định hướng; mã yêu cầu chi tiết chỉ được quản lý trong [danh mục FR/NFR](functional-requirements.md).", "", "## Mục tiêu và bối cảnh", "", "Marketplace đa Store cho phép Customer chọn item từ nhiều Store và tạo một Order cho mỗi Store trước thanh toán; các Order dùng Payment và phương thức riêng. Web/Mobile mua sắm, Management Portal quản trị, chatbot RAG và recommendation cá nhân hóa là các luồng MVP.", "", "## Actor và quyền", "", "Guest xem catalog/chat cơ bản; Customer mua, đánh giá, đăng ký Store; Seller vận hành Store; Owner quản lý Store, voucher và báo cáo; Admin quản trị toàn sàn. Một User có thể mang nhiều vai trò. [Ma trận RBAC](rbac.md) là định nghĩa quyền chi tiết.", "", "## Phạm vi chức năng", "", "Catalog, thuộc tính động, giỏ, multi-store checkout, sandbox/COD, voucher Store/toàn sàn, hủy và hoàn mock, review sau mua, mở Store có duyệt, vận hành Seller/Owner, báo cáo, RAG và recommendation offline. [Use Case](use-cases.md) phân rã các mục tiêu. [Quy tắc nghiệp vụ](business-rules.md) chốt tính tiền, trạng thái và xử lý lỗi.", "", "## Ranh giới hệ thống", "", "Bốn service M1–M4 có dữ liệu sở hữu riêng, liên hệ qua REST/event. [Kiến trúc](architecture.md), [API](api-spec.md), [event contract](integration-contract.md) và [ERD](data-dictionary.md) định nghĩa thiết kế.", "", "## Dữ liệu và phi chức năng", "", "Sản phẩm/Variant và kho ở M1; giỏ, Order, Payment riêng Order, voucher và idempotency có TTL ở M2; danh tính và Store ở M3; hành vi, chat và model ở M4. Checkout là quy trình, không có bảng CheckoutSession. Không có FK xuyên service. Các NFR bảo mật, riêng tư, hiệu năng, độ tin cậy và chất lượng AI trong [danh mục](functional-requirements.md) được đánh giá theo [Test Plan](test-plan.md).", "", "## Nghiệm thu MVP", "", "Đủ luồng Web/Mobile/Portal, không truy cập chéo Store/Customer, multi-store checkout theo cả sandbox và COD, hủy riêng Order, voucher cộng dồn, đánh giá có kiểm duyệt, RAG grounded và mô hình recommendation offline có báo cáo Top-K. Các tình huống cụ thể trong [Test Plan](test-plan.md); chưa có kết quả thực thi trong bộ tài liệu này.", "", "## Ngoài phạm vi", "", "Xem [scope](scope.md). Các con số/cấu hình demo cần được ghi trong [deployment](deployment.md) trước khi chạy."]
    for path, content in zip(outputs, (lines, slines, trace, srs, acceptance)):
        path.write_text("\n".join(content) + "\n", encoding="utf-8")
    print(f"Wrote {len(fr)} FR, {len(nfr)+len(NEW_NFR)} NFR and {len(stories)+len(extra)} stories")

if __name__ == "__main__":
    main()

