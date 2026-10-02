# Rà soát tài liệu PBL6

> Báo cáo lịch sử của bộ nguồn trước 2.0, không dùng các đề xuất cũ làm quy tắc hiện hành. Quy tắc hiện hành nằm ở [bộ tài liệu 2.1 Draft](README.md): một lần xác nhận tạo một Order/Store và từng Order chọn, thanh toán riêng. Tình trạng kiểm tra tài liệu mới ở [review 2.1](review-2.1.md); chưa đánh dấu nghiệm thu hệ thống khi chưa triển khai/kiểm thử.

Ngày rà soát: 28/09/2026. Phạm vi: toàn bộ 5 file trong `docs_old`, gồm SRS, Use Case, Functional Requirements, User Story và phân công.

**Kết luận:** vấn đề chính là các tài liệu đang phản ánh những phiên bản yêu cầu khác nhau. Ngoài việc đồng bộ checkout và recommendation, nhóm cần đặc tả rõ vòng đời thanh toán–đơn hàng–tồn kho trước khi triển khai. Các bản Markdown chuyển đổi giữ nguyên nghiệp vụ nguồn; nội dung dưới đây là phát hiện và đề xuất, chưa phải quyết định đã được nhóm phê duyệt.

Trong thư mục được cung cấp không có Đề Cương.docx, source code, OpenAPI, ERD hoặc bộ Test Case độc lập để đối chiếu. Vì vậy, “thiếu” trong báo cáo nghĩa là chưa có trong bộ tài liệu đã đọc, không khẳng định nhóm chưa làm ở nơi khác.

## 1. Thứ tự xử lý

P0 cần giải quyết trước khi chốt baseline và contract giao dịch. P1 cần giải quyết trước khi triển khai hoặc nghiệm thu nhóm chức năng tương ứng. P2 là hoàn thiện tài liệu và tổ chức công việc.

| Mã | Mức | Vấn đề | Loại |
| --- | --- | --- | --- |
| R01 | P0 | Một Store hay nhiều Store trong một checkout | Mâu thuẫn trực tiếp |
| R02 | P0 | Chưa khép kín luồng Payment thành công nhưng tạo đơn thất bại | Thiếu quy tắc phục hồi |
| R03 | P0 | Hủy từng đơn trong một checkout đã thanh toán chung | Thiếu quyết định nghiệp vụ |
| R04 | P1 | Bảng FR/NFR chưa cập nhật theo SRS | Lệch phiên bản |
| R05 | P1 | Recommendation có huấn luyện offline chưa được đồng bộ | Lệch phạm vi và tiêu chí |
| R06 | P1 | Trạng thái đơn và bước xử lý đơn còn thiếu | Thiếu nội dung |
| R07 | P1 | Quantity và reservation chưa có định nghĩa đủ dùng | Thiếu bất biến dữ liệu |
| R08 | P1 | Sản phẩm không có lựa chọn biến thể chưa có đường mua rõ ràng | Khoảng trống mô hình |
| R09 | P1 | Tổng tiền, phí giao hàng và snapshot đơn chưa được chốt | Thiếu quy tắc giao dịch |
| R10 | P1 | Quyền Seller, Owner và tác động khóa Store còn mơ hồ | Thiếu ma trận quyền |
| R11 | P1 | Truy vết chưa bao phủ yêu cầu và story thiếu acceptance criteria | Thiếu khả năng nghiệm thu |
| R12 | P1 | Ưu tiên story lệch với từ “phải” trong FR | Mâu thuẫn mức bắt buộc |
| R13 | P1 | RAG chưa quy định xử lý dữ liệu cũ và dữ liệu bị khóa | Thiếu hành vi khi đồng bộ chậm |
| R14 | P1 | Hiệu năng, chất lượng AI và Integration Testing chưa đủ đo kiểm | Thiếu điều kiện kiểm thử |
| R15 | P1 | Ranh giới module và sở hữu dữ liệu mới chưa đồng bộ | Thiếu contract kiến trúc |
| R16 | P2 | Phiên bản và tài liệu tham chiếu chưa nhất quán | Lỗi quản lý tài liệu |
| R17 | P2 | Phân công chưa gắn deliverable, phụ thuộc và mốc hoàn thành | Rủi ro kế hoạch |
| R18 | P2 | Tên actor, mã nguồn đề cương và các mục tùy chọn chưa thống nhất | Lỗi diễn đạt và truy vết |

## 2. Các vấn đề cần xử lý

### R01 — Mâu thuẫn checkout một Store và nhiều Store

**Bằng chứng:** SRS [FR-CART-03, FR-CHECKOUT-01, FR-ORDER-01](legacy/srs.md#table-10), [BR-01/02/16/17/18](legacy/srs.md#table-17) và [AC-04/06](legacy/srs.md#table-34) quy định nhiều Store, một Payment, một Order cho mỗi Store. Trong khi đó [FR-CHECKOUT-01 trong bảng tính](legacy/functional-requirements.md#sheet-1-row-20), [UC-CHECKOUT-01](legacy/use-cases.md#table-16) và [US-CHECKOUT-01](legacy/user-stories.md#sheet-1-row-28) giới hạn một Store. UC còn yêu cầu từ chối nếu chọn nhiều Store.

**Tác động:** Web/Mobile có thể xây luồng khác backend, test đúng tài liệu này nhưng sai tài liệu khác. Mô hình Payment–Order cũng khác nhau.

**Đề xuất:** lấy hướng multi-store của SRS làm ứng viên hợp nhất, sau khi nhóm xác nhận. Cập nhật đồng thời mô tả đầu tài liệu UC, danh mục UC, UC-CART/CHECKOUT/PAY/ORDER, ma trận UC–FR, mục 6 của UC, FR và các story checkout/order. Giữ nguyên mã yêu cầu khi chỉ thay đổi nội dung, ghi lịch sử sửa; không chỉ đổi tiêu đề UC.

### R02 — Thanh toán thành công nhưng tạo Order thất bại

**Bằng chứng:** [UC-CHECKOUT-01 của SRS](legacy/srs.md#table-27) reserve tồn, thực hiện Payment, rồi tạo các Order. Ngoại lệ mới xử lý item không hợp lệ, payment thất bại/hủy và retry. [BR-18](legacy/srs.md#table-17) giới hạn all-or-nothing ở bước xác nhận, nhưng hậu điều kiện UC nói thất bại thì không tạo một phần Order. SRS cũng yêu cầu M1/M2 độc lập dữ liệu.

**Tác động:** chưa rõ xử lý khi Payment Success nhưng M2 lỗi, callback đến muộn, reserve hết hạn, hoặc chỉ tạo được một số Order. Không thể suy ra rollback thanh toán từ rollback cơ sở dữ liệu.

**Cần bổ sung:** trạng thái CheckoutSession, điểm chốt thanh toán, cách truy vấn kết quả khi timeout, cơ chế phục hồi hoặc bù trừ, thời hạn giữ hàng và xử lý callback lặp/sai thứ tự. Quy định một checkout có thể có bao nhiêu lần thử thanh toán và tối đa bao nhiêu lần thành công. Idempotency cần xác định phạm vi theo customer, thời hạn key, kết quả khi cùng key khác payload và xử lý hai request đồng thời.

**Tiêu chí hoàn thành:** có bảng tình huống lỗi và kết quả cuối của Payment, reservation, từng Order, giỏ hàng; có test Payment Success rồi lỗi tạo đơn và retry sau khi mất kết nối. Có thể chọn phương án phục hồi đơn hoặc hoàn giao dịch mock, nhưng phải ghi thành quyết định rõ ràng.

### R03 — Hủy một Order khi Payment thuộc toàn checkout

**Bằng chứng:** [BR-17](legacy/srs.md#table-17) dùng một Payment chung; [FR-ORDER-04](legacy/srs.md#table-10) và [UC-ORDER-01](legacy/srs.md#table-28) cho phép yêu cầu hủy đơn khi trạng thái cho phép. [FR-PAY-02](legacy/srs.md#table-10) chỉ nêu Pending/Success/Failed/Cancelled. Chưa thấy rule hoàn tiền từng phần hoặc cách thể hiện tiền đã thanh toán sau hủy.

**Ví dụ cần quyết định:** checkout Store A và B đã thanh toán; A bị hủy còn B đã giao. Số tiền, trạng thái payment hiển thị cho từng Store, báo cáo doanh thu và tồn kho phải thay đổi thế nào?

**Đề xuất:** chốt hủy ở cấp Order hay toàn checkout, ai có quyền hủy, trạng thái được hủy, có cần Seller chấp nhận hay không, thời điểm hoàn kho và cách mô phỏng hoàn tiền. Hoàn tiền mock không đồng nghĩa phải bổ sung payout/settlement production. Nếu loại hoàn tiền khỏi MVP, phải thu hẹp rõ quyền hủy sau thanh toán và tiêu chí nghiệm thu tương ứng.

### R04 — Thiếu 6 FR và 12 NFR trong bảng yêu cầu

Đối chiếu mã định danh cho kết quả SRS có **77 FR, 24 NFR**; workbook có **71 FR, 12 NFR**. Ngoài các mã thiếu, 6 FR cùng mã có mô tả khác: `FR-CART-03`, `FR-CHECKOUT-01/02/03`, `FR-PAY-01`, `FR-ORDER-01`.

| Nhóm thiếu ở workbook | Mã trong SRS | Nguồn |
| --- | --- | --- |
| Toàn vẹn checkout, giữ tồn, trạng thái Payment | FR-CHECKOUT-04, FR-CHECKOUT-05, FR-PAY-02 | [SRS bảng checkout](legacy/srs.md#table-10) |
| Dataset, huấn luyện và fallback recommendation | FR-REC-09, FR-REC-10, FR-REC-11 | [SRS recommendation](legacy/srs.md#table-11) |
| Tải, pagination, index | NFR-PERF-03, NFR-PERF-04, NFR-PERF-05 | [SRS NFR](legacy/srs.md#table-19) |
| Token, rate limit, HTTPS, upload, audit | NFR-SEC-05, NFR-SEC-06, NFR-SEC-07, NFR-SEC-08, NFR-SEC-09 | [SRS NFR](legacy/srs.md#table-19) |
| Idempotency, tác vụ embedding | NFR-REL-02, NFR-REL-03 | [SRS NFR](legacy/srs.md#table-19) |
| Đánh giá recommendation và log riêng tư | NFR-AI-02, NFR-PRIV-02 | [SRS NFR](legacy/srs.md#table-19) |

**Đề xuất:** sau khi chốt R01/R05, đồng bộ một danh mục yêu cầu chuẩn. Với bảng tổng hợp được sinh từ SRS, không duy trì hai bản chỉnh sửa độc lập. Chênh lệch ở đây là nội dung có sẵn trong nguồn, không phải mất dữ liệu khi chuyển đổi.

### R05 — Recommendation đã tăng phạm vi nhưng tài liệu liên quan còn cũ

**Bằng chứng:** [FR-REC-09/10/11](legacy/srs.md#table-11), [BR-20](legacy/srs.md#table-17), [AC-07](legacy/srs.md#table-34) bắt buộc pipeline implicit feedback và ít nhất một mô hình CF/Matrix Factorization huấn luyện offline. [UC-REC-01](legacy/use-cases.md#table-12) chỉ nói Behavioral/Content-based; FR workbook dừng ở FR-REC-08. Story chưa thể hiện deliverable huấn luyện/đánh giá.

**Đề xuất:** ghi rõ đây là phần bắt buộc của MVP hay quyết định thay đổi phạm vi. Nếu giữ yêu cầu SRS, bổ sung công việc kỹ thuật cho dataset, training, lưu phiên bản model, serving Top-K và đánh giá baseline. Không cần ép tất cả công việc kỹ thuật thành story Customer.

Cần chốt nguồn dataset, trường sự kiện, cách gán search/click về product, chống sự kiện trùng, trọng số, điều kiện “đủ dữ liệu”, K, cách chia train/test, metric và ngưỡng nghiệm thu. Runtime được fallback khi model lỗi không có nghĩa được bỏ deliverable huấn luyện mà AC-07 yêu cầu.

### R06 — Luồng trạng thái đơn chưa đủ cụ thể và có bước trống

**Bằng chứng:** [FR-ORDER-03](legacy/srs.md#table-10) và [FR-SORDER-02](legacy/srs.md#table-15) liệt kê trạng thái nhưng chưa có bảng chuyển trạng thái đầy đủ. [UC-SORDER-01, bảng bước](legacy/use-cases.md#table-33) có **bước 3 trống ngay trong file Word gốc**; phần cốt lõi SRS cũng đi từ xem chi tiết sang kiểm tra chuyển trạng thái mà thiếu hành động chọn trạng thái.

**Đề xuất sửa câu bị thiếu:** “Actor chọn trạng thái đích và xác nhận cập nhật đơn.” Đây là câu đề xuất, chưa chèn vào bản chuyển đổi.

Cần bảng `trạng thái hiện tại → trạng thái đích → actor → điều kiện → tác động`. Làm rõ Order mới sau Payment Success là Pending hay Confirmed; ai chuyển sang Completed; ai được Cancelled; xử lý hai Seller cùng cập nhật và việc gửi lại cùng một thao tác. Không dùng cụm “theo rule” khi chưa có rule tương ứng.

### R07 — Tồn kho chưa định nghĩa quantity và reservation

**Bằng chứng:** [mô hình inventory](legacy/srs.md#table-18), [FR-CHECKOUT-05](legacy/srs.md#table-10), [UC-INV-01](legacy/srs.md#table-31) có `quantity`, `reserved_quantity`, reserve/release nhưng chưa xác định quantity là tồn vật lý hay tồn khả dụng, thời điểm trừ tồn hoặc thời hạn reservation.

**Đề xuất để thảo luận:** nếu quantity là tồn vật lý, định nghĩa `available = quantity - reserved_quantity` và bất biến `0 ≤ reserved_quantity ≤ quantity`. Ghi quy tắc reserve, consume, release, hết hạn, điều chỉnh kho khi đang có reservation và chống xử lý lặp. Reservation cần truy được về checkout và variant. Đây là lựa chọn thiết kế đề xuất, không phải công thức đã có trong SRS.

**Kiểm thử cần có:** hai Customer cùng mua SKU chỉ còn một sản phẩm; điều chỉnh giảm kho lúc hàng đang giữ; payment callback đến sau hết hạn; release được gọi hai lần.

### R08 — Product không có biến thể và thay đổi schema thuộc tính

**Bằng chứng:** [UC-SPROD-01](legacy/srs.md#table-30) chỉ tạo ProductVariant “nếu ProductType có biến thể”; [UC-CART-01](legacy/srs.md#table-26) luôn thêm ProductVariant và inventory cũng gắn variant. Vì vậy đường mua sản phẩm không có lựa chọn size/màu chưa được mô tả.

**Đề xuất:** mỗi sản phẩm bán được có ít nhất một SKU mặc định, hoặc đặc tả một mô hình khác giải quyết nhất quán cart/inventory/order. Chốt duy nhất SKU theo Store hay toàn sàn, duy nhất tổ hợp thuộc tính trong một Product, nguồn giá ưu tiên giữa base_price và variant.price.

[FR-MPROD-04](legacy/srs.md#table-14) yêu cầu thuộc tính bắt buộc, nhưng [attribute_keys](legacy/srs.md#table-18) chưa thể hiện cờ bắt buộc, tập giá trị, đơn vị hoặc giới hạn. Cần quy định xử lý Product hiện có khi Admin đổi kiểu dữ liệu/xóa AttributeKey, ProductType hoặc Category; bảo toàn tham chiếu của đơn đã tạo.

### R09 — Tổng tiền, giao hàng và dữ liệu chụp tại thời điểm mua

**Bằng chứng:** [UC checkout](legacy/srs.md#table-27) hiển thị tổng checkout và từng Store; SRS mục 6.3 chỉ mô tả dữ liệu giao dịch ở mức khái quát. [M2](legacy/srs.md#table-6) liệt kê Promotion nhưng chưa có FR về áp mã hoặc giảm giá. [UC báo cáo](legacy/use-cases.md#table-34) thừa nhận công thức metric chưa xác định.

**Cần chốt:** đơn vị tiền, cách làm tròn, phí giao hàng theo Store hay toàn checkout, discount có thuộc MVP không, tổng từng Order cộng lại khớp Payment thế nào. Nếu phí giao hàng bằng 0 và chưa có promotion trong mock, phải ghi rõ giả định đó.

Order/OrderItem cần quy định snapshot tên, SKU, giá, số lượng, thuộc tính đã chọn và địa chỉ tại lúc đặt hàng để việc sửa Product/Address không đổi lịch sử đơn. Báo cáo phải xác định doanh thu tính theo thanh toán hay đơn hoàn tất, xử lý hủy/hoàn, mốc ngày và múi giờ; tránh tính lặp toàn Payment cho mỗi Store.

### R10 — Quyền hạn và vòng đời Store/tài khoản

**Bằng chứng:** [bảng actor và BR-06/07](legacy/srs.md#table-5) nêu Seller không xem báo cáo doanh thu; [FR-STORE-02](legacy/srs.md#table-13) cho Owner cấp quyền Seller; [UC-ADMIN-03](legacy/use-cases.md#table-40) chưa chốt permission code và quy tắc chỉnh sửa.

**Cần bổ sung:** ma trận role × thao tác × phạm vi, giới hạn quyền Owner được cấp, cách khóa quyền bị cấm cho Seller, quyền sửa role hệ thống, và thời điểm thay đổi quyền có hiệu lực với token đang sống. Chốt quy trình tạo Store/Owner, ai nộp yêu cầu duyệt, trạng thái Store và tác động khóa Store lên catalog, cart, checkout, đơn đã thanh toán, AI index.

Cần nêu rõ Seller có thể xem giá trị từng đơn nhưng không được xem báo cáo tổng, nếu đó là chủ đích. Không mô tả “không xem doanh thu” thành cấm mọi dữ liệu số tiền khi luồng xử lý đơn vẫn cần dữ liệu đó.

### R11 — Truy vết và nghiệm thu theo story chưa đủ

**Bằng chứng:** [ma trận UC–FR](legacy/use-cases.md#table-44) chưa liệt kê `FR-AUTH-04`, `FR-PROFILE-01`, `FR-ADDR-01`, `FR-CAT-01`, `FR-STOREVIEW-01`, `FR-MPROD-01` và 6 FR mới của SRS. FR-AUTH-02 bao gồm Seller/Owner/Admin nhưng UC-AUTH-01 chỉ đặc tả Guest/Customer. [Ma trận SRS](legacy/srs.md#table-35) dùng wildcard theo nhóm, chưa liên kết từng US/API/Test Case. [User Story](legacy/user-stories.md#sheet-1-row-4) chỉ có 6 trường, không có acceptance criteria hay mã FR.

**Đề xuất:** lập bảng `FR → US hoặc technical task → UC/flow → API operation → Test Case → AC`, cho phép nhiều–nhiều. Các yêu cầu xuyên suốt như FR-AUTH-04 không nhất thiết cần UC riêng nhưng phải có điểm áp dụng và test rõ ràng. Mỗi story cần điều kiện thành công, ngoại lệ và giới hạn quyền; bổ sung luồng đăng nhập cho vai trò quản trị, hồ sơ và địa chỉ.

### R12 — Mức ưu tiên không khớp yêu cầu bắt buộc

**Bằng chứng:** [FR-AUTH-03](legacy/functional-requirements.md#sheet-1-row-5) ghi “phải” hỗ trợ quên/đổi mật khẩu, nhưng [US-AUTH-04/05](legacy/user-stories.md#sheet-1-row-8) là “Nên có”. Tương tự FR-SEARCH-03 với [US-SEARCH-03](legacy/user-stories.md#sheet-1-row-20), FR-MPROD-06 với [US-MPROD-06](legacy/user-stories.md#sheet-1-row-64), FR-ADMIN-05/06/07 với các story giám sát/tra cứu liên quan.

**Đề xuất:** chọn một quy ước mức bắt buộc và đồng bộ xuống story. Nếu “Nên có” chỉ là thứ tự thực hiện, đổi tên cột để không bị hiểu thành tùy chọn bỏ khỏi MVP. Với chức năng có điều kiện, ghi điều kiện quyết định đưa vào phạm vi và trạng thái quyết định.

### R13 — RAG cần hành vi rõ khi dữ liệu sản phẩm thay đổi

**Bằng chứng:** [FR-MPROD-09](legacy/srs.md#table-14) đồng bộ embedding sau thay đổi sản phẩm; [NFR-REL-03](legacy/srs.md#table-19) cho phép tách tác vụ AI; [FR-AI-05](legacy/srs.md#table-12) yêu cầu không bịa giá/thông số. Chưa có độ trễ đồng bộ chấp nhận được, hành vi khi sản phẩm/Store bị khóa hoặc quy tắc làm mới giá trong context cũ.

**Đề xuất:** xác định nguồn dữ liệu hiện hành cho card/giá, thời điểm kiểm tra sản phẩm còn được phép hiển thị, loại bỏ sản phẩm ẩn/xóa khỏi kết quả, version dữ liệu, retry và rebuild index. Thêm test sản phẩm đổi giá, hết hàng, bị khóa khi embedding chưa cập nhật; nội dung sản phẩm chứa chỉ dẫn yêu cầu chatbot bỏ quy tắc; Customer truy cập chat session của người khác. Đây là kiểm thử cho phạm vi RAG và dữ liệu cá nhân đã có, không cần mở rộng chatbot thành tác nhân giao dịch.

### R14 — Điều kiện kiểm thử và ngưỡng đánh giá còn thiếu

**Bằng chứng:** [NFR-PERF-03 và NFR-AI-02](legacy/srs.md#table-19) đã có 100 concurrent users, mục tiêu 95% request dưới 2 giây và metric recommendation. Tuy vậy chưa có cấu hình môi trường, kích thước dữ liệu, tải theo endpoint, thời lượng, tỷ lệ lỗi hoặc ngưỡng AI. [Phụ lục B, Integration Testing](legacy/srs.md#table-37) có ô phạm vi trống trong bản gốc.

**Đề xuất:** bổ sung Test Plan với môi trường và dữ liệu cố định, kịch bản tải, cách tính latency, cách tính request lỗi, mục tiêu đạt và bằng chứng. Với chatbot dưới 4 giây, xác định đo đến token đầu hay toàn bộ câu trả lời và có tính thời gian LLM bên ngoài không. Với AI, chốt tập câu hỏi/nhãn, K, cách chia dữ liệu, baseline, metric và ngưỡng; ghi rõ seed/demo data nếu sử dụng.

Integration Testing nên bao gồm M1 reserve/consume/release với M2, callback Payment, phân quyền M3, và cập nhật sản phẩm sang M4. Các số liệu ngưỡng mới phải được nhóm chọn theo môi trường thực tế; báo cáo không tự đặt thành cam kết.

### R15 — Ranh giới module chưa cập nhật theo dữ liệu mới

**Bằng chứng:** [bảng M1–M4](legacy/srs.md#table-6) chưa liệt kê CheckoutSession/OrderGroup và RecommendationInteraction dù mục 6.3 đã thêm chúng. M2 còn chứa Promotion nhưng chưa có yêu cầu chi tiết. M4 gộp Chatbot và Recommendation, còn [phân công](legacy/phan-cong.md#sheet-1-row-2) chia AI và Recommendation Service cho hai người.

**Đề xuất:** thống nhất tên `CheckoutSession` hoặc `OrderGroup` và một tên khóa chính dùng xuyên tài liệu. Bổ sung chủ sở hữu dữ liệu, bên điều phối checkout, interface giữa M1/M2, nguồn sự kiện hành vi, chủ sở hữu pipeline huấn luyện và API serving. Phân biệt “4 module logic” với “4 service triển khai độc lập” bằng quyết định kiến trúc; dùng chung PostgreSQL hạ tầng không tự xác định được quyền truy cập dữ liệu giữa module.

Không cần ép SRS chứa toàn bộ schema API. SRS chốt hành vi quan sát được và bất biến; OpenAPI/thiết kế chốt payload, status code, version event và cơ chế triển khai tương ứng.

### R16 — Phiên bản và nguồn tham chiếu không khớp

**Bằng chứng:** file nguồn tên `SRS_v1.2.docx` nhưng [trang bìa](legacy/srs.md#table-1) ghi 1.1 và [lịch sử](legacy/srs.md#table-3) dừng ở 1.1 ngày 22/09/2026. [UC metadata](legacy/use-cases.md#table-1) ghi 1.0 ngày 19/09/2026, dựa trên SRS 1.0. SRS tham chiếu Đề Cương.docx nhưng file đó không có trong nguồn được cung cấp; thông tin nhóm/lớp đang trống.

**Đề xuất:** chốt version thực tế từ lịch sử thay đổi, ghi tác giả/người rà soát/trạng thái và ngày baseline. Bổ sung bản đề cương có thể truy cập hoặc ghi rõ chưa có để kiểm chứng. Không tự đổi nội dung version thành 1.2 chỉ dựa vào tên file.

### R17 — Phân công chưa đủ để kiểm soát phạm vi

**Bằng chứng:** [bảng phân công](legacy/phan-cong.md#sheet-1) chỉ ghi 5 người với nhóm việc; Công giữ BE, AI và điều phối, Hatsaphone giữ User Web và Recommendation Service. Chưa có owner cho contract, tích hợp, dữ liệu mẫu, kiểm thử, deployment và bộ tài liệu; không có ước lượng hoặc deadline.

**Đề xuất:** bổ sung theo deliverable: người chịu trách nhiệm chính, người review, mã yêu cầu, đầu vào phụ thuộc, đầu ra, mốc dự kiến và tiêu chí hoàn thành. Rà lại tải backend/AI sau khi chốt R05. SRS nói Management Portal dùng chung trong khi phân công tách Admin Web/Seller Web; cần xác định chia khu vực của một portal hay hai ứng dụng để thống nhất routing, authentication và thành phần giao diện.

### R18 — Thuật ngữ và mục tùy chọn dễ gây hiểu khác

**Bằng chứng:** [thuật ngữ SRS](legacy/srs.md#table-4) định nghĩa Seller là nhân viên Store, nhưng tên “Multi-Seller” có thể khiến người đọc hiểu Seller là chủ gian hàng. `Admin`/`Administrator`, `Owner`/`Store Owner`, `Client Web`/`User Web` xuất hiện song song. [Nguồn đề cương của FR-MPROD](legacy/srs.md#table-14) dùng `UC-PROD-01` cho tạo sản phẩm, trùng mã UC duyệt sản phẩm trong danh mục hiện tại; có thể là mã của đề cương khác nên chưa thể kết luận sai tham chiếu.

**Đề xuất:** thống nhất glossary, thêm namespace cho mã nguồn như `OUTLINE:UC-PROD-01` và `SRS:UC-SPROD-01`. SRS mục 3.1 liệt kê lịch sử hội thoại nhưng [FR-AI-08](legacy/srs.md#table-12) vẫn có điều kiện triển khai. Lập danh sách rõ Included/Deferred/Undecided cho lịch sử chat, semantic search độc lập và metric Owner; không dùng “ở mức MVP” làm tiêu chí nghiệm thu.

## 3. Gói sửa đề xuất theo thứ tự

1. **Chốt baseline:** xác nhận hướng checkout, yêu cầu huấn luyện recommendation, version tài liệu và các mục tùy chọn. Sửa R01/R04/R05/R12/R16/R18 trong cùng đợt để tránh phát sinh thêm bản lệch.
2. **Chốt nghiệp vụ giao dịch:** viết bảng trạng thái Checkout/Payment/Order, reservation, hủy/hoàn mock, tổng tiền và snapshot. Giải quyết R02/R03/R06/R07/R08/R09 trước khi cố định ERD và checkout contract.
3. **Chốt quyền và ranh giới tích hợp:** hoàn thiện permission matrix, lifecycle Store, ownership từng entity và contract M1–M4; xử lý R10/R13/R15.
4. **Đồng bộ triển khai và kiểm thử:** thêm truy vết, acceptance criteria, Integration Test Plan, ngưỡng AI/hiệu năng và phân công theo deliverable; xử lý R11/R14/R17.

## 4. Acceptance criteria mẫu cho checkout mới

Các trường hợp dưới đây là **đề xuất** dựa trên hướng multi-store của SRS, chưa phải bộ test đã chạy hoặc rule đã được duyệt. Những điểm có dấu “cần chốt” phụ thuộc quyết định R02/R03/R07.

| Tình huống | Kết quả cần mô tả/kiểm tra | Truy vết |
| --- | --- | --- |
| Chọn item hợp lệ của A và B, Payment thành công | Một Payment thành công; hai Order đúng Store; chung định danh checkout; tổng phân bổ khớp Payment; chỉ xóa item đã mua | FR-CHECKOUT-01, FR-PAY-01/02, FR-ORDER-01; UC-CHECKOUT-01; US-CHECKOUT-01 cần sửa |
| Một item của B hết hàng trước khi xác nhận | Toàn checkout bị từ chối, không tạo Order một phần; xử lý phần tồn đã giữ theo rule | FR-CHECKOUT-04/05; BR-18 |
| Giá thay đổi trước thanh toán | Yêu cầu xác nhận lại giá và tổng; không tự thanh toán giá mới | UC-CHECKOUT-01, FR-CHECKOUT-02/03 |
| Gửi lại cùng checkout với cùng idempotency key và payload | Không tạo thêm Payment/Order; trả trạng thái/kết quả tương ứng checkout cũ | BR-19; NFR-REL-02 |
| Cùng key nhưng payload khác | Từ chối hoặc quy tắc xử lý được chốt rõ trong contract | R02 cần chốt |
| Callback Success lặp hoặc đến sau timeout | Không tiêu thụ tồn hai lần hoặc tạo đơn trùng; đối soát về một kết quả cuối | R02/R07 cần chốt |
| Payment Success nhưng tạo đơn lỗi | Phục hồi/bù trừ đúng phương án đã chốt; không báo thất bại chung chung rồi cho thanh toán lại | R02 cần chốt |
| Hủy Order A, giữ Order B đã thanh toán chung | Tồn, số tiền và trạng thái từng Order/Payment/báo cáo đúng rule đã chốt | FR-ORDER-04; R03 cần chốt |
| Seller A truy cập Order B trong cùng checkout | Bị từ chối; không lộ thông tin đơn/khách của Store B qua tài nguyên checkout chung | BR-04; NFR-ISO-01 |

## 5. Điều kiện để đánh dấu tài liệu đã ổn định

- [ ] Chỉ còn một quy tắc checkout và một phạm vi recommendation được phê duyệt.
- [ ] Danh mục FR/NFR đồng nhất giữa các tài liệu; mọi thay đổi có version và người chịu trách nhiệm.
- [ ] Các trường hợp giao dịch ở mục 4 có kết quả cuối rõ, không còn “theo rule” chưa được định nghĩa.
- [ ] Quyền truy cập và phạm vi dữ liệu xác định được cho từng thao tác.
- [ ] FR có liên kết đến flow hoặc technical task và cách nghiệm thu; story có acceptance criteria.
- [ ] Các ô trống được hoàn thiện; OpenAPI, ERD, Test Plan và phân công liên kết được với baseline.
- [ ] Nội dung đề xuất đã được phân biệt với nội dung Approved; không tự xem bản chuyển đổi là bản chốt.
