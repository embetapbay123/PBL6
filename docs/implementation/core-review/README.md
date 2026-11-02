# Core marketplace review — cập nhật 30/10/2026

**Kế hoạch sửa:** [fix-plan.md](fix-plan.md) — 8 đợt, 19 gói công việc, mapping đủ27 CR/20 UX/5 OP; có phụ thuộc chính sách, contract và cổng nghiệm thu sáu chuỗi. Mới lập kế hoạch, chưa sửa ứng dụng.

**Kết quả hiện hành:** đã chốt kết quả hoặc giới hạn cho [158 nhiệm vụ](scenario-coverage.md), [325 ý góp ý](plan-review-decisions.md) và sáu chuỗi đối chiếu. **54 PASS, 51 FRICTION, 38 FAIL, 10 BLOCKED, 5 POLICY_GAP; 0 NOT_RUN.** Có149 ID có đường đi/điểm dừng UI,406 lượt browser; không tuyên bố mọi nhiệm vụ hoặc mọi nhánh đều đã chạy xong. Chín ID chưa có walkthrough đầy đủ được ghi rõ ở [readiness](operational-readiness.md). **Chưa sẵn sàng vận hành.**

Xem [lượt06 — Admin](continuation-06-admin.md), [lượt07 — ảnh, bàn phím và nội dung khó](continuation-07-accessibility-content.md), [ledger từng lần chạy](scenario-results.csv) và [findings](findings.md). Thêm CR-026/027 P2; tái xác minh CR-005/017 trên baseline hiện tại. Tổng CR27:0P0,4P1,22P2,1P3; không cộng các biểu hiện UX/OP trùng nguyên nhân thành bug mới. SELLER là nhân viên, STORE_OWNER là chủ Store. Các mục bên dưới giữ snapshot lịch sử, không thay số liệu hiện hành.

**Bổ sung quan trọng:** xem [review theo nhu cầu và thao tác thực tế](user-workflow-review.md). PASS chức năng/API ở báo cáo này không đồng nghĩa người dùng có đủ thông tin và thao tác để mua, giao hàng hoặc xử lý sau bán. Báo cáo thao tác có 12 vấn đề và kịch bản nghiệm thu riêng, không cộng trùng vào số bug kỹ thuật.

Kết quả xác minh mới cho CR-001–CR-019, gồm chín mục ban đầu: [prior-finding-revalidation.md](prior-finding-revalidation.md). Lượt 02 bổ sung **CR-020/021** và **UX-13/14**; CR-001/UX-01 đã có UI+DB thật ở hai viewport. Các giới hạn fixture/static/NEEDS_REPRO được ghi riêng; không dùng số 23 test chứng minh bug xanh làm bằng chứng sẵn sàng vận hành.

Phạm vi: web Customer/Seller/Admin xuyên frontend, API, PostgreSQL và worker. Chỉ thêm tài liệu/script review, không sửa mã nghiệp vụ, không đổi contract hoặc triển khai marketplace.

## Baseline và môi trường

- HEAD: `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846`; review working tree chưa commit. 170 dòng git status ở đầu lượt. Danh sách trạng thái hiện tại được lưu cùng artifact baseline.
- Gateway test `127.0.0.1:18080`; frontend `127.0.0.1:3109` dùng Vite hiện có; Docker project `pbl6-fe-verify`. Project `pbl6` dùng chung không được chọn làm đích.
- Checksum 5 file nghiệp vụ container trùng workspace sau chuẩn hóa LF: `source-comparison.json`. Unit/build dùng source workspace; integration dùng source image đã có, không tuyên bố tất cả file image đều trùng.
- Database `core_review_m3` mới tạo trong PostgreSQL test dùng cho năm suite M3 tự host. Dữ liệu journeys có tag riêng và được giữ lại để đối chiếu; không gửi thư hoặc chuyển tiền thật.

## Kết quả thực chạy

- Unit workspace: **296 passed / 296**, 41 suites.
- Integration stack: **176 passed, 18 skipped**, không có assertion fail trong lần chạy cấu hình đúng.
- M3 database riêng: **21 passed, 0 failed**, 5 suites; một số suite trùng với lần chạy stack nên không cộng thành tổng test duy nhất.
- Browser hiện có: **110 passed, 2 skipped**, API mode, E2E_REAL_MESSAGING=1. Hai skip là fixture-mode chỉ chạy khi chọn fixture.
- Tái hiện riêng: **17 passed, 0 failed**; các assertions được viết để chứng minh hành vi lỗi. Xem `repro.spec.ts`, không đưa suite này thành acceptance test xanh.
- Responsive: **148 tổ hợp** route/viewport, overflow/alert/pageerror/console error/requestfailed rỗng trong lượt chụp; đã xem trực tiếp ảnh storefront và Seller 390px, vẫn tìm thấy CR-005/017.
- OpenAPI check, contracts drift và frontend production build: PASS; 128 public + 11 internal operations. Không chạy codegen ghi lại contract.

## Snapshot lượt 05 — giữ lịch sử

Đã đi UI/ghi điểm dừng đủ42ID Seller/Owner; 15PASS/14FRICTION/9FAIL/1BLOCKED/3POLICY_GAP, chưa phải mọi công việc đều vận hành được. Lượt05 không tạo thêm ID bug: tái hiện UX-03/12, CR-013 và giữ blocker CODrefundCR-006. Report thật khớpSQL cho104đơn, nhưng cần chốtPOL-07: Đãthu/Đãhoàn theo cohort ngày tạođơn hay tiền phát sinhtrongkỳ. Lời mời runtime503 đượcREVOKED, S39BLOCKED. Xem [lượt05](continuation-05-seller-orders-operations.md); còn35NOT_RUN chủ yếu Admin/accessibility/C08.

## Phát hiện mới nhất — lượt 04

Thêm **CR-025 P1**: người có quyền kho không nhận ra món/SKU khi chỉ thấy UUID; hai điều kiện là nhân viên inventory-only và product ngoài100 metadata đầu. **CR-023 P2** chặn giá100500 ở form tạo dù API nhận, **CR-024 P2** lịch sử kho cũ sau nhập, **UX-15 P2** thiếu lý do sản phẩm bị ẩn. UI/API thật hai viewport, chưa có bằng chứng ghi nhầm tồn hoặc sai tiền. Tổng CR hiện25 mục: 0 P0, 4 P1, 20 P2, 1 P3; không cộng các UX/OP biểu hiện trùng thành bug kỹ thuật mới. Xem [findings](findings.md) và [lượt 04](continuation-04-seller-catalog-stock.md).

## Phát hiện và ưu tiên — snapshot core trước

Tổng 19 mục: 0 P0, 3 P1, 15 P2, 1 P3. Chi tiết tại [findings.md](findings.md).

1. CR-001: mua ngay có thể đặt cả số lượng đã có trong giỏ.
2. CR-006: nhận yêu cầu hoàn COD rồi không có đường hoàn tất.
3. CR-016: refresh token không cập nhật identity/context/cache của UI; rủi ro thao tác nhầm tài khoản. Backend vẫn kiểm ownership/quyền.

CR-002 được hạ từ P1 xuống P2 và rút lại kết luận tạo trùng cùng SKU: retry thực trả 409, DB unique/transaction bảo vệ. CR-015 đã nâng CONFIRMED ở lượt 03 sau lifecycle hide thật; CR-016 đã có hai tab thật, không chỉ fixture. Xem [lượt 03](continuation-03-auth-aftersales.md); thêm CR-022 P2: tổng đã đổi nhưng đơn giá checkout còn cũ, reload phục hồi.

## Coverage từng tính năng

| Đợt | Hồ sơ | PASS | FAIL | BLOCKED | N/A |
|---|---|---:|---:|---:|---:|
| 00 | [Môi trường và dữ liệu](00-environment.md) | 5 | 0 | 1 | 0 |
| 01 | [Xác thực và phân quyền](01-auth-access.md) | 3 | 1 | 2 | 0 |
| 02 | [Sản phẩm và tồn kho Seller](02-seller-catalog-inventory.md) | 5 | 2 | 0 | 1 |
| 03 | [Khám phá và chi tiết sản phẩm](03-public-catalog.md) | 5 | 1 | 1 | 0 |
| 04 | [Giỏ hàng và mua ngay](04-cart-buy-now.md) | 3 | 3 | 0 | 0 |
| 05 | [Voucher và checkout](05-vouchers-checkout.md) | 6 | 1 | 0 | 0 |
| 06 | [Đơn hàng và thanh toán](06-orders-payments.md) | 5 | 1 | 1 | 0 |
| 07 | [Đổi trả và hoàn tiền](07-returns-refunds.md) | 3 | 2 | 2 | 0 |
| 08 | [Hồ sơ, địa chỉ và mở Store](08-profile-address-store-application.md) | 4 | 3 | 0 | 0 |
| 09 | [Nhân viên và cấu hình Store](09-staff-store-settings.md) | 4 | 1 | 1 | 0 |
| 10 | [Yêu thích và đánh giá](10-favorites-reviews.md) | 4 | 3 | 0 | 0 |
| 11 | [Chat và thông báo](11-chat-notifications.md) | 6 | 0 | 1 | 0 |
| 12 | [Quản trị, báo cáo và AI](12-admin-report-ai.md) | 4 | 2 | 1 | 0 |

FAIL có thể là bug confirmed hoặc nhận xét static được ghi rõ. Hai tín hiệu phụ về cạnh tranh giỏ và phân trang yêu thích đã được thêm ca tái hiện, chuẩn hóa thành CR-018 và CR-019.

## Hai hành trình xuyên hệ thống

- **Mua hàng PASS:** buyer riêng → hai Store (Store thứ hai được duyệt qua Admin API) → sản phẩm/nhập kho → voucher → quote → confirm COD/COD → retry cùng key vẫn cùng order IDs → Seller giao/thu COD/hoàn tất → review từ OrderItem thật → thông báo → Admin đọc đơn. PostgreSQL mỗi variant còn 19/20, reserved=0; cart trống.
- **Sau bán PASS ở nhánh EXCHANGE:** từ chính đơn đã mua → yêu cầu đổi → Seller duyệt/nhận/gửi → Customer xác nhận → Admin đọc COMPLETED. Nhánh REFUND COD được chạy tới RECEIVED và chứng minh lỗi CR-006; nhánh refund online provider thật BLOCKED. Refund kernel/lookup/receipt đã kiểm bằng integration adapter có kiểm soát.

## Giới hạn và cách chạy lại — snapshot core trước

- Chưa nghiệm thu provider email/payment/refund/AI thật hoặc thiết bị mobile vật lý. Gateway staff invitation cần email delivery adapter; mock hiện trả 503 theo thiết kế. Không sửa cấu hình service đang chạy để biến trường hợp này thành pass.
- Hai tab thật chờ token hết hạn, hàng trả nhập kho/hàng đổi xuất kho, một số tổ hợp phân trang và cạnh tranh phí giao hàng vẫn cần ca riêng. Kết quả review không đồng nghĩa mọi tổ hợp đã được thực thi hoặc ứng dụng đạt production.
- Các lần lỗi setup (sandbox EPERM, thiếu DB URLs, M3 audit actor thiếu, gateway/DB không khớp) đã phân biệt khỏi lỗi sản phẩm. Kết quả cuối trong JSON là lần chạy đúng; log vẫn giải thích giới hạn môi trường.
- Browser hồi quy: từ frontend chạy Playwright với WEB_TEST_URL=http://127.0.0.1:3109, PLAYWRIGHT_CHANNEL=msedge, E2E_REAL_MESSAGING=1.
- Reproducer: từ artifacts/core-review chạy `node ../../frontend/node_modules/@playwright/test/cli.js test --config=playwright.config.mjs`.
- `journeys.cjs` chỉ chạy bằng Compose tools của pbl6-fe-verify, bind thư mục artifact vào /review. Mỗi lần chạy tạo tài khoản/Store/sản phẩm/đơn riêng, không phải script không có side effect.
- `m3-isolated.cjs` chỉ dùng DB core_review_m3 riêng. Script có reset role/permission trong DB đó, không chạy với database demo.
