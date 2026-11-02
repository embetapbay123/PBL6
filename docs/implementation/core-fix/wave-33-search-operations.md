# Đợt 59 — Tìm kiếm và hàng đợi trên dữ liệu lớn

**CR-021/UX-10 thuộc F17 đã FIXED/VERIFIED trong phạm vi đã chốt. 52/52 finding gốc đã xác minh. Mục tiêu tổng vẫn ACTIVE, chưa nghiệm thu vận hành.** F00/F18 còn sáu chuỗi chung baseline cuối, rollback snapshot writer, rà coverage158nhiệm vụ và các giả thuyết phân trang ngoài F17. Mobile được người dùng miễn; nghiên cứu người thật vẫn `USER_VALIDATION_PENDING`.

Stack riêng `Node56/AI56/frontend59`, gateway18080/frontend3109. HEAD `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` cộng working tree. Backend/AI/API contract/migrations không đổi từ56; reader/catalog ở58 giữ nguyên. Không commit hoặc triển khai production, không xóa report lỗi hoặc sửa hash baseline cũ.

## CF-059-01 · P2 · CONFIRMED → FIXED/VERIFIED

Ba hàng đợi đơn Customer/Seller/Admin và hai danh sách tài khoản/Store Admin dùng cache tổng cũ. Sau khi trang cuối rỗng và được đưa về trang trước, danh sách tăng40→41 hoặc20→21. Quay lại nhanh vẫn thấy tổng cũ, không tới bản ghi mới. Khi bật đọc mới, effect tự clamp vẫn dựa trang rỗng cache ngay lúc GET hiện tại chưa trả, đẩy URL về trang trước dù trang cuối đã tồn tại.

Bằng chứng trước sửa: `order-page-cache-baseline58.json` 3FAIL; `order-page-clamp-baseline59.json` 3FAIL sau chỉ sửa freshness, tách được nguyên nhân clamp; `directory-page-cache-baseline58.json` 2FAIL. Đây là các biểu hiện cùng nguyên nhân, gộp một bug; không suy đã ghi nhầm đối tượng hoặc mất đơn ở database.

Sửa `OrderHistoryPage.tsx`, `AdminLiveData.tsx`, `SellerWorkspace.tsx`, `AccountDirectory.tsx`: query danh sách dùng `staleTime:0`, đọc lại khi quay về; chỉ clamp sau GET hiện tại hoàn tất thành công, effect theo dõi cả fetching/error. Không đổi endpoint, bộ lọc, quyền hoặc mutation. Regression giữ GET trang cuối, xác nhận URL chưa tự chuyển, rồi trả dữ liệu mới và mở được trang đó. Các trường hợp đổi filter/race/error/Back/Forward cũ vẫn giữ.

## Luồng thật và phạm vi bằng chứng

Mỗi bộ dữ liệu dùng hai Customer/hai Store private mới. **102đơn được tạo qua quote/confirm API thật**, không seed SQL đơn. Customer chính có100đơn ở haiStore; Store chính có100đơn của haiCustomer. Có COD PENDING/COMPLETED/CANCELLED và online AWAITING_PAYMENT khi walkthrough; cuối lượt hủy đơn còn được phép, giữ đơn đã hoàn tất và lịch sử. Mỗi bộ có25sản phẩm public tìm kiếm qua API; dataset300sản phẩm Store đã nghiệm thu ở58, source backend/catalog không đổi.

Customer tìm tiếng Việt không dấu/có dấu/hoa thường/NFD gồmđ/Đ, đi hai trang25món và sort theo giá; `%`/`_` là ký tự literal, truy vấn SQL-like không mở rộng kết quả. Đi chi tiết rồi Back giữ query/trang/sort, reload chờ đúng dữ liệu mới. Customer vào lịch sử bằng menu, đi đến trang5 của100đơn, tìm đơn cũ theo tên đã mua không dấu, lọc COMPLETED/SUCCEEDED, mở chi tiết rồi quay lại và reload giữ bộ lọc/nội dung.

Sau mua, title catalog đổi; Customer/Seller/Admin vẫn tìm và đọc snapshot tên/SKU lúc đặt. Seller qua Store Portal→Đơn hàng:100đơn, tìm theo tên trả đúng haiCustomer, lọc hoàn tất còn đúng một đơn, phiếu nhận diện đúng món/người nhận. Admin qua Menu quản trị→Đơn hàng toàn sàn, tìm Store có100đơn, tìm SKU và lọc trạng thái, mở đúng đơn cũ. API đối chiếu tên Unicode/SKU/điện thoại/mã đơn/mã nhóm giữa ba vai trò; Customer khác/Store khác không thấy, detail Store khác404, Customer cố thêm `store_id` bị422. Trường điện thoại trả nhiều đơn phù hợp, không giả định luôn một kết quả.

`search-ui59.json`: **27ca browser fixture PASS**; `search-sql59.json`: **22SQL integration PASS/4suite**, schema tạm riêng trên image56. Bao phủ normalize/literal/category, scoped predicate trước count/page, stable paging, directory/application query, refund request/UNKNOWN khác tiền đã hoàn, legacy snapshot/policy không dựng lại. Không chạy lại toàn bộ unit/Python hoặc build image backend/AI.

## Những lượt không được gọi thành PASS

Giữ nguyên mọi report trong `artifacts/core-fix/fix-20261030T100153Z/`:

| Report | Kết quả thực tế và cách xử lý |
|---|---|
| `search-operations-runtime59-trial.json` | FAIL harness: tìm cụm tag+`%_` không liền nhau trong title nên0 đúng. Sửa truy vấn thành cả cụm liên tục; không đổi search nghiệp vụ. |
| `search-operations-runtime59-run2.json` | FAIL harness: selector exact label không khớp select có option text. Dùng role combobox với tên trợ năng đã quan sát. |
| `search-operations-runtime59-final.json` | FAIL harness ở menu Admin: sai role/tên link. Customer/Seller và public search đã qua; đối chiếu DOM dùng complementary Menu quản trị/Đơn hàng toàn sàn. |
| `search-operations-runtime59-accepted.json` | 1PASS, nhưng ảnh Customer chụp sau reload còn loading; chỉ URL đã được kiểm ở thời điểm đó. Không dùng ảnh này làm bằng chứng dữ liệu đã tải xong. |
| `search-operations-runtime59-verified.json` | Hoàn tất cả checkpoint nghiệp vụ và tăng kiểm tra dữ liệu/bộ lọc sau reload, có ảnh Customer đã tải. Report vẫn **FAIL cleanup429**, không đổi nó thành PASS. |
| `search-cleanup-recovery59.json` | Cleanup riêng PASS: phục hồi4tài khoản tagged bằng reset mật khẩu/email capture theo API hỗ trợ, token/mật khẩu chỉ trong bộ nhớ; hủy thêm2đơn, dừng27sản phẩm/khóa2Store. Không sửa tiền/tồn/trạng thái đơn bằng SQL; checkpoint lỗi gốc không bị ghi đè. |

`private-market.ts` là helper kiểm thử, được bổ sung xử lý **chỉ429/RATE_LIMITED có Retry-After≤60s**, tối đa2lần chờ. Cùng path/token/body được giữ; không tự replay503/UNKNOWN hoặc401, không xóa/hạ limiter và không chờ budget email một giờ. `raw()` vẫn trả429 trực tiếp. `fixture-rate59.json` **6PASS**, gồm caller sửa object trong lúc chờ nhưng body retry vẫn giữ, thời gian chờ, lỗi không replay và bound retry. Đây là fixture kiểm transport của bộ test, không thay bằng chứng API/database/worker về nghiệp vụ. Không chạy lại102đơn chỉ để thay một report cleanup đã có phục hồi độc lập và SQL xác nhận; các thay đổi cuối chỉ ở helper/test, ứng dụng giữ source đã thực thi.

## Hậu điều kiện và bàn giao

`search-final-state59-verified.json` SELECT độc lập đối chiếu cả năm bộ: **510đơn API,25COMPLETED/485CANCELLED;25money collection thủ công tổng3000000, hoàn0/refund0/cart0.10Store LOCKED,135Product STOPPED,135dòng inventory khớp ledger/reserved0**. Mỗi dataset: baseA996, baseB10, target19;24reader còn0. Mỗi COD hủy đúng một reserve/consume/restock, online chưa thu đúng reserve/release, không tạo thu/hoàn giả. Đơn gốc giữ snapshot dù tên catalog hiện tại đã đổi. Xác nhận COD này không phải bằng chứng tiền mặt/ngân hàng thật.

Đã xem ảnh Customer đã tải sau reload trong thư mục `search-operations-runtime59-verified`; ảnh Seller/Admin trong thư mục `search-operations-runtime59-accepted` xác nhận đúng danh sách/món/bộ lọc. Không dùng ảnh loading làm ảnh nghiệm thu. Tên/địa chỉ/email trong dữ liệu đều là fixture riêng.

`frontend-source-search59-handoff.json`, `source-match-search59-handoff.json`, `runtime-image-search59-handoff.json`: **395backend/43AI/320frontend-contract-test-config/10image** khớp, backend/AI unchanged56. Các manifest59/final/verified trước được giữ làm lịch sử. Build frontend2076modules, cảnh báo chunk lớn cũ còn; contract/drift/docs/typing/whitespace/secret cuối ghi trong `search-gates59.json`. Chỉ chốt khi các gate đó PASS.

Rà mã phát hiện các pattern clamp tương tự tại `FinancialReport` (money/gaps), `StoreAuditPage`, `StockCommitments`; **NEEDS_REPRO**, chưa gọi bug đã chứng minh hoặc đã sửa. Chúng được đưa vào F18 cùng rà158scenario, callback/worker/snapshot rollback và sáu chuỗi cuối. Không tự đóng toàn mục tiêu từ con số52finding gốc; không ghi PASS cho mobile, screen reader, native zoom, thiết bị thật hoặc nghiên cứu người thật chưa làm.
