# F09 — giao thất bại, kiểm hàng hoàn và kết thúc tiền

02/11/2026; các lượt runtime bắt đầu tối01/11. **OP-01 VERIFIED** trong phạm vi giao hàng thủ công đã chốt. Tổng finding gốc: **19/52 VERIFIED, 33 còn mở**. Giữ toàn bộ52 finding/F00–F18/sáu chuỗi trong mục tiêu; chưa nghiệm thu toàn bộ marketplace.

Baseline **Node37/AI37/frontend39**, M1_014/M2_022/M3_013 giữ nguyên. Không thêm enum, API, migration, provider tiền thật hoặc quy tắc bồi thường. Backend270file/AI43file và10image giữ nguyên; integration mới bind-mount đúng file test vào tools, chỉ tạo schema riêng. Manifest frontend/contract/test/config cuối244file, không sửa hash baseline38 hoặc manifest39 trước đó.

## Ba điểm đã sửa

1. **Mất ngữ cảnh liên hệ:** “Liên hệ cửa hàng về đơn” trong hồ sơ hoàn về chỉ dẫn đến danh sách chat. Thay bằng `ContactStoreButton`, xác minh Store và order_context trước khi mở chat; giữ nguyên trang công việc, không tự gửi tin. Fixture baseline một caFAIL; runtime thật Customer gửi một tin, Owner đọc lại đúng order_id. Keyboard Enter và hit-test CTA1440/390 qua. Gộp vào phạm vi UX-07/F16, chưa đóng toàn UX-07 từ riêng CTA này.
2. **Polling xóa biên nhận COD đang nhập:** ACK kho tăng version hồ sơ khiến React remount form hoàn tiền, mất mã biên nhận. Runtime desktop-run4 bắt được mã đã nhập trở thành rỗng, CTA disabled. Hai fixture tái hiện ở đổi trả và hoàn về đềuFAIL trước sửa. Giữ lifetime form biên nhận theo request/order; phần quyết định/kiểm hàng vẫn reset theo version. Bản chưa gửi giữ trường đã nhập, khi gửi dùng version hiện hành; command chưa rõ kết quả giữ nguyên body/operation/version cũ. Không bỏ guard server hoặc tự xác nhận tiền.
3. **Màn chờ dừng ở 404 sớm:** hồ sơ SETTLING có thể xuất hiện trước refund row. GET đầu404 làm panel ngừng polling dù worker đã tạo refund UNKNOWN. Runtime desktop-run5 chứng minh lệch UI–API/DB này. Với hồ sơ hoàn về đang chờ, panel nói rõ chưa có xác nhận hoàn tiền và đọc lại bằng GET tối đa60giây; có nút làm mới thủ công. 401/403 vẫn báo mất quyền. Không retry mutation từ lỗi GET, không giả404 thành thành công.

Các lỗi draft/đọc chờ là những điểm phục hồi trong OP-01/F09; không tăng số finding gốc bằng cách đếm thành các CR trùng.

## Hành trình thật và hậu điều kiện

Hai lineage độc lập1440/390; mỗi lineage giữ cùng đối tượng xuyên suốt từng nhánh. Customer, SELLER chỉ quyền đơn và Owner dùng ba browser context riêng. Chuẩn bị tài khoản bằng verified seed M3 riêng, tạo sản phẩm/đơn và giao bằng HTTP thật; không coi đây là nghiệm thu đăng ký/email hoặc toàn bộ checkout UI.

**COD chưa thu, nhận thiếu rồi nhận đủ:** đặt3áo, trừ tồn10→7, SHIPPED. SELLER đi menu/queue/tìm đúng đơn/dialog để ghi giao thất bại. Thu COD và hoàn tất đơn bị409; Customer khác không đọc được hồ sơ, Customer không dùng endpoint Store. Biên bản nhận2, một tốt/một chờ kiểm giữ hồ sơ mở, reload vẫn đủ dữ liệu. Chuyển thành một tốt/một hỏng nhưng vẫn thiếu một thì UI không đối chiếu, API409 `RETURN_RECEIPT_INCOMPLETE`, chưa cộng tồn. Customer hỏi đúng Store/đơn về món còn lại. Sau khi ghi đủ3, tốt2/hỏng1, đối chiếu bị mất ACK sau commit rồi retry cùng body/key. Chỉ cộng2, tồn9; nghĩa vụ COD CANCELLED, collected/refunded0, không có refund hoặc money movement giả. Đơn chỉ CANCELLED sau hồ sơ CLOSED.

**COD đã thu, toàn bộ hàng nhận lại hỏng:** đơn1áo120000 gồm phí20000; thu trước khi ghi giao thất bại. Nhận đủ1, resellable0/damaged1; M1 ghi receipt rỗng, không có movement cộng kho, tồn8. Hồ sơ SETTLING chờ tiền. Owner giữ được biên nhận qua cập nhật version, xác nhận người nhận/thời điểm/đủ120000 bằng UI; worker mới đóng. Đây là xác nhận thủ công, không phải ngân hàng kiểm chứng.

**Online đã thu, UNKNOWN:** callback integration có chữ ký thật trong stack test xác nhận120000; giao thất bại, nhận đủ1 bán lại được. Tồn về8 nhưng đơn vẫn SHIPPED/hồ sơ SETTLING khi refund UNKNOWN, chưa báo đã hoàn. Worker chỉ lookup; làm mới UI không tạo refund POST mới. Provider kiểm thử xác nhận cùng operation, worker đối soát rồi CLOSED/CANCELLED/REFUNDED. Mỗi lineage chỉ một refund call/một effect. Không phải provider/ngân hàng thật.

Readback M1/M2/M3: **6đơn/6hồ sơ CLOSED**, shipment RETURNED, order_inventory_state RETURN_INSPECTED. Hai variant quantity8/reserved0 khớp ledger. Có6receipt nhưng chỉ4movement nhận trả (+2/+1 mỗi Store), không full-restock thêm sau CANCELLED. Hai refund COD đủ tiền bởi Owner đúng Store; hai refund online DONE; hai COD chưa thu không có refund. **8money movement**, tổng thu480000/hoàn480000. History mỗi hồ sơ chỉ một SETTLEMENT_STARTED/một CLOSED dù retry.

Báo cáo Admin HTTP theo đúng Store/kỳ UTC+7 khớp SQL: mỗi Store3đơn, giá trị đơn560000/phí60000, hàng hoàn tất0, thu240000/hoàn240000; bốn dòng nguồn tiền thuộc đúng Store. Đây là kiểm API/report và nguồn dữ liệu, chưa phải walkthrough UI báo cáo Owner/Admin hoặc hoàn tất F15.

## Quyền và cạnh tranh

- Runtime SELLER chỉ `order.store.read_status_cancel` thực hiện nhận/kiểm/đối chiếu COD chưa thu; không tự hoàn COD đã thu.
- Owner Store mới được xác thực thật thử sáu đơn có tồn tại của Store khác: GET đơn404, list theo order_id rỗng; mở hồ sơ/inspection/settle/CODrefund đều404. Admin đọc trước–sau không đổi. Các đối tượng này đã terminal; không gọi đây là race trên hồ sơ OPEN.
- PostgreSQL isolated dùng handler/service thật, hai kết nối cạnh tranh mở hoàn về với `transitionStoreOrder(COMPLETED)` hoặc `collectCod`: chỉ một bên thành công, bên kia409, không vừa hoàn tất vừa OPEN hoặc vừa mở vừa thu trên cùng version. Test riêng cả hàng hỏng không tạo tồn/tiền giả. Đây là SQL/service transport, không thay chứng cứ HTTP.
- Các scope history/redaction và COD Owner proof đã có35/36;39 bổ sung gate mới, không suy rằng Admin UI, mọi quyền và mọi tranh chấp đã qua.

## Bằng chứng và gate

Tất cả trong `artifacts/core-fix/fix-20261030T100153Z/`:

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| UI hồi quy source cuối |40PASS/6file|`delivery-recovery-fixture39-accepted.json`|
| CTA keyboard/geometry |1PASS, nằm trong40;1440/390|`delivery-contact-geometry39.json`|
| PostgreSQL isolated |34PASS/4suite, thêm2test về race/all-damaged|`delivery-integration39.json`|
| Runtime giao thất bại1440 |PASS, ba nhánh|`delivery-acceptance-runtime39-desktop-accepted.json`|
| Runtime giao thất bại390 |PASS, cùng mục tiêu/dữ liệu khác|`delivery-acceptance-runtime39-mobile-accepted.json`|
| SQL/report HTTP trước và sau thử sai Store |PASS, không đổi tiền/tồn|`delivery-final-state39.json`, `delivery-after-scope-state39.json`|
| Owner Store khác |PASS, sáu đối tượng có thật|`delivery-scope-runtime39.json`|
| Hồi quy UX-08 thực tế |PASS1440/390 và SQL2đơn/4dòng gốc|`exchange-regression39-desktop.json`, `exchange-regression39-mobile.json`, `exchange-regression-final-state39.json`|
| Source/image |270backend/43AI không đổi;244frontend-contract-test-config;10image khớp|`frontend-source-delivery39-final.json`, `runtime-image-delivery39-final.json`|
| Build/contract/drift |PASS,159public/14internal/7event giữ nguyên|gate trên source39 cuối|
| Docs/whitespace/secret text scan |PASS;11file đổi không lỗi khoảng trắng,1235text artifact không khớp secret runtime|`delivery-acceptance39.json`, `artifact-secret-scan39.json`|

Không cộng fixture refinement, viewport, screenshot, assertion hoặc sáu đơn trên thành sáu chuỗi marketplace. Backend unit/Python không chạy lại vì application/image giữ nguyên; chỉ tham chiếu365unit/24Python của37. Runtime đã thu unhandled `pageerror` và không có lỗi; chưa phải toàn bộ audit console/network hoặc screen reader.

## Lịch sử lỗi và phục hồi

Giữ báo cáo desktop/run2/run3/run4/run5, không đổi kỳ vọng để che lỗi. Ba lỗi harness trước là selector `getByLabel` không phù hợp label có textarea prefilled, helper coi heading cũ là lưu xong, và chọn mọi nút Xem đơn khi queue còn dữ liệu cũ. Đã dùng accessible role, chờ response+readback, giới hạn vào đúng mã đơn. Giả thuyết tên trường accessibility sai đã được fixture PASS và ARIA snapshot bác bỏ; không sửa label hoặc báo bug screen reader.

Run4/run5 tìm được hai bug ứng dụng nêu trên. Run5 có lệnh UNKNOWN thật đang chờ: provider kiểm thử sau đó xác nhận operation cũ, worker tự lookup/đóng. Observer45giây hết hạn ngay trước lịch backoff tiếp theo; kiểm tra lại job thực tế DONE/CLOSED, không restart hoặc chỉnh lease: `delivery-pending-recovery39.json`. Chỉ một refund call/effect, hai dòng thu/hoàn120000, không SQL UPDATE trạng thái tiền/hàng.

Verifier ban đầu dùng sai cwd npm, tên cột method/permissions và tạo file đọc chưa thành công; sửa theo schema/tool thực tế rồi chạy lại. Đây là lỗi công cụ, không cộng thành bug ứng dụng. Mọi baseline/result cũ giữ nguyên.

## Thu hồi fixture và phần còn lại

`delivery-visibility39.json` và readback `delivery-taxonomy-visibility39.json`:10sản phẩm/type/category test dừng bán;6Store đã kết thúc được Admin LOCKED và guest không đọc được. Bốn Store exploratory còn công việc được giữ quyền hoạt động: hai biên bản nhận thiếu, một đơn đã thu đang SHIPPED chưa mở hồ sơ, một hồ sơ chờ Owner xác nhận hoàn COD. Tổng4đơn chưa terminal/3delivery case mở. Không bịa kiện đã nhận hoặc biên nhận hoàn tiền để dọn dữ liệu. Các trường hợp pending37 giữ nguyên, không xóa ledger/audit.

**OP-01 VERIFIED**, F09 hai finding gốc OP-01/UX-08 đã có nghiệm thu trong phạm vi thống nhất. Việc chưa có dữ liệu thực nhận đủ hoặc Owner chưa thực sự xác nhận tiền là điều kiện chờ hợp lệ; hệ thống không tự coi hàng thiếu đã về. Không mở rộng sang bồi thường vận chuyển/hàng thất lạc vĩnh viễn hoặc quyết định phí ngoài policy đã duyệt.

Sáu chuỗi cuối cùng baseline, snapshot-writer rollback và33finding còn lại vẫn mở. Bảng đọc inspection còn dùng SKU và cần cải thiện nhận diện/khả năng cuộn theo UX-01/UX-03; không đóng các finding này từ việc luồng chính đã chạy được. Giữ review lịch sử, không tự đổi mọi scenario cũ thành PASS.

Không có giao/nhận kiện vật lý, thiết bị thật, bàn phím ảo, native zoom hoặc screen reader. `USER_VALIDATION_PENDING`; expert walkthrough không thay nghiên cứu người thật. Không kết luận production-ready.
