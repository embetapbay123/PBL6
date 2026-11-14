# Hướng dẫn sửa báo cáo kiểm thử PBL6

Ngày đối chiếu: 12/11/2026. Tài liệu này hướng dẫn sửa 4 nhóm lỗi còn lại trong `Software_Test_Documentation.docx` và `Test_Report.xlsx`. Chưa thực hiện thay đổi vào hai file nguồn.

## 1. U06 dùng nhầm thuật ngữ trừ tồn kho

**Vị trí:** sheet `Xac_Thuc`, ca `U06`, các ô `D17`, `K17`, `N17`.

Ca này kiểm tra token xác minh email, không liên quan đến tồn kho. Cụm hiện tại “consume (trừ tồn kho)” là diễn giải sai ngữ cảnh.

Thay toàn bộ nội dung `D17` bằng:

> Token A → lỗi vì đã bị vô hiệu hóa khi phát token B; token B dùng lần đầu → tài khoản ACTIVE; dùng lại token B → INVALID_TOKEN; không tạo thêm tài khoản người dùng.

Trong `K17` và `N17`, thay cụm “A → lỗi (đã consume (trừ tồn kho) khi phát B)” bằng “token A bị vô hiệu hóa khi phát token B”. Đồng thời xử lý phần câu mẫu theo mục 4 bên dưới.

`H17` và `O17` đang dùng “consume” theo ngữ cảnh token, không có diễn giải trừ tồn kho. Có thể đổi thành “bị vô hiệu hóa” để người đọc dễ hiểu và thống nhất cả dòng.

Không thay hàng loạt mọi từ “consume”: các ca giữ chỗ/trừ tồn kho vẫn dùng thuật ngữ đó đúng ngữ cảnh.

## 2. Word ghi lịch sử Round 1 lệch ngày và phân công

**Vị trí:** phần `I. Record of Changes`, hai dòng ngày `20/10/2026` và `22/10/2026`.

Hiện trạng:

| Nguồn | Nội dung hiện có |
| --- | --- |
| Word, dòng 20/10 | Công thực thi Round 1 phần Xác thực và Sản phẩm tồn kho. |
| Word, dòng 22/10 | Trí thực thi Round 1 phần Giỏ hàng, Đơn hàng thanh toán, AI và k6. |
| Excel, cột G | Cả 162 ca đều ghi ngày thực thi Round 1 là 20/10/2026. |
| Phân công chi tiết trong Word và người thực thi ở Excel | Công phụ trách thanh toán, đánh giá, AI, hiệu năng; Đức phụ trách sản phẩm/tồn kho/voucher; Hoa phụ trách giỏ hàng/đơn hàng/Android; Trí phụ trách xác thực/cửa hàng/bảo mật; Hà phụ trách Web UI và các ca chung. |

**Nếu ngày 20/10 trong Excel là ngày thực thi đúng**, có thể gộp hai dòng lịch sử thành một dòng:

| Date | A/M/D | In charge | Change Description |
| --- | --- | --- | --- |
| 20/10/2026 | M | Nhóm kiểm thử (5 thành viên) | Thực thi Round 1 bộ 162 ca theo phân công chuyên trách; kết quả: 141 Passed, 17 Failed và 4 Pending. |

Chỉ giữ dòng 22/10 nếu thực sự có hoạt động trong ngày đó. Nếu đó là ngày tổng hợp hoặc xem lại kết quả, ghi đúng hoạt động và người phụ trách thực tế, không ghi là một đợt thực thi khác.

Nếu ca kiểm thử thực tế chạy vào nhiều ngày, cập nhật cột G theo ngày thật và sửa lịch sử cho khớp; không đổi đồng loạt ngày chỉ để hai tài liệu trông giống nhau. Cột “In charge” có thể chỉ người điều phối, nhưng khi đó mô tả phải nói rõ vai trò điều phối/tổng hợp.

## 3. PERF01 ghi sai nhãn ngưỡng SLA

**Vị trí:** sheet `Hieu_Nang`, ca `PERF01`, các ô `H12` và `O12`.

- Yêu cầu ở `D12`: p95 < 2 giây, tương đương 2.000 ms.
- Kết quả đang ghi: p95 = 850 ms, kèm cụm “< 1.000ms SLA”.

Giữ nguyên kết quả đo 850 ms. Thay “850ms (< 1.000ms SLA)” bằng:

> 850 ms, đạt ngưỡng SLA p95 < 2.000 ms.

Giữ nguyên thông lượng 420 req/s và tỷ lệ lỗi đã ghi; không sửa hoặc bổ sung số đo.

**Không đổi 850 ms thành 1.820 ms:** PERF01 là tải đọc catalog; PERF02 là tải hỗn hợp marketplace. Hai giá trị có thể khác nhau. Trong Word mục 6.1, dòng dẫn báo cáo k6 có p95 = 1,82 s nên ghi rõ đó là kết quả kịch bản tải hỗn hợp PERF02 nếu báo cáo thực tế xác nhận như vậy.

## 4. Kết quả Round 2/3 còn câu mẫu và bị cắt nội dung

**Vị trí:** cột `K` (Round 2) và `N` (Round 3) của các sheet chức năng.

Đợt đối chiếu hiện tại có **134 ô K** chứa mẫu “Tái kiểm thử hồi quy xác nhận…” và **155 ô N** chứa mẫu “Nghiệm thu Staging…”. Đây là danh sách cần đọc lại, không có nghĩa tất cả các ô đều sai kết quả test.

### 4.1 Nguyên tắc sửa

1. Giữ nguyên người thực thi, ngày, trạng thái Passed/Failed/Pending và diễn biến từng vòng đã ghi nhận.
2. Bỏ các câu dài như “xác nhận tính năng tiếp tục ổn định”, “duy trì phản hồi chuẩn”, “sẵn sàng phát hành” nếu chúng chỉ lặp thông tin và không mô tả kết quả của ca.
3. Với ca từng Failed, giữ mô tả lỗi, thay đổi đã thực hiện và kết quả kiểm tra lại riêng của ca. Không thay bằng câu mẫu của các ca luôn Passed.
4. Không sao chép Expected ở cột D thành “Thực tế” nếu hồ sơ không ghi nhận đã kiểm tra các tình huống đó trong vòng tương ứng.
5. Không tự bổ sung mã HTTP, số lượng bản ghi, mức sử dụng RAM, thời gian phản hồi, log hoặc đường dẫn minh chứng mới.
6. Nếu hồ sơ chỉ có trạng thái Passed, có thể viết ngắn “Kết quả ghi nhận: Passed.” và dẫn lại phần ghi chép cụ thể đã có, thay vì tạo lời kể như đã quan sát đủ mọi điều kiện. Khi cần chi tiết thêm, lấy từ kết quả chạy thật.

Không cần viết 289 câu khác nhau để tránh lặp. Mẫu trình bày ngắn có thể giống nhau; phần dữ liệu đầu vào, kết quả và tác động nghiệp vụ phải đúng với từng ca và từng vòng.

### 4.2 Các ô có nội dung bị cắt cần ưu tiên

| Sheet / ca | Ô cần đọc lại | Phần cần làm rõ từ kết quả thực tế |
| --- | --- | --- |
| `Xac_Thuc` / U02 | `K13`, `N13` | Ca mật khẩu vượt 72 byte: hệ thống thực tế từ chối 422 hay xử lý theo chính sách nào; không chỉ chép câu lựa chọn “hoặc…” của Expected. |
| `Don_Hang` / U43 | `K19`, `N19` | Các chỉ số báo cáo được tách đúng, mốc `to` không bao gồm và không tính trùng Payment. Chỉ ghi những điều đã xác nhận. |
| `AI_Chatbot` / API43 | `N17` | Trước đồng ý và sau rút đồng ý: cách hệ thống ngừng dùng dữ liệu cá nhân và trả FALLBACK/BASELINE đã ghi nhận. |
| `AI_Chatbot` / API44 | `K18`, `N18` | Provider lỗi/chưa cấu hình/phản hồi sai: mã phản hồi và `fallback_reason` của các tình huống thực sự đã chạy. |
| `Bao_Mat` / SEC03 | `K14`, `N14` | Request sau thu hồi quyền bị chặn thế nào; không để câu dở “khôn...”. |

Phân biệt dấu `...` do câu bị cắt với dấu lược trong thông báo giao diện. Ví dụ “Tỷ lệ… từ 1 đến 100” ở U09 có thể là trích đoạn thông báo, không mặc định là lỗi cắt dữ liệu.

### 4.3 Ưu tiên các ca rủi ro cao

| Ca / dòng | Nội dung nên đối chiếu với kết quả đã chạy |
| --- | --- |
| U36 — `San_Pham_Kho`, dòng 18 | Trùng dòng giữ chỗ, thời hạn không hợp lệ, giữ đúng tồn khả dụng và giữ vượt tồn. |
| U20 — `Voucher`, dòng 23 | Phân bổ A = 3.333, B = 6.667, tổng 10.000; vòng 1 có lỗi, vòng 2 đã sửa. Giữ riêng lịch sử lỗi và kết quả từng vòng. |
| U44 — `Thanh_Toan`, dòng 12 | Timestamp ±300 giây hợp lệ; ±301 giây hoặc chữ ký sai bị từ chối. Không nhầm với correlation ID. |
| API35 — `Thanh_Toan`, dòng 17 | Callback lặp không ghi nhận tiền hai lần; phân biệt xung đột payload, lệch số tiền và sai tài khoản. |

Các giá trị trên là điều kiện/mong đợi đang có trong hồ sơ, không phải số đo mới. Chỉ đưa vào phần thực tế khi đã được xác nhận cho vòng đang sửa.

### 4.4 Danh sách ô dùng câu mẫu

Danh sách dưới đây chỉ đánh dấu ô chứa hai câu mẫu nêu trên, giúp tìm nhanh. Những ô đang có ghi chép riêng cần được giữ lại.

| Sheet | Round 2 — cột K | Round 3 — cột N |
| --- | --- | --- |
| `Xac_Thuc` | `K12:K13`, `K15:K17`, `K19:K22`, `K24:K26`, `K28:K29`, `K31` | `N12:N26`, `N28:N32` |
| `Cua_Hang_Quan_Tri` | `K12`, `K14:K18` | `N12`, `N14:N18` |
| `San_Pham_Kho` | `K12:K14`, `K16:K28`, `K30:K32` | `N12:N32` |
| `Gio_Hang_Dat_Hang` | `K12:K16`, `K18:K21`, `K24:K26`, `K28` | `N12:N21`, `N23:N28` |
| `Voucher` | `K12:K19`, `K21:K22`, `K24:K28` | `N12:N28` |
| `Don_Hang` | `K12:K19`, `K21`, `K24:K29` | `N12:N19`, `N21:N29` |
| `Thanh_Toan` | `K12:K22` | `N12:N22` |
| `Danh_Gia` | `K12:K16` | `N12:N16` |
| `AI_Chatbot` | `K12:K16`, `K18:K23`, `K25` | `N12:N25` |
| `Bao_Mat` | `K12:K17`, `K19:K20` | `N12:N20` |
| `Chung_API_UI` | `K12:K13`, `K15:K19` | `N12:N19` |
| `Android_App` | `K12:K15` | `N12:N16` |
| `Hieu_Nang` | `K12`, `K14:K15`, `K17` | `N12:N17` |

## 5. Kiểm tra sau khi sửa

- [ ] U06 không còn diễn giải token thành thao tác trừ tồn kho.
- [ ] Ngày và phân công Round 1 giữa Record of Changes, phần phân công và Excel không còn mâu thuẫn.
- [ ] PERF01 giữ số đo 850 ms và so sánh đúng ngưỡng 2.000 ms.
- [ ] Không còn các câu bị cắt giữa chừng ở danh sách mục 4.2; không phát sinh lời kể hay số liệu ngoài hồ sơ.
- [ ] Trạng thái và thống kê giữ nguyên nếu chỉ sửa câu chữ: Round 1 = 141 Passed / 17 Failed / 4 Pending; Round 2 = 158 Passed / 4 Failed; Round 3 = 160 Passed / 2 Failed. Hai ca cuối còn Failed là AND11 và PERF09.
- [ ] Mở Excel tính lại và lưu; kiểm tra công thức không lỗi, kết quả tổng hợp vẫn khớp.
- [ ] Nếu tiếp tục nộp cả `Test_Report.xlsx` và `Test_Report_Minh_Cong.xlsx`, đồng bộ nội dung sửa. Nếu chỉ nộp một bản, cập nhật tên file trong Word đúng với file nộp.

## 6. Các điểm không cần sửa số liệu

- 87,04% là tỷ lệ Passed Round 1; 98,77% là Round 3. Sheet Test Statistics đã ghi rõ đang thống kê Round 1. Có thể bổ sung tổng hợp ba vòng để dễ đọc, không cần thay 87,04% bằng 98,77% trong bảng Round 1.
- 850 ms của PERF01 và 1,82 s của PERF02 là hai kịch bản tải khác nhau; cần ghi rõ ngữ cảnh, không ép hai số bằng nhau.
- `PBL6_TestReport_v3.0` trên Cover là mã tài liệu, không phải tên file bắt buộc.

Các việc hoàn thiện thêm như Reviewer/Approver, cách nhóm 6 loại/7 nhóm và mã Static Review có thể xử lý riêng; không tự điền tên phê duyệt hay thay đổi nội dung rà soát chéo của nhóm bạn.
