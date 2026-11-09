# Tổng hợp phong cách review, gu thẩm mỹ và cách nhìn vấn đề của Reviewer

Tài liệu đúc kết từ chuỗi các đợt review chuyên sâu trên hệ thống PBL6 Market (các đợt review luồng desktop 07/11, 08/11, 09/11/2026; xử lý các phát hiện $T01–T08$, hồi quy sắp xếp $S01$, và các ca biên $G01, G02$).

---

## 1. Gu thẩm mỹ & Tiêu chuẩn thiết kế (Taste & UX Philosophy)

### 1.1. Triệt tiêu quá tải nhận thức (Cognitive Load Reduction)
* **Nguyên lý cốt lõi:** *"Không bao giờ đưa thông tin vận hành nội bộ vào cùng tầng với thông tin ra quyết định của người dùng."*
* **Dị ứng với giao diện phình to, kéo dài vô ích:**
  * Không chấp nhận việc 8 kết quả tìm kiếm chính bị "đè bẹp" bởi 40 thẻ gợi ý/sản phẩm đã xem kéo trang dài hơn $5.500\text{px}$ ($T01$).
  * Không chấp nhận dòng giỏ hàng cao gần $300\text{px}$ chỉ vì form đổi phân loại mở sẵn ($T07$).
  * Không chấp nhận thông báo đẩy các trạng thái cũ của cùng một đơn lên ngang hàng với trạng thái mới nhất ($T03$).
* **Thực dụng, bài trừ trang trí hình thức (Pragmatism over Cosmetics):**
  * Luôn nhắc nhở: *"Không nên bắt đầu bằng đổi font, thêm animation hay tăng khoảng trắng trên toàn bộ hệ thống."*
  * Ưu tiên số một của hệ thống thương mại điện tử là: **chọn đúng hàng, hiểu đúng tiền, thấy rõ bước tiếp theo**.

### 1.2. Mỗi bước giải quyết đúng một quyết định (Task-Driven & Context-Aware)
* Giao diện phải thay đổi theo đúng trạng thái tác nghiệp thực tế của quy trình, không được giữ nguyên các khối thông tin lỗi thời:
  * Khi shop đã bắt đầu kiểm hàng hoàn ($T02$), khối *"Hướng dẫn gửi trả"* không được tiếp tục chiếm vị trí chính vì sẽ khiến khách hàng hoang mang tưởng mình phải gửi thêm lần nữa. Thông tin cần thấy lúc này là tiến độ kiểm tra, khoản hoàn dự kiến và ai chịu phí; hướng dẫn gửi trước đó chỉ nằm trong details tham khảo.
  * Thông báo đổi trả dẫn tới chi tiết đơn phải tự cuộn/mở đúng hồ sơ đổi trả tương ứng ($T04$), không để người dùng bơ vơ ở đầu trang.

### 1.3. Đo lường trên Viewport tiêu chuẩn thực tế
* Không đánh giá giao diện trên màn hình 4K hay môi trường lý tưởng:
  * Môi trường kiểm thử chuẩn luôn là desktop phổ thông: **1366 × 768** và **1440 × 900**.
  * Định lượng sự cải tiến bằng pixel cụ thể: chiều cao dòng giỏ hàng từ $265.8\text{px}$ giảm xuống $162\text{px}$ (giảm 39%), chiều cao toàn trang tìm kiếm từ $5.598\text{px}$ giảm còn $2.794\text{px}$.

---

## 2. Cách nhìn nhận vấn đề & Tư duy kỹ thuật (Problem-solving Mindset)

### 2.1. Nhìn xuyên thấu từ bề mặt UI xuống tận Database Engine & Protocol
Reviewer không bao giờ dừng lại ở việc mô tả triệu chứng bên ngoài, mà luôn truy tìm tận gốc rễ ở tầng kiến trúc:
* **UI thông báo bị phân mảnh ($T03$):** Bóc tách nguyên nhân backend dùng `LIMIT / OFFSET` trên bảng sự kiện phẳng trước khi gom nhóm, khiến cùng một đơn bị tách thành nhiều nhóm khác nhau qua từng trang.
* **Mất dấu watermark đã đọc ($G01$):** Phát hiện ra sự không tương thích giữa độ chính xác microsecond của `timestamptz` trong PostgreSQL (`now()` $\rightarrow$ `.123456`) và hàm chuyển đổi millisecond của JavaScript Date (`.123Z`). Nhận định chính xác phép so sánh `occurred_at <= $4` bị `false`, làm treo badge chưa đọc.
* **Hiển thị giá thẻ sản phẩm sai lệch ($S01$):** Truy vết từ việc frontend hiển thị giá *"Từ..."* nhưng backend ORDER BY theo `min_price` không JOIN với bảng tồn kho (`inventory`) và không áp dụng khoảng lọc giá, dẫn đến việc sản phẩm hết hàng hoặc ngoài khoảng giá bị kéo lên đầu bảng sắp xếp.

### 2.2. Tôn trọng ranh giới nghiệp vụ & Tính toàn vẹn dữ liệu (Domain Boundaries & Data Integrity)
* **Tách bạch 5 trục nghiệp vụ độc lập:**
  1. Đơn hàng (Order)
  2. Thanh toán (Payment)
  3. Vận chuyển / Giao nhận (Shipping / Delivery)
  4. Hậu mãi / Đổi trả (Returns)
  5. Kho & Biến thể (Inventory & Catalog)
* **Nghiêm cấm "suy diễn" trạng thái:**
  * Không biến *"Đã giao hàng"* thành *"Đã thu tiền COD"*.
  * Không suy diễn *"Đã kiểm hàng"* thành *"Đã hoàn tiền"*.
  * Seller chuẩn bị và bàn giao; hãng vận chuyển xác nhận hành trình; tiền theo kết quả đối soát.
* **Bảo toàn lịch sử khi gộp giao diện ($T08$):**
  * Gộp cách trình bày để khách dễ đọc, nhưng không được xóa sự kiện nếu có quyết định mới, thay đổi trách nhiệm phí (`fault_party`), người chịu phí (`fee_payer`) hay số tiền (`amount_vnd`).
  * Khối mở rộng cho khách chỉ lọc thông tin phù hợp; toàn bộ audit trail và log kỹ thuật nội bộ phải giữ nguyên vẹn cho Seller và Admin.

### 2.3. Kiên quyết triệt tiêu giải pháp vá víu (Root-cause over Surface Workarounds)
* Phản đối kịch liệt việc viết accumulator tạm bợ ở frontend để giấu lỗi phân trang của API: *"Accumulator frontend chỉ giải quyết phần đã tải, chưa khắc phục đầy đủ trạng thái mới nhất và tổng chưa đọc. Backend là phương án hoàn chỉnh."*
* Đòi hỏi hợp đồng chuẩn (OpenAPI Contract) phải được cập nhật trước, sinh mã client/DTO đồng bộ thay vì ép kiểu `any` tùy tiện.

### 2.4. Nhạy cảm cao độ với các ca biên (Boundary / Edge Cases & Off-by-one)
* Luôn rà soát ranh giới phân trang: khi nhóm có 10, 11, 20, 21 sự kiện ($G02$), việc trừ bù `total - 1` ở frontend sẽ gây lỗi lệch 1 trang (off-by-one), làm mất sự kiện thứ 11.
* Phải có tham số tường minh (`exclude_primary`, `up_to`) để backend trả về con số chính xác tuyệt đối.
* Không tin vào Unit Test mock sẵn dữ liệu: *"Unit test mock sẵn kết quả trả về không chứng minh được database sắp xếp đúng. Cần test tích hợp SQL với dữ liệu nhiều SKU."*

---

## 3. Phong cách Review & Văn phong (Review Style & Tone)

### 3.1. Tính khách quan và khiêm nhường khoa học (Intellectual Honesty)
* Báo cáo luôn đi kèm tuyên bố ranh giới rõ ràng:
  * *"Đây là review chuyên gia trên dữ liệu demo, không phải usability test hay bằng chứng ảnh hưởng đến conversion."*
  * *"Không dùng lượt review này để kết luận chúng có lỗi xử lý tiền/kho."*
  * *"Phát hiện qua source, chưa thao tác đổi trạng thái trên demo dùng chung."*
* Phân định minh bạch giữa: **Hiện tượng đã quan sát thấy** vs. **Giả thuyết/Dự đoán kỹ thuật** vs. **Phạm vi chưa kiểm chứng**.

### 3.2. Cấu trúc hóa cao độ & Tính hành động rõ ràng (Structured & Actionable)
Mọi phát hiện trong báo cáo đều tuân thủ cấu trúc mẫu mực:
1. **Tái hiện:** Các bước click, URL, tài khoản thực hiện.
2. **Quan sát:** Số liệu đo đạc, số phần tử, chiều cao pixel, sự vô lý trong hiển thị.
3. **Nguyên nhân kỹ thuật:** Phân tích mã nguồn, câu lệnh SQL, logic component.
4. **Hướng sửa:** Giải pháp kiến trúc từ gốc rễ, ranh giới cần bảo vệ.
5. **Tiêu chí kiểm chứng sau sửa (Acceptance Criteria):** Điều kiện cụ thể để đóng issue, ca biên cần phòng tránh.
6. **Vị trí mã nguồn & Ảnh bằng chứng:** Đường dẫn file, số dòng cụ thể, ảnh chụp màn hình đối chứng.
7. **Hệ thống mã hóa chuẩn:** $T01–T08$ (Task phát hiện), $S01$ (Sorting regression), $G01–G02$ (Granularity/Group follow-up), ưu tiên $P2$ thực tế, không thổi phồng nghiêm trọng hóa.

### 3.3. Kỷ luật vận hành mẫu mực (Operational Hygiene)
* Rất thận trọng trên môi trường staging/demo dùng chung: không tùy tiện thực hiện các thao tác ghi phá hủy dữ liệu (đánh dấu đã đọc hàng loạt, hủy đơn, chuyển trạng thái đơn).
* Luôn dọn dẹp trạng thái sau phiên kiểm thử: khôi phục tài khoản demo mặc định, tắt viewport override, trả lại dữ liệu sạch.

---

## 4. Bảng tổng kết đặc trưng Reviewer

| Tiêu chí | Biểu hiện cụ thể của Reviewer |
|---|---|
| **Vai trò tương đương** | Lead Software Architect kiêm Senior Product/UX Designer. |
| **Góc nhìn UX** | Tập trung vào luồng nhiệm vụ, giảm tải nhận thức, đo đạc bằng pixel và viewport chuẩn desktop. |
| **Góc nhìn Kỹ thuật** | Bóc tách vấn đề xuống tầng Database/SQL, kiểu dữ liệu (`timestamptz`), API Contract, phân lớp sạch sẽ. |
| **Quan điểm xử lý lỗi** | Triệt để giải quyết nguyên nhân gốc (Root-cause); bác bỏ giải pháp vá víu tạm bợ ở UI. |
| **Văn phong báo cáo** | Khách quan, chuẩn xác, khiêm nhường khoa học, đầy đủ số liệu và ảnh đối chứng. |
| **Tiêu chuẩn kiểm thử** | Khắt khe với ca biên (off-by-one, microsecond, ranh giới trang), đòi hỏi kiểm thử tích hợp DB thật. |
