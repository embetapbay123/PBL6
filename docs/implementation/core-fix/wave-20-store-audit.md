# F12 — Owner truy được thao tác nhân viên

02/11/2026. **OP-04 VERIFIED**, tổng **30/52 finding gốc VERIFIED,22 còn mở**. Hai finding gốc của F12 có bằng chứng: CR-012 ở đợt45 và OP-04 ở đợt46. Gói vẫn giữ kiểm tra chéo phiên/draft khi chuyển Store trước nghiệm thu chung; không suy từ nhật ký đúng thành mọi thao tác phiên đều đúng. Sáu chuỗi trên cùng baseline cuối, rollback snapshot writer và các finding khác vẫn mở ở F18.

Baseline cuối **Node46b/AI46/frontend46-readable**, HEAD giữ nguyên.389file backend,43file AI và275hash frontend/contract/test/config đối chiếu đúng10image đang chạy; simulator tiền vẫn37. `frontend-source-store-audit46-readable.json` là con của manifest46/273hash. Giữ nguyên manifest46,45 và các report trước thay đổi renderer. Không migration, không sửa lại raw audit lịch sử.

## Lỗi đã chứng minh và sửa

- **Mất version sau lỗi gửi lời mời:** TypeORM trả kết quả UPDATE RETURNING theo dạng bọc; nhánh `failInvitationDelivery` lấy nhầm phần tử ngoài. Invitation đã REVOKED/version1 nhưng audit thiếu `after.version`. Dùng `returnedRow`, kiểm kết quả ghi và giữ audit trong cùng transaction. Test SQL so version trước/sau với bản ghi thật.
- **Đổ bước worker cho Customer:** một số audit kho/callback/refund lưu ID khách đặt đơn làm actor. Owner thấy như khách thực hiện bước tự động; projection cũng bỏ `state` nên có sự kiện trước/sau rỗng. Writer mới lưu System cho các sự kiện tự động đã biết. Reader lịch sử dùng cùng định nghĩa executor cho kết quả, count và bộ lọc; raw actor gốc không bị viết lại.
- **Không nhận diện worker chỉ bằng mã:** lý do hủy do người dùng nhập từng được dùng làm mã audit. Candidate46 bị test chống trùng mã bắt lỗi. Bản46b kiểm cả hậu điều kiện kho/trạng thái; hủy đơn được ghi thành `CANCEL_ORDER`, giữ lý do riêng. Reader ánh xạ lịch sử tương ứng và không đổi raw record. Khách hủy với lý do `INVENTORY_CONSUMED` vẫn là ACCOUNT/Customer, không thành System.
- **Không đoán người thực hiện:** actor lịch sử thiếu ID trả `UNKNOWN` qua enum bổ sung trong StoreAuditEntry; UI nói chưa có thông tin. Tài khoản có ID nhưng không có nhãn vẫn giữ ID; System chỉ dùng cho executor đã xác định. Không gọi lookup toàn sàn để chữa thiếu nhãn.

Code chính: [audit-actor.ts](C:/PBL6/backend/shared/src/audit-actor.ts), [audit writer](C:/PBL6/backend/shared/src/audit.ts), [Store reader](C:/PBL6/backend/shared/src/store-audit.ts), [StaffRepository](C:/PBL6/backend/identity-store-service/src/staff/staff.repository.ts).

## Khả năng dùng được từ UI

Owner vào Nhật ký Store, chọn khu vực, lọc theo người/hành động/đối tượng/kỳ và xem trước–sau. Có nút lọc ngay hành động đang xem; liên kết mở đúng sản phẩm, phân loại kho hoặc hàng đợi đơn với mã cần tìm. Metadata variant của audit điều chỉnh kho lấy từ chính dòng đã ghi, trong quyền Store.

Trạng thái/vai trò có nhãn tiếng Việt và giữ mã để đối chiếu. Formatter chỉ dịch trường hệ thống: SKU trùng chuỗi mã quyền vẫn giữ nguyên; thuộc tính tự định nghĩa tên `status`/`permissions` không bị biến thành trạng thái/quyền hệ thống. Không biến giá trị thiếu thành0.

Owner chỉ đọc Store hiện hành, theo actor/object/time đã lọc server. Nhân viên SELLER không có trang log và API trả403. Actor đã bị khóa hoặc chuyển Store vẫn truy được bằng membership/ID lịch sử; tên hiển thị là nhãn hiện tại, UI nói rõ giới hạn này. Không mở `platform.admin`, không trả password/token/địa chỉ/biên nhận ngân hàng trong raw JSON cho Owner.

UI: [StoreAuditPage](C:/PBL6/frontend/src/features/seller/StoreAuditPage.tsx), [formatter](C:/PBL6/frontend/src/features/seller/store-audit-presentation.ts).

## Gate và bằng chứng

Artifact tại `artifacts/core-fix/fix-20261030T100153Z/`.

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Baseline45 |21PASS/2FAIL: mất version và worker bị gán Customer, state bị bỏ|`store-audit-baseline45.json`|
| Candidate46 |Ca chống lý do hủy trùng mã FAIL; giữ lịch sử, không sửa kỳ vọng cho qua|`store-audit-reason-collision46-baseline.json`|
| Unit Node46b |369PASS/51suite|`backend-unit-audit46-final.json`|
| SQL Node46b |80PASS/6suite: audit/lifecycle, callback, recovery/refund/COD và order recovery|`store-audit-sql46-final.json`|
| Edge/pure renderer cuối |23Edge +3pure PASS; Unknown/System, actor/scope/error, link/filter/date, bàn phím dialog và bảo toàn mã hàng|`store-audit-ui46-readable.json`|
| Runtime1440 |PASS N08: nhân viên đổi giá/kho/xác nhận đơn; chuyển Store; Owner tìm ở trang2, lọc actor/kỳ và đối chiếu|`store-audit-runtime46b-readable-desktop.json`|
| Runtime390 |PASS cùng mục tiêu với dữ liệu khác; thêm hình bảng/cards768/1024|`store-audit-runtime46b-readable-mobile.json`|
| SQL cuối |4Store/4variant,2đơn CANCELLED/payment CANCELLED,0thu/0hoàn; tồn12/10 đúng ledger; actor, version, lịch sử membership đúng|`store-audit-final-state46-readable.json`|
| AI reader |28PASS contract/algorithm/active-store|`ai-audit46-final.xml`|
| Source/image |389backend,43AI,275hash;10image đúng, không migration mới|`deployed-source-manifest-46.json`, `runtime-image-store-audit46-readable.json`, `frontend-source-store-audit46-readable.json`|
| Thu hồi hiển thị |16Store/16product/type/category của mọi lượt46 đã khóa/dừng;8đơn đã kết thúc, không còn pending trong tập này|`store-audit-visibility46-readable.json`|

Mỗi lượt runtime dùng cùng đối tượng xuyên suốt: Seller sửa giá100000→100500, nhập thêm2, xác nhận đơn COD; Customer hủy với mã lý do trùng worker, worker hoàn kho. Owner khóa membership cũ, nhân viên nhận lời mời Store thứ hai và đổi tên hiện tại.22điều chỉnh bù của Owner đưa hai sự kiện nhân viên ra ngoài trang đầu mà không đổi tồn ròng. Owner tìm từ UI, đọc lại đúng giá/tồn/trạng thái/quyền và mở đúng đơn đã hủy. API Store khác trả0kết quả cho đối tượng của Store đầu, lookup không trả nhân viên chỉ thuộc Store khác. Không dùng DB để chỉ đường cho lượt walkthrough.

SQL cuối xác nhận membership cũ LOCKED/version1, membership Store mới ACTIVE; actor lịch sử và ID không bị chuyển sang nhân viên khác. Audit xác nhận đơn là đúng Seller; consume/restock là System; hủy là đúng Customer dù lý do giống mã worker. Tồn/reserved khớp ledger, không phát sinh money movement. Hai lượt cuối không có pageerror trên các trang đã theo dõi.

## Giới hạn và phần chưa đóng

- NULL/legacy actor, backfill liên kết và lỗi email được kiểm trong schema SQL cách ly; không dựng sự kiện giả vào raw audit runtime để làm bằng chứng. Email là adapter kiểm thử; không chứng minh inbox SMTP thật.
- Lịch sử thiếu Store association đáng tin vẫn không được trả cho Owner; dùng đường Admin đối chiếu mã truy vết. Không suy hoặc gán lại Store từ JSON không chắc chắn.
- Nhãn actor hiện tại không phải snapshot tên ở thời điểm cũ. Log không thay báo cáo tiền, timeline đơn hoặc bằng chứng kiểm hàng.
- Giữ các report thử thất bại: locator tên nút cũ, giả định kiểu number thay vì bigint-string ở JSON audit, locator text gộp trong ô, compiler annotation của test. Đã sửa harness, không đổi số tiền/trạng thái mong đợi. Một sản phẩm Store thứ hai còn ACTIVE sau lượt harness đầu đã được dừng bằng SQL cleanup có tag riêng; không viết lại tiền/tồn/đơn/audit. Chi tiết tại `store-audit-visibility46.json`.
- `generate:types` cập nhật hai public typings, nhưng bước ghi lại internal typings gặp lỗi mở file của Windows. Sinh internal ra file tạm cho SHA256 trùng bản đang dùng; contract drift check vẫn PASS. Không thay quyền file hoặc đổi nội dung để che lỗi.
- M3 được recreate khi đổi image; email capture cũ trên filesystem container không còn để đọc lại. Bằng chứng capture/secret scan45 giữ nguyên lịch sử, không tuyên bố đã chạy lại nó trên46. Bản cuối không yêu cầu token email cũ.
- Không thiết bị vật lý, bàn phím ảo, native zoom hoặc screen reader; giữ `USER_VALIDATION_PENDING`. Ảnh Edge/viewport không thay nghiên cứu người thật.
- Gói F12 còn kiểm tra chéo draft/request khi membership chuyển Store trong phiên đang mở. Đây là ca cần tái hiện, chưa gán thành bug hoặc P1 khi chưa có kết quả. UX-12 onboarding,22finding khác, sáu chuỗi cùng baseline cuối và rollback snapshot writer vẫn mở; **chưa nghiệm thu vận hành marketplace**.

Build, OpenAPI, drift và kiểm tài liệu/whitespace đã qua; warning bundle chính >500kB vẫn hiện hữu. Gate tổng hợp và quét secret cuối nằm trong `store-audit-acceptance46.json` và `artifact-secret-scan46.json`.
