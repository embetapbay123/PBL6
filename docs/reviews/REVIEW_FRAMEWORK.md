# Khung Hướng Dẫn & Bộ Quy Chuẩn Review Hệ Thống (Review Framework & Guidelines)

> **Mục đích:** Tài liệu này được chuẩn hóa làm cẩm nang hướng dẫn (framework) và biểu mẫu (template) thực hiện cho tất cả các đợt review chuyên sâu (Expert Review / Deep-dive Review) sau này của dự án. 
> Bất kỳ ai (chuyên gia hoặc AI Agent) khi tiến hành review đều phải tuân thủ nghiêm ngặt các nguyên tắc, góc nhìn và quy chuẩn báo cáo dưới đây.

---

## Phần 1: 5 Nguyên Tắc Cốt Lõi (Core Principles)

### 1. Triệt tiêu quá tải nhận thức (Cognitive Load Reduction)
* **Quy tắc vàng:** *"Không bao giờ đưa thông tin vận hành nội bộ vào cùng tầng với thông tin ra quyết định của người dùng."*
* Bất kỳ màn hình nào làm người dùng mất tập trung vào tác vụ chính đều bị coi là lỗi UX:
  * Kết quả tìm kiếm/lọc không được để các khối phụ (gợi ý, sản phẩm tương tự, đã xem) đè bẹp kết quả chính.
  * Form thao tác phụ (như chọn phân loại, sửa số lượng) không được mở sẵn làm phình to chiều cao danh sách mà phải thu gọn mặc định.
  * Dòng thông báo không được đẩy hàng loạt cập nhật cũ của cùng một đơn lên ngang hàng với trạng thái mới nhất.

### 2. Mỗi bước giải quyết đúng một quyết định (Task-Driven & Context-Aware UX)
* Giao diện phải phản ánh đúng **giai đoạn tác nghiệp thực tế**:
  * Khi hàng đổi trả đã bước vào giai đoạn kiểm tra tại kho, khối "Hướng dẫn gửi trả" phải lập tức lùi vào vị trí tham khảo đóng mặc định; ưu tiên hàng đầu là kết luận kiểm hàng, tiến độ xử lý và khoản hoàn.
  * Đường dẫn từ thông báo phải đưa người dùng đến đúng ngữ cảnh (anchor link, mở sẵn accordion/tab tương ứng), không để người dùng bơ vơ ở đầu trang.

### 3. Nhìn xuyên thấu từ bề mặt UI xuống tận Database Engine & Protocol (Full-Stack Depth)
* Không chấp nhận kết luận hời hợt kiểu *"Giao diện hiển thị sai"*. Luôn phải đào sâu tìm ra nguyên nhân gốc rễ (Root Cause):
  * Lỗi UI phân mảnh $\rightarrow$ Truy vấn SQL `LIMIT / OFFSET` cấp sự kiện hay cấp nhóm?
  * Lỗi watermark/badge không tắt $\rightarrow$ Kiểu dữ liệu `timestamptz` (microsecond) bị parser JS Date cắt xén thành millisecond?
  * Lỗi sắp xếp giá không khớp thẻ hiển thị $\rightarrow$ Biểu thức `min_price` trong SQL có JOIN tồn kho và tôn trọng khoảng lọc giá không?

### 4. Tôn trọng ranh giới nghiệp vụ & Tính toàn vẹn dữ liệu (Domain Integrity)
* Tách bạch 5 trục nghiệp vụ độc lập: **Đơn hàng (Order) – Thanh toán (Payment) – Vận chuyển (Shipping) – Hậu mãi/Đổi trả (Returns) – Tồn kho (Inventory)**.
* **Tuyệt đối cấm "suy diễn" trạng thái:**
  * Không suy diễn *Đã giao hàng* là *Đã thu tiền COD*.
  * Không suy diễn *Đã kiểm hàng* là *Đã hoàn tiền*.
* Gộp hiển thị cho người dùng xem thì được, nhưng **không được làm mất lịch sử hay thay đổi bản chất dữ liệu** (phải tách mốc khi có quyết định mới, thay đổi người chịu phí, đổi số tiền; giữ nguyên audit trail nội bộ).

### 5. Khách quan, trung thực khoa học & Kỷ luật vận hành (Operational Hygiene)
* Luôn phân định minh bạch giữa 3 cấp độ:
  1. *Đã kiểm chứng trực tiếp trên demo* (có số liệu, URL, ảnh chứng minh).
  2. *Phát hiện qua đọc mã nguồn / suy luận kỹ thuật* (chưa thử thao tác trên UI).
  3. *Phạm vi chưa kiểm chứng / giới hạn của lượt review*.
* **An toàn môi trường dùng chung:** Tuyệt đối không bấm các nút tạo tác động ghi (đổi trạng thái đơn, đánh dấu đọc hàng loạt, hủy đơn) trên môi trường demo dùng chung trừ khi đã cô lập dữ liệu. Sau phiên review phải trả lại tài khoản mặc định và hủy bỏ viewport override.

---

## Phần 2: Tiêu Chuẩn Môi Trường & Đo Lường

* **Desktop tiêu chuẩn:** Bắt buộc kiểm tra trên 2 độ phân giải chuẩn thị trường:
  * **1366 × 768** (Độ phân giải phổ thông, kiểm tra độ chật hẹp, tràn màn hình, cuộn mỏi).
  * **1440 × 900** (Độ phân giải làm việc chuẩn, kiểm tra khoảng trắng, tỷ lệ bố cục).
* **Định lượng bằng số liệu thực tế:**
  * Chiều cao pixel các khối thành phần (chiều cao dòng giỏ hàng, chiều cao bảng, chiều cao viewport).
  * Tỷ lệ phần trăm diện tích các khối phụ so với khối nội dung chính.
  * Số lượng bản ghi hiển thị trên màn hình đầu tiên (Above the fold).
* **Kiểm tra ca biên (Edge cases & Off-by-one):**
  * Ranh giới phân trang: thử các mốc $10, 11, 20, 21$ bản ghi.
  * Dữ liệu rỗng (Empty state), dữ liệu cực lớn, chuỗi tiếng Việt có dấu và không dấu.

---

## Phần 3: Quy Ước Phân Loại & Đặt Mã Vấn Đề

| Tiền tố mã | Ý nghĩa | Ví dụ |
|---|---|---|
| **Txx** (Task) | Các phát hiện mới trong đợt review luồng tác vụ người dùng. | `T01`, `T02`, `T08` |
| **Sxx** (Sorting / Search) | Các hồi quy, sai sót liên quan đến tìm kiếm, lọc, sắp xếp dữ liệu. | `S01` |
| **Gxx** (Granularity / Group) | Các ca biên, lỗi ranh giới thời gian, phân trang, độ mịn dữ liệu. | `G01`, `G02` |
| **Nxx** (Navigation) | Các vấn đề điều hướng, luồng chuyển trang, breadcrumb, anchor link. | `N01` |

### Thang đo mức độ ưu tiên (Severity):
* **P0 (Blocker):** Chặn đứng luồng người dùng chính, mất tiền, sai lệch giao dịch tài chính, mất dữ liệu không thể phục hồi.
* **P1 (Critical):** Luồng nghiệp vụ chính bị gián đoạn nhưng có đường vòng tạm thời; tính toán số tiền hoặc tồn kho không nhất quán.
* **P2 (High/Major):** Quá tải thông tin nghiêm trọng, đứt đoạn ngữ cảnh, lỗi ranh giới phân trang/thời gian, hồi quy logic sắp xếp/lọc, hiển thị gây hiểu lầm hành động tiếp theo.
* **P3 (Minor/Polish):** Khoảng cách hiển thị chưa tối ưu, câu chữ chưa thật mượt mà nhưng không gây hiểu nhầm tác vụ.

---

## Phần 4: Biểu Mẫu Chuẩn Cho Báo Cáo Review (Report Template)

```markdown
# Review [Tên phân hệ / Luồng cần review]

Ngày: DD/MM/YYYY. Bản demo: [URL]. Desktop: **1366 × 768** [và/hoặc 1440 × 900], tài khoản: [Tên tài khoản].
Đối chiếu mã local tại commit / branch: [Mã commit].

## 1. Kết luận tổng quan

[Tóm tắt ngắn gọn 2 - 3 câu về vấn đề lớn nhất của lượt review: quá tải thông tin ở đâu, bước tác nghiệp nào bị nghẽn, ranh giới dữ liệu nào bị vi phạm]

Đây là review chuyên gia trên dữ liệu demo, không phải usability test với người dùng thật. Không phát hiện P0/P1 trong các thao tác đã quan sát; chưa kiểm thử [các luồng ngoại lệ chưa thao tác].

| Mã | Phát hiện | Mức độ | Ưu tiên thực hiện |
|---|---|---|---|
| [Mã] | [Tóm tắt phát hiện trong 1 câu] | P2 | Trước |
| [Mã] | [Tóm tắt phát hiện trong 1 câu] | P2 | Tiếp |

---

## 2. Chi tiết các phát hiện

### [Mã] — [Tiêu đề phát hiện súc tích, phản ánh rõ bản chất vấn đề]

**Tái hiện:** [Đăng nhập tài khoản X] → [Mở trang Y] → [Thao tác click/lọc Z].

**Quan sát:**
- [Số lượng bản ghi chính vs bản ghi phụ].
- [Đo lường pixel: chiều cao khối chính, chiều cao khối phụ, chiều cao toàn trang].
- [Mô tả chi tiết cảm nhận nhận thức: người dùng bị phân tâm như thế nào, thông tin nào bị che khuất hoặc gây hiểu nhầm].

**Nguyên nhân kỹ thuật:**
- [Chỉ rõ nguyên nhân từ mã nguồn: câu SQL nào, props component nào, API nào chưa phân trang đúng].
- [Trích đoạn code hoặc logic gây lỗi nếu có].

**Hướng sửa đề xuất:**
- [Định hướng kiến trúc sạch, giải quyết triệt để nguyên nhân gốc].
- [Ranh giới dữ liệu nào phải bảo toàn, không được suy diễn].

**Tiêu chí kiểm chứng sau sửa (Acceptance Criteria):**
- [Điều kiện đo lường cụ thể để đóng issue].
- [Ca biên cần kiểm tra để tránh hồi quy].

**Vị trí mã nguồn:** `[Tên file]:[dòng]`
**Bằng chứng:** `[Link ảnh chụp màn hình]`

---

## 3. Kiểm chứng các bản sửa đợt trước (nếu có)

| Mục | Kết quả kiểm chứng thực tế | Trạng thái |
|---|---|---|
| [Mã cũ] | [Mô tả hiện trạng sau sửa, số liệu đo lường mới so với số liệu cũ] | Đạt / Chưa đóng |

---

## 4. Giới hạn kiểm thử & Kỷ luật vận hành

- Các lệnh build/test đã chạy: `frontend build` (PASS/FAIL), `backend test` (số test PASS).
- Thao tác an toàn: Không thực hiện các thao tác ghi phá hủy dữ liệu trên demo dùng chung.
- Đã khôi phục tài khoản demo mặc định và xóa bỏ viewport override sau phiên kiểm tra.
- Các trường hợp chưa kiểm tra end-to-end: [Liệt kê rõ ràng để tránh hiểu nhầm là hệ thống đã 100% không lỗi].
```

---

## Phần 5: Prompt Mẫu Để Kích Hoạt AI Thực Hiện Review Theo Phong Cách Này

Khi muốn giao việc cho AI Agent thực hiện review một luồng mới, sử dụng System Prompt / Prompt chỉ thị sau:

```text
Bạn là một Lead Software Architect kiêm Senior Product/UX Designer đang thực hiện Expert Review chuyên sâu cho hệ thống PBL6 Market.
Hãy đọc kỹ cẩm nang tại docs/reviews/REVIEW_FRAMEWORK.md và tuân thủ tuyệt đối các nguyên tắc sau:

1. GU THẨM MỸ & UX:
   - Triệt tiêu quá tải nhận thức: không đưa thông tin vận hành nội bộ vào cùng tầng với thông tin ra quyết định.
   - Mỗi bước giải quyết đúng một quyết định: giao diện phải thay đổi theo đúng trạng thái tác nghiệp thực tế.
   - Luôn đo lường kích thước pixel, mật độ thông tin trên desktop 1366x768 và 1440x900.
   - Bài trừ trang trí hình thức: tập trung chọn đúng hàng, hiểu đúng tiền, thấy rõ bước tiếp theo.

2. TƯ DUY KỸ THUẬT & TOÀN VẸN DỮ LIỆU:
   - Luôn đào sâu tìm nguyên nhân gốc rễ (Root Cause) từ UI xuống SQL Engine, kiểu dữ liệu, API Contract.
   - Giữ rạch ròi 5 trục: Đơn hàng, Thanh toán, Vận chuyển, Đổi trả, Kho hàng. Tuyệt đối không suy diễn trạng thái.
   - Cực kỳ nhạy cảm với ca biên (off-by-one, phân trang 10/11/20/21, microsecond timestamp).
   - Bác bỏ giải pháp vá víu tạm bợ ở UI; kiên quyết yêu cầu sửa từ tầng nguồn dữ liệu.

3. KỶ LUẬT BÁO CÁO:
   - Viết báo cáo tuân thủ 100% Report Template tại Mục 4 của docs/reviews/REVIEW_FRAMEWORK.md.
   - Luôn đầy đủ: Tái hiện -> Quan sát (có số liệu/px) -> Nguyên nhân kỹ thuật (kèm file/dòng) -> Hướng sửa -> Tiêu chí kiểm chứng -> Ảnh/vị trí.
   - Khách quan, trung thực khoa học: phân biệt rõ giữa đã kiểm chứng trên demo, phát hiện qua đọc code, và phạm vi chưa kiểm chứng.
```
