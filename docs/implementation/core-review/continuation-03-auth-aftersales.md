# Lượt 03 — đăng nhập trong hành trình, sau mua và phục hồi

Ngày 29/10/2026. Tiếp tục baseline `operational-20261029T075615Z`, HEAD `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` cộng working tree chưa commit. Vite 3109 và gateway 18080 vẫn dùng Docker project riêng `pbl6-fe-verify`; 239 path nguồn trong baseline không đổi. Chỉ sửa tài liệu/script kiểm thử; không sửa ứng dụng, contract hoặc triển khai.

## Kết quả hiện hành

Thêm **34 ID**, gồm **16 Customer** C04, C13–C18, C44–C51, C54 và **18 tình huống gián đoạn** X01–X18. Mỗi ID có ghi bước đi, screenshot, request hoặc checkpoint riêng ở 1440px/390px. C14–C16 chỉ đi được phần UI với liên kết email tổng hợp; phần email runtime BLOCKED, không gọi là đã xác minh end-to-end. X17 dùng hai tab thật; không thay bằng response giả.

Có **78 lượt browser hiện hành** sau gộp chạy lại cùng file/title/project: **56 assertion qua, 22 lỗi**. Số này gồm bài chính, ca biên và đường phục hồi trên cùng ID; 22 failure không phải 22 bug. Các lượt harness sai được giữ trong CSV với `INVALID_HARNESS_ATTEMPT`, không gán lỗi cho sản phẩm.

Tích lũy **77 ID đi UI / 182 lượt browser hiện hành**: 104 assertion qua, 78 lỗi. Tổng 158 nhiệm vụ: **26 PASS, 26 FRICTION, 25 FAIL, 8 BLOCKED, 2 POLICY_GAP, 71 NOT_RUN**. Đây là phán định của chuyên gia trên tập dữ liệu được mô tả, không phải tỷ lệ thành công của người dùng thật. Bộ 109 acceptance qua/3 skip và 23 ca chứng minh bug trước đây là các tập riêng, không cộng thành nhiệm vụ mới. Chưa có người tham gia: `USER_VALIDATION_PENDING`.

## Phát hiện đã có bằng chứng thật

| Finding | Đường đi và hậu điều kiện | Kết luận |
|---|---|---|
| **CR-016 · P1** — lẫn context sau refresh | Tab 1 Owner A mở Store Portal; tab 2 cùng browser logout/login Customer B; đổi mật khẩu tài khoản test A để thu hồi access token, buộc tab cũ refresh. Refresh trả đúng context B; tab cũ mở địa chỉ B nhưng header còn Kênh người bán của A. Cả hai viewport | X17 FAIL. Rủi ro thao tác dưới danh tính không đúng với context UI; chưa chứng minh backend vượt ownership. Mật khẩu đã khôi phục và login bằng giá trị gốc được xác minh |
| **CR-015 · P2** — chủ review bị ẩn không sửa được | Buyer tìm completed OrderItem qua phân trang và sửa review công khai thành công → Admin ẩn đúng review → buyer reload/tìm lại item → không có nút sửa. Gửi nội dung khác nhận 409 REVIEW_ALREADY_EXISTS, UI lại bảo chọn Sửa đánh giá | C54 FAIL. Nâng STATIC_FINDING → CONFIRMED cho đúng lifecycle, giữ nguyên ID. Không phải lỗi tạo/sửa review công khai. Review gốc được khôi phục |
| **CR-022 · P2** — đơn giá checkout bị cũ | Quote 100.000đ → Owner đổi variant thành 110.000đ → confirm cũ trả 409 QUOTE_CHANGED → quote/tổng mới 110.000đ, dòng vẫn ghi Giá hiện tại 100.000đ. Reload thì đơn giá trở lại đúng 110.000đ | X13 FRICTION vì có đường phục hồi. UI/API thật hai viewport; chưa chứng minh thu sai hoặc tạo đơn sai. Giá được phục hồi |

Ảnh và metadata: [X17 hai tab thật](../../../artifacts/core-review/operational/continuation-03-real-screenshots/), [CR-015/022 lifecycle chạy lại](../../../artifacts/core-review/operational/continuation-03-real-rerun-screenshots/). Với X13, ảnh `stale-unit.png` giữ thời điểm sai; `checkpoint.png` cuối ca là sau reload phục hồi. `walkthrough.json` ghi cả rendered_unit cũ và reload_recovers_unit; không dùng ảnh cuối để phủ nhận thời điểm lỗi.

## Hậu điều kiện API/database/worker

Các đoạn dưới dùng đối tượng cùng tag, không ghép thành tuyên bố PASS toàn bộ sáu chuỗi. Xem [HTTP thật](../../../artifacts/core-review/operational/continuation-03-http.json).

| Ca | Quan sát thật | Giới hạn |
|---|---|---|
| X10/X11/C49 — confirm cạnh tranh cùng key | Hai request cùng body/key ban đầu [201,503]; explicit replay giải quyết về một order; DB đúng một order. Hủy khi PENDING → CANCELLED; worker khôi phục tồn | Đây là saga chưa rõ kết quả khi request đang xử lý, không tự báo tạo trùng. Chưa thử hai tab sinh hai key khác nhau trên cùng cart |
| X14 — món cuối | Hai Customer, key khác nhau, cùng variant tồn 1: [201,409 INSUFFICIENT_STOCK], một winner, quantity=0/reserved=0; hủy và đợi quantity trở về 1 | COD trừ quantity trước PENDING; không gọi quantity này là hàng đã giao vật lý |
| X15 — xóa địa chỉ sau quote | Confirm trả 404 ADDRESS_NOT_FOUND, không có order cho Customer riêng | UI fixture vẫn giữ option cũ nhưng chọn địa chỉ còn lại đặt được. Lời ghi bước ở artifact đầu có chữ “422” là chú thích harness cũ; response/assertion và HTTP thật đều là 404 |
| X16 — thu quyền khi phiên mở | Bỏ product.store.read_write của SELLER, token cũ GET product 403; quyền inventory còn lại GET 200. Khôi phục permissions | UI fixture từ catalog sang editor hiện lỗi 403 và không PATCH; không suy rộng thành mọi permission đã review |
| C48 — notification | Notification gắn đơn test; B mark read của A nhận 404; A mark read và đọc lại read=true | UI desktop qua header, mobile qua Hồ sơ; link mở đúng owned order. Không gửi thông báo tới người thật |
| C14–C16 — email | Register lần đầu/retry cùng email và reset đều 503 EMAIL_DELIVERY_UNAVAILABLE; DB có một user | Mock hiện không gửi thư. Retry vẫn gọi lại delivery; chưa có căn cứ kết luận đăng ký bị khóa vĩnh viễn hoặc dùng token fixture như thư thật |

## Walkthrough và đường phục hồi

Kết luận từng ID và loại bằng chứng nằm trong [coverage](scenario-coverage.md), [ledger](scenario-results.csv) và [quyết định lượt 03](../../../artifacts/core-review/operational/continuation-03-decisions.json). Những điểm dễ kết luận quá mức được chốt như sau:

- C04 vẫn chọn được món trong ngân sách bằng sort và kiểm giá từng variant: FRICTION, không tự biến filter ngân sách thành tính năng bắt buộc mới.
- C13/C17 phải tìm/chọn lại hoặc logout/login thủ công: FRICTION. C18 chuyển tài khoản rõ ràng trong một tab qua; không suy thành X17 hai tab qua.
- C44 dò trang 2 để tìm đơn cần trả và mở đúng payment URL được: FRICTION, còn provider thanh toán BLOCKED. C45 thiếu lời giải thích đang chờ ai, C46 thiếu thông tin giao/dấu vết: FAIL theo UX-12/UX-03/OP-03 hiện có.
- C47 hỏi đúng Store qua sản phẩm và tự chép mã đơn được: FRICTION UX-07; không coi thiếu tự gắn đơn làm chat hoàn toàn hỏng. Nội dung chỉ nằm ở fixture.
- C49 phần hủy COD/tồn qua nhưng quy tắc phục hồi lượt voucher chưa chốt: POLICY_GAP POL-03. C50 đi hủy–đặt lại trước bàn giao được; SHIPPED không có hủy/sửa trực tiếp. Không yêu cầu duyệt chỉnh số lượng hoặc tính chênh tiền sau đặt.
- C51 form nói rõ toàn đơn và gửi EXCHANGE được; đổi một phần/khác giá DEFERRED. Thiếu hướng dẫn/đích phân loại là FRICTION UX-08; C52 địa chỉ/phí trả vẫn POLICY_GAP riêng.
- X01/X02 browser Back/Forward giữ q/sort/page đúng; không phủ nhận C06 link quay lại làm mất ngữ cảnh. X04 mở lại link owned bằng full navigation qua, foreign link không lộ người nhận/nút hủy. X05 mở tab mới đối chiếu được, chưa phải thử hành vi tab trên điện thoại vật lý.
- X03/X06 mất voucher/phương thức chưa gửi khi reload/rời màn: FRICTION UX-05. X10 attempt đã gửi nhưng chưa rõ kết quả giữ đúng body/key sau reload; không gộp hai trạng thái này thành một bug mất giao dịch.
- X07/X08 loading/error/retry qua. X09/X11 khóa hai CTA trong lúc busy và chỉ ghi một request. X12 phục hồi offline/online trong cửa sổ quan sát 1,5 giây rồi reload không tự POST; không ngoại suy mạng thiết bị thật dài hạn.
- X15 có thể chọn địa chỉ khác để phục hồi nhưng option đã xóa chưa tự biến mất: FRICTION; không tạo finding trùng cho cùng vướng phục hồi. X18 VERSION_CONFLICT giữ lý do, đọc lại PROCESSING thì bỏ thao tác hủy; PASS cho form đã kiểm.

## Tính toàn vẹn và thu hồi dữ liệu

Tag lượt 03 `op-review-1793266468983`; dữ liệu nền Store vẫn `op-review-1793261067285`. Tạo Customer A/B riêng theo viewport, tên/địa chỉ tổng hợp. Giá, review, permissions và mật khẩu test được khôi phục trong finally, rồi đối chiếu bằng [cleanup](../../../artifacts/core-review/operational/continuation-03-cleanup.json). Hai order bổ sung đã CANCELLED, last-unit quantity=1/reserved=0; **0 sản phẩm review ACTIVE**, type riêng INACTIVE. Không xóa audit, movement hoặc lịch sử.

Các lỗi script đã xử lý: main lồng trong payment làm collector strict locator lỗi; label textarea có nội dung được nạp sẵn; label select bao gồm options; mobile dùng đường Hồ sơ khi header không có chuông; StrictMode đọc GET hai lần; hai CTA cùng busy; mutation mô phỏng giá/địa chỉ trước khi quote ban đầu sẵn sàng. C54 fixture ban đầu còn bắt nhầm route `/reviews` thay `/me/reviews`; chỉ kết quả chạy đúng contract được dùng. Các lỗi này không tạo bug sản phẩm. Các báo cáo chạy lại thay kết quả hiện hành cùng file/title/project nhưng giữ lịch sử trong ledger.

Validator đối chiếu 158 catalog/325 mapping, **707 hàng ledger**, 108 subcase automation có mapping đã qua, sáu chuỗi có checkpoint, 239 hash source không đổi và không có SEED_PASSWORD/JWT thật trong JSON/log/CSV báo cáo. Không tuyên bố kiểm hết backend image hoặc thay mọi secret scanner bằng kiểm tra này.

## Phạm vi còn mở

Còn **71 NOT_RUN**, xem từng ID ở coverage; chủ yếu vận hành Seller/Owner, quyết định Admin, C08 ảnh có nghĩa và X19–X30 accessibility/nội dung khó. C39–C41 provider online, C14–C16 email, X22 screen reader và X25 thiết bị/bàn phím ảo vẫn BLOCKED theo giới hạn tương ứng. Hai POLICY_GAP là C49 voucher hủy và C52 hướng dẫn/địa chỉ/phí trả. Không có kết luận review đã hoàn chỉnh hoặc sản phẩm sẵn sàng vận hành.
