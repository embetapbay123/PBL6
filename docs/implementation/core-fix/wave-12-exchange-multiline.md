# F09 — đổi toàn đơn nhiều phân loại, đúng quyền nhân viên

01/11/2026. Nghiệm thu bổ sung **UX-08** trên baseline **Node37/AI37/frontend38**. Tổng finding gốc: **18/52 VERIFIED, 34 còn mở**. F09 chưa đóng vì OP-01 và ma trận giao thất bại còn cần nghiệm thu; sáu chuỗi cuối vẫn phải chạy cùng baseline cuối. Không thay bằng chứng cũ hoặc nâng toàn bộ F09 từ một luồng đổi hàng.

## Vướng mắc đã tái hiện và sửa

Đơn có cùng một sản phẩm với hai phân loại M ×1 và L ×2. Tại bước gửi hàng đổi, hai ô chọn chỉ ghi cùng tên sản phẩm. Nhân viên phải nhớ thứ tự các dòng ở phần trên để ghép lựa chọn; ngay tại ô chọn không có phân loại gốc hoặc lượng áp dụng. `exchange-multiline-baseline37.json` cùng ảnh `staff-multiline-selection.png` chứng minh hai label giống nhau bằng Edge và dữ liệu thật. Đây là vướng mắc nhận diện P2 thuộc UX-08; chưa có bằng chứng đã giao nhầm hàng vật lý hoặc mất tiền, không tạo thêm finding trùng trong tổng52.

`ReturnActions.tsx` nay chia từng dòng thành fieldset có legend riêng, hiển thị lại snapshot tên, phân loại, SKU, số lượng và giá gốc ngay cạnh lựa chọn. Label liên kết ID rõ ràng, phân biệt mục1/mục2 và không chứa các option/giá trị đang chọn. Giải thích lựa chọn áp dụng toàn lượng của dòng, chỉ đổi toàn đơn/cùng sản phẩm/cùng giá; chưa hỗ trợ riêng một món hoặc khác giá. Không tự chọn phân loại thay người dùng.

Không thêm quyền catalog/inventory cho SELLER: metadata từ public API của sản phẩm đang bán đã đủ cho trường hợp này. Không tạo API đặc quyền để làm test qua. Backend, contract, worker và migration giữ nguyên37; snapshot hàng đổi vẫn do M1 chụp cùng transaction xuất kho và M2 đối chiếu.

## Các lượt đã chạy

- Một lượt baseline UI37 và hai lượt nghiệm thu UI38 ở1440/390. Cùng mục tiêu ở hai viewport không được cộng thành nhiệm vụ mới. Customer, nhân viên chỉ `order.store.read_status_cancel`, Owner và Admin có phạm vi riêng; hai browser context Customer–SELLER độc lập.
- Chuẩn bị bằng HTTP thật: giỏ có M ×1/L ×2 → quote/confirm một đơn320000 gồm hàng300000/phí20000 → giao/thu COD/hoàn tất. Tài khoản được seed xác minh trong M3 riêng, không gọi đây là nghiệm thu đăng ký/email.
- Customer đi menu/lịch sử/tìm đơn/chi tiết, form nói rõ toàn đơn; lý do chỉ M sai cỡ nhưng yêu cầu toàn đơn. Nhân viên vào Store Portal/Đổi trả, chấp thuận Store chịu phí, ghi nhận đủ M ×1/L ×2 bán lại được bằng UI. Kho nhận về từng dòng đúng lượng, không hỏi DB để tìm món trong walkthrough.
- Nhân viên không có quyền đọc catalog hoặc inventory Store (HTTP403) vẫn chọn được phân loại. Owner thu hồi quyền khi form gửi đổi đang mở: PATCH bị403, trạng thái vẫn NOT_STARTED, chưa có dispatch snapshot, L còn3. Cấp lại đúng quyền bằng Owner; reload đọc quyền và dữ liệu mới, không tự phát mutation cũ.
- Nhân viên gửi L ×3 từ hai dòng gốc. HTTP handler commit rồi mất ACK503; UI retry giữ nguyên body/operation ID. Worker chỉ xuất một lần tổng3, giữ hai dòng snapshot tương ứng original variant/quantity. Customer thấy hàng đổi L và xác nhận đã nhận bằng UI. Admin đọc cùng snapshot qua API, chưa phải walkthrough Admin.
- Fixture bổ sung chọn hai đích khác nhau (M→L, L→M) và kiểm mapping order_item_id chính xác, label ổn định sau chọn. Kiểm không tràn ngang ở1440/1024/768/390. Các fixture được ghi rõ, không thay API/DB/worker thật.

## Gate và hậu điều kiện

Artifact tại `artifacts/core-fix/fix-20261030T100153Z/`:

| Gate | Kết quả | Bằng chứng |
| --- | --- | --- |
| Hồi quy UI đổi/trả/hoàn về/history |21PASS/4file, gồm một test nhiều dòng mới|`exchange-multiline-fixture38.json`|
| Runtime desktop1440 |PASS, một đơn nhiều dòng|`exchange-multiline-runtime38-desktop.json`|
| Runtime mobile390 |PASS, cùng mục tiêu với dữ liệu độc lập|`exchange-multiline-runtime38-mobile.json`|
| SQL M1/M2/M3 |PASS, tách2đơn accepted/1đơn baseline|`exchange-multiline-final-state38.json`|
| Source/runtime |270backend hash không đổi;242frontend/contract/test/config;10image giữ nguyên37|`frontend-source-exchange38.json`, `runtime-image-exchange38.json`|
| Build/contract/drift/whitespace |PASS;159public/14internal/7event không đổi|lệnh kiểm trên baseline38|
| Thu hồi dữ liệu fixture |3Store LOCKED, sản phẩm/type/category STOPPED; giữ lịch sử|`exchange-multiline-visibility38.json`|

Readback ba lineage:3Order/3Return COMPLETED; mỗi đơn2dòng gốc,2snapshot đổi nhưng cùng variant L, tổng3áo. Chỉ một dispatch movement −3 mỗi đơn,2movement nhận về +1/+2. Chín variant đối chiếu ledger: mỗi Store M10/L0/XL2, reserved0. Ba khoản thu COD320000, không có khoản hoàn giả. Nhân viên từng Store chỉ có quyền đơn; một EXCHANGE_DISPATCH_REQUESTED/đơn dù gửi lại. Hai snapshot M1/M2 đối chiếu đúng toàn bộ dữ liệu từng receipt.

Lỗi verifier ban đầu dùng đường `/fix` chưa mount, sau đó dùng sai tên cột permissions; đã sửa verifier theo schema thực tế và chạy lại SELECT-only thành công. Không coi hai lỗi công cụ này là bug ứng dụng. Những hồ sơ REQUESTED/APPROVED còn mở từ lượt37 giữ nguyên, không giả hoàn tất để dọn dữ liệu.

## Kết luận theo finding và giới hạn

**UX-08 VERIFIED** cho thiếu hướng dẫn/địa chỉ/phí và chọn đúng hàng đổi trong phạm vi đã chốt. Bằng chứng38 bổ sung đơn nhiều dòng và nhân viên quyền đơn vào37 (nhận thiếu rồi nhận đủ, chọn rõ phân loại, snapshot sau sửa catalog, hết hàng, đề nghị chuyển hoàn có consent/mất ACK, hoàn COD đủ). Không yêu cầu đổi một phần/khác giá ngoài phạm vi. C52/S35/S36 không còn bị chặn bởi phần hướng dẫn/chọn hàng đổi của UX-08; không tự chuyển kết quả review lịch sử thành PASS.

**OP-01 vẫn mở**, tách khỏi UX-08. Ma trận giao thất bại/nhận hoàn thiếu hoặc hỏng, các biên cạnh tranh và sáu chuỗi cuối thuộc công việc tiếp theo. Rollback writer snapshot chưa diễn tập, giữ M1/M2 reader37; không nâng thành PASS từ thay đổi UI38.

Đây là expert walkthrough và automation, `USER_VALIDATION_PENDING`. Không có người tham gia nghiên cứu, giao/nhận kiện vật lý, thiết bị thật, bàn phím ảo, screen reader hoặc zoom native. Không tuyên bố các phần này đã đạt. Runtime38 chưa thu console tự động riêng; không suy console/screen reader PASS từ screenshot. API/SQL Admin chưa thay walkthrough Admin.
