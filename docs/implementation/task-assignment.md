# Bảng giao task trên khung 2.2

Giao theo **chức năng có thể demo và nghiệm thu**, dùng [ownership](service-ownership.md) để giữ phạm vi từng người và [backlog](member-backlog.md) để chọn việc tiếp theo. Mỗi người có một task đang làm; một task có một owner, người hỗ trợ/review được ghi riêng. Các task dưới đây mới là kế hoạch giao việc, chưa phải bằng chứng đã triển khai.

Task nằm trong GitHub Issues; tiến độ quản lý trực tiếp trên [Kanban GitHub Projects](https://github.com/users/embetapbay123/projects/1/views/2). Kéo thẻ để đổi trạng thái theo [hướng dẫn board](kanban-guide.md). Thịnh dùng `QT-2005` (#2/#7), Hoa dùng `mimidangeiu` (#3/#8); đã mời Write vào repo, assignee tạm vẫn embetapbay123 trong lúc chờ chấp nhận. Trí/Hatsaphone chưa có username. Tài liệu này ghi phạm vi và tiêu chí; trạng thái hiện hành xem trên Kanban.

## Đợt đầu: giao ngay

| ID | Owner | Task đầu tiên | Phụ thuộc và đầu ra |
| --- | --- | --- | --- |
| CORE-01 | Công | Tách điểm mở rộng Customer/Seller/Admin của Web và component trạng thái dùng chung | Refactor khung API hiện có; bàn giao route, thư mục, mẫu gọi API cho ba người làm Web |
| CAT-01 | Thịnh | Danh sách sản phẩm của Store trên Seller Web | M3 context/Store mẫu đã có; bàn giao `listOwnStoreProducts`, `listStoreProducts` và màn danh sách Seller |
| CART-01 | Hoa | Đọc, sửa số lượng và xóa item trong giỏ của mình | Bàn giao `listCartItems`, `updateCartItem`, `removeCartItem`; dùng dữ liệu giỏ trong test. Thêm item và tích hợp giá hiện hành làm ở CART-02 |
| ID-01 | Trí | CRUD địa chỉ của Customer | Bàn giao `listAddresses`, `createAddress`, `updateAddress`, `deleteAddress`; mở đường cho checkout/Web/Mobile |
| WEB-01 | Hatsaphone | Trang danh sách sản phẩm Customer | Dùng `listProducts` mẫu đã chạy; bàn giao danh sách, tìm kiếm, phân trang và trạng thái loading/empty/error |

Backend bắt đầu song song. Người làm Web có thể tạo page riêng trước; kết nối route sau khi CORE-01 được merge. Không yêu cầu Thịnh/Trí/Hatsaphone cùng sửa `BootstrapApp.tsx`. Không giao lại login/catalog mẫu như thể đã hoàn thành toàn bộ nghiệp vụ.

### CORE-01 — Công

- Điểm bắt đầu: [BootstrapApp](../../frontend/src/bootstrap/BootstrapApp.tsx), [API client](../../frontend/src/api/client.ts), [auth provider](../../frontend/src/api/auth-context.tsx).
- Tách các page API thật vào thư mục dự kiến `frontend/src/features/customer/`, `seller/`, `admin/`; component dùng chung có ErrorView/loading/empty. Đây là cấu trúc cần tạo, chưa có sẵn trong khung.
- Bàn giao một page mẫu dùng generated types/API client và quy tắc đăng ký route. Giữ một AuthProvider/QueryClient cho app; client và refresh được dùng chung.
- Nghiệm thu: catalog, login, profile và route demo mock vẫn hoạt động; Web build và các bài kiểm tra Web hiện có đạt. Ba owner có thể thêm page trong thư mục riêng.

### CAT-01 — Thịnh

- Điểm bắt đầu: [catalog module](../../backend/catalog-service/src/catalog/README.md); Seller page sau CORE-01.
- Triển khai `GET /store/products` và `GET /stores/{id}/products` đúng schema/filter/phân trang của OpenAPI. Dùng catalog mẫu làm điểm xuất phát.
- Nghiệm thu: Seller chỉ xem danh sách quản lý của Store thuộc membership hiện hành; trang công khai chỉ trả sản phẩm đủ điều kiện hiển thị. Kiểm bằng hai Store và một User không có quyền.
- Seller page có loading/empty/error/phân trang và dữ liệu API; bàn giao request/response mẫu cho Hatsaphone. Form tạo/sửa sản phẩm là task tiếp theo.

### CART-01 — Hoa

- Điểm bắt đầu: [cart module](../../backend/commerce-service/src/cart/README.md); database M2.
- Triển khai `GET /cart/items`, `PATCH /cart/items/{id}`, `DELETE /cart/items/{id}` với DTO runtime, ownership và version theo contract. Tạo dữ liệu giỏ bằng fixture test để kiểm độc lập.
- Nghiệm thu: Customer A không đọc/sửa/xóa item của B; số lượng sai bị từ chối; version cũ không ghi đè; response đúng schema. Không nhận giá/tổng tiền do client gửi để ghi thành dữ liệu nguồn.
- Phần response cần giá/snapshot từ M1 được kiểm bằng adapter fixture đúng internal contract trong test. Chỉ nghiệm thu tích hợp thật sau khi M1 bàn giao API cần dùng; 501/timeout phải hiển thị là lỗi phụ thuộc.
- Giao `POST /cart/items` và kết nối M1 ở CART-02. Mobile Cart nối sau khi API giỏ tích hợp đạt, để Hoa không phải hoàn thành nhiều phần cùng lúc.

### ID-01 — Trí

- Điểm bắt đầu: [profile module](../../backend/identity-store-service/src/profile/README.md); bốn operation địa chỉ trong OpenAPI.
- Triển khai danh sách/thêm/sửa/xóa, DTO runtime và các quy tắc địa chỉ trong [business rules](../business-rules.md)/schema. Chỉ sử dụng User từ context xác thực.
- Nghiệm thu: A không dùng ID địa chỉ của B; input sai bị từ chối; thay đổi được lưu trên M3 và đọc lại đúng; xử lý địa chỉ mặc định theo contract. Không ghi địa chỉ trực tiếp từ M2.
- Bàn giao request/response và lỗi cho Hoa/Hatsaphone. Lookup nội bộ để M2 lấy snapshot địa chỉ là phần cần chốt ở FLOW-01, không mặc định đã có trong khung.

### WEB-01 — Hatsaphone

- Điểm bắt đầu: Products trong [BootstrapApp](../../frontend/src/bootstrap/BootstrapApp.tsx), `api.products` và mẫu component Công bàn giao. Chỉ nhận một màn ở task này.
- Tạo trang danh sách Customer bằng API: thẻ sản phẩm, nhập tìm kiếm, phân trang; dùng ID/giá do backend trả. Không yêu cầu tự thiết kế contract hoặc viết BE.
- Nghiệm thu: có loading, không có kết quả, lỗi API kèm correlation ID và danh sách bình thường; thao tác tìm kiếm/phân trang đúng request; dùng được ở chiều rộng điện thoại.
- Nếu API client thiếu tham số phân trang, đề nghị Công bổ sung phương thức dùng chung. Chi tiết sản phẩm/login/profile/address là các task riêng kế tiếp.

## Đợt tiếp theo và mốc tích hợp

Đây là thứ tự mở backlog, không phải lịch cam kết theo ngày. Khi giao từng dòng, tách thành task nhỏ như đợt đầu; API/phụ thuộc phải ghi cụ thể. Hoàn thành task thì giao việc tiếp theo cho người đó, không cần chờ cả nhóm nếu phụ thuộc đã sẵn sàng.

| Đợt | Thịnh | Hoa | Trí | Công | Hatsaphone | Mốc nghiệm thu chung |
| --- | --- | --- | --- | --- | --- | --- |
| B: Catalog, Cart, tài khoản | Product/Variant/Image; taxonomy; kho adjustment/movement; ưu tiên `QuoteVariants` để mở CART-02 | CART-02 thêm item + gọi M1; Mobile auth/catalog/cart/address; voucher CRUD/validate | Hoàn thiện auth/profile; StoreApplication/review/Store; Admin User/Store/application | FLOW-01 chốt giao tiếp checkout và Order/Payment; tích hợp nền Payment/COD; hỗ trợ shared | Detail, login/profile, rồi address; từng màn nối API đã nghiệm thu | Customer có giỏ và địa chỉ thật; Seller quản lý được sản phẩm; Admin duyệt Store |
| C: Mua hàng | Reserve/consume/release/restock; kiểm cạnh tranh/replay; Seller Order UI gọi M2 | Quote/checkout nhiều Store; tạo nhóm Order; xem/chuyển trạng thái/hủy; Mobile Order | Staff/invitation/RBAC; khóa User/Store; lookup địa chỉ/Store cho M2 theo FLOW-01 | Payment attempt + SePay Test callback; COD/Refund; recovery và review transaction M2 | Cart → checkout → Order/history/payment; mỗi màn chỉ mở khi API sẵn sàng | Một lượt mua hai Store, Payment riêng từng Order; không trừ kho/thu tiền hai lần |
| D: Hoàn thiện | Review hậu mua/moderation; Seller Voucher/Store/staff | Report/voucher usage; Mobile review, hoàn thiện lỗi và thiết bị | Admin moderation/taxonomy gọi M1; voucher/report gọi M2; metric gọi M4 | Consent/tracking; RAG; recommendation/evaluation; recovery/load/demo | Review, recommendation/chat theo mẫu và API Công bàn giao | Luồng đầy đủ, quyền/ownership, lỗi/retry và nghiệm thu FR/NFR |

### FLOW-01 — Công chủ trì, Hoa/Thịnh/Trí phối hợp

Làm sau CORE-01 và trước khi Hoa triển khai checkout. Đầu ra là contract/ví dụ, interface trong code và danh sách case tích hợp; không phải viết hết nghiệp vụ của người khác.

- M1 ↔ M2: dùng [internal OpenAPI](../contracts/internal-api.json) đã có cho quote/reserve/consume/release/restock; chốt error, timeout, operation ID và recovery theo [integration contract](../integration-contract.md).
- M3 ↔ M2: bổ sung contract lookup địa chỉ/Store mà checkout cần; kiểm ownership ở M3, lấy snapshot ở M2. Khung hiện chỉ có context và danh sách Store active chạy mẫu, không có lookup địa chỉ nội bộ.
- Trong M2: chốt interface Order gọi Payment/COD/Refund và truyền cùng EntityManager khi phải nguyên tử. Hoa sở hữu luồng Order; Công sở hữu ghi nhận tiền và state Payment/Refund. Không để hai người cùng viết một logic tiền.
- `collectCod` hiện nằm ở module Order và metadata owner Hoa: Hoa giữ endpoint/kiểm quyền/luồng Order; Công triển khai nghiệp vụ COD collection/Payment dùng chung transaction. Nếu chuyển owner/controller, cập nhật contract/status trong PR đó.
- Chốt event nghiệp vụ có version/outbox và bên tiêu thụ; event bootstrap đang có chỉ là mẫu. Fixture hỗ trợ phát triển độc lập, không thay bằng chứng tích hợp thật.

## Mẫu task dùng khi giao

Dùng [GitHub issue template](../../.github/ISSUE_TEMPLATE/member-task.md) hoặc copy mẫu dưới đây vào board nhóm. Không giao nguyên một service bằng một issue.

```text
Tiêu đề: [ID] Chức năng và kết quả quan sát được
Owner: một người
Reviewer / người hỗ trợ: ...
Phạm vi: module/file chính, operationId hoặc màn hình
Đầu ra: endpoint/page/migration/ví dụ cần bàn giao
Phụ thuộc: API/task nào; đang có, stub hay cần bổ sung?
Tiêu chí nghiệm thu: thành công + quyền/input/lỗi có liên quan
Kiểm chứng: lệnh chạy, dữ liệu và kết quả
Ngoài phạm vi: phần tách sang task tiếp theo
```

Ưu tiên task có thể demo sau khoảng 1–3 ngày làm việc; đây là mục tiêu chia nhỏ, không phải ước lượng chắc chắn. Nếu một task chứa nhiều màn hoặc nhiều luồng giao dịch, tách tiếp. Hatsaphone nhận từng màn và được Công bàn giao mẫu/API rõ ràng.

## Theo dõi và merge

- Board: `Backlog → Todo → In progress → Review → Done`; task thiếu API dùng trạng thái `Blocked` kèm tên API, owner và cách mở chặn. Kéo thẻ trực tiếp trên Kanban theo [hướng dẫn](kanban-guide.md). UI có fixture chưa được gọi là tích hợp hoàn thành.
- Mỗi task dùng một branch, ví dụ `feat/id-01-addresses`; PR về `main`, ghi ID task, scope, cách chạy và bằng chứng nghiệm thu. Tránh gom toàn bộ service vào một PR.
- Chủ module review phần mình sở hữu; Công review shared/infrastructure/contract và tích hợp. Order/Payment/Inventory cần Hoa/Công/Thịnh cùng xem ranh giới tác động.
- Khung Web đang có nhiều route chung một file; CORE-01 là việc cần làm trước để giảm xung đột. Đổi API client/auth provider, generated types, migration/contract hoặc registration `main.ts` thì báo các owner dùng chung.
- Hoa/Công cùng M2: phối hợp số migration và entity/interface dùng chung trước khi merge. Mỗi service thêm migration mới, không sửa migration đã áp dụng, không truy cập DB service khác.
- Mỗi ngày cập nhật ngắn: đã demo được gì, tiếp theo làm gì, đang chờ ai/API nào. Công tích hợp ngay khi có một luồng đủ các phần, không chờ đến cuối dự án.
- `Done`: owner demo đạt tiêu chí; PR được review/merge; contract/types/status/README đồng bộ nếu có đổi; test phù hợp đạt theo [verification plan](verification-plan.md). Task hoàn thành một phần endpoint không được đổi cả endpoint sang `IMPLEMENTED`.
