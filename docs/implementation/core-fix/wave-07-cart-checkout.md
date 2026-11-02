# F04 — readback giỏ, chọn một phần và cạnh tranh checkout

01/11/2026, stack riêng `pbl6-fe-verify`, gateway18080/frontend3109. **Backend/AI giữ manifest29; frontend cuối31**. Không migration hoặc thay contract/backend trong đợt này. Manifest frontend/contract/test207file cuối: `frontend-source-cart31-final.json`; manifest30 giữ lịch sử; backend263file/AI42file vẫn khớp các manifest29. Không sửa baseline hoặc báo cáo review cũ.

## Lỗi tái hiện và sửa

CR-008 còn một nhánh chưa được giải quyết: DELETE đã commit nhưng phản hồi bị mất → UI khóa checkout và yêu cầu đọc lại → danh sách giỏ đúng nhưng badge vẫn giữ số cũ. Fixture xác nhận giỏ0/badge1; UI/API thật xác nhận giỏ3/badge4. Bằng chứng trước sửa: `cart-badge-lost-ack-baseline29-repro.json` và `cart-checkout-baseline29.json`.

`CartPage.load` nay đưa kết quả đọc đủ giỏ vào cache `cart-summary`, gồm trang đầu và tổng số dòng, rồi mới kết thúc readback. Không gửi lại DELETE hoặc giả thao tác thành công. Các mutation khác vẫn chặn trong lúc chưa rõ kết quả; server là nguồn dữ liệu để tiếp tục. Query được cập nhật trong phạm vi phiên hiện hành; kiểm hồi quy đổi tài khoản vẫn giữ.

Hai cải thiện nhỏ cùng phạm vi: giỏ nói rõ tạm tính chưa gồm phí/ưu đãi; checkout dùng hướng dẫn tiếng Việt để kiểm tra lại yêu cầu cũ, không yêu cầu người mua hiểu thuật ngữ idempotency. Body/key bất biến vẫn được kiểm trong bằng chứng kỹ thuật.

Vị trí: `frontend/src/features/customer/CartPage.tsx` và `CheckoutPage.tsx`. Các sửa F04 trước đó về chọn một phần, quote dòng, tách ưu đãi và lưu kết quả được nghiệm thu lại dưới đây; không coi tất cả đều là mã vừa viết trong lượt này.

## Sáu finding được nghiệm thu

| Finding | Bằng chứng chức năng trên30 |
| --- | --- |
| CR-008 | Badge4→3 sau DELETE mất ACK/readback; checkout một phần còn đúng1; checkout hết giỏ về0. API/database và UI1440/390 cùng đối tượng. DELETE chỉ1lần. |
| CR-018 | Giữ PATCH thật trước phản hồi và DELETE thật trước thực thi: CTA checkout disabled; PATCH thành quantity2. DELETE mất ACK tiếp tục khóa tới readback, không tự gửi lại. |
| CR-020 | Bỏ dòng cùng Product và StoreB → checkout chỉ StoreA → quay lại/reload vẫn bỏ; chọn lại riêng StoreB, giữ dòng khác ngoài checkout. |
| CR-022 | Owner đổi đơn giá100001→110001 bằng API thật sau quote. Confirm cũ409; quote, đơn giá dòng, thành tiền và tổng mới đồng bộ trước lần xác nhận tiếp. |
| UX-13 | Hai Store có giảm10000/7001, ưu đãi sàn10%, phí15000/25000. UI tách nguồn giảm theo Store; tổng sau đổi giá294704, tổng ưu đãi45301; snapshot/redemption thật khớp. |
| UX-14 | Commit thật rồi bỏ ACK; kích hoạt xác nhận hai lần chỉ1POST lúc đang chờ. Lần kiểm lại giữ cùng body/key, cùng nhóm2đơn. Reload đọc lại nhóm đã tạo, không POST thêm. |

**Tổng15/52finding gốc VERIFIED,37chưa đóng đầy đủ.** Sáu mục trên được chuyển FIXED/VERIFIED30 trong `finding-status.csv`. Không cộng các biểu hiện hoặc lượt viewport thành finding mới.

UX-02 giữ PARTIAL: thành tiền dòng, tổng phần chọn, thay đổi số lượng và giá không tải được đã qua kiểm; vẫn cần nghiệm thu đầy đủ đường đổi phân loại và khả năng nhận diện/lựa chọn bằng công cụ hỗ trợ. F04 rộng còn mở; không chuyển mọi ID trong C19–C30/C34–C38/X09–X15 thành PASS từ các subcase này.

## Walkthrough và các race thật

Hai lượt UI bắt đầu từ khách quay lại có4dòng thuộc2Store; màu/SKU có nghĩa và3variant trong cùng Product. Store/khách/địa chỉ được tạo riêng theo tag, identity seed trong M3 riêng có guard; đây không phải nghiệm thu đăng ký/email. Sau đăng nhập, đi qua header → giỏ → checkout → giỏ → checkout → kết quả/reload → checkout phần còn lại. Không dùng URL nội bộ để thay đường đi chính. Chỉ ACK được thay ở biên browser sau khi handler ghi thật.

Tạm tính sau tăng lượng: dòng đỏ200002, toàn giỏ540007; bỏ các dòng khác còn200002. Sau DELETE/readback và chọn2Store, quote trước đổi giá276704; Owner đổi giá thì quote mới294704. Người mua xác nhận COD ở StoreA, online ở StoreB; chưa thanh toán online hoặc thu COD trong ca này. Giỏ giữ đúng dòng không chọn. Sau reload kiểm lại2đơn và mua hết dòng còn lại để xác minh badge0.

Race HTTP dùng2Customer độc lập, cùng2Store, PostgreSQL row lock kiểm soát thứ tự. Quan sát đồ thị `pg_blocking_pids` cả trực tiếp và bắc cầu; không lấy thời gian chờ cố định làm bằng chứng:

1. **Món cuối:** tồn của một variant về1; hai quote hợp lệ rồi confirm cạnh tranh. Một nhóm2đơn được tạo; bên thua409 `INSUFFICIENT_STOCK`,0đơn và giỏ2dòng còn nguyên. Không giữ một phần ở Store còn hàng. Hủy nhóm thắng rồi replay key bên thua vẫn trả thất bại đã ghi, không âm thầm tạo đơn mới.
2. **Voucher lượt cuối:** đủ tồn, cả hai đã quote; giữ hàng xong cùng chờ khóa voucher. Một nhóm được tạo, bên thua422 `VOUCHER_OUT_OF_QUOTA`; attempt FAILED, có2lệnh release đã xác nhận và0Order của nhóm thua. Một lượt sử dụng của voucher sàn tương ứng2redemption theo2Order, không đếm thành2lượt.
3. **Store dừng voucher:** quote khi còn ACTIVE; API dừng voucher thật xếp trước commit checkout trong hàng chờ khóa. PATCH200, confirm422 `VOUCHER_INACTIVE`; attempt FAILED, nhả giữ của cả2Store,0Order/0redemption cho lần này.

Sau hủy, lượt voucher đã dùng không phục hồi. Các giao dịch đều dùng command/key riêng, retry kết quả chưa rõ giữ body/key cũ. Không tắt rate limiter, không dùng provider tiền thật hoặc ép SQL trạng thái đơn để làm ca qua.

## Gate và đối chiếu cuối

Artifact tại `artifacts/core-fix/fix-20261030T100153Z/`.

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Fixture UI |20PASS|`cart-checkout-fixture30-accepted.json`|
| UI desktop1440 +3race HTTP |2PASS, checkpoint tách từng bước|`cart-checkout-runtime30-desktop-final-ready.json`|
| UI mobile390 |1PASS, cùng walkthrough|`cart-checkout-runtime30-mobile.json`|
| M1/M2 đọc cuối |PASS|`cart-checkout-final-state31.json`|
| Frontend build/contract check/drift/docs |PASS trên31|`cart-checkout-acceptance31.json`|
| Backend/AI source và9image |Giữ29, hash khớp|`runtime-image-cart30.json`|

SQL cuối chọn đúng3lineage nghiệm thu:12variant đều quantity30/reserved0;10Order và Payment CANCELLED; kho6RELEASED/4RESTOCKED. **0money movement/0refund** vì chưa thu tiền. Giữ10redemption trong3nhóm đã dùng, tổng snapshot giảm108602. Có9attempt:6COMMITTED,3FAILED; mọi nhóm FAILED đều0Order. Product/taxonomy `corecheckout-*` đã thu hồi ACTIVE; audit, đơn và ledger giữ nguyên.

20fixture bao gồm branch readback mới, tạm tính theo lượng/chọn và trường hợp metadata giá lỗi phải hiện chưa đủ thông tin, không giả0. Đây là fixture; các race, order/payment/stock/redemption kể trên là runtime/database thật. Không lấy số assertion làm số scenario đã review.

Backend365unit/44SQL và Python24 của29 được giữ như gate trước đó; **không tuyên bố chạy lại chúng trong đợt UI này**. Backend/AI không thay, source263/42 vẫn khớp. Sáu chuỗi cuối: CH01–CH05 vẫn bằng chứng21, CH06 gần nhất29; các ca đặt/hủy ở đây không thay nghiệm thu giao/thu tiền/hoàn tất toàn chuỗi.

## Các giới hạn và lượt lỗi

- UI là Edge viewport1440/390; bàn phím ảo, native zoom, screen reader, thiết bị thật và nghiên cứu người dùng vẫn chưa thực hiện. Đã xem ảnh quote mobile và desktop; kết quả chức năng không thay nghiên cứu hiểu đúng của người thật.
- Chưa kiểm đầy đủ PATCH/DELETE từ tab khác khi checkout đã mở, mọi biên hết hạn quote hoặc toàn bộ đường đổi phân loại. Giữ trong F04/UX-02 và F18, không chấm PASS thay.
- Những lượt đầu lỗi harness: thiếu `scope`/thừa `status` khi tạo voucher; đếm chỉ waiter trực tiếp thay vì đồ thị khóa bắc cầu; cleanup quá sớm lúc COD còn PREPARING. Đã sửa dữ liệu/setup/điểm chờ; giữ nguyên kỳ vọng về số đơn/tồn/usage. Hai lần chạy nhầm working directory không có test, không tính coverage.
- Khi cần xử lý fixture sau harness lỗi, chỉ hủy đúng2và3Order tagged qua domain service, rồi thu hồi metadata sau khi không còn giữ hàng. Artifact `cart-harness30-*-cleanup.json` ghi rõ **DIRECT_SERVICE_FIXTURE_CLEANUP**, không coi đây là bằng chứng auth hoặc thao tác UI. Không xóa audit/giao dịch, không cập nhật trực tiếp tiền/tồn để che lỗi.
- Verifier đầu chọn Customer từ các Order thành công đã bỏ sót bên thua không có Order. Đã sửa phạm vi đọc theo title trong plan gốc, giữ nguyên kỳ vọng9attempt/6COMMITTED/3FAILED; ghi chú nằm trong final-state30.

Bước còn lại: hoàn thiện UX-02 và cạnh tranh giỏ đang mở ở phiên khác; nghiệm thu quyền/xung đột và đường kết thúc sau bán theo ưu tiên P1; sau đó chạy lại sáu chuỗi cùng source cuối. Chưa kết luận sẵn sàng vận hành toàn bộ.


## Tiếp nối kiểm ảnh — frontend31

Đọc ảnh desktop sau gate chức năng30 phát hiện2vướng mắc thật: launcher chat đè mép phải nút xác nhận (hit ở90%chiều ngang rơi vào “Mở chat”); nút “Tính lại báo giá” có foreground và background cùng `rgb(194,65,12)`. `checkout-controls-baseline30.json` lưu geometry và màu trước sửa, không bị thay bằng kết quả mới.

Đã chuyển điểm mở chat desktop vào header, giữ mobile trong dock có chỗ dành riêng; không đặt launcher nổi trên thao tác tiền. Trigger giữ trạng thái mở/thu nhỏ/khôi phục, không hiện ở portal hoặc trang Messages đã có workspace riêng. Đóng dialog sau resize1440↔390 trả focus về trigger đang hiện. Nút tính lại dùng kiểu secondary có chữ rõ. Đây là phần tiếp của F16/UX-20 và CR-022, không tạo thêm finding trùng.

Gate cuối trên source31: **40fixture UI PASS**, UI thật1440/390 PASS với3hit-point trên CTA không bị che, tương phản chữ nút tính lại14.89:1. Có ảnh sau sửa và đã xem trực tiếp. Hồi quy gồm chat Store/draft/message retry, quyền Seller, ngữ cảnh đơn, hash/focus, ảnh lỗi, dock mobile và resize dialog. Không lấy việc hit-test3điểm hoặc tỷ lệ màu này làm chứng nhận accessibility toàn ứng dụng.

Artifact cuối: `cart-chat-controls-fixture31-final.json`, `cart-controls-runtime31-desktop-final.json`, `cart-controls-runtime31-mobile-final.json`, `cart-checkout-final-state31.json`, `cart31-gates.json`, `frontend-source-cart31-final.json`. Race HTTP vẫn dùng backend29 không đổi, lấy lineage từ `cart-checkout-runtime30-desktop-final-ready.json`; đã đọc lại SQL cùng hai lineage UI31, vẫn12variant30/0,10Order hủy,0money/refund,10redemption,6COMMITTED/3FAILED. Không gộp các lần chạy lặp làm số nhiệm vụ mới.

Các gate30 được giữ làm lịch sử và đã được31 thay cho phần UI cuối. Tổng vẫn15/52VERIFIED,37chưa nghiệm thu đầy đủ; F16 và UX-02 rộng vẫn PARTIAL.
