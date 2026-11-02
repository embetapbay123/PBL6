# F07 — trục phân loại, phục hồi ghi và thao tác catalog

Tiếp nối01/11/2026 trên stack riêng `pbl6-fe-verify`, gateway18080/frontend3109. Backend manifest26 khớp263file; bảy service/worker cùng image `958266fbdfd07cdda99fc0bce2ff750cf805bb3f6ee9e5b1b6b48de4e20c557f`. Không có migration mới. Source frontend, contract và test cuối nằm trong `frontend-source-variant26-final.json`. Giữ baseline25 và các báo cáo lỗi để đối chiếu.

## Lỗi mới tái hiện và thay đổi

`variant-taxonomy-runtime-baseline25.json` tái hiện10đầu vào sai được ghi/mở bán: thiếu size, thuộc tính lạ, thuộc tính chỉ mô tả Product nhưng không phải trục, giá trị ngoài allowed_values, sai kiểu, khoảng trắng, sửa/add thiếu trục, đổi Product type khi variant cũ không khớp, mở bán legacy malformed. Ca typed0/false hợp lệ được kiểm riêng; không tính nó thành một lỗi.

Đã bổ sung validation trục trong `createProduct`, replacement `updateProduct`, `createVariant`, đổi loại sản phẩm và thao tác mở bán. Mỗi trường lỗi có đường dẫn/reason. Chỉ các `variant_factor` được dùng làm trục; dữ liệu NUMBER/BOOLEAN không được tự ép từ chuỗi. `0`/`false` vẫn hợp lệ. Kiểm trước ghi metadata/variant/inventory/audit/event, trong transaction và khóa Product hiện hành. Các luật ownership, version và unique vẫn giữ.

Dữ liệu cũ không bị sửa hàng loạt: Seller được dừng Product dù taxonomy đã ngừng dùng; dòng variant STOPPED giữ nguyên identity cũ có thể đi cùng payload sửa dòng khác. Dòng mới/sửa thuộc tính/mở lại phải khớp cấu hình hiện hành. Đổi type phải kiểm lại các dòng còn bán. Không sửa snapshot đơn hoặc tồn đã ghi.

Form hiện đọc đúng taxonomy trước khi cho lưu; trường cũ sai kiểu/ngoài lựa chọn có thông báo và cách nhập lại. Thuộc tính ngoài cấu hình được hiển thị nguyên giá trị và chỉ xóa khi Seller chọn, không âm thầm bỏ dữ liệu. Dòng lịch sử dừng bán chưa sửa có thể giữ. Loại không có trục dùng một phân loại tiêu chuẩn, không gợi thêm các dòng trùng. Checklist chỉ ra SKU có trục sai thay vì xác nhận dữ liệu hợp lệ chỉ dựa giá/SKU.

## Ba finding được nghiệm thu

| Finding | Kết quả trên26 |
| --- | --- |
| CR-002 | Mất ACK sau **CREATE thật**: UI giữ trạng thái chưa rõ, khóa tạo và hướng kiểm danh sách. Seller đóng form, tìm đúng sản phẩm, tiếp tục editor; chỉ1POST và1CREATE audit, không cần tạo lại. |
| CR-017 | Bảng390px tại scroll0 đọc được tên dài; action không sticky đè tên. Geometry overlap0, ảnh đã xem; Seller tới editor qua hàng được nhận diện. 1440px cũng đo overlap0. |
| CR-023 | Tạo100500, sửa100001 bằng UI/API/DB, SKU`009264` giữ nguyên. Fixture kiểm min0/MAX_SAFE_INTEGER hợp lệ, âm/thập phân/vượt max bị native input từ chối trước POST. |

**Tổng9/52finding VERIFIED,43finding chưa đóng đầy đủ.** F07 vẫn IN_PROGRESS vì phạm vi UX-09/catalog rộng hơn ba lỗi này. Không coi validation mới là đã nghiệm thu lại toàn bộ sản phẩm, checkout hoặc các luồng cũ.

## Gate và bằng chứng

Tất cả artifact trong `artifacts/core-fix/fix-20261030T100153Z/`.

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Toàn bộ backend unit |356PASS,50suite|`backend-unit-variant26.json`|
| Catalog SQL schema riêng |20PASS|`variant-axes-integration26.json`|
| HTTP thật,11trường hợp trục |PASS:10đầu vào sai422, typed0/false201|`variant-taxonomy-runtime26.json`|
| Edge fixture form/catalog/checklist |33PASS|`variant-catalog-browser26-final.json`|
| Toàn walkthrough Seller1440px |PASS|`seller-catalog-runtime26-desktop-final-readiness.json`|
| Toàn walkthrough Seller390px |PASS|`seller-catalog-runtime26-mobile-final-readiness.json`|
| Đọc lại M1/audit/cleanup |PASS|`seller-catalog-final-state26.json`|
| Build frontend/backend, contract check/drift, docs check |PASS|`seller-catalog-acceptance26.json`|

Walkthrough cùng đối tượng xuyên suốt: Store Portal → tạo Product qua UI với Màu/Cỡ → giữ phản hồi sau commit và trả503 có kiểm soát → kiểm danh sách → editor → thêm variant Xanh/M với NUMBER0/BOOLEANfalse → mô phỏng legacy ngoài cấu hình trong đúng fixture → Seller tự bỏ thuộc tính → lưu giá100001 → thêm2ảnh → đổi thứ tự thật rồi mất ACK → UI khóa mutation → reload đọc lại đúng thứ tự → bỏ ảnh → SQL.

SQL cuối xác nhận mỗi lượt đúng1Product/1CREATE audit,2variant, giữ SKU`009264`/giá100001, trục đúng kiểu, không còn thuộc tính obsolete, tồn0/giữ0. Có2ảnh đã lưu,1ACTIVE/1STOPPED sau bỏ. Product/taxonomy fixture STOPPED; đọc lại toàn tag không còn listing/taxonomy ACTIVE hoặc identity tạm. Giao dịch/audit không bị xóa.

20SQL integration kiểm cả batch swap25 hồi quy, từ chối dữ liệu trục không ghi mồ côi, version không đổi khi lỗi, type change, mở bán legacy, retire/reopen, taxonomy đã dừng và typed0/false. Các ca trước dùng trục không khai báo đã được sửa fixture khai báo cấu hình thực sự; không đổi expected behavior nghiệp vụ để che lỗi.

## Giới hạn và bước còn lại

- Đây là browser viewport1440/390 và fixture responsive768/1024 phù hợp; chưa chứng minh cảm ứng/thiết bị thật, bàn phím ảo, native zoom hoặc screen reader. Geometry và ảnh không thay nghiên cứu với người dùng thật.
- Ảnh dùng SVG URL localhost có browser route kiểm soát. Bằng chứng mutation metadata/SQL là thật; không coi đây là nghiệm thu upload/CDN/provider ảnh bên ngoài.
- Chưa nghiệm thu mọi trạng thái ảnh xung đột/timeout hoặc mọi tổ hợp quyền. Cần kiểm thêm khả năng đặt mua dữ liệu legacy đang ACTIVE từ trước, dữ liệu taxonomy đổi đồng thời và luồng đưa sản phẩm tới trạng thái mua được xuyên checkout. Các phần đó giữ trong F07/F02, không tuyên bố đã hoàn tất.
- Identity fixture được seed trong M3 riêng có guard/tag; login/catalog qua handler thật. Không gọi các lượt này là nghiệm thu đăng ký/email và không tắt rate limiter.
- Lượt runtime đầu lỗi locator, quoting harness SQL và alias cột`url`được giữ. Chúng không phải lỗi sản phẩm. Lượt form đầu thiếu fixture taxonomy cho hai ca version được giữ; sau khai báo axis đúng, các assertion version/toàn bộ variant vẫn giữ và qua.
- CH01–CH05 vẫn bằng chứng21; CH06 gần nhất23. Chưa nghiệm thu sáu chuỗi trên source cuối26 hoặc toàn bộ43finding còn mở.


Tiếp nối29: legacy ACTIVE quote/confirm, khóa taxonomy và phục hồi draft khi Admin đổi cấu hình đã được kiểm tiếp; xem [bàn giao đợt sau](wave-06-taxonomy-checkout.md). Những giới hạn của26 ở trên được giữ như lịch sử, không sửa baseline cũ.
