"""Give every NFR an observable Given–When–Then check without claiming execution."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1] / "docs"
cases = {
    "AI-01": ("Bộ câu hỏi cố định có Product còn bán, Product ẩn và giá vừa đổi", "Gọi chatbot RAG và đối chiếu response với context M1 tại thời điểm phục vụ", "Mọi card Product còn công khai và giá đúng; phát biểu về sản phẩm truy được về context, thiếu context thì fallback thay vì bịa."),
    "AI-02": ("Dataset đã khử trùng và chia train/validation/test theo thời gian", "Chạy baseline và model trên cùng test split, cùng K", "Lưu Precision@K, Recall@K, NDCG@K, độ phủ, cấu hình và so sánh baseline; thiếu lần chạy thì ghi chưa thực thi."),
    "API-01": ("OpenAPI và payload mẫu của từng operation đã được đóng phiên bản", "Validate spec, gửi request hợp lệ/sai quyền/sai schema và so response", "Operation, schema, mã lỗi, auth và phân trang đúng contract; validator không báo lỗi."),
    "ARCH-01": ("M1–M4 triển khai với DB/schema và credential riêng", "Kiểm dependency, DB grants và luồng tích hợp giữa service", "Không service nào đọc/ghi bảng riêng của service khác; giao tiếp dùng API/event có contract."),
    "ISO-01": ("Hai Store và hai Customer có dữ liệu riêng; Seller/Owner có token hợp lệ", "Truy vấn ID tài nguyên của Store/Customer khác và đổi store_id trong request", "Backend trả 403/404, không lộ dữ liệu chéo; thao tác trong scope vẫn thành công."),
    "PERF-01": ("Dataset, phần cứng, mạng và tải MVP được ghi trong báo cáo", "Đo API nghiệp vụ thông thường theo kịch bản Test Plan", "Thời gian phản hồi từng API mục tiêu dưới 2 giây; báo cáo số mẫu và percentile, không suy từ một request."),
    "PERF-02": ("Corpus và cấu hình LLM/RAG cố định, mạng và số mẫu được ghi", "Đo từ lúc gửi câu hỏi đến lúc nhận câu trả lời hoàn chỉnh", "Mục tiêu phản hồi dưới 4 giây theo điều kiện MVP; báo cáo percentile và tỷ lệ fallback."),
    "PERF-03": ("Có tối thiểu 100 người dùng đồng thời với mix request ghi rõ", "Chạy load test đủ thời lượng và xuất latency của API thông thường", "Ít nhất 95% request hoàn tất dưới 2 giây; ghi throughput, lỗi và môi trường."),
    "PERF-04": ("Danh sách có nhiều hơn một trang dữ liệu", "Gọi GET list với page/size, gồm giá trị biên", "Mỗi response có items,total,page,size, size không vượt 100 và không trả toàn tập trong một request."),
    "PERF-05": ("Schema, index và truy vấn filter/join/search đại diện đã có", "Kiểm migration/index và EXPLAIN ANALYZE trên dữ liệu mẫu", "Các đường truy vấn chính có index/chiến lược phù hợp được ghi cùng kế hoạch thực thi; truy vấn vẫn đạt NFR-PERF tương ứng."),
    "PRIV-01": ("Có prompt test chứa token, địa chỉ và dữ liệu không cần cho tư vấn", "Gọi chatbot rồi kiểm payload gửi LLM", "Không có secret, token hoặc PII không cần thiết trong payload; chỉ context Product và preference đã đồng ý được gửi."),
    "PRIV-02": ("Có kịch bản login, checkout, lỗi và chat chứa dữ liệu nhạy cảm", "Kiểm log ứng dụng, trace và payload LLM", "Không có password, JWT/API key hoặc PII không cần thiết; correlation ID vẫn đủ đối soát."),
    "REL-01": ("Hai Customer cùng mua SKU có available_quantity=1", "Xác nhận giỏ đồng thời và đối soát tồn/Order", "Tối đa một lần giữ/consume thành công; 0 ≤ reserved_quantity ≤ quantity và không có Order một phần."),
    "REL-02": ("Một Customer gửi cùng Idempotency-Key và payload, rồi payload khác", "Gửi lại POST /orders/batches sau timeout và chạy hai request đồng thời", "Cùng key/payload trả cùng purchase_group_id/Order; key khác payload trả 409; không tạo thêm Payment/Order."),
    "REL-03": ("Product đổi giá/ẩn và M4 có worker index chậm", "Cập nhật Product khi worker tạm dừng, sau đó chạy lại event", "Request cập nhật M1 vẫn hoàn tất; event retry/dedup và card AI kiểm trạng thái hiện hành trước khi hiển thị."),
    "SEC-01": ("User được đăng ký và đổi mật khẩu", "Đọc bản ghi credential qua tài khoản kiểm thử và kiểm tra đăng nhập", "DB chỉ lưu BCrypt hash có salt, không lưu hoặc log plaintext; mật khẩu đúng/sai được xác minh theo hash."),
    "SEC-02": ("Một User đồng thời là Customer và Owner/Seller; token còn hạn", "Gọi API Customer, Store và Admin bằng cùng token", "JWT xác minh user_id; membership/permission Store kiểm tra hiện hành; API Admin từ chối nếu không có quyền Admin."),
    "SEC-03": ("Có input sai định dạng và ID tài nguyên ngoài scope", "Gọi API ghi/đọc với payload sai và ID của User/Store khác", "Validation trả 4xx có mã; backend từ chối truy cập chéo và không ghi dữ liệu một phần."),
    "SEC-04": ("Repo, cấu hình build và biến môi trường của demo sẵn sàng", "Chạy secret scan và rà cấu hình triển khai", "Không có API key/JWT secret/DB credential trong Git hoặc image công khai; secret được nạp từ môi trường."),
    "SEC-05": ("Có access và refresh token kiểm thử", "Đợi access hết hạn, logout và khóa User khi token còn hạn", "Access quá hạn bị từ chối; refresh token đã thu hồi không đổi được token mới; khóa User chặn request mới."),
    "SEC-06": ("Đã cấu hình ngưỡng login, search và chatbot cho môi trường test", "Gửi liên tiếp request vượt từng ngưỡng", "Request vượt ngưỡng trả 429, không chạy xử lý tốn tài nguyên; truy cập bình thường phục hồi sau cửa sổ giới hạn."),
    "SEC-07": ("Demo qua HTTPS và một client cố gửi store_id/customer_user_id giả", "Gọi API có bearer token hợp lệ nhưng ID tự khai khác ngữ cảnh", "TLS hợp lệ; backend suy quyền từ User/membership hiệu lực và từ chối ID giả ngoài scope."),
    "SEC-08": ("Có ảnh hợp lệ và file sai MIME, quá cỡ, tên nguy hiểm", "Gửi các file lên API ảnh Product", "Chỉ ảnh hợp lệ được lưu/phục vụ; file sai bị từ chối, tên được chuẩn hóa và nội dung upload không thực thi."),
    "SEC-09": ("Có thao tác đổi quyền, khóa User/Store, duyệt Store, voucher, Product, tồn và Order", "Thực hiện thao tác rồi truy Audit Log tương ứng", "Mỗi thao tác có actor, đối tượng, hành động, thời gian, lý do khi cần và correlation ID; bản ghi không bị sửa qua API nghiệp vụ."),
    "REL-04": ("Có operation ID cố định cho reserve/consume/release/hoàn kho, callback và Refund", "Phát lại từng command/event hai lần và đổi thứ tự callback", "Tồn, tiền và trạng thái chỉ nhận một tác động hợp lệ; bản ghi trùng được nhận diện và đối soát."),
    "DATA-01": ("Migration/schema của M1–M4 và các ID logic đã có", "Kiểm FK, DB grants, API xác minh tham chiếu và job đối soát", "Không có FK xuyên DB service; ID không tồn tại bị từ chối/đánh dấu đối soát, không âm thầm tạo quan hệ sai."),
    "SEC-10": ("Owner/Seller đang có access token còn hạn", "Thu hồi membership hoặc khóa User/Store rồi gọi lại API quản trị và public catalog", "Request mới bị chặn theo quyền hiện hành; Store khóa không bán/công khai hàng mới, Order cũ vẫn xử lý theo quyền còn hiệu lực."),
    "MONEY-01": ("Quote hai Store có voucher Store/sàn và phần dư khi chia theo VND", "Tạo Order và đối chiếu snapshot Order/Payment/Redemption", "Tất cả tiền là số nguyên không âm; tổng phân bổ bằng giảm sàn; Payment.payable_vnd bằng Order.payable_vnd từng Store; tổng Order bằng quote đã xác nhận."),
}

path = root / "requirements-acceptance.md"
lines = path.read_text(encoding="utf-8").splitlines()
seen = set()
for i, line in enumerate(lines):
    match = re.match(r"^\| TC-NFR-([A-Z0-9-]+) \|", line)
    if not match:
        continue
    key = match.group(1)
    given, when, then = cases[key]
    lines[i] = f"| TC-NFR-{key} | NFR-{key} | {given} | {when} | {then} | Chưa thực thi |"
    seen.add(key)
assert seen == set(cases), set(cases) - seen
path.write_text("\n".join(lines) + "\n", encoding="utf-8")

fr_path = root / "functional-requirements.md"
rows = fr_path.read_text(encoding="utf-8").splitlines()
for i, row in enumerate(rows):
    match = re.match(r"^\| NFR-([A-Z0-9-]+) \|", row)
    if not match:
        continue
    key = match.group(1)
    assert key in cases
    cells = row.split(" | ")
    cells[-1] = f"Xem [TC-NFR-{key}](requirements-acceptance.md); chưa thực thi |"
    rows[i] = " | ".join(cells)
fr_path.write_text("\n".join(rows) + "\n", encoding="utf-8")
