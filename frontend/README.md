# PBL6 Multi-Store Marketplace — UI & Mock Data Demo

Mặc định chạy khung React gọi API thật cho auth/profile/catalog. `/?mode=mock` mở UI mô phỏng cũ với localStorage; không đại diện nghiệp vụ backend đã hoàn thiện. Xem [bàn giao khung](../docs/implementation/README.md) và [README gốc](../README.md). Các mô tả demo bên dưới thuộc chế độ mock.

---

## 🚀 Hướng Dẫn Khởi Chạy

Từ thư mục gốc dự án hoặc thư mục `frontend`:

```bash
# Cách 1: Chạy từ thư mục gốc c:\PBL6
npm run dev

# Cách 2: Chạy trong thư mục frontend
cd frontend
npm run dev
```

Mở trình duyệt truy cập: **`http://localhost:3000`**

---

## 🎯 Các Tính Năng & Luồng Màn Hình Đã Hoàn Thiện

### 1. Phân vai đa ngữ cảnh & Chuyển đổi nhanh (Role Switcher Bar)
Ngay trên thanh điều hướng đầu trang, có bộ chọn nhanh vai trò cho phép kiểm thử toàn bộ ma trận RBAC:
* **Customer**: `Nguyễn Văn An` (`customer@pbl6.vn`)
* **Store Owner (Chủ Store A)**: `Trần Thị Bình` (`owner@techhub.vn` — TechHub Official)
* **Seller (Nhân viên Store A)**: `Lê Văn Cường` (`seller@techhub.vn` — TechHub Staff)
* **Store Owner (Chủ Store B)**: `Phạm Thị Dung` (`owner@fashionistar.vn` — Fashionistar Studio)
* **Administrator (Quản trị viên toàn sàn)**: `Admin Tổng` (`admin@pbl6.vn`)
* **Guest (Khách vãng lai)**

---

### 2. Luồng Khách Hàng (Customer Flows C01 – C10)
* **C01. Khám phá & Chi tiết sản phẩm**:
  * Tìm kiếm, lọc theo danh mục (Điện tử, Thời trang, Đời sống, Sách).
  * Modal chi tiết sản phẩm: chọn biến thể (Màu sắc, Switch, Size), cập nhật giá và tồn kho khả dụng (`quantity - reservedQuantity`) thời gian thực, xem thông tin Store và đánh giá từ khách hàng.
* **C02. Tài khoản & Mock Mailbox**:
  * Mô phỏng máy chủ email demo (`Mock Mailbox`) để nhận link xác minh email, OTP đặt lại mật khẩu và lời mời nhân viên gian hàng.
* **C03. Giỏ hàng đa Store**:
  * Tự động phân nhóm CartItem theo từng Gian hàng (`storeId`).
  * Chọn / bỏ chọn sản phẩm theo từng Store hoặc toàn giỏ, cập nhật số lượng, tạm tính từng Store.
* **C04. Báo giá & Áp dụng Voucher 2 tầng**:
  * Hiển thị bảng tính giá riêng từng Store: Tiền hàng + Phí ship Store.
  * Áp dụng tối đa 1 Voucher Store cho mỗi Store + 1 Voucher toàn sàn (cộng dồn theo đúng quy tắc: Store voucher áp trước, Platform voucher phân bổ sau).
  * Hiển thị **Tổng thanh toán tham khảo** (không gộp thành 1 Payment chung).
* **C05. Đặt hàng & Idempotency**:
  * Khách hàng chọn phương thức thanh toán **SANDBOX** hoặc **COD** riêng cho từng Store.
  * Bấm xác nhận một lần: Hệ thống sinh `purchase_group_id` duy nhất và tạo một `Order` + một `Payment` riêng biệt cho mỗi Store. Tồn kho được chuyển vào trạng thái `reservedQuantity`.
* **C06. Thanh toán Sandbox Simulator**:
  * Đồng hồ đếm ngược 15 phút (giữ tồn).
  * 3 nút giả lập kịch bản:
    1. **Thành công (Happy path)**: Callback thành công, Payment `SUCCESS`, Order `PENDING/CONFIRMED`.
    2. **RECOVERING**: Giả lập lỗi consume kho tạm thời, Order rơi vào `RECOVERING` để worker retry.
    3. **Thất bại**: Payment `FAILED`.
* **C07. Quản lý Đơn hàng, Tracking & Hủy đơn/Hoàn tiền**:
  * Phân tách nhãn rõ ràng: Trạng thái Đơn hàng và Trạng thái Thanh toán.
  * Nút "Thanh toán ngay" cho đơn Sandbox đang chờ.
  * Hủy đơn hàng khi còn ở trạng thái `AWAITING_PAYMENT`, `PENDING` hoặc `CONFIRMED`. Nếu đơn đã thanh toán Sandbox, tự động sinh bản ghi `Refund` (Mock Refund) và giải phóng tồn kho đã giữ.
* **C08. Đánh giá sản phẩm sau mua**:
  * Chỉ những sản phẩm thuộc Order `COMPLETED` mới hiển thị nút viết đánh giá (1–5 sao kèm nhận xét).
* **C09. Mở Store & Lời mời nhân viên**:
  * Khách hàng nộp đơn đăng ký mở Store kèm mã số kinh doanh.
  * Hộp thư lời mời nhân viên (`GET /me/invitations`) theo email đã xác minh kèm 4 nhóm quyền.
* **C10. Trợ lý AI Chatbot & Gợi ý "Dành cho bạn"**:
  * Chatbot RAG grounded tra cứu trực tiếp catalog sản phẩm đang bán.
  * Trích xuất và đính kèm thẻ sản phẩm (Product Card) trực tiếp trong khung chat.

---

### 3. Portal Quản Lý Gian Hàng (Seller & Owner Portal S01 – S05)
* **S01. Quản lý Sản phẩm**: Chuyển trạng thái `DRAFT` / `PUBLISHED` / `STOPPED`, hiển thị cảnh báo nếu bị Admin ẩn kiểm duyệt.
* **S02. Quản lý Kho & Tồn**: Bảng chi tiết `quantity`, `reservedQuantity`, `available`. Modal điều chỉnh tồn có lý do bắt buộc và ghi nhận nhật ký kiểm toán `StockMovement`.
* **S03. Xử lý Đơn hàng Store**: Vận hành quy trình đơn hàng: `CONFIRMED` → `PROCESSING` → `SHIPPED` → `COMPLETED`. Thu tiền mặt COD khi giao hàng thành công.
* **S04. Nhân sự & Phân quyền (Chỉ Owner)**: Danh sách nhân viên, gán/thu hồi 4 nhóm quyền vận hành (Sản phẩm, Kho, Đơn hàng, Thu COD), gửi lời mời qua email, khóa/mở quyền nhân viên.
* **S05. Voucher Store & Báo cáo Tài chính (Chỉ Owner)**: Danh sách voucher của Store; Báo cáo doanh số hàng, tiền đã thu thành công và số đơn hoàn tất.

---

### 4. Portal Quản Trị Hệ Thống (Administrator Portal A01 – A03)
* **A01. Duyệt đơn mở Store & Quản lý User/Store**: Duyệt hoặc từ chối đơn kèm lý do; Khóa/mở khóa tài khoản User và Store kèm ghi nhận Audit Log.
* **A02. Kiểm duyệt Nội dung**: Ẩn/gỡ ẩn sản phẩm vi phạm; Ẩn/hiển thị lại đánh giá của khách hàng (lưu lý do kiểm duyệt).
* **A03. Voucher Toàn Sàn & Giám sát AI**: Quản lý voucher toàn sàn; Giám sát nhật ký kiểm toán hệ thống (Audit Logs) và trạng thái RAG Grounding.

---

### 5. Dữ Liệu Mẫu (Mock Data)
Toàn bộ dữ liệu mẫu trong `src/data/mockData.ts` được đồng bộ qua `localStorage` và có nút **"Reset Demo Data"** trên thanh điều hướng để khôi phục dữ liệu ban đầu bất kỳ lúc nào.

### Customer API sample retry

The default API-mode product list uses `ProductsSample` and the shared `ErrorView`. API failures display the server message and correlation ID with an optional retry action. Retrying keeps the same query, shows loading and prevents another retry while the request runs; it never switches to mock data. The legacy UI above is available separately with `?mode=mock`.

PR #89 covers this retry behavior only. WEB-01 remains open for its full acceptance criteria. `tests/scaffold.spec.ts` checks 503 → retry → real M1 recovery at a phone viewport, together with search, pagination and the existing API samples.
