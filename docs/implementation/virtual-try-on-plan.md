# Kế hoạch thử đồ bằng AI

Ngày: 14/11/2026. FE và BE có chế độ mật khẩu demo cho mỗi lần tạo ảnh; khóa OpenAI chỉ cấu hình ở backend. Ngân sách 1 USD/ngày, 10 USD/tháng. Chưa gọi model tạo ảnh thật để nghiệm thu. Xem [bàn giao frontend](virtual-try-on-frontend.md), [vận hành backend](../../backend/ai-service/app/try_on/README.md) và báo cáo kiểm chứng rollout.

## 1. Phạm vi bản đầu

- Customer đăng nhập, email đã xác minh, tải ảnh cá nhân để thử một sản phẩm áo hoặc quần.
- Điểm vào: trang chi tiết sản phẩm thật tại `frontend/src/features/customer/ProductDetail.tsx`.
- Tạo một ảnh với `gpt-image-2.6-sunburst`, `quality=low`, `complexity=low`, kích thước đề xuất `1024x1536`, `n=1`.
- Giữ nguyên người, tư thế và bối cảnh; chỉ thay món đồ đang thử. Prompt do backend quản lý, có phiên bản.
- Khách xem ảnh gốc/kết quả, xóa ảnh, thử lại trong hạn mức hoặc thêm đúng biến thể vào giỏ.
- Hoãn thử cả bộ, giày/dép, tạo người từ số đo, đổi vóc dáng, đổi bối cảnh và prompt tự do.
- Ảnh mang tính minh họa; không xác nhận vừa size hoặc giữ đúng tuyệt đối màu, logo, chất liệu.

Đây là cấu hình cần đánh giá, chưa phải kết luận đạt chất lượng. So sánh thêm `complexity=medium` với cùng ảnh, prompt, quality và size trước khi chốt cấu hình phục vụ khách.

## 2. Hiện trạng đã kiểm tra

- Frontend React/TypeScript, API qua operation contracts và TanStack Query.
- M4 FastAPI có PostgreSQL, Redis và cơ chế xác minh Customer qua M3; RabbitMQ đang được dùng cho tracking.
- Caddy đã chuyển `/api/v1/ai/*` tới M4.
- M4 đang có giới hạn request chung, chưa thay thế được hạn mức tác vụ trả phí theo người/ngân sách.
- HTTP client dùng chung của M4 có timeout ngắn; cần client riêng cho API ảnh trong worker.
- Có bản nháp chưa được Git theo dõi: `frontend/src/components/customer/VirtualTryOnModal.tsx`. Chưa thấy import sử dụng trong frontend khi kiểm tra.
- Bản nháp gọi Google/Imagen/Pollinations trực tiếp từ trình duyệt, có chuỗi khóa nhúng, lựa chọn số đo/vóc dáng/bối cảnh; chưa phù hợp luồng đã thống nhất. Không dùng nguyên trạng làm tích hợp thật.
- Bản nháp đang biến ảnh tham chiếu thành mô tả chữ rồi sinh ảnh ở bước khác; luồng mới phải gửi trực tiếp cả ảnh người và ảnh sản phẩm vào yêu cầu chỉnh sửa ảnh.
- Catalog đã có `product_image.variant_id`, có thể đối chiếu ảnh với biến thể.
- Workspace có nhiều thay đổi sẵn, gồm ProductDetail và bản nháp trên; khi triển khai phải giữ các thay đổi ngoài phạm vi và rà diff trước khi sửa.
- Script `deploy-demo-all.ps1` hiện đọc được chỉ rebuild/migrate M1/M2; cần thủ tục triển khai M4, worker và lưu trữ riêng cho tính năng này.

## 3. Giao diện

Luồng: chọn biến thể → mở “Thử với ảnh của bạn” → chọn ảnh → đồng ý gửi ảnh → “Tạo ảnh” → xem kết quả.

- Chỉ hiện tính năng trên nhóm sản phẩm đã được bật và có ảnh phù hợp. Thiếu ảnh đúng màu thì báo chưa hỗ trợ, không tự thay ảnh khác màu.
- Khách chưa đăng nhập đi qua luồng đăng nhập hiện có, trở về sản phẩm/biến thể ban đầu.
- Một ảnh xem trước; hướng dẫn ngắn theo áo/quần; phần tham khảo trong một mục mở rộng.
- Hiện hạn mức còn lại và thời điểm được thử tiếp ngay cạnh nút tạo.
- Hiện rõ việc chuyển ảnh tới nhà cung cấp và thời hạn lưu trước khi gửi. Consent thử đồ tách khỏi personalization consent.
- Đang xử lý: khách có thể đóng hộp thoại; khi quay lại sẽ thấy tác vụ cũ. Không hiển thị phần trăm hoặc đếm ngược giả.
- Đổi biến thể sau khi tạo không đổi nhãn/kết quả cũ. Mỗi kết quả gắn với sản phẩm và biến thể tại thời điểm gửi.
- Trạng thái cần thiết: ảnh không hợp lệ, không đủ quyền, hết lượt, đang chờ, đang xử lý, chưa rõ kết quả, thất bại, hoàn tất, hết hạn lưu và tính năng tạm dừng.
- Tuân thủ `frontend/CONTENT_GUIDELINES.md`; keyboard/focus, screen reader, mobile, giải phóng object URL và ngừng polling khi không cần thiết.

## 4. Kiến trúc và dữ liệu

```text
Web → M4: xác thực, nhận ảnh riêng tư, kiểm tra catalog, giữ hạn mức
        → PostgreSQL: tác vụ và sổ ngân sách bền vững
Worker thử đồ → OpenAI Images Edits: ảnh người + ảnh sản phẩm
             → vùng lưu ảnh riêng tư + cập nhật trạng thái/usage
Web → M4: lấy trạng thái và ảnh của chính người dùng
```

- Thêm module `backend/ai-service/app/try_on/`, client/provider, repository, worker và cleanup.
- Chọn worker riêng thuộc M4 để việc dựng ảnh không chặn tracking; bản demo dùng hàng đợi tác vụ PostgreSQL, claim bằng khóa hàng/lease. Không cần đưa ảnh/base64 vào RabbitMQ.
- Tác vụ và giữ lượt/ngân sách commit cùng transaction. Worker chỉ xử lý sau commit; không giữ transaction khi gọi API.
- Volume riêng tư dùng chung giữa M4 và worker cho bản demo, không mount thành thư mục web công khai. Tách interface lưu trữ để có thể chuyển sang object storage sau.
- Migration mới cho tài sản ảnh, tác vụ, consent theo lần gửi, quota/attempt counter và budget ledger. Tiền dùng số nguyên đơn vị nhỏ, không dùng float.
- Lưu: owner, product/variant/image ID và phiên bản/dấu vết tham chiếu, cấu hình/prompt version, trạng thái, timestamps/expiry, khóa chống trùng, usage/chi phí ước tính/thực tế nếu có và provider request ID.
- Snapshot ảnh sản phẩm dùng cho lần tạo để việc shop thay ảnh giữa chừng không làm đổi yêu cầu.
- Không lưu key, base64 hoặc ảnh cá nhân trong log; không đưa ảnh vào localStorage.

### API dự kiến

Tiền tố `/api/v1/ai/try-on`, cập nhật OpenAPI trước và sinh lại operation types/runtime contracts theo convention hiện có.

| API | Mục đích |
| --- | --- |
| `GET /capabilities?product_id=...&variant_id=...` | Khả năng thử, hạn mức người dùng và cấu hình hiển thị |
| `POST /photos` | Upload multipart có xác thực, trả photo ID riêng tư |
| `POST /jobs` | Nhận photo/product/variant ID, consent version và khóa chống trùng; trả 202/job ID |
| `GET /jobs` | Danh sách gần đây của chính Customer, gồm tác vụ đang chạy |
| `GET /jobs/{id}` | Trạng thái/kết quả và lỗi có thể hành động |
| `GET /photos/{id}/content` | Xem ảnh của chính chủ; không cache công khai |
| `DELETE /photos/{id}` | Xóa ảnh tải lên khi không còn phụ thuộc xử lý hoặc yêu cầu xóa an toàn |
| `DELETE /jobs/{id}` | Xóa kết quả/đặt yêu cầu xóa, giữ metadata tối thiểu để đối soát phí |

Upload multipart cần parser/decode ảnh và giới hạn body riêng. Không gửi base64 qua đường JSON đang có giới hạn 64 KiB. Kiểm tra các thư viện cần thêm và cập nhật cả requirements lẫn lock file.

## 5. Hạn mức và chống phát sinh phí

Giá trị đề xuất ban đầu, triển khai qua cấu hình server:

| Mục | Mặc định đề xuất |
| --- | --- |
| Customer | 3 lần gửi tới provider/ngày |
| Song song theo người | 1 tác vụ chưa kết thúc |
| Khoảng cách gửi | 60 giây |
| IP | Tối đa 10 lần tạo/phút và 30 lần/ngày; cấu hình được vì có Wi-Fi chung |
| Toàn hệ thống | 50 lần gửi provider/ngày, 500 lần/tháng |
| Worker | 2 lần gọi provider đồng thời cho bản demo |
| Đầu vào | 1 ảnh người + 1 ảnh sản phẩm |
| Upload | JPEG/PNG/WebP tĩnh, tối đa 8 MiB/ảnh; giới hạn pixel sau giải mã |
| Đầu ra | 1 ảnh, model/quality/complexity/size cố định phía server |
| Tiền | Bắt buộc cấu hình hạn mức ngày/tháng; chưa cấu hình thì chế độ thật tắt |

- Quota ngày reset theo `Asia/Ho_Chi_Minh`; lưu timestamp UTC và trả `reset_at`/`retry_after` rõ ràng. Không phụ thuộc timezone máy chủ.
- PostgreSQL là nguồn quyết định bền vững cho lượt/ngân sách; Redis bổ sung burst/cooldown. Mất Redis/DB hoặc không xác định được ngân sách thì từ chối tạo mới.
- Giữ trước lượt, giới hạn song song và ngân sách bằng transaction/khóa thống nhất; không chỉ đọc rồi tăng ở hai bước rời.
- Ngân sách gồm chi phí đã ghi nhận + khoản đang giữ + yêu cầu chưa rõ kết quả. Không giải phóng khoản chưa rõ chỉ vì lease/timeout hết hạn.
- Xây ước tính bảo thủ từ giới hạn ảnh/prompt/đầu ra, thêm dự phòng và đo lại bằng usage thực tế. Hạn mức tiền nội bộ là cơ chế ngắt theo sổ dự toán; không hứa trần hóa đơn tuyệt đối nếu provider không cung cấp giới hạn phí chắc chắn cho request.
- Trần số lần gọi provider được đếm riêng, bao gồm lần thất bại hoặc kết quả không rõ. Nếu chính sách trả lượt cho khách, việc đó không xóa chi phí hay bộ đếm attempt của hệ thống.
- Khóa chống trùng gắn với owner và dấu vết payload: cùng khóa/cùng nội dung trả tác vụ cũ; cùng khóa/khác nội dung trả lỗi. Chặn double-click, refresh và gửi đồng thời nhiều tab.
- Mỗi retry có thể là một lần tính phí mới. Không tự đổi provider/model, không tự gửi lại sau timeout hoặc worker chết ở giai đoạn đã có thể gửi.
- Lấy IP qua chuỗi proxy tin cậy; rà Caddy/Uvicorn và ngăn client tự giả header. Không dùng IP làm danh tính chính; hash/HMAC IP cho bộ đếm có thời hạn.
- Có công tắc bật/tắt, dashboard metadata về lượt/usage/chi phí ước tính, tác vụ chưa rõ và lỗi. Kiểm tra hard cap của nhà cung cấp nếu có; không coi budget alert là hard cap.

## 6. Trạng thái và phục hồi

`QUEUED → PROCESSING → SUCCEEDED / FAILED / UNKNOWN`; `CANCELLED` dành cho tác vụ chưa gửi. Trạng thái lưu/xóa ảnh được quản lý riêng.

- Dùng claim token/fencing để worker cũ không ghi đè kết quả mới; lease hết hạn không tự cho phép gửi lại tác vụ đã có khả năng gửi.
- Ghi mốc trước khi gọi provider. Worker chết sau mốc này được xử lý bảo thủ là chưa rõ, kể cả có khả năng request chưa ra khỏi máy.
- Chỉ retry phần chắc chắn chưa gửi hoặc bước nội bộ không tạo ảnh mới. Tác vụ `UNKNOWN` giữ dự phòng và chờ đối soát.
- Không mặc định Images Edits có API polling, hủy hay idempotency phía provider. Kiểm tra đúng endpoint/nhà cung cấp; chỉ dùng khả năng có tài liệu xác nhận.
- Nếu đã nhận kết quả mà lỗi ghi file/DB: ưu tiên phục hồi từ dữ liệu đã có, không gọi lại để tạo ảnh.
- Đóng trình duyệt chỉ dừng theo dõi. Yêu cầu xóa khi đang chạy phải ngăn lưu/hiển thị kết quả sau đó và cleanup khi xử lý xong; không hứa hủy phí provider.
- Logout/đổi tài khoản xóa cache và ảnh preview đang hiện; mọi endpoint đọc/xóa ảnh kiểm tra owner tại server.

## 7. Ảnh và quyền riêng tư

- Server kiểm tra nội dung file thật, kích thước pixel, decode ảnh, chuẩn hóa hướng và loại EXIF; từ chối SVG, ảnh động và dữ liệu giả định dạng.
- Hướng dẫn ảnh rõ một người; bước kiểm tra thông minh nếu cần phải được đo chi phí riêng, không thêm ngầm một lời gọi model.
- Backend xác minh variant thuộc product, trạng thái được phép và ảnh phù hợp. Chỉ tải ảnh catalog qua host cho phép; chặn localhost/private-network/redirect ngoài allowlist, giới hạn thời gian và dung lượng.
- Tên file/key ngẫu nhiên, không suy ra từ email. Ảnh không có URL công khai lâu dài và không được cache chung.
- Đề xuất lưu ảnh gốc/kết quả tối đa 24 giờ, xóa được sớm hơn; upload bỏ dở cũng được cleanup. Cleanup áp dụng cả file mồ côi và file tạm, chạy khi worker rảnh.
- Không đưa ảnh vào backup mặc định của demo; nếu bổ sung backup phải có chính sách hết hạn/xóa tương ứng.
- Tách consent thử đồ khỏi consent đề xuất sản phẩm. Công bố đúng thời hạn lưu tại PBL6 và điều khoản dữ liệu của provider; không hứa xóa ngay bản sao do provider quản lý.
- Với chuỗi khóa đang nhúng trong bản nháp: gỡ khỏi mã/bundle trong bước triển khai; nếu đó là khóa thật còn hiệu lực, chủ khóa cần thu hồi/đổi khóa. Không sao chép khóa vào tài liệu hay log.

## 8. Thứ tự thực hiện và điều kiện qua bước

| Bước | Công việc | Điều kiện hoàn tất |
| --- | --- | --- |
| 1 | Kiểm tra endpoint/provider, quyền truy cập model; đánh giá ảnh thật với hai mức complexity | Có mẫu áo/quần, usage, thời gian, chi phí và nhận xét độ đúng; ngân sách thử nhỏ được xác định trước khi gọi |
| 2 | Chốt OpenAPI, trạng thái, policy/quota; migration và private storage | Contract/runtime types đồng bộ, schema chạy được, thiết kế bảo vệ chi phí rõ ràng |
| 3 | Upload, auth/ownership, catalog validation, quota/budget, job queue và provider adapter | Test bằng provider giả qua đủ luồng, không cần phát sinh phí |
| 4 | Worker phục hồi, cleanup, metrics và cấu hình vận hành | Restart/timeout không gửi trùng; xóa ảnh và reservation hoạt động đúng |
| 5 | Tích hợp modal trong ProductDetail, trạng thái, hạn mức và ảnh kết quả | Luồng desktop/mobile và keyboard hoàn chỉnh, không có key/lời gọi provider trong browser |
| 6 | Kiểm thử tích hợp thật có giới hạn và chuẩn bị demo | Có số liệu chất lượng/chi phí, check hồi quy đạt, feature flag mặc định tắt cho tới khi đủ cấu hình |
| 7 | Deploy backend/database/storage/worker trước, frontend sau; bật theo nhóm nhỏ | Smoke check công khai đạt, quan sát được chi phí và có công tắc tắt nhanh |

Không gọi API trả phí chỉ để hoàn thành bản kế hoạch. Cần xác định base URL là OpenAI trực tiếp hay gateway tương thích; nếu qua trung gian, đối chiếu lại schema, giá, usage, timeout và chính sách lưu dữ liệu của họ. Không yêu cầu gửi khóa trong chat; cấu hình secret phía server.

## 9. Kiểm thử bắt buộc

- Nhiều request cùng lúc ở lượt cuối/ngân sách cuối chỉ có số tác vụ được phép; restart Redis/worker không reset sổ quota.
- Hai tab/cùng khóa không phát sinh hai lần gọi; tái giao job không sinh ảnh lại; thay payload cùng khóa bị từ chối.
- Giả IP header, khác owner, tài khoản khóa/chưa xác minh và URL nội bộ bị chặn trước provider.
- Ảnh sai định dạng/quá pixel/quá dung lượng, upload gián đoạn, thiếu ảnh đúng biến thể không tốn lượt provider.
- Timeout sau khi gửi, process chết trước/sau khi nhận ảnh, lưu ảnh lỗi, usage thiếu, provider trả lỗi: reservation và trạng thái rõ ràng, không tự retry trả phí.
- Hết quota/ngân sách, feature tắt, Redis/DB/provider không sẵn sàng có thông báo đúng và không phát sinh gọi mới.
- Xóa/expiry, xóa trong lúc chạy, logout/đổi user không lộ ảnh hoặc phục hồi ảnh đã yêu cầu xóa.
- Bộ ảnh chất lượng: nhiều dáng người/tư thế, áo sáng/tối/có họa tiết/logo, quần dài/ngắn; đánh giá identity, dáng người, màu, hình sản phẩm và số lần cần tạo lại.
- Chạy pytest M4, contract checks/drift và Playwright luồng thử đồ cùng hồi quy chi tiết sản phẩm/thêm giỏ. Các test tự động dùng provider giả; gọi thật theo bộ mẫu và hạn mức riêng.

## 10. Build và triển khai

- Bản kế hoạch này chỉ thêm tài liệu; chưa cần build/deploy frontend.
- Khi triển khai: cập nhật migration M4, volume/quyền thư mục, secret/env, worker thử đồ, readiness và quy trình cleanup; không dùng script chỉ triển khai web để suy rằng backend đã được cập nhật.
- Cập nhật hoặc tạo thủ tục deployment M4 riêng; không chạy nguyên trạng script all đang chỉ cập nhật M1/M2 cho tính năng này.
- Sau thay đổi frontend, bắt buộc `npm --prefix frontend run build`; chỉ khi build và các check bắt buộc đạt mới chạy từ repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-demo-web.ps1
```

- Chờ script hoàn tất public smoke check và báo kết quả. Smoke luồng API bằng tài khoản kiểm thử/fixture trước; mọi lượt tạo ảnh thật cũng đi qua quota và ngân sách.
- Rollback nhanh: tắt tạo mới, giữ tác vụ đã gửi để đối soát và cleanup; không xóa schema/dữ liệu ngân sách để rollback UI.

## Nguồn kỹ thuật

- [GPT-Image-2.6 Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.6-sunburst).
- [Image generation: complexity, edits và cách tính phí](https://developers.openai.com/api/docs/guides/image-generation).

Tài liệu OpenAI cho biết complexity không có phí riêng; quality và kích thước liên quan token ảnh đầu ra. Độ đúng và chi phí cho thử đồ phải đo trên dữ liệu thực tế, không suy ra từ tên cấu hình.
