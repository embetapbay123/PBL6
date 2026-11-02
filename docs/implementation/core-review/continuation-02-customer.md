# Lượt 02 — hành trình Customer, giỏ và checkout

Ngày 29/10/2026. Tiếp tục baseline `operational-20261029T075615Z`, HEAD `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` và working tree chưa commit. Vite ở 3109 đã dừng giữa hai lượt, được khởi động lại với `VITE_DEV_PROXY_TARGET=http://127.0.0.1:18080`; backend vẫn là project riêng `pbl6-fe-verify`. Đã xác minh lại 239 path nguồn trong baseline không thay đổi. Không sửa ứng dụng, contract hoặc triển khai.

## Kết quả và cách đọc

Lượt này thực hiện **31 ID Customer mới**, trên **1440px và 390px**. Có **78 lượt kiểm tra browser hiện hành** sau ghép lần chạy sửa harness: 44 assertion qua, 34 assertion lỗi. Cùng một ID có thể có bài chính, đường phục hồi và ca biên; không cộng thành nhiệm vụ mới. Hai ca C19/C20 dùng UI–API–DB thật với Customer riêng theo viewport; các ca UI còn lại dùng HTTP fixture có trạng thái và đối chiếu mã/HTTP thật phù hợp.

Tổng tích lũy: **43 ID đã đi UI**, **104 lượt browser hiện hành** (48 qua/56 lỗi). Bộ 109 ca acceptance cũ và 23 ca chứng minh bug là các tập riêng, không cộng vào số nhiệm vụ. Xem [coverage](scenario-coverage.md), [ledger từng lần chạy](scenario-results.csv), [summary máy đọc](../../../artifacts/core-review/operational/summary.json).

Kết quả tổng hợp 158 nhiệm vụ hiện là **11 PASS, 21 FAIL, 15 FRICTION, 5 BLOCKED, 1 POLICY_GAP, 105 NOT_RUN**. PASS là kết luận chuyên gia cho mục tiêu và tập dữ liệu/loại bằng chứng được ghi, không phải nghiên cứu người thật hoặc chứng nhận production. Provider online/refund thật vẫn tắt; C35 chọn phương thức qua không làm C39–C41 thành PASS.

## Điều đã được kiểm bằng API/DB thật

| Nhóm | Hậu điều kiện quan sát được | Artifact |
|---|---|---|
| Địa chỉ | Thêm hai địa chỉ, sửa contact được; Customer khác sửa trả 404. Chọn địa chỉ khác không tự đổi default; sửa sau đặt không đổi snapshot đơn | `customer-http-round2.json` |
| Giỏ/variant | Cùng variant gộp đúng lượng; khác variant có hai cart item; quantity=0 trả 422. Quote chỉ tính cart_item_ids được chọn; hai Store cộng phí 20.000+30.000đ đúng tổng 551.000đ | `customer-http-round2.json` |
| Giá đổi khi đang xác nhận | Đổi giá sau quote → confirm cũ trả 409 `QUOTE_CHANGED`; số đơn của Customer vẫn bằng 0 trước khi đặt lại hợp lệ | `customer-http-round2.json` |
| Confirm lặp | Cùng body/key trả cùng hai order IDs, không sinh thêm đơn. Đơn giữ snapshot người nhận dù address được sửa sau đó | `customer-http-round2.json` |
| Mua ngay | Mỗi Customer riêng có sẵn 2; chọn mua ngay 2 → checkout/quote thật 4 và hàng hóa 400.000đ; DB cart=4 ở cả hai viewport, order_count=0 | `customer-real-round2-v2-results.json`, `customer-real-round2-postconditions.json` |
| Nhận diện variant | Cart thật có hai variant đúng, nhưng UI chỉ hiện SKU; không có Đỏ/S và Đỏ/M | C19 UI thật + DB hậu điều kiện |
| Tìm tiếng Việt | Cùng món: `Áo công sở` và `áo CÔNG SỞ` tìm được; `Ao cong so` và `ao cong so` trả 0 | `customer-search-round2.json` |
| Hết tồn | Variant ACTIVE có quantity=0/reserved=0, add 1 trả 409 `INSUFFICIENT_STOCK` với thông báo vượt tồn; không ghi thành thêm giỏ thành công | `customer-search-round2.json → stock_zero` |
| Voucher hết lượt sau quote | Hai Customer cùng có quote hợp lệ; người thứ hai dùng lượt cuối; người đầu confirm trả 422 `VOUCHER_OUT_OF_QUOTA`, số đơn không tăng; bỏ mã quote lại được | `customer-voucher-round2.json` |

Các request HTTP này là lớp đối chiếu và fixture preparation, không được ghi là walkthrough UI. Không gọi provider thanh toán thật, gửi email thật hoặc tạo giao dịch tiền thật.

## Kết quả từng mục tiêu

| ID | Kết quả | Quan sát quyết định |
|---|---|---|
| C01 | FRICTION | Có dấu/hoa thường được; không dấu không ra cùng món, phải nhập lại có dấu — CR-021 |
| C02 | PASS | Có thể bắt đầu bằng danh mục phù hợp nhu cầu chưa biết tên, cả sidebar và drawer |
| C03 | PASS | Chọn/bỏ danh mục cập nhật đúng URL/request/danh sách |
| C05 | PASS | Kết quả rỗng có thông báo, sửa từ khóa rồi tiếp tục được |
| C06 | FRICTION | Link “Tất cả sản phẩm” reset q/sort đúng tên đích; browser Back giữ được. Thiếu đường quay lại kết quả trước ngay trong nội dung; không báo sai URL |
| C07 | PASS | Mô tả/thông số fixture có nghĩa hiển thị; chưa có nghiên cứu mức hiểu với người thật |
| C09 | FAIL | Chỉ SKU, không chọn Đỏ/M một cách có căn cứ — UX-01 |
| C10 | FRICTION | STOPPED disable đúng; ACTIVE tồn 0 chỉ biết lỗi sau thử thêm, backend chặn an toàn — nối UX-09 |
| C11 | PASS | Đổi lựa chọn đổi đúng giá, variant_id và giá ở giỏ; không đồng nghĩa đã hiểu màu/size |
| C12 | FAIL | Lựa chọn gần nhau không có thuộc tính để phân biệt — UX-01 |
| C19 | FAIL | Hai dòng đúng ở DB nhưng thiếu thuộc tính để xem lại, UI thật cả hai viewport — UX-01 |
| C20 | FAIL | Mua ngay cộng lượng giỏ cũ, thực nhận 4 thay vì ý định 2 — CR-001 P1 |
| C21 | PASS | Min 1, tăng/giảm và từ chối vượt tồn giữ lượng hợp lệ; thêm đối chiếu guard thật |
| C22 | FRICTION | Có đường bỏ dòng/tìm lại/thêm variant khác; phải vòng lại và vẫn dựa SKU |
| C23 | PASS | Bỏ chọn Store B thì quote/checkout chỉ có Store A |
| C24 | FRICTION | Thêm lại được sau xóa nhầm nhưng phải nhớ món/variant/lượng; không yêu cầu mới nút Undo |
| C25 | FAIL | Thiếu thành tiền từng dòng, phải tính nhẩm — UX-02 |
| C26 | FAIL | Thiếu tổng tiền phần giỏ được chọn — UX-02 |
| C27 | PASS | Phí và tổng từng Store đọc được; quote thật hai phí khớp |
| C28 | FRICTION | Quote tách nguồn giảm nhưng UI gộp một số; tổng đúng — UX-13 |
| C29 | PASS | Lỗi quota ở quote và sau confirm sửa được; API thật không tạo thêm đơn, bỏ mã quote lại được |
| C30 | FRICTION | Giảm lượng được nhưng phải đi checkout để biết đã trong ngân sách — UX-02 |
| C31 | FRICTION | Thêm địa chỉ đầu tiên/default đúng; phải rời checkout và tự quay lại — UX-05 |
| C32 | FAIL | Backend sửa được nhưng UI không có sửa contact — CR-010 |
| C33 | PASS | Chọn địa chỉ khác đúng body/default/snapshot |
| C34 | FRICTION | Quay lại giỏ tự chọn thêm Store B; quote tiếp có thêm dòng, phải bỏ chọn lại — CR-020 |
| C35 | PASS | Map COD/online riêng từng Store đúng; không thử tiền thật |
| C36 | FAIL | Đủ tên/lượng/địa chỉ/tiền, thiếu màu/size trước confirm — UX-01 |
| C37 | FRICTION | Màn thành công mất khi reload, tìm lại qua menu được và không POST lại — UX-14 |
| C38 | FRICTION | Nhóm có hai mã đơn nhưng thiếu tên Store/món, phải nhớ hoặc mở chi tiết — mở rộng UX-06 |
| C42 | FRICTION | Không báo COD đã thu giả; enum PENDING chưa diễn giải rõ bằng ngôn ngữ người mua — UX-12 |

## Lỗi mới: CR-020 — Quay lại giỏ tự chọn lại dòng đã bỏ

- **P2, CONFIRMED, bug trạng thái chọn.** Áp dụng C34, liên quan C23/C36; không đếm riêng mỗi Store hay viewport.
- **Điều kiện:** hai Store trong giỏ; khách chỉ muốn mua Store A, đã bỏ chọn dòng Store B.
- **Tái hiện:** Giỏ → bỏ Store B → checkout (quote có một cart_item_id) → “Quay lại giỏ hàng” để sửa → không chủ động chọn Store B → checkout lại.
- **Expected:** quyết định bỏ chọn còn được giữ cho những dòng chưa thay đổi; món ngoài ý định không tự quay vào quote.
- **Actual:** cart load gán selected=toàn bộ item. Store B được chọn lại; quote thứ hai có hai cart_item_ids. Khách có thể bỏ chọn lại trước confirm, nên kết quả nhiệm vụ là FRICTION. Chưa đặt nhầm đơn/thu tiền thật, không nâng P1 chỉ vì có khả năng ảnh hưởng tổng tiền.
- **Mã:** [CartPage.tsx:71](../../../frontend/src/features/customer/CartPage.tsx:71), đặc biệt dòng 78; selection namespaced được viết khi đi checkout nhưng không phục hồi ở load.
- **Bằng chứng:** C34 ở `customer-round2-v2-results.json`; `customer-recovery-results.json` lưu quote trước một dòng và sau hai dòng, cả 1440/390. Test đỏ giữ assertion mong đợi chỉ một dòng.
- **Hướng sửa tối thiểu:** phân biệt khởi tạo lần đầu với lựa chọn đã có; giữ lựa chọn theo user, chỉ loại item đã mất và có quy tắc rõ cho item mới. Không reset khi quay lại sửa giỏ; không lẫn selection của tài khoản khác.
- **Hồi quy:** một phần dòng/một Store, back/link quay lại/reload, lượng đổi, dòng bị xóa, item mới, hai tab và đổi tài khoản; so cart_item_ids và payable ở quote trước confirm.

## Lỗi mới: CR-021 — Tìm không dấu bỏ sót món tiếng Việt

- **P2, CONFIRMED cho hành vi tìm kiếm;** C01 FRICTION. Không kết luận toàn bộ tìm kiếm hỏng; lỗi chính tả/fuzzy search không được kéo vào tiêu chí bắt buộc.
- **Điều kiện:** đúng product ACTIVE/VISIBLE của Store review đang mở, title có “Áo công sở”.
- **Tái hiện:** API public `/products?q=Áo công sở` → có món; cùng dữ liệu `/products?q=Ao cong so` → total=0. Hoa/thường vẫn đúng. Frontend gửi nguyên q đã nhập, không có bước chuẩn hóa làm thay kết quả này.
- **Expected:** truy vấn có/không dấu tương đương cho nhu cầu tiếng Việt đã giữ từ DIS01; count và items nhất quán.
- **Actual:** chỉ tìm hoa/thường bằng ILIKE; thiếu xử lý dấu. Đây là bằng chứng API/DB thật kết hợp code; hai viewport đã kiểm đường nhập có dấu, chưa đi riêng UI không dấu bằng người thật.
- **Mã:** [catalog.repository.ts:36](../../../backend/catalog-service/src/catalog/catalog.repository.ts:36), [MarketplaceHeader.tsx](../../../frontend/src/live/MarketplaceHeader.tsx).
- **Bằng chứng:** năm query cùng product_id trong `customer-search-round2.json`. Đã thu hồi lại product/type sau thử, không dùng data demo làm đối tượng ghi.
- **Hướng sửa tối thiểu:** chuẩn hóa tìm kiếm tiếng Việt nhất quán ở title/description và count/items, giữ giá trị q người dùng đọc được. Nêu rõ nếu sản phẩm quyết định không hỗ trợ tìm không dấu; không tự thêm typo engine hoặc thay chính sách ranking.
- **Hồi quy:** hoa/thường, có/không dấu, đ/Đ, phân trang/sort/category, kết quả rỗng thật; kiểm đúng visibility/Store scope và chỉ đo hiệu năng khi có workload xác định.

## Vướng mắc mới: UX-13 — Không thấy nguồn giảm giá

- **P2, usability, CONFIRMED trên UI fixture và code;** C28 FRICTION. Quote có store_discount=10.000, platform_discount=5.000; summary chỉ “Giảm giá: 15.000”, tổng 205.000đ đúng.
- Người mua phải nhớ mã nào do Store/sàn cấp hoặc tự tính để giải thích tổng, dù dữ liệu riêng đã có. Không có bằng chứng sai phân bổ tiền hoặc tiền thu.
- **Mã/bằng chứng:** [CheckoutPage.tsx:752](../../../frontend/src/features/customer/CheckoutPage.tsx:752), C28 hai viewport trong `customer-round2-v2-results.json`.
- **Tối thiểu/nghiệm thu:** hiển thị hai nguồn giảm và tên Store tương ứng, tổng khớp. Kiểm một hoặc hai voucher, không đủ điều kiện, nhiều Store, snapshot đơn; không kéo thêm ví/phí sàn/payout.

## Vướng mắc mới: UX-14 — Reload làm mất xác nhận vừa tạo đơn

- **P2, usability, CONFIRMED trên UI fixture và code;** C37 FRICTION. Sau thành công, màn kết quả chỉ nằm ở React state; attempt/selection đã bị xóa. Reload về checkout không có món chọn thay vì thông tin đơn vừa tạo.
- Đường vòng đã thực hiện: Menu tài khoản → Đơn hàng → xem lại mã; không gửi confirm lần hai. Backend replay thật cùng key cũng trả cùng order IDs, nên không gọi đây là bug sinh đơn trùng.
- **Mã/bằng chứng:** [CheckoutPage.tsx:398](../../../frontend/src/features/customer/CheckoutPage.tsx:398), C37 bài chính và recovery hai viewport; `customer-http-round2.json` phần replay.
- **Tối thiểu/nghiệm thu:** sau commit dẫn tới kết quả đọc lại được bằng owned order/group ID hoặc lịch sử có liên kết rõ. Reload/back/tab mới không làm khách hiểu phải đặt lại. Giữ nguyên cơ chế body/key của giao dịch chưa rõ kết quả; không tự phát lại POST sau success.

## Các phát hiện cũ được mở rộng, không tạo ID trùng

- **CR-001:** nâng loại bằng chứng từ fixture lên UI + quote + DB thật, ở cả hai viewport. Chưa bấm confirm đặt sai; tác động đã chứng minh ở số lượng/tổng tiền được đưa ra để xác nhận.
- **UX-01:** ngoài picker, cart và checkout đều thiếu thuộc tính; C19 thật có hai dòng đúng nhưng không xem lại được Đỏ/S và Đỏ/M. Không sửa sai variant_id của server để chữa phần nhận diện UI.
- **UX-02:** thành tiền/tổng phần chọn thiếu khiến C30 phải sang checkout xem ngân sách; đường vòng hoàn thành được nên không chấm C30 FAIL.
- **UX-05:** C06 link Tất cả sản phẩm đúng đích nhưng không giữ q/sort; browser Back là đường phù hợp. C31 và C24 có đường vòng khả dụng. Không đếm việc thiếu Undo hoặc đổi variant trực tiếp thành tính năng bắt buộc mới.
- **UX-06:** màn kết quả nhiều Store cũng chỉ có UUID/tiền/phương thức, thiếu tên Store/món. Có thể mở từng đơn nên FRICTION, không kết luận server giao nhầm Store.
- **UX-09/UX-12:** ACTIVE không đồng nghĩa có tồn; COD PENDING không phải tiền đã thu. Server chặn thiếu tồn/giữ tiền đúng ở mẫu đã chạy; UI vẫn cần diễn giải trạng thái bằng ngôn ngữ công việc.

## Dữ liệu, harness và phần chưa làm

- HTTP chính dùng `op-review-1793263405819`: hai Customer riêng, quote/đơn riêng; hai đơn đã hủy trước bàn giao. Bài voucher tạo thêm một đơn phụ và đã hủy. [Cleanup cuối](../../../artifacts/core-review/operational/customer-round2-cleanup.json) xác nhận ba đơn CANCELLED, 0 sản phẩm review ACTIVE, type INACTIVE, voucher STOPPED.
- UI thật lần đúng dùng `op-review-1793263841536`, bốn Customer độc lập cho C19/C20 × hai viewport; cả bốn có 0 đơn. Cart và lịch sử được giữ để tái kiểm. Lần chuẩn bị trước đó giữ riêng `customer-real-ui-data-attempt1.json`; không đếm lỗi heading trùng thành bug.
- Bộ seed 100 đơn của lượt 01 là checkpoint lịch sử. Sau giao dịch lượt 02, Store A có **102 đơn**, Store B **3 đơn**; không viết lại bằng chứng bài “100 đơn” đã chạy trước.
- Lần UI đầu có race chờ điều hướng, selector “Giỏ hàng” trùng header/footer và label drawer exact sai. Kết quả đầu/ảnh được giữ riêng; bản v2 và rerun danh mục thay kết quả hiện hành theo file/title/project. Các lỗi này là harness, không phải finding sản phẩm.
- Test kỳ vọng giữ nguyên màn kết quả sau reload hoặc có tổng ngay trong giỏ có thể đỏ nhưng nhiệm vụ vẫn hoàn thành qua đường vòng. Đã chạy recovery để quyết định FRICTION, không biến mọi assertion đỏ thành FAIL nhiệm vụ.
- Fixture có thông điệp quota có kiểm soát; API thật đã kiểm code `VOUCHER_OUT_OF_QUOTA` và thông báo tiếng Việt. Các widget phụ không cấu hình trong một số fixture có thể trả 404 thử nghiệm; không báo các 404 đó là bug backend hoặc tuyên bố mọi request ở trang đều sạch.
- **105 NOT_RUN còn lại**, provider/thiết bị/screen reader vẫn như báo cáo readiness. Chưa seed ảnh thật có nghĩa cho C08, chưa nghiên cứu người thật, chưa kiểm bàn phím ảo hoặc thiết bị vật lý. Không tự suy kết quả này cho toàn bộ X01–X30.

Ưu tiên tiếp: C04/C08 và C13–C18 (mua qua đăng nhập/đổi tài khoản), C44–C54 (tìm việc cần làm/hủy/sau mua), rồi quyền nhân viên và quyết định Admin. Các policy POL-01–POL-06 chưa được tự chốt trong lượt này.
