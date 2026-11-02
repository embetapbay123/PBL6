# Đợt52 — hàng đợi duyệt Store và quyết định khóa/mở

Baseline gốc `fix-20261030T100153Z` giữ nguyên. Runtime **Node51/AI51/frontend52**, stack test riêng. **CR-026/027 VERIFIED;37/52finding gốc đã xác minh,15còn mở.** F14 còn UX-16/17, sáu chuỗi trên cùng source cuối và rollback snapshot writer vẫn mở. Không chạy thêm mobile theo yêu cầu.

## Phạm vi và vấn đề bổ sung

CR-026 từng lọc hồ sơ chỉ trong trang hiện hành rồi làm mất pager. CR-027 từng dùng prompt khóa không nhắc đối tượng/tác động. Các sửa nền đã có trong source trước; lượt này xác minh lại bằng dữ liệu thật ngoài trang đầu, hai phiên Admin, phiên Owner đang mở và hậu điều kiện SQL. Không chỉ chuyển trạng thái vì test fixture cũ đã xanh.

Thêm **P2 CF-052-01**, lỗi vòng đời form quyết định: `admin-review-recovery-baseline51.json` có3FAIL thật. Lý do từ chối vẫn sửa được khi PATCH đang gửi hoặc chưa rõ kết quả; đóng bản nháp không hỏi, làm mất lý do đang soạn. Chưa có bằng chứng gửi sai quyết định server hoặc tạo Store trùng từ lỗi này. Đã sửa/xác minh riêng, không cộng vào52finding gốc.

## Thay đổi source

`frontend/src/features/admin/StoreApplicationAdminPage.tsx`:

- Khóa lý do, nút đóng/quay lại khi đang gửi hoặc UNKNOWN/409 cần đối chiếu. Đọc lại là GET đúng mã hồ sơ, không tự lặp PATCH.
- Bản nháp lý do có xác nhận trước khi đóng; dùng guard chung cho route/back/unload. Sau success/readback đã xử lý thì dialog đóng và guard được thu hồi.
- Ref chặn hai thao tác đồng thời ở cả submit và readback; kiểm blocked trước submit. GET lỗi giữ trạng thái dừng, không bảo người dùng đóng rồi bỏ mất yêu cầu chưa rõ.
- Giữ tìm/lọc/đếm phía server, generation bỏ response cũ, URL/pager và version hiện có. Không tự cấp quyền bổ sung hoặc thay nghiệp vụ duyệt/khóa.

`admin-directory.spec.ts` thêm lựa chọn desktop-only cho lượt kiểm thử này:1440/1024/768, bỏ390 khi biến môi trường được bật. Không xóa bằng chứng mobile lịch sử hoặc thay mặc định CI ngoài phạm vi lượt chạy.

Không backend/contract/migration mới. Node51/AI51 và simulator cũ giữ nguyên; chỉ frontend/test mới.393backend/43AI hash đối chiếu vẫn khớp image đã nghiệm thu51, không giả đây là lần chạy lại unit/Python.

## Kiểm chứng mới

| Gate | Kết quả | Artifact |
| --- | --- | --- |
| Edge fixture desktop |16PASS:5queue,8directory,3recovery; cả1024/768 cho dialog/directory|`admin-ui52.json`|
| SQL M3 cách ly |10PASS/2suite: tìm trước paging, counts, ownership, race, version, revoked sessions và phạm vi user/Store|`admin-sql52.json`|
| Runtime desktop |2PASS:25hồ sơ/haiAdmin/Customer và khóa–mở Owner/Store/hai tab|`admin-runtime52-run3.json`|
| SELECT M1/M2/M3 độc lập |26hồ sơ của lượt queue đạt, một Store/membership Owner; phiên cũ thu hồi, tiền/tồn không đổi|`admin-final-state52.json`|
| Source/image |393backend/43AI/299frontend-contract-test-config/10container khớp|`frontend-source-admin52.json`, `runtime-image-admin52.json`|
| Build/contract |Frontend production build PASS;139publicpaths/14internalpaths,159public+14internalDTO/7event và drift PASS|`admin-acceptance52.json`|

Unit374/51suite và Python9 giữ bằng chứng image51, source backend/AI không thay đổi. Không cộng các suite cũ thành ca chạy mới.

### Hàng đợi và cấp Store đúng người

Tạo25hồ sơ có tag:20rejected ở hai trang đầu,5pending ở trang3.24identity/hồ sơ điền là **dữ liệu chuẩn bị SQL**, không tuyên bố đó là24quyết định Admin đã thực hiện. Người nộp mục tiêu là tài khoản test đã xác minh, có mật khẩu chỉ trong bộ nhớ.

Admin đi từ menu, tìm tag, thấy25kết quả và tổng chờ5 ngay khi trang1 không có pending; phân trang tới đúng món ở trang3 rồi lọc thấy5hồ sơ ở trang1. Reload giữ tìm/lọc. Dialog duyệt xác định đúng email, userID và appID; cancel không ghi.

Hai phiên Admin cùng mở đúng hồ sơ: B từ chối có hướng khắc phục, A xác nhận duyệt từversion0 nhận409; GET đọc đúng REJECTED, không ghi đè. Customer thấy lý do, sửa/gửi hồ sơ mới từUI. Admin duyệt hồ sơ mới quaUI, server200 bị cắt thành503 sau commit; nút gửi bị chặn, GET đọc lại APPROVED, chỉ1PATCH. Customer cập nhật quyền và vào Store từUI.

SQL:26hồ sơ của tag cuối gồm25REJECTED/1APPROVED; bản cũ và mới mỗi bảnversion1, hai audit review thực, đúng một Store và một active OWNER membership cho đúng applicant. **STORE_OWNER là vai trò được AuthService suy ra từ membership OWNER**, không thêm global user_role STORE_OWNER; global role vẫn CUSTOMER. UI/API Store thật đã thành công. Store test cuối được khóa sau nghiệm thu.

### Khóa/mở đúng tác động và quyền

Owner có mobile access và WEB session/hai tab đang mở. Admin tìm bằng email, dialog nêu email/ID/phạm vi, hủy không PATCH. Lệnh khóa thật mấtACK; GET đối chiếu xong không gửi lại. Khi userLOCKED, Store vẫnACTIVE và món public vẫn200; access cũ401 và refresh cũ401. Mở user lại yêu cầu đăng nhập mới: credentials cũ vẫn401, context mới có đúng các role trước khóa và đúng membership Store. Hai tab cũ hiển thị yêu cầu đăng nhập, không còn menu Store; không bắt buộc redirect URL vì ProtectedRoute hiện hành giữ địa chỉ và hiển thị prompt.

Admin mở dialog khóa Store; một quyết định cùng trạng thái ACTIVE khác làm tăngversion trước confirm. PATCH cũ409 không đổi Store, lý do UI được giữ; đọc đúng version rồi xác nhận mới khóa. Public product404, Owner account/context vẫn200, ghi product403. Mở Store lại: mónACTIVE public200, mónSTOPPED vẫnSTOPPED. Owner dùng trực tiếp API Admin read/write đều403. Không tăng quyền hoặc tự mở bán các món đã dừng.

SQL cuối của lượt state đạt: userACTIVE/version2, hai audit LOCKED→ACTIVE,4refresh_session cũ revoked; membership OWNER/ACTIVE giữ nguyên. Audit Store gồm quyết định cạnh tranh, khóa, mở và cleanup đúngversion2→5; request409 không thêm audit. Mỗi Store state có một món10tồn và một món0tồn; ledger/reserved đúng.

## Cleanup, lịch sử và giới hạn

`admin-final-state52.json` kiểm luôn các lượt thử:54hồ sơ cuối đều terminal,4Store đãLOCKED,6product/taxonomySTOPPED,0đơn/0money, tổng quantity30/ledger30 và reserved0. Giữ lịch sử, không xóa hoặc SQL sửa trạng thái nghiệp vụ để làm ca qua. Queue seed bị lỗi compile đầu chỉ tạo một identity test riêng, chưa tạo hồ sơ hay Store công khai.

Giữ các trial trong `admin-runtime52-trial.json` và `admin-runtime52-run2.json`, giải thích ở `admin-runtime-harness52.json`: escape JS/SQL trong helper; thiếu Origin nên refresh bịCSRF403 trước khi xét token; locator status chọn thêm Loading; kỳ vọng redirect thay vì prompt thực tế. Sửa harness, giữ các bất biến401/403/phiên/quyền/version/số Store. Verifier đầu giả định quyền Owner là global role cũng được sửa theo repository/AuthService thật, không thêm quyền để làm test qua (`admin-readback52-trial.json`).

Đã xem screenshot queue và Store state desktop. Không chạy thiết bị thật, screen reader hoặc nghiên cứu người tham gia; USER_VALIDATION_PENDING. Không có thanh toán/provider thật trong hai hành trình;0money không thay bằng chứng các chuỗi tiền cuối. CF-052-01 được nghiệm thu, UX-16/17 vẫn mở về đủ ngữ cảnh Store/khách/vụ việc và actor/audit theo quyền.
