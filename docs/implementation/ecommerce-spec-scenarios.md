# Ma trận nghiệm thu mở rộng TMĐT

Đi cùng [nghiên cứu Shopee và spec đề xuất](ecommerce-spec-research-2026-10-27.md), baseline `68072f5`, ngày 27/10/2026. **Đây là ca cần kiểm chứng, không phải kết quả test đã đạt.** Các kỳ vọng là đề xuất PBL6, không mặc định là mọi policy Shopee. Chỉ đổi acceptance sau khi chốt policy/contract tương ứng.

Mỗi ca cần lưu revision, người/vai trò/Store, dữ liệu trước/sau, operation/correlation IDs, response, history/audit/movement/event liên quan và bằng chứng UI. Test race/crash dùng stack riêng; không cố tình gây lỗi, gửi email hay chạy hoàn tiền trên demo khi chưa có phạm vi test phù hợp. SePay acceptance hiện vẫn đang tạm dừng theo yêu cầu.

| ID | Tình huống | Kỳ vọng cần đặc tả/kiểm chứng |
| --- | --- | --- |
| O-01 | Mua 2 Store, một đơn hủy | Đơn còn lại, hàng giữ và thanh toán của nó không đổi; voucher chung theo policy nhóm |
| O-02 | Confirm đã commit nhưng browser mất ACK | Cùng key/body nhận lại đúng nhóm; không tạo thêm Order/Payment/quota |
| O-03 | Đổi giá/địa chỉ/phí sau quote | Confirm từ chối quote không còn hợp lệ; quote mới không sửa đơn đã Confirm |
| O-04 | Sửa Product, Store hay sổ địa chỉ sau mua | Đơn giữ snapshot mua/giao/return policy; public Product không trở thành snapshot lịch sử |
| O-05 | Khách yêu cầu hủy khi Store đang bàn giao | Lock/version cho đúng một kết quả; không vừa hủy tức thì vừa có kiện đã gửi không được xử lý |
| O-06 | Đơn quá hạn chuẩn bị/khách đã trả tiền | Exception/SLA có người xử lý; stock/Refund vẫn theo bằng chứng, không giả hoàn tất |
| O-07 | Store/Seller khác đọc hoặc thao tác đơn | Deny đúng scope dù biết UUID; Admin đọc không tự thành quyền viết của Owner |
| S-01 | Đóng gói phát hiện thiếu một món | Ghi lượng thực tế, chặn bàn giao không đủ theo policy một kiện; không sửa số mua âm thầm |
| S-02 | Chưa bàn giao nhưng đã tạo vận đơn | Chưa ghi xuất kho vật lý; hủy nhãn và hủy Order là hai thao tác có kiểm soát |
| S-03 | Một lần thử giao thất bại rồi hẹn lại | Có attempt/lý do/thời điểm; không tự Restock/Refund hoặc kết luận Return |
| S-04 | Từ chối nhận và chuyển hoàn | Có quyết định chuyển hoàn và trách nhiệm phí; hàng vẫn chưa quay lại kho bán |
| S-05 | Carrier gửi lặp/sai thứ tự hoặc ACK bị mất | Inbox/dedup và legal transition; lưu history nhưng không kéo trạng thái lùi |
| S-06 | Carrier báo đã giao nhưng khách chưa nhận | Case điều tra/bằng chứng; không xóa lịch sử, không tự giải phóng toàn bộ quyền sau mua |
| S-07 | Khách xác nhận nhận hàng trong cửa sổ Return | Hoàn tất thao tác mua không tự xóa quyền khiếu nại còn hạn |
| S-08 | Một Order chia nhiều kiện ở giai đoạn mở rộng | Tổng ShipmentItem không vượt lượng mua; không coi tất cả đã giao khi chỉ một kiện giao |
| S-09 | Tạo/hủy vận đơn mất ACK | Lookup/replay cùng mã nghiệp vụ; không tạo nhãn thứ hai hoặc khẳng định chặn giao khi chưa có kết quả |
| S-10 | Cân đo thực tế làm phí hãng thu khác quote | Lưu chênh lệch và bên chịu theo snapshot; không sửa tiền khách đã chốt hoặc phí lịch sử âm thầm |
| V-01 | Mã phần trăm có trần, min spend và dòng không eligible | Tính đúng tập hàng/cơ sở; UI giải thích không đủ điều kiện; không vượt net dòng |
| V-02 | Hai Checkout tranh lượt/ngân sách cuối | Chỉ mức reservation/redemption cho phép được commit; không dựa số còn lượt đọc trước |
| V-03 | Mã Shop mạnh hơn nhưng làm mã sàn không đủ ngưỡng | Engine so sánh tổ hợp hợp lệ; gợi ý và Quote dùng cùng logic |
| V-04 | Freeship có trần ở nhóm nhiều Store | Chỉ trừ phí giao eligible; hiện phần khách còn trả; tổng không âm |
| V-05 | Mã chung áp dụng hai Store nhưng mới hủy một | Không tự cấp lại toàn mã; bản phân bổ gốc còn để tính tiền và đối soát |
| V-06 | Mã hết hạn/khóa sau Confirm | Đơn cũ giữ snapshot; quyền dùng mới và policy cấp lại được xử lý riêng |
| V-07 | Allocation chia không hết một đồng | Tổng cấp dòng/Store/nhóm bằng nhau; tie-break ổn định qua retry và trả từng phần |
| V-08 | Áp dụng ví dụ tiền ở mục 6 spec | Khách trả 529.000; hoàn B 190.000 và A1 243.000 thì còn 96.000; không hoàn lại phần tài trợ thành tiền mặt cho khách |
| V-09 | FE khai người dùng mới hoặc thay funding của campaign đã dùng | Backend xác minh eligibility, chặn chuyển scope/chi phí giao dịch cũ; tạo exception có căn cứ nếu nghi lạm dụng |
| I-01 | Tạo SKU hoặc duyệt PO 100 sản phẩm chưa nhận | Không tăng tồn bán được; không ghi receipt mua giả |
| I-02 | PO 100 nhận lần một 60, lần hai 40 | Hai receipt riêng; tổng tăng 100, không 200; không nhận vượt phần còn lại |
| I-03 | Receipt có món tốt, hỏng và sai SKU | Phân loại/phê duyệt theo dòng; chỉ phần đủ điều kiện vào saleable; có exception phần sai |
| I-04 | Mất ACK khi POSTED phiếu nhiều dòng | Replay một phiếu/ledger/audit; cùng ID khác payload conflict |
| I-05 | Seller đề xuất, Owner từ chối hoặc sửa số liệu | Chỉ thao tác được policy cho phép; số đã duyệt liên kết đúng phiên bản; audit ai yêu cầu/duyệt |
| I-06 | Kiểm kê song song với bán/nhập thêm | Không ghi đè stock mới; reconcile movement cutoff/version hoặc yêu cầu đếm lại |
| I-07 | Hủy trước xuất so với trả sau xuất | Release và ReturnReceipt có loại chứng từ khác nhau; không đếm cả hai là hàng mua vào |
| I-08 | Hàng hoàn có 4 tốt/1 hỏng | Saleable tăng 4, cách ly tăng 1; không dùng `restock=true` cho cả 5 |
| I-09 | Đảo receipt đã có phần hàng bán/giữ | Chặn đảo gây âm/cam kết thiếu; correction/reversal có căn cứ và link bản gốc |
| I-10 | Đối chiếu mô hình tồn mới với Consume hiện tại | Không trừ lần hai lúc bàn giao; không tạo tồn đầu kỳ vật lý bằng suy đoán |
| R-01 | Trả một món hoặc một phần số lượng đã mua | Cộng dồn lượng Return đang mở/đã chấp nhận không vượt phần còn được phép của dòng |
| R-02 | Case được duyệt nhưng hàng chưa đến | Không tuyên bố kho đã nhận/Restock; Refund xử lý theo loại case/policy đã chốt |
| R-03 | Nhận thiếu, khác hàng hoặc hỏng do vận chuyển | Ghi actual receipt và bằng chứng, quarantine/exception; không tự khớp toàn bộ đơn |
| R-04 | Hoàn tiền không thu hồi hàng được duyệt | Không có receipt/Restock giả; Refund vẫn có hạn mức và lý do phê duyệt |
| R-05 | Hai Refund race, provider timeout rồi restart | Tổng hoàn xác minh không vượt tiền đã thu; giữ nguyên operation ID; UNKNOWN được đối soát |
| R-06 | COD chưa thu và COD đã thu/đã chuyển tiền | Chưa thu không thành hoàn tiền mặt; thu và remittance khác nhau; có điều chỉnh đối soát |
| R-07 | Đổi policy sau mua, yêu cầu sát deadline | Áp dụng policy snapshot và mốc đúng; boundary/múi giờ được xác định, không tính từ lúc bấm COMPLETED tùy tiện |
| B-01 | Đơn tháng trước hoàn tháng này | Báo cáo sự kiện ghi khoản hoàn kỳ này; cohort ghi rõ cơ sở; không sửa lịch sử đã chốt âm thầm |
| B-02 | Platform tài trợ 36.000 cho Store A | Giá trị khách trả tiền hàng 324.000 không tự trở thành khoản Shop được hưởng 360.000 hoặc tiền đã payout |
| B-03 | Nhập 100, giữ 20, soạn 20, giao 20, hàng về 5 | Reconcile từng bucket và ledger; giữ/soạn không làm xuất trùng; số nhập mua, hàng hoàn và correction tách nhau |
| B-04 | Không có giá vốn hoặc phí đối soát chưa đủ | UI hiện chưa có dữ liệu/tạm tính đúng nghĩa; không bịa lợi nhuận hoặc thực nhận |

Các ca hiện có trong CI chỉ là một phần: `order-fulfillment.test.ts`, `demo-operations.test.ts`, `order-recovery.test.ts`, `refund.runtime.test.ts` và acceptance liên service. Cần map từng ca tới bằng chứng thực tế khi triển khai; không suy ra toàn bảng này đã pass vì CI baseline xanh.
