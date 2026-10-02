"""Replace shared FR outcomes where a story has a narrower user goal."""
from pathlib import Path
import re

path = Path(__file__).resolve().parents[1] / "docs/user-stories.md"
scenarios = {
    "US-PROFILE-01": "Given User đăng nhập; When mở hồ sơ của mình; Then thấy thông tin User/CustomerProfile hiện hành mà không có dữ liệu người khác. Given token hết hạn hoặc cố mở hồ sơ User khác; When đọc; Then trả 401/404, không thay đổi hồ sơ.",
    "US-ADDR-01": "Given Customer đăng nhập; When thêm địa chỉ có người nhận, điện thoại và địa chỉ hợp lệ; Then Address mới nằm trong danh sách của Customer. Given thiếu trường bắt buộc; When lưu; Then trả validation error, không tạo Address.",
    "US-ADDR-02": "Given Customer sở hữu Address; When sửa thông tin giao hàng; Then Address hiện hành đổi và snapshot trên Order cũ giữ nguyên. Given Address của Customer khác; When sửa; Then trả 404, không lộ hoặc đổi dữ liệu.",
    "US-ADDR-03": "Given Customer sở hữu Address; When xóa địa chỉ; Then Address không còn trong danh sách chọn cho Order mới, Order cũ vẫn giữ snapshot. Given Address của Customer khác; When xóa; Then trả 404.",
    "US-ADDR-04": "Given Customer có hai Address; When đặt Address B làm mặc định; Then B là địa chỉ mặc định duy nhất khi mở bước xác nhận. Given Address B không thuộc Customer; When chọn; Then từ chối, địa chỉ mặc định cũ giữ nguyên.",
    "US-CART-03": "Given Customer sở hữu CartItem A và B; When xóa A; Then chỉ A biến mất khỏi giỏ, B giữ nguyên. Given CartItem thuộc Customer khác; When xóa; Then trả 404, không sửa giỏ người khác.",
    "US-SEARCH-04": "Given tìm kiếm ngữ nghĩa đã bật trong cấu hình MVP; When Guest nhập cách diễn đạt không trùng tên Product; Then kết quả liên quan được xếp hạng và lọc Product/Store còn công khai. Given tính năng chưa bật hoặc index lỗi; When tìm; Then dùng tìm kiếm từ khóa hoặc báo fallback rõ ràng, không trả hàng ẩn.",
    "US-REC-04": "Given Customer chưa có đủ lịch sử hoặc model chưa sẵn sàng; When mở Dành cho bạn; Then M4 trả baseline rồi hàng bán chạy/mới, có source=BASELINE/FALLBACK. Given ứng viên bị ẩn hoặc Store khóa; When phục vụ; Then loại ứng viên khỏi danh sách.",
    "US-REC-05": "Given Customer đã đồng ý cá nhân hóa và có event purchase hợp lệ; When mở Dành cho bạn; Then M4 dùng tín hiệu mua cùng search/view/cart để xếp hạng, chỉ trả Product còn bán. Given rút consent; When gọi lại; Then không dùng event cá nhân, trả gợi ý chung.",
    "US-CHAT-02": "Given phiên chat của Guest/Customer có một lượt trước; When gửi thêm tiêu chí; Then M4 dùng context phiên đó để trả lời câu mới mà không bắt người dùng lặp lại. Given session không thuộc User/anonymous key; When gửi; Then từ chối, không lộ lịch sử.",
    "US-CHAT-03": "Given Customer có consent cá nhân hóa và UserPreference hợp lệ; When hỏi chatbot; Then tư vấn có thể dùng sở thích cùng Product context đã xác minh. Given chưa có/rút consent; When hỏi cùng câu; Then không dùng lịch sử cá nhân, vẫn trả tư vấn chung grounded.",
    "US-CHAT-04": "Given M4 truy xuất Product context; When chatbot đề xuất card; Then mỗi Product/giá/thông số khớp context và kiểm tra M1 hiện hành. Given Product vừa bị ẩn/đổi giá; When trả card; Then loại card hoặc cập nhật giá, không dùng dữ liệu embedding cũ.",
    "US-CHAT-05": "Given câu hỏi thiếu tiêu chí hoặc không có Product context phù hợp; When chatbot xử lý; Then nêu rõ giới hạn và hỏi thêm tiêu chí, không bịa sản phẩm. Given câu hỏi ngoài phạm vi mua sắm; When xử lý; Then từ chối hoặc định hướng lại.",
    "US-CHAT-06": "Given câu trả lời có card Product còn công khai; When Guest/Customer chọn card; Then mở trang chi tiết đúng product_id và lấy giá/tồn hiện hành. Given Product bị ẩn trước lúc mở; When điều hướng; Then trang chi tiết báo không còn bán, không giữ card cũ như hàng mua được.",
    "US-MPROD-02": "Given Seller/Owner có quyền Product trong Store active; When chọn ProductType và tạo Product với thuộc tính hợp lệ; Then Product DRAFT thuộc Store hiện hành được lưu. Given chưa có Variant/SKU; When muốn chuyển ACTIVE; Then từ chối cho đến khi có ít nhất một Variant bán được.",
    "US-MPROD-03": "Given Seller/Owner chọn ProductType A; When Portal tải danh sách ProductType; Then form chỉ hiển thị attribute_definitions của A với kiểu, đơn vị, tập giá trị, bắt buộc và cờ tạo Variant. Given đổi sang ProductType B; When dựng lại form; Then trường chỉ thuộc A không còn được chấp nhận.",
    "US-MPROD-04": "Given ProductType có thuộc tính bắt buộc và kiểu dữ liệu; When Seller gửi Product thiếu/sai kiểu; Then M1 trả lỗi từng thuộc tính, không lưu Product bán được một phần. Given dữ liệu hợp lệ; When lưu; Then thuộc tính được chụp theo định nghĩa hiện hành.",
    "US-REP-02": "Given Owner của Store A chọn khoảng ngày hợp lệ và DAY hoặc MONTH; When mở báo cáo; Then revenue_series nhóm đúng kỳ với doanh thu hàng Completed sau giảm giá. Given ngày kết thúc không sau ngày bắt đầu hoặc Owner Store B; When xem; Then trả lỗi và không lộ số liệu Store A.",
    "US-REP-03": "Given Owner của Store A có Product/Order trong kỳ; When mở thống kê Product; Then thấy Product bán chạy và tồn thấp của Store A, số tiền hàng tách phí/thu/hoàn. Given Seller không có quyền báo cáo; When mở; Then trả 403.",
    "US-ADMIN-STORE-01": "Given Admin có quyền và StoreApplication PENDING; When duyệt/từ chối; Then tạo Store/Owner hoặc lưu lý do từ chối có audit. Given Store đang hoạt động; When Admin khóa có lý do và version đúng; Then Product công khai bị ẩn, Order cũ vẫn xử lý. Given actor không phải Admin hoặc version cũ; When gửi; Then từ chối, không đổi trạng thái.",
}

rows = path.read_text(encoding="utf-8").splitlines()
seen = set()
for i, line in enumerate(rows):
    match = re.match(r"^\| (US-[A-Z0-9-]+) \|", line)
    if not match or match.group(1) not in scenarios:
        continue
    cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
    assert len(cells) == 8, (match.group(1), len(cells))
    cells[7] = scenarios[match.group(1)]
    rows[i] = "| " + " | ".join(cells) + " |"
    seen.add(match.group(1))
assert seen == set(scenarios), set(scenarios)-seen
path.write_text("\n".join(rows) + "\n", encoding="utf-8")
