# Test Plan và Test Case thiết kế — 2.1 Draft

**Trạng thái:** chưa thực thi. Mã TC mô tả kịch bản và kết quả kỳ vọng, không báo PASS khi chưa có log/bằng chứng. Kiểm thử unit cho phép tính và state machine; integration cho M1–M4/gateway; E2E trên Web/Mobile/Portal; security, performance và AI dùng dữ liệu/cấu hình cố định. Mỗi PR triển khai gắn FR/BR/UC/TC từ [ma trận truy vết](traceability.md).

[Tiêu chí riêng cho toàn bộ 98 FR và 28 NFR](requirements-acceptance.md) bổ sung các trường hợp dưới đây; chúng cũng đang ở trạng thái chưa thực thi.

## Dữ liệu và điều kiện chung

Tạo Customer C1/C2, Seller SA/SB, Owner OA/OB, Admin; Store A/B đều active và Store C locked. Product A1/B1 mỗi SKU tồn 5, Product A2 chỉ tồn 1, Product B2 bị ẩn; một Product không có thuộc tính biến thể có SKU mặc định. Địa chỉ của C1/C2 khác nhau. Voucher Store A giảm 10.000, Store B phần trăm có trần; voucher toàn sàn 30.000; bản hết hạn và hết lượt. Cổng sandbox có Success/Fail/timeout/callback lặp; worker có chế độ giả lập lỗi M1/M2. Lưu ID và số tiền snapshot để đối chiếu độc lập.

| TC | Mức | Điều kiện và thao tác | Kết quả cần xác nhận | FR/BR |
| --- | --- | --- | --- | --- |
| TC-AUTH-01 | Integration | C1 đăng ký, lấy link xác minh email từ mock mailbox, thử link sai/hết hạn; đăng nhập/đăng xuất và dùng refresh cũ | Mật khẩu hash; email_verified_at chỉ có sau link hợp lệ; chưa xác minh không xem/nhận lời mời; refresh đã revoke không dùng được | FR-AUTH-01/02, BR-35, NFR-SEC-01/05 |
| TC-AUTH-02 | Integration | Customer/Seller/Owner/Admin yêu cầu reset trước đăng nhập; lấy mã từ mock mailbox demo, xác nhận một lần; đổi mật khẩu sau đăng nhập | Mọi vai trò dùng cùng tài khoản; email/token không bị lộ qua response hoặc log; email không tồn tại nhận phản hồi giống nhau; token hết hạn/đã dùng và mật khẩu cũ sai bị từ chối; phiên cũ thu hồi | FR-AUTH-03, UC-AUTH-RESET/CHANGE |
| TC-ACC-01 | E2E | C1 nộp StoreApplication, Admin từ chối có lý do rồi duyệt đơn mới | Đơn cũ giữ lịch sử; Store/Owner chỉ tạo ở lần duyệt, một transaction | FR-STORE-05/06, BR-33 |
| TC-ACC-02 | Integration | C1 đang Owner A thử nhận Seller B | Từ chối membership active thứ hai | FR-AUTH-05, BR-03 |
| TC-ACC-03 | E2E | Admin khóa Store A khi còn Order đang xử lý | Product A mất khỏi catalog/AI/checkout; SA/OA vẫn xử lý đơn cũ theo quyền | FR-STORE-08, BR-34 |
| TC-ACC-04 | Integration | OA xem Seller/lời mời, thu hồi quyền kho, khóa rồi mở lại SA; thử thao tác Store B | Chỉ trả nhân viên A; request SA bị từ chối ngay khi thu hồi/khóa; mở khóa chỉ phục hồi quyền còn được cấp; Store B không đổi | FR-STORE-02, BR-04/35 |
| TC-ACC-05 | E2E | Owner mời nhầm rồi thu hồi; Customer xem lời mời của mình, thử nhận lời mời thu hồi/hết hạn/email khác và nhận lời mời còn hạn | Chỉ lời mời đúng email đã xác minh được thấy và nhận; thu hồi/hết hạn không tạo membership; lời mời hợp lệ chỉ tạo một membership; audit ghi thu hồi, mock mailbox không làm lộ token qua API | FR-STORE-07, UC-STAFF-INBOX/INVITE/ACCEPT, BR-35 |
| TC-SEC-01 | Security | SA đọc/sửa Product hoặc Order B, xem báo cáo A; OA cấp Admin cho SA | Từ chối; không lộ dữ liệu/không cấp quyền vượt Store | FR-AUTH-04, BR-04/07/35 |
| TC-SEC-02 | Security | C2 mở Address/Order/Chat/Review của C1 | 404 hoặc từ chối theo contract, không trả nội dung | BR-05 |
| TC-SEC-03 | Security | Log/prompt của login/chat với dữ liệu nhạy cảm | Không có password, token, secret, địa chỉ không cần thiết | NFR-PRIV-01/02 |
| TC-SEC-04 | Integration | OA thu hồi quyền kho của SA trong lúc token SA còn hạn | Request sau bị từ chối | NFR-SEC-10, BR-35 |
| TC-SEC-05 | Security | C1 chưa consent, sau đó đồng ý rồi rút consent cá nhân hóa; gửi view/cart/chat | Trước đồng ý và sau rút không dùng hành vi cá nhân cho gợi ý; log/prompt không chứa dữ liệu nhạy cảm; fallback chung vẫn hoạt động | NFR-PRIV-01/02, FR-REC-*, UC-REC-FOR-YOU |
| TC-SEC-06 | Integration | Admin khóa/mở User/Store, duyệt Store, ẩn/hiện Product/Review; Owner đổi quyền/voucher; Seller điều chỉnh kho/hủy đơn | Mỗi thao tác có actor, đối tượng, thời điểm, trước/sau, lý do khi bắt buộc và correlation ID; người ngoài scope không đọc/sửa audit | NFR-SEC-09, UC-ADMIN-*, UC-STAFF-* |
| TC-CAT-01 | Unit | Tạo ProductType có trường required/kiểu/tập giá trị; nhập sai | M1 trả lỗi từng trường, không lưu Product sai | FR-MPROD-03/04, BR-08 |
| TC-CAT-02 | Integration | Product không màu/size; thêm SKU mặc định, thử SKU trùng Store; sửa sau khi mua | Mua được; trùng bị từ chối; Order snapshot giữ giá/tên cũ | FR-MPROD-10, BR-09/36 |
| TC-CAT-03 | E2E | Seller A xem/tìm Product nháp/ngừng bán trong Store A, Guest xem catalog công khai | Seller thấy đúng Product A để quản lý; Guest không thấy Product ngừng bán/Admin ẩn/Store khóa; không lộ Product B cho Seller A | FR-MPROD-01, BR-38 |
| TC-CAT-04 | E2E | Seller đăng bán DRAFT, ngừng/bật bán lại; Admin ẩn rồi bỏ ẩn Product ACTIVE và STOPPED | Chỉ đăng bán khi Store/SKU/giá hợp lệ; Seller không tự gỡ ẩn Admin; Admin bỏ ẩn Product STOPPED không tự đăng bán; Product ACTIVE hợp lệ trở lại catalog/AI; mọi thao tác có audit/version | FR-MPROD-05, FR-ADMIN-04, BR-09/38 |
| TC-INV-01 | Integration | C1/C2 đồng thời mua SKU chỉ có một; retry reserve/consume/release | Không bán quá 1; bất biến tồn và một StockMovement/operation | BR-10, NFR-REL-01/04 |
| TC-CHK-01 | E2E | C1 xác nhận A1/B1, A SANDBOX và B COD | Hai Order cùng purchase_group_id tạo nguyên tập, hai Payment riêng đúng payable từng Order; A trả sau, B xử lý độc lập; chỉ xóa item đã mua | FR-CHECKOUT-01/06, FR-ORDER-01, BR-01/02/17 |
| TC-CHK-02 | E2E | B1 hết hàng hoặc giá đổi sau quote | Không tạo Order/Payment thành công; trả quote mới; cần xác nhận lại | FR-CHECKOUT-02/04, BR-18 |
| TC-CHK-03 | Integration | Cổng sandbox trả Failed cho Order A | A vẫn AWAITING_PAYMENT đến khi hết hạn hoặc retry hợp lệ; Order B không đổi; hết hạn A release tồn, voucher đã chốt không hồi lượt | FR-CHECKOUT-05, BR-23/30 |
| TC-CHK-04 | Integration | Gửi đồng thời cùng key/payload; sau đó cùng key payload khác | Chỉ một purchase_group_id/tập Order; lặp trả cùng danh sách; payload khác 409 | NFR-REL-02, BR-19 |
| TC-CHK-05 | Integration | Order A Payment Success nhưng M1 consume lỗi, worker retry | Chỉ A RECOVERING, không thu thêm; B không đổi; cuối cùng A PENDING hoặc Refund riêng A | BR-22, NFR-REL-04 |
| TC-CHK-06 | Integration | Order A hết hạn, callback Success lặp/đến muộn | A EXPIRED, chỉ một Refund A; B không đổi, không trừ tồn lặp | BR-23/40 |
| TC-PAY-01 | E2E | C1 tạo hai Order sandbox, trả A rồi B | Order tồn tại trước thanh toán; mỗi Payment/Attempt gắn đúng Order; A PENDING trong khi B AWAITING_PAYMENT | FR-PAY-01/02, BR-15/17 |
| TC-PAY-02 | Integration | Hai callback Success hoặc hai Attempt của cùng Order | Tối đa một Success/Payment; Payment.payable_vnd bằng payable của Order | BR-40 |
| TC-COD-01 | E2E | C1 tạo A COD, B SANDBOX; A giao/thu trước B trả | Hai Payment riêng; A SUCCEEDED/COMPLETED, B vẫn AWAITING_PAYMENT; không có trạng thái thu tiền chung | FR-PAY-03/04, BR-17/21 |
| TC-COD-02 | Integration | M1 đã reserve A/B nhưng transaction M2 lỗi; lần khác COD consume lỗi sau tạo | Lỗi transaction không có Order và release toàn bộ; lỗi consume giữ đúng Order PREPARING, retry một lần rồi PENDING | BR-41 |
| TC-COD-03 | E2E | Hủy A/B COD trước khi thu | Mỗi CODCollection nghĩa vụ 0, mỗi Payment riêng CANCELLED và giữ payable snapshot; không Refund | BR-25/26 |
| TC-ORD-01 | E2E | C1/SA hủy Order AWAITING_PAYMENT/PENDING/CONFIRMED; thử PROCESSING | Cho hủy ba trạng thái đầu; chưa trả release tồn, đã bán restock; Seller ghi lý do; PROCESSING trả 409 | BR-24/39 |
| TC-ORD-02 | Integration | Hủy A sandbox đã trả trong nhóm A/B; hủy COD B | Refund A bằng payable snapshot của A; B không đổi khi hủy A; COD không tạo Refund | BR-25/26 |
| TC-ORD-03 | Integration | Hai Seller đồng thời chuyển/hủy một Order cùng version | Chỉ một thay đổi thành công; thao tác trễ 409, audit đúng | BR-39 |
| TC-ORD-04 | E2E | Seller A chuyển Order sandbox Shipped → Completed sau xác nhận giao; thử đánh giá trước/sau | Chỉ Seller/Owner A với version hiện hành được hoàn tất; Customer không có nút xác nhận nhận hàng trong MVP; Review chỉ tạo sau Completed | FR-SORDER-02, FR-REV-01, BR-37/39 |
| TC-VCH-01 | Unit | Voucher Store phần trăm/trần và voucher toàn sàn; thử hết hạn/min/cap | Áp Store trước, toàn sàn sau; các điều kiện không đạt bị từ chối | FR-VCH-02/03, BR-27/28 |
| TC-VCH-02 | Unit | Phân bổ giảm toàn sàn cho A/B có phần dư 1 VND | Tổng giảm phân bổ bằng voucher; mỗi Order payable bằng Payment riêng, tổng Order bằng quote; hòa theo store_id | FR-VCH-04, BR-29/31 |
| TC-VCH-03 | Integration | Hai lần xác nhận giỏ tranh lượt cuối; một lỗi trước tạo, một tạo A/B rồi B hết hạn | Không vượt usage; lỗi trước tạo release; voucher sàn của nhóm A/B đếm một lượt, B hết hạn không đổi giảm A | BR-30 |
| TC-REV-01 | E2E | C1 đánh giá OrderItem Completed, sửa; C2/chưa giao/đánh giá lần hai thử tạo | Chỉ C1 được tạo một Review 1–5; thử sai bị từ chối | FR-REV-01, BR-37 |
| TC-REV-02 | Integration | Admin ẩn rồi hiện lại Review, đọc rating công khai; Seller thử hiện lại | Chỉ Review VISIBLE góp aggregate; Admin có lý do/audit hai chiều; Seller bị từ chối; version cũ bị từ chối | FR-REV-03, BR-37/38 |
| TC-REP-01 | Unit | Order Completed, Cancelled, COD chưa thu và Refund mock trong hai Store | Metric tiền hàng, đã thu, đã hoàn, phí tách biệt; không tính trùng Payment | FR-REP-03, BR-32 |
| TC-AI-01 | Integration | Product đổi giá/ẩn/Store khóa sau khi đã embedding; prompt injection trong mô tả | Chat chỉ trả dữ liệu Product hiện hành, không làm theo lệnh trong mô tả | FR-AI-05, BR-13/38 |
| TC-AI-02 | Unit | Product cùng Category/Type/Store, giá gần/xa | Xếp hạng baseline và lọc sản phẩm không hiển thị như quy tắc | BR-11 |
| TC-AI-03 | Offline | Train CF/MF với split thời gian, test cold-start, so baseline K=10 | Lưu model/version/dataset/metrics; fallback hoạt động; không tuyên bố đạt nếu metric không đạt | FR-REC-09/10/11, BR-20 |
| TC-AI-04 | Offline/Integration | Chạy bộ câu hỏi RAG có giá đổi, Product ẩn, thiếu context, ngoài phạm vi và prompt injection; lưu dataset/model/index version | Báo groundedness, relevance, hallucination, card hợp lệ và latency theo [AI evaluation](ai-evaluation.md); case sai không bị che bởi demo chọn lọc | NFR-AI-01, FR-AI-04/05/06 |
| TC-API-01 | Contract | Validate OpenAPI; so 96 operation với UI/UC, request/response/error, auth và phân trang | Không có ref hỏng/schema `Resource` chung ở operation; role/scope rõ; ví dụ quote/Order/Refund khớp schema; endpoint danh sách có page/size | NFR-API-01, NFR-PERF-04 |
| TC-OPS-01 | Demo | Khởi động M1–M4 theo hướng dẫn, migration/seed, health/readiness; giả lập một RECOVERING và Refund FAILED | Demo hai Store tái lập được; worker/cảnh báo/đối soát thấy đúng ID và không thu/hoàn lặp; không đánh dấu đã chạy trước khi có log | NFR-REL-04, BR-22/23/41 |
| TC-PERF-01 | Performance | 100 concurrent users trên dataset đã ghi, API thường trong thời lượng cố định | ≥95% request hợp lệ dưới 2 giây, báo cả tỷ lệ lỗi và p95 theo endpoint | NFR-PERF-01/03 |
| TC-PERF-02 | Performance | Chat RAG trên bộ câu hỏi và LLM cấu hình cố định | Thời gian đến toàn câu trả lời dưới 4 giây theo mục tiêu, báo p95/tỷ lệ lỗi | NFR-PERF-02 |

## Ghi nhận chạy kiểm thử

| Run ID | Commit/build | Môi trường | Dataset/seed | Thời điểm | Người chạy | Kết quả | Link log/screenshot |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Chưa chạy | — | — | — | — | — | Chưa thực thi | — |

Đánh giá AI theo [ai-evaluation.md](ai-evaluation.md). Với performance, ghi CPU/RAM, PostgreSQL/pgvector, số lượng Product/Order/Chat, phân bố request, warm-up, thời lượng và cấu hình gateway/LLM trước khi kết luận. Khi test lỗi cần kiểm DB/StockMovement/Payment/Order và log theo correlation ID, không chỉ nhìn thông báo UI.
