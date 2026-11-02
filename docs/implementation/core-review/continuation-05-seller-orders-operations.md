# Lượt 05 — đơn, COD, sau bán và điều hành Store

Ngày30/10/2026. Baseline `operational-20261029T075615Z`, HEAD `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` cùng working tree đã ghi. Chỉ review, script và tài liệu; không sửa ứng dụng/contract, không triển khai. SELLER là nhân viên, STORE_OWNER là chủ Store.

## Kết quả hiện hành

Thực hiện **15 ID Seller**: 14 ID trước đây NOT_RUN và bổ sung walkthrough S36 đã có blocker kỹ thuật. Mỗi ID đi menu trên1440/390. Có **34 lượt browser hiện hành**, 28 assertion qua/6 lỗi sau gộp rerun; không cộng viewport/vòng tránh hoặc hai nhánh S36 thành ID mới. S36 giữ FAIL dù guard/nhánh exchange qua, vì COD refund thật của CH05 chưa kết thúc được.

Tích lũy **114 ID đã đi UI / 286 lượt browser**, 180 assertion qua/106 lỗi. Catalog158: **41 PASS, 38 FRICTION, 30 FAIL, 9 BLOCKED, 5 POLICY_GAP, 35 NOT_RUN**. Toàn bộ42 ID Seller/Owner đã có walkthrough hoặc điểm dừng UI cụ thể: **15 PASS, 14 FRICTION, 9 FAIL, 1 BLOCKED, 3 POLICY_GAP**. Đây là coverage đã review, không phải42 công việc đều vận hành được. S39 không được tính đã đi qua delivery/accept runtime; S35/S42 chưa chốt policy.

Lượt05 không tạo ID bug kỹ thuật mới: xác minh/mở rộng UX-03/06/07/08/12, CR-013 và blocker CR-006 hiện có. Thêm câu hỏi **POL-07** về nghĩa kỳ của tiền thu/hoàn; không kết luận backend sai tiền khi chưa chốt phạm vi báo cáo. `USER_VALIDATION_PENDING`.

## Nhiệm vụ và điểm dừng

Dữ liệu fixture có hai đơn cùng270000đ, title khác nhau; hàng đợi21đơn, COD SHIPPED chưa/đã thu; một yêu cầu EXCHANGE/REFUND; nhân viên có email riêng; voucher10% và quota; hội thoạiLan chứa mã đơn. Báo cáo fixture dùng bốn đơn có tổng1000000đ, tổng thu700000đ, hoàn160000đ; được đối chiếu riêng với mẫu runtime thật, không gộp hai tập dữ liệu. Bằng chứng từng ID/project ở `seller-round5-*-screenshots/**/walkthrough.json` và ledger.

| ID | Điểm bắt đầu/đối tượng và thao tác | Kết quả/expected so với actual |
|---|---|---|
| S26 | MenuStore→Đơn hàng; mã do khách cung cấp, hai đơn cùng tiền; mở dialog đọc Bình giữ nhiệt/lượng2 rồi xác nhận | FRICTION: PATCH đúngID/version4 và CONFIRMED, nhưng nhận diện món từ hàng đợi vẫn phải mở dialog; không chứng minh xác nhận nhầm |
| S29 | ĐơnCONFIRMED thiếu hàng→ghi lý do→hủy toàn đơn | FRICTION: CANCELLED/body đúng; chưa có chỉ dẫn liên hệ–đặt lại/giới hạn giai đoạn. Không yêu cầu sửa lượng trực tiếp; hậu điều kiện tồn/hủy đã có CH02 thật |
| S30 | Hàng đợi trang2/21đơn→mở→PROCESSING→đóng | PASS: vẫn trang2 và đúng đơn/trạng thái mới. Chỉ giữ ngữ cảnh xử lý tại chỗ, không suy mọi lần rời route giữ bộ lọc |
| S31 | ĐơnPROCESSING cần bàn giao thủ công→tìm người nhận/phone/address trước SHIPPED | FAIL UX-03: có nút chuyển nhưng thiếu các dữ liệu đã có trong payload. Không yêu cầu tích hợp hãng vận chuyển |
| S32 | ĐơnSHIPPED, tiềnSUCCEEDED→ghiCOMPLETED | FRICTION UX-12/OP-03: API đúngID/version, có kết quả; nhãn enum không giải thích công việc đã giao/timeline. Chưa giao vật lý |
| S33 | COD SHIPPED270000, chưathu→checkbox nhận đủ→503→đọc lại→retry rõ ràng | PASS cho đoạn kiểm: trước checkbox không gửi;503 không toast thu thành công; đọc lại rồi gửi đúngamount/version mớiSUCCEEDED. Fixture, không phải mất phản hồi sau commit provider thật |
| S34 | SELLER có quyền đơn, thiếucod.collect; SHIPPED/PENDING | FAIL UX-12: hoàn tấtdisabled và formCOD vắng, nhưng không có lời giải thích quyền/nhờOwner/bước tiếp. Guard đúng, thông tin vận hành thiếu |
| S35 | MenuĐổi trả→yêu cầuREQUESTED→chấp thuận có phản hồi | POLICY_GAP POL-02: note được lưu/hiển thịAPPROVED; chưa biết nơi nhận/phí nên chỉ ghi chờStore xác nhận điểm nhận, không bịa địa chỉ hoặc giả nhận kiện |
| S36 | EXCHANGE RECEIVED→reference thủ công→gửi đổi; REFUND COD RECEIVED chưa xác nhận | FAIL toàn nhiệm vụ: exchange tớiEXCHANGE_SENT và biết chờCustomer được; refund buttondisabled đúng để chống hoàn tất giả. COD adapter thật không có ởCH05, online provider cònBLOCKED |
| S37 | MenuVoucher→tạo10%/cap30000/min50000/quota10/mỗi khách1→đọc điều kiện/lượt dùng | PASS phạm vi UI: bodySTORE, codeMAI10, điều kiện/thời hạn/counters đúng. 1giữ/2dùng là sự kiện fixture mô phỏng sau tạo, không giả là đã có giao dịch DB. Quote/quota thật đã có lượt02 |
| S38 | VoucherACTIVE→dừng→muốn sửa/mở lại | FAIL CR-013: dừng đúngcode/version, STOPPED, không có editor/reactivation. Không tạo mã mới để giả mở voucher cũ |
| S39 | MenuStaff→email/quyền kho độc lập→gửi | BLOCKED delivery runtime: fixture lỗi503 khôngfake success; adaptermock thật trả503 và invitationREVOKED. Chưa thực thi nhận/chấp nhận lời mời thật, dù integration cũ có subcase |
| S40 | Đúngemail nhân viên→cấpinventory/revokeproduct→version conflict→đọc lại/retry | FRICTION: expected_version đúng,409 không ghi đè; phải browserreload lấyv7 rồi retryv7→v8. Guard token hiện hành có bằng chứng thật X16/S23; không suy mọi quyền/scope đều đã qua |
| S41 | ChatLan có mã đơn→tự chuyểnĐơn hàng kiểm→quay đúnghội thoại→reply | FRICTION UX-07: đúngStore/conversation/content; phải nhớ/chép mã do không có link đơn liên kết. Tin nhắn chỉ fixture, không gửi người thật |
| S42 | MenuReport→chọn01–31/10→đọc giá trị/thu/hoàn→tìm nguồn đơn | POLICY_GAP POL-07: UI/API/SQL thật khớp nhưng kỳ tiền đang dựa ngày tạo đơn; chưa chốt khác biệt với tiền phát sinh thu/hoàn trong kỳ. Không gọi tổng là lợi nhuận/đối soát payout |

## Đối chiếu report thật và câu hỏi POL-07

Đi UI report thật trên1440/390; API/SQL đọc Store riêng của tag `op-review-1793261067285`, khoảng `2026-10-01T00:00:00Z` tới `2026-10-31T00:00:00Z`. Cùng một dataset, các số khớp:

| Chỉ số | API/SQL/UI |
|---|---:|
| Số đơn | 104 |
| Giá trị đơn | 10672000đ |
| Doanh thu hàng hoàn tất | 90000đ |
| Đã thu | 90000đ |
| Đã hoàn | 0đ |
| Phí giao hàng | 20000đ |

`backend/commerce-service/src/report/report.repository.ts:125` lọc order.created_at cho tổng đơn; payment tổng ở khoảng dòng138 cũng JOIN order rồi lọc order.created_at. Các giá trị collected/refunded là số hiện tại của payment thuộc cohort đơn, chưa lọc theo thời điểm phát sinh thu/hoàn. UI chỉ ghi “Từ ngày/Đến ngày”, “Đã thu/Đã hoàn”, không giải thích cohort.

**Câu hỏi cần chốt:** khi Owner hỏi “Trong kỳ đã thu/hoàn bao nhiêu?”, sản phẩm muốn tổng tiền hiện tại của các đơn tạo trong kỳ hay số tiền thực phát sinh thu/hoàn trong kỳ? Xử lý một đơn tạo trước kỳ nhưng thu/hoàn trong kỳ ra sao? Nếu chọncohort, cần nhãn/phạm vi đủ rõ; nếu chọncashflow, cần đối chiếu sự kiện theo thời gian phù hợp. Đây không phải yêu cầu phí sàn/ví/hoa hồng/payout/lợi nhuận.

Chưa tạo giao dịch provider ở biên kỳ để gọi là bug đã chứng minh. Quan sát hiện tại được xác nhận bằng API/SQL; ví dụ đơn cũ thu sau sẽ bị lọc theo cohort là suy luận từ WHERE, không phải giao dịch mới đã tái hiện. CR-014 về default tháng lệchUTC+7 giữ riêng, không đếm thành POL-07 hoặc tuyên bố đã sửa.

## Email, fixture và hậu điều kiện

Đã kiểm `EMAIL_ADAPTER=mock` ngay trên m3 trước khi gọi inviteStaff. Một invitation mới có tag riêng trả503 EMAIL_DELIVERY_UNAVAILABLE, repository ghiREVOKED khi delivery lỗi. Không cònpendingaccess, không gửi thư tới người thật. Chưa có adapter delivery/capture runtime để hoàn thành S39, không dùng fixture làm bằng chứng thư tới người nhận.

Ngoài invitation test đãREVOKED, lượt05 chỉ đọc dữ liệu runtime; không tạo đơn, refund, collection hoặc tin nhắn thật. [Closeout](../../../artifacts/core-review/operational/seller-round5-closeout.json) kiểm0product reviewACTIVE trong các Store riêng, hai Store lượt04LOCKED, tồn0/reserved0, quyền nhân viên phục hồi và số đơn StoreA vẫn104. Không xóa lịch sử/audit, không chạm Store/nhân viên demo chung.

Các harness cần sửa được giữ riêng: checkbox Staff tự lưu không phù hợp `check()` vì controlled value chưa đổi trước khi request hoàn tất; chuyển sang click rồi đợi version. Fixture report cần period_start/period_end/best_selling_product_ids đúngcontract; counters voucher phải có sự kiện fixture mô phỏng để giải thích số lượt sau khi vừa tạo. Chạy lại S37/S40/S42 trên cảhai viewport, không đưa các lần lỗi thiết lập thành bug sản phẩm.

Nguồn: [ledger](scenario-results.csv), [coverage](scenario-coverage.md), `seller-round5-results.json`, `seller-round5-rerun-results.json`, `seller-round5-aftersales-results.json`, `seller-round5-report-real-results.json`, [HTTP/SQL](../../../artifacts/core-review/operational/seller-round5-http.json). Mọi PASS giới hạn theo loại bằng chứng. Các bộ cũ vẫn giữ lịch sử, không chạy lại hoặc tăng số ID theo assertion/screenshot.

## Còn lại

**35 NOT_RUN**: C08, A01–A24 và X19/X20/X21/X23/X24/X26–X30. Các ca BLOCKED/POLICY_GAP trước đó vẫn mở; không ghi toàn bộ158đã hoàn tất hoặc sản phẩm sẵn sàng vận hành. Sau nhóm Seller, ưu tiên quyết định Admin, rồi keyboard/focus/zoom/nội dung khó và ảnh nhận diện thật. Bộ bài nghiên cứu người thật giữ `USER_VALIDATION_PENDING`.
