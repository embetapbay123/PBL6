# Kế hoạch sửa marketplace sau review vận hành

> Trạng thái kế hoạch này là lịch sử khi lập30/10. Việc sửa và bằng chứng mới được theo dõi riêng tại [core-fix](../core-fix/README.md); không dùng câu “chưa triển khai” bên dưới để phủ nhận các đợt sửa đã thực hiện.

Ngày lập: 30/10/2026. Trạng thái: **kế hoạch, chưa triển khai sửa ứng dụng**.

Nguồn: [readiness](operational-readiness.md), [27 CR](findings.md), [UX-01–12](user-workflow-review.md), [UX/OP bổ sung](usability-findings.md), [coverage 158 ID](scenario-coverage.md). Baseline review: `operational-20261029T075615Z`, HEAD `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` cùng working tree đã ghi. Hiện có54 PASS / 51 FRICTION / 38 FAIL / 10 BLOCKED / 5 POLICY_GAP; chưa sẵn sàng vận hành.

## 1. Mục tiêu và giới hạn

Ưu tiên để người dùng mua đúng món/lượng, thao tác đúng tài khoản, lấy và giao đúng hàng, đối chiếu được tiền–tồn và kết thúc được sau bán. Sửa theo nguyên nhân xuyên UI → contract → service/transaction → worker/database, không chỉ sửa màn hình làm test xanh.

- SELLER là nhân viên; STORE_OWNER là chủ Store. Quyền hiện hành và phạm vi Store phải được kiểm tại server.
- Sau đặt vẫn hủy–đặt lại trong giai đoạn hợp lệ. Không thêm duyệt sửa lượng, thu chênh hoặc hoàn một phần.
- Cho phép giao thủ công với đủ thông tin/dấu vết; không bắt tích hợp hãng vận chuyển.
- Kho tiếp tục là điều chỉnh tồn hiện có. Chưa mở rộng ERP, nhà cung cấp, giá vốn, công nợ, lô hoặc đa kho.
- Phí sàn, ví, hoa hồng, payout, POS/đa kênh/CRM, voucher nhắm nhóm khách, tách đơn và đổi khác giá tiếp tục hoãn.
- Thay đổi contract/migration có thể cần thiết khi sửa. Phải thiết kế và kiểm tương thích trước; không sửa file generated bằng tay hoặc nới guard để ca chạy qua.
- Chưa ấn định người thực hiện, thời gian hoặc lịch phát hành khi chưa có nguồn lực. Các đợt dưới đây là mốc nghiệm thu, không phải cam kết số ngày.

## 2. Thứ tự thực hiện và điểm kết thúc từng đợt

| Đợt | Gói chính | Kết quả cần đạt trước khi chốt đợt |
|---|---|---|
| 0 — Chuẩn bị và quyết định | F00; thiết kế F02/F03; POL-01–07 | Chốt baseline sửa mới, môi trường kiểm thử, các phương án nghiệp vụ và contract liên quan. Các gói độc lập được làm ngay khi đủ thông tin |
| 1 — Tài khoản và đặt đúng | F01, F02, F03, F04, F05 | Không lẫn phiên; chọn đúng phân loại/lượng; giỏ không bị thay đổi ngoài ý định; checkout đủ thông tin và phục hồi an toàn |
| 2 — Kho và giao đúng | F06, F07, F08 | Nhân viên kho nhận ra hàng; lịch sử/preview tồn rõ; phiếu Seller đủ dữ liệu để lấy, giao và thu COD đúng |
| 3 — Hoàn về và sau bán | F09, F10; phần voucher của F11 | Đơn giao thất bại có đường đi tiếp; hàng về được kiểm và đối chiếu; COD/online refund có kết quả xác nhận, chống lặp |
| 4 — Điều hành Store và Admin | F11, F12, F14, F17 | Voucher/staff quản lý được qua nhiều trang; tìm đúng đối tượng; duyệt/khóa/kiểm duyệt có ngữ cảnh và truy vết đúng quyền |
| 5 — Tự phục vụ và khả năng thao tác | F13, F16 | Yêu thích/đánh giá đồng bộ; liên hệ đúng đơn; liên kết, ảnh, mobile và focus hỗ trợ công việc |
| 6 — Báo cáo và đối chiếu | F15 | Thời gian/phạm vi/định nghĩa rõ; Owner/Admin giải thích được số từ nguồn đơn, thu và hoàn |
| 7 — Nghiệm thu lại | F18 | Sáu chuỗi đạt trên UI/API/DB/worker, các ca bị ảnh hưởng chạy lại; không còn lỗi thiết yếu bị che bởi fixture hoặc đổi phạm vi |

**Đường ưu tiên P1:** F01 → F03/F04; F02 → F08; F06; F09 → F10. POL và thiết kế sau bán bắt đầu từ đợt0 để không phải chờ các P2 khác xong. Chia F06 thành metadata kho trước, ledger/kiểm kê sau. Khi phụ thuộc đã sẵn sàng, được triển khai gói P1 sau bán sớm hơn số thứ tự đợt; không dùng việc hoàn thiện P3 để trì hoãn nó.

## 3. Bảy quyết định nghiệp vụ cần chốt

Đây là đề xuất và câu hỏi cho chủ sản phẩm, **chưa phải chính sách đã được duyệt**. Chỉ phần phụ thuộc bị giữ lại; không chặn các sửa độc lập.

| Policy | Quyết định cụ thể cần có | Gói phụ thuộc |
|---|---|---|
| POL-01 | Ai ghi giao thất bại, ai nhận kiện về, có giao lại không, điều kiện đóng vụ việc và đóng đơn? Tiền và hàng được kết thúc độc lập thế nào? | F09/F10 |
| POL-02 | Địa chỉ nhận trả, cách liên hệ/gửi, bên chịu phí hai chiều; xử lý thiếu/hỏng và khi nào hàng đủ điều kiện bán lại? | F09/F10 |
| POL-03 | Hủy/hoàn có trả lượt voucher tổng/theo khách không; trả ở mốc nào; voucher hết hạn/đã dừng xử lý thế nào? | F11; hậu điều kiện F09/F10 |
| POL-04 | Owner/nhân viên nào được xem log; được thấy danh tính, thay đổi và thông tin cá nhân ở mức nào? | F12/F14 |
| POL-05 | Cửa sổ/điều kiện đổi trả, hết hàng đổi, đổi cùng giá trong phạm vi hiện tại; COD hoàn theo cách nào, ai có quyền xác nhận bằng chứng? | F09/F10 |
| POL-06 | `quantity` là tồn thương mại hay tồn vật lý? COD hiện consume trước bàn giao: kiểm kê thực tế quy đổi các hàng đã trừ nhưng chưa rời kho thế nào? | F06; tồn hoàn về F09 |
| POL-07 | Kỳ thu/hoàn theo ngày tạo đơn hay thời điểm phát sinh tiền? Timezone báo cáo là gì? Đơn cũ thu/hoàn trong kỳ được tính thế nào? | F15 |

Đề xuất cho POL-06: trước mắt giữ mốc consume hiện hành, đặt nhãn đúng và cung cấp đối chiếu; chỉ đổi mô hình khi đã có phương án dữ liệu chuyển tiếp. Với POL-07, giữ và ghi rõ cohort nếu chọn cách tính hiện tại; nếu cần cashflow phải có dữ liệu sự kiện tiền đáng tin cậy. Không đổi số hoặc backfill giả để đạt báo cáo.

## 4. Các gói sửa cụ thể

### F00 — Baseline sửa, dữ liệu và adapter kiểm thử

- **Phạm vi:** lập manifest commit/working tree mới; đối chiếu source với image runtime cho các service sẽ sửa. Tiếp tục stack riêng `pbl6-fe-verify`, frontend3109/gateway18080; kiểm cấu hình trước ghi dữ liệu.
- **Thực hiện:** dùng tag mới, hai Customer / hai Store / Owner / SELLER đủ-thiếu quyền/Admin; tái sử dụng quy mô300 sản phẩm/12 variant/100 đơn khi phù hợp. Chuẩn bị email capture và payment/refund adapter có kiểm soát ở ranh giới runtime, hỗ trợ PENDING/UNKNOWN/SUCCEEDED/FAILED, callback trùng/muộn/sai tiền và mất phản hồi sau commit.
- Adapter test phải tách khỏi cấu hình production; không trả thành công giả khi provider tắt. Chuẩn bị fixture rõ loại bằng chứng cho UI nhanh, nhưng không dùng nó thay API/DB/worker thật.
- **Bàn giao:** dữ liệu/tag, health/capabilities, lệnh chạy và cleanup; kế hoạch Edge nativezoom/screenreader/thiết bị thật. Nếu chưa có môi trường thì giữ BLOCKED và nêu phần kiểm chưa thực hiện.

### F01 — Phiên đăng nhập và cache cùng một danh tính

- **Finding:** CR-016. **Vùng sửa:** `frontend/src/api/client.ts`, `auth-context.tsx`, QueryClient và các state/draft gắn tài khoản/Store.
- Refresh phải công bố token và authcontext cùng thế hệ phiên; phân biệt đổi token cùng principal với đổiuser/Store/quyền. Hủy hoặc loại kết quả request cũ, đóng dialog/attempt không còn thuộc phiên hiện tại và xóa cache riêng đúng phạm vi.
- Query key có user/Store phù hợp. Đồng bộ thay đổi phiên giữa tab bằng tín hiệu tối thiểu; không gửi token, mật khẩu hoặc dữ liệu cá nhân qua kênh thông báo giữa tab.
- **Không tự replay mutation khi refresh đổi principal hoặc phạm vi thao tác.** Request có thể đã commit dưới phiên cũ phải được đối chiếu, không chuyển thành thao tác dưới tài khoản mới. Việc thu hồi quyền vẫn được server kiểm cho từng thao tác.
- **Nghiệm thu:** X16/X17/X18,C18; hai tabA/B, request chậm trả sau đổi phiên, cùng user đổi quyền, khóa user/Store và reload. Header, dữ liệu và các hành động luôn cùng context; không lộ cache của phiên trước.

### F02 — Thông tin nhận diện hàng và snapshot đơn

- **Finding chính:** UX-01. Là dữ liệu tiền đề cho UX-03/06/16 ở F08/F14. **Vùng sửa:** ProductDetail/CartProduct, catalog quote DTO, order calculation/snapshot/mapper và contracts.
- Tạo cách hiển thị phân loại dùng giá trị có nghĩa như “Đỏ / M”, giá/trạng thái và SKU bổ trợ; nhất quán catalog/detail/cart/checkout. Thông tin tồn/khả dụng phải đến từ server, guard tồn khi đặt vẫn giữ nguyên.
- Chốt title, SKU, phân loại, giá và thông tin cần đóng gói thành snapshot tại giao dịch; quote/confirm phải dùng dữ liệu đã kiểm hợp lệ, không ghép metadata vừa thay đổi để tạo lịch sử không nhất quán. DTO đơn cung cấp addresssnapshot và dữ liệu được phép theo vai trò.
- **Đơn cũ:** hiển thị snapshot/SKU đang có cùng cảnh báo thiếu dữ liệu nếu cần; không lấy variant hiện tại giả thành màu/size tại thời điểm mua. Không thay snapshot khi Seller sửa sản phẩm hoặc khách sửa địa chỉ.
- **Nghiệm thu:** C07–C12,C19,C36,S27/S28/S31,A14;12 variant, sửa tên/giá/thuộc tính/địa chỉ sau đặt, variant dừng/xóa, hai Store cùng title/SKU. Không có người dùng phải giải UUID/SKU để chọn hàng.

### F03 — Mua ngay đúng lượng, bảo toàn giỏ

- **Finding:** CR-001. **Phụ thuộc:** F01 và thiết kế quote/snapshot F02.
- **Phương án đề xuất:** ý định mua trực tiếp độc lập với dòng giỏ; quote/confirm nhận một nguồn mua có kiểu rõ và danh sách variant/lượng. Tái sử dụng kernel kiểm giá/tồn/voucher/payment/idempotency hiện có, không viết pipeline đặt đơn thứ hai.
- Chốt ADR và contract tương thích trước khi code: luồng CART cũ tiếp tục hợp lệ; BUY_NOW có quote thuộc đúng user/nguồn, TTL và fingerprint chứa đầy đủ đầu vào. ConfirmCART mới xóa các dòng giỏ đã chọn; confirmBUY_NOW không xóa hoặc đổi giỏ sẵn có. Chọn cách mở rộng operation hiện tại hoặc operation bổ sung sau khi kiểm ảnh hưởng các consumer.
- Không dùng thủ thuật ghi đè quantity trong giỏ rồi khôi phục: reload, tab khác và timeout có thể làm mất hàng/ghi nhầm. Không chỉ sửa con số hiển thị trong khi server vẫn đặt lượng cộng.
- **Nghiệm thu:** C20/X10/X11; giỏ có0/2/5 cùng variant, mua ngay2 đều quote/đơn2; giỏ giữ nguyên. Hủy checkout/reload/back/hai tab/timeout/retry cùngkey không thay giỏ hoặc tạo đơn thứ hai; kiểm cả catalog và detail.

### F04 — Giỏ, quote, tổng tiền và kết quả chưa rõ

- **Finding:** CR-008/018/020/022; UX-02/13/14. **Vùng sửa:** CartPage,CheckoutPage,CartProduct,cart-summary và purchasegroup recovery.
- Chặn checkout trong khi mutation giỏ liên quan đang chờ; đọc lại trạng thái chắc chắn trước khi tạo quote. Giữ lựa chọn một phần theo user, không tự chọn lại dòng/Store đã bỏ khi quay lại hoặc dữ liệu thay đổi.
- Hiển thị đơn giá/lượng/thành tiền dòng và tổng hàng được chọn; tách giảm Store/sàn/phígiao. Số dự tính ở giỏ có nhãn rõ, số quyết định khi confirm phải từ quote authoritative. Requote làm mới đầy đủ dòng hàng/tổng trước cho xác nhận lại.
- Sau xóa/đặt thành công cập nhật cache giỏ và badge đúng số còn lại. Lưu tham chiếu kết quả đã tạo để reload đọc lại nhómđơn; không phát POST lại vì remount.
- Attempt chưa rõ kết quả giữ **nguyên body và idempotency key**. Đổi địa chỉ/payment/voucher không được âm thầm ghi đè attempt đang đối chiếu; kết quả chắc chắn rồi mới tạo ý định mới. GETretry được tách khỏi mutationretry.
- **Nghiệm thu:** C19–C30,C34–C38,X09–X15. Kiểm giá đổi/quota hết lúc confirm, cartPATCH/DELETE chậm, mấtack sau commit, retry đồng thời và hai Store; đọc lại order/payment/stock/redemption, không chỉ toast.

### F05 — Địa chỉ, hồ sơ và tiếp tục hành trình

- **Finding:** CR-010/011; UX-04/05/19. **Phụ thuộc:** F01 và cơ chế attempt F04.
- Thêm/sửa địa chỉ bằng API hiện có, hiển thị đầy đủ bản địa chỉ đang chọn tại checkout; không nhét toàn bộ thông tin quan trọng chỉ trong option bị cắt. Bảo toàn default/version theo contract.
- Cho thêm/sửa tại checkout hoặc trở về đúng checkout với draft được gắnuser; giữ món/voucher/payment chưa confirm và bắt quote lại khi đầu vào thay đổi. Draft cóTTL, xóa khi logout/đổi tài khoản; không lưu secrets hoặc attempt tài chính bằng một cơ chế draft tùy ý.
- Login/register/verify/reset có returnpath nội bộ được kiểm an toàn và ý định mua; quay lại để người dùng xem/xác nhận, không tự đặt đơn sau xác thực. Hồ sơ lưu thành công cập nhật queryprofile dùng chung.
- **Nghiệm thu:** C13–C18,C31–C36,X03/X15/X27; địa chỉ đầu tiên, đổi phone/default, địa chỉ bị sửa/xóa ở tab khác, hai địa chỉ giống đầu khác cuối, lỗiAPI/Back/reload. Đơn cũ không đổi addresssnapshot.

### F06 — Nhận diện hàng, điều chỉnh và sổ kho

- **Finding:** CR-024/025, OP-02, UX-11. **Phụ thuộc:** POL-06 cho phần kiểm kê vật lý; metadata và đồng bộ lịch sử có thể sửa trước.
- **F06a trước:** inventory trả metadata tối thiểu của các variant ở trang đang đọc: product/title/SKU/phân loại/trạng thái, trong đúng Store và quyền kho. Không phụ thuộc tải100product đầu, không cấp quyền sửa sản phẩm để đọc tên hàng. Lowstock/dialog dùng cùng nhận diện.
- **F06b:** projection lịch sử có delta_quantity/delta_reserved, actor/nguồn/lý do/thời gian và thông tin trước–sau/checkpoint cần đối chiếu kỳ; dữ liệu cũ không có thì ghi thiếu, không bịa actor. Lọc/phân trang và tổngmốc phải thống nhất phạm vi.
- Nhập thêm/giảm hàng có đầu vào và preview kết quả rõ. Chỉ bật “kiểm kê về số thực tế” sau khi quy đổi đúng nghĩa tồn/giữ/hàng đã consume chờgiao; không mặc định `physical_count - quantity` đúng với mô hình hiện tại.
- Lưu adjustment làm mới cả tồn và lịch sử; lỗi tải lịch sử sau commit không tự gửi lại adjustment. Giữ operation ID/body khi chưa rõ kết quả, sửa nhầm bằng bù có lý do, không sửa/xóa lịch sử im lặng.
- **Nghiệm thu:** S19–S24,N06/N07,X10/X14/X18; inventory-onlySELLER, Store300, thứtự kho khác catalog, reserve/release/consume/restock, hai người kiểm kê, thiếu quyền/saiStore và lặp command. Cộng riêng quantity và reserved khớp DB.

### F07 — Catalog Seller và luồng đưa món lên bán

- **Finding:** CR-002/017/023; UX-09; kết hợp search F17 và metadata F06.
- Giá integerVND theo contract, create/edit thống nhất min/step/max; giữSKU có số0.408/5xx/network mất phản hồi phải vào trạng thái chưa rõ, hướng kiểm lại đối tượng; không tự thêm idempotency key nếu server chưa hỗ trợ.
- Luồng nháp → phân loại/giá → ảnh → tồn → xem trước có checklist/link tới đúng variant cần hoàn thiện.12tổ hợp làm được bằng editor hiện có; không bắt thêm bulk hoặc wizard lớn. Phân biệt đăngbán với còn hàng mua được, không tự đổi chính sách cho ACTIVE/tồn0.
- Bảng mobile dùng thao tác gọn hoặc layout phù hợp, để nhận ra tên/phân loại và chọn đúng dòng; không để sticky rộng che gần toàn bộ hàng. Form bẩn có cảnh báo/đường phục hồi phù hợp, giữ dữ liệu khi validation/version lỗi.
- **Nghiệm thu:** S07–S18,X03/X18/X28/X29; giá100500, SKU009264,12 variant, ảnh thứ tự, Stop/Active, hiddenreason từ F14,300product,390/768/1024/1440 và unknowncreate. Không tuyên bố từngGET200 là đã bán được.

### F08 — Hàng đợi, phiếu xử lý, COD và timeline

- **Finding chính:** UX-03/06/12, OP-03. **Phụ thuộc:** F02/F06; search toàn dữ liệu F17.
- Customer/Seller/Admin nhận ra đơn bằng món/Store/ngày/mã, phân biệt các đơn cùng tiền. Phiếu Seller có snapshotvariant/lượng/người nhận/phone/địachỉ; thông tin cần thiết để bàn giao thủ công và dấu vết thời gian/người thực hiện/tham chiếu nếu có.
- Dùng tên hành động theo công việc và giải thích điều kiện: đang chờ Store/khách/thanh toán, thiếu quyền COD, vì sao không hoàn tất. COD ghi đúng số tiền cầnthu, có cơ hội kiểm tra; không đồng nhất SHIPPED/COMPLETED với đã thu nếu payment chưa xác nhận.
- Timeline đọc dữ liệu lịch sử thật, lọc thông tin theo vai trò; phiên bản kỹ thuật đưa vào chi tiết khi cần. Giữ bộ lọc/trang/vịtrí và bảnnháp khi409; đọc bảnmới để người dùng quyết định, không ghi đè hoặc tựretry mutation.
- Hủy–đặt lại và giới hạn sau bàn giao được nói rõ; không mở chức năng sửa món sau đặt. Tracking thủ công không được bịa mã hoặc giả đã bàn giao hãng vận chuyển.
- **Nghiệm thu:** C43–C50,S25–S34,N05,X18; cùng một đơn qua ba vai trò, người thiếu quyền, hai Store, CODchưa thu/đã thu và các chuyển trạng thái cấm. Người bán lấy/giao được hàng bằngUI, không cần truyDB hoặc hỏi lại địa chỉ khách.

### F09 — Giao thất bại, nhận hoàn về và đổi trả có thể thực hiện

- **Finding:** OP-01, UX-08. **Phụ thuộc:** F02/F06/F08; POL-01/02/05, tác động voucher POL-03.
- Thiết kế ADR state/contract tối thiểu trước code: ghi sự cố giao/từchối, người xử lý tiếp, nhận kiện theo đúng đơn/variant/số thực nhận/tình trạng; phân biệt hàng chờkiểm/hỏng/bánlại được. Không dùng COMPLETED giả để mở return trên đơn SHIPPED.
- Trạng thái hàng tách tiền. CODchưa thu không tạo collected/refunded giả. Chỉ stock bán được tăng khi receipt/điều kiện đã được xác nhận; command/event lặp không tăng lần hai. Giao lại hoặc đóng đơn tuân theo policy đã chốt.
- Đổi/trả có hướng dẫn nơi nhận, cách gửi, phí và bước đang chờ; ghi lựa chọn hàng đổi đúng phạm vi được duyệt và liên hệ đúng Store. Nếu đổi khácgiá/hoàn một phần ngoài phạm vi thì nói rõ giới hạn và đường hỗ trợ; ghi nhận hàng thiếu/hỏng không tự biến thành hoàn một phần.
- Có recovery cho command treo, worker chết sau commit, nhận lặp và hai người cùng xử lý; không xóa trạng thái cũ/audit để mở lại.
- **Nghiệm thu:** N01–N04,C51/C52,S35/S36,CH04/05; CODchưa thu và online đã thu, nguyên/thiếu/hỏng, double-receipt, cancelrace, tiếp nhận Store khác. Đối chiếu ledger tồn/payment/voucher/ba vai trò ở từng checkpoint.

### F10 — Hoàn COD và hoàn online có bằng chứng

- **Finding:** CR-006/007. **Phụ thuộc:** F09, POL-05, adapter kiểm thử F00; giữ eligibility/guard tiền hiện có.
- **Giảm rủi ro tạm thời:** không mời khách vào luồng REFUNDCOD chắc chắn không xử lý được; hiển thị giới hạn/hỗtrợ. Đây chỉ là containment, **chưa đủ đóng CR-006 hoặc nghiệm thu công việc hoàn COD**. Yêu cầu đãkẹt phải có recovery, không bị xóa/bỏquên.
- Sau chốt policy, bổ sung đường COD được sản phẩm hỗtrợ: adapter hoặc xácnhận hoànthủ công có số tiền/reference/bằng chứng/actor/quyền/thời gian/audit. Giao dịch bên ngoài chưa được xácminh không được bấm thành SUCCEEDED chỉ bằnglời khaiUI. Không bắt buộc quy trình hai người nếu chưa có chính sách đó, nhưng người xácnhận phải đúng quyền/phạm vi.
- Online giữ REQUESTED/PROCESSING/UNKNOWN/SUCCEEDED rõ ràng; đốisoát/lookup trước retry giao dịch không rõ kết quả. Callback saioperation/reference/số tiền hoặc đến sau đóng đơn phải đi recovery phù hợp, không ghi thành công giả.
- Kết thúc yêu cầu chỉ khi hoàn đủ tiền đã xác nhận đúng đơn; cùng operation/body không hoàn hai lần. Có nútđọc lại/poll cógiới hạn khi chờ, ngừng khi terminal/tabẩn, lỗi đọc không tự phát lệnh hoàn.
- **Nghiệm thu:** C40/C41/C53,S36,A21,CH03/05; adapter tắt/lỗi/UNKNOWN, mấtack sau commit, callback trùng/muộn/saitiền, refund đủ tiền, quyền bịthu, request COD cũ đang RECEIVED. DB/payment/refund/job/audit khớp UI.

### F11 — Voucher quản lý được và hậu điều kiện hủy/hoàn

- **Finding:** CR-013; POL-03. **Vùng sửa:** VoucherPanel và update/usage/redemption service hiện có.
- Thêm sửa/dừng/mởlại STORE/PLATFORM với version, validation và chỉ dẫn quota/thời hạn/min/cap/percustomer. Không cho sửa voucher làm thay snapshot giảm giá củađơn đã chốt.
- Hủy/hoàn/phí/sự cố giao khôi phục lượt đúngmốc policy, dùng thao tác idempotent; release/redemption/restore không chạy hai lần khi worker/callback replay. Giải thích mã bị từ chối và cho sửa quote, không tự confirm.
- **Nghiệm thu:** C28/C29/C49,S37/S38,CH01/02/04/05; tranh lượt cuối, mã hết hạn khi xácnhận, voucherSTOPPED sau đặt, hai Store và versionconflict. Kiểm historicalamounts và counters gốc.

### F12 — Nhân viên, quyền và log theo Store

- **Finding:** CR-012, OP-04. **Phụ thuộc:** F01, POL-04 và emailcapture F00.
- Phân trang nhân viên/lời mời riêng, tìm/thu hồi phần tử sau100; trạng thái invitation hết hạn/revoked và delivery lỗi rõ, không giữ quyền ngầm khi gửi thấtbại.
- Owner xem viewlog tối thiểu theo Store/actor/object/time, có trước–sau và liênkết phù hợp; không cấp platform.admin hoặc trả rawlog toàn sàn. Khi actor mất/quyền thay đổi vẫn giữ định danh lịch sử đáng tin, che dữ liệu không cần thiết.
- Thay quyền/khóa membership có hiệu lực với phiên đangmở; UI nêu rõ quyền theo Store khác rolehệ thống. Không nới quá nhiệm vụ của SELLER hoặc biến SELLER thành Owner.
- **Nghiệm thu:** S39/S40,N08,X16/X18;101nhân viên/lời mời, email capture/accept/revoke/expire, hai Store, nhân viên tồn-only, chỉnh quyền cạnh tranh và request đang chạy. Actor/store/permission có audit đúng.

### F13 — Yêu thích và đánh giá sở hữu

- **Finding:** CR-003/004/015/019. **Vùng sửa:** sharedfavorites cache, ProductCardActions/ProductDetail/FavoritesPage và ownedreviewread.
- Một nguồn trạng thái favorite theo user/product; optimisticupdate có rollback, không localoverride vôhạn. Reload/two-tab/recommendation/detail đồngbộ theo chiến lược invalidation phù hợp, không polling toàn catalog vôhạn.
- Xóa mục cuối làm trang vượt total thì chuyển tới trang hợp lệ; loading/error khác empty thật. Hidden/stoppedproduct có thông báo đúng, không giữ CTA mua không hợp lệ.
- Đọc/sửa review sởhữu kểcả HIDDEN bằng projection/endpoint có ownership, không trả review ẩn ra public hoặc tự bỏ moderation khi sửa. Giữ uniqueOrderItem/version.
- **Nghiệm thu:** C54 và ca favorite trongcatalog; nhiều thẻ cùng ID, haiuser/tab, trang21→20mục, lỗi optimistic, Adminẩn rồi Customer tải/sửa, người khác403/404 và public không thấy review ẩn.

### F14 — Admin quyết định đúng đối tượng và Seller biết lý do

- **Finding:** CR-026/027; UX-15/16/17. **Phụ thuộc:** F01/F02; queryserver tương ứng F17; POL-04 cho nhãn actor/log.
- Hồsơ lọc/đếm phía server trên toàn tập, total/page đồng nhất; còn đường phân trang/đổi bộ lọc khi rỗng hoặc trang ngoài biên.
- Lock/unlock xácnhận danh tính, trạng thái đích, phạm vi ảnh hưởng và lý do; cancel không mutation,409đọc lại. Không tự thêm quyền khi mởkhóa; phân biệt khóa user/Store.
- Productmoderation và Adminreturns có Store/đối tượng/ngữcảnh cần thiết; resolve tên hàng loạt phù hợp quyền, không N+1vôhạn. Hai Storecùng title/SKU vẫn phân biệt được trước ghi.
- Lýdo/quyết định ẩn được lưu/đọc cócấu trúc hoặc projection đáng tin từ dữ liệu hiện có, Seller đọc đúng Store để sửa. Không mở rawaudit hay tựđăng lại khi Seller sửa; restore giữ STOPPED nếu Store đãdừng.
- Audit có actor label/link phù hợp quyền và ID truyvết. Actor NULL hệ thống khác actor ID không resolve được; không gán nhầm thành “Hệ thống”. Không tự backfill danh tính lịch sử thiếu.
- **Nghiệm thu:** A01–A18,A22/A23,S17; pendingtrang2, trùng tên/email/SKU, user/StoreLOCKED,409, hai identityvàhai Store; guardOwner/Customer không được dùng moderation/auditplatform vẫn403.

### F15 — Báo cáo đúng nghĩa kỳ và có nguồn đối chiếu

- **Finding:** CR-014, OP-05. **Phụ thuộc:** POL-07, log/snapshot/tiền ở F02/F08/F10.
- Fixdate mặcđịnh không quaUTCISO rồi cắt nhầm ngày; hiển thị timezone. Khoảng ngày UI được chuyển thành `[đầu ngày bắt đầu, đầu ngày kế tiếp ngày kết thúc)` đúng timezone đã chốt; contractAPI/timezone phải rõ và thống nhất.
- Owner đúng Store; Admin có Store/kỳ phù hợp nhu cầu hỗtrợ, drilldown hoặc công cụ đối chiếu nguồn hợp lệ. Tách giá trị đơn/discount/phígiao/hàng hoàn tất/đã thu/đã hoàn; không gọi thành lợi nhuận/payout.
- Nếu dùng cohort thì nhãn và nguồn ghi rõ ngày tạođơn; nếu cashflow thì cần sự kiện thu/hoàn có timestamp đángtin. Thiếu sự kiện cũ phải công bố giới hạn, không dùng order.created_at giả ngày nhận tiền.
- **Nghiệm thu:** S42/A24,CH01/02/04/05/06; đầu tháng/năm, một ngàyUTC+7, giao dịch ởbiên, đơn trước kỳ thu/hoàn trong kỳ, COD giao thất bại, hai Store và quyền không phù hợp. API/SQL/UI cùngmẫu và cùng định nghĩa.

### F16 — Liên hệ có ngữ cảnh, điều hướng và responsive

- **Finding:** CR-005/009; UX-07/18/20. **Phụ thuộc:** F01/F02/F08.
- Từđơn nhắn đúng Store với tham chiếu đơn được server kiểm ownership/Store; mở composer có ngữ cảnh để user quyết địnhgửi, không tựgửi tin. Seller có đường trởlại đúng đơn, không lộđơn sang participant khác.
- Hashcancel/return/review đợiđích render rồi scroll/focus phù hợp, giữBack/Forward. Focusroute và giải thích bất đồng bộ giữ skiplink/dialog đúng, không cướp focus khi polling hoặc đang nhập. UX-20 là cải thiện cần uservalidation, không tái cấu trúc mọi navigation theo một giả định WCAG.
- Ảnhlỗi có fallback/đường phục hồi. Chatlauncher/sticky/actionbar không che thông tin cần quyết định/CTA trên mobile; giữchat/draft và khả năng đóng/khôi phục. Không sửa bằng cách bỏ hẳn chat trên luồng mua.
- **Nghiệm thu:** C47,X19–X30liên quan,CR-005/009; tên/địa chỉ dài, dialog/table, ảnhlỗi, zoom200%native, bàn phím ảo/safearea và screenreader trênmôi trường thật khi có. Screenshotviewport/DOM không được dùng thay thiết bị hoặc tiếng đọc.

### F17 — Tìm kiếm, bộ lọc và giữ ngữ cảnh toàn danh sách

- **Finding:** CR-021, UX-10; backendquerycho CR-026 ở F14.
- Tìm sảnphẩm tiếng Việt có/không dấu/hoa-thường, gồmđ/Đ; Seller tìm toàn Store theo tên/SKU. Hàng đợi đơn và công cụAdmin có trường tìm/lọc thực sự cầncho nhiệm vụ, không chỉ lọc page hiện tại hoặc tải mọi bản ghi về browser.
- Chọn chiến lược normalize/index sau kiểm PostgreSQL/cấu hình: không mặc định extension cósẵn. Giữ dấu ở dữ liệu hiển thị, escapequery, phân quyền/Store predicate tại server. Filter trước count/page, sort ổn định cótie-breaker; query/trang nằm trongURL để Back/Forward hoạt động.
- **Nghiệm thu:** C01/C06,S13/S14/S25,A01/A07/A19;300product/100order, SKU khó đoán, Unicode/NFC, trang cuối, empty thật, đổi bộ lọc, APIlỗi/race và hai Store. Không mở rộng thành tìm kiếm CRM hoặc search engine ngoài nhu cầu.

### F18 — Nghiệm thu, chứng cứ mới và đóng lỗi

- Chạy build/contractcheck và unit/integration phù hợp từnggói. Gói chạm tiền/tồn/quyền bắtbuộc integration thật kiểm hậu điều kiện; UIfixture kiểm thao tác nhanh, không là bằng chứng tiền đã thu/hoàn hoặc quyềnđã thu hồi.
- Chạy lại toàn158ID theo nhóm bị ảnh hưởng, desktop1440/mobile390;768/1024cho checkout/editor/table/dialog. Ca ngoài khả năng vẫn có BLOCKED lý do và quyết định nghiệm thu rõ; không đổi thành PASS vì không cóthiết bị.
- Chạy sáu chuỗi ởmục6 trên cùngđối tượng; thêm ca cạnh tranh/timeout/replay và ba vai trò. Thử với người thật từ bộbài cósẵn khi có participant; giữ USER_VALIDATION_PENDING nếu chưa tổchức.
- Lỗi chỉ chuyển FIXED_VERIFIED khi có thayđổi, test hành vi đúng và bằng chứng mới đúng baseline. Giữ IDs/repro/lịch sử; không đổi fixture thành khớp output lỗi hoặc bỏ assertion để suitexanh.

## 5. Mapping đầy đủ, một gói chủ trì mỗi finding

Các gói phụ thuộc vẫn có thể chạm cùng component. Bảng này chỉ định gói chịu trách nhiệm đóng finding, tránh đếm hoặc sửa trùng. UX-20 giữ trạng thái cần uservalidation về tác động.

| Gói | Finding chủ trì |
|---|---|
| F01 | CR-016 |
| F02 | UX-01 |
| F03 | CR-001 |
| F04 | CR-008,CR-018,CR-020,CR-022,UX-02,UX-13,UX-14 |
| F05 | CR-010,CR-011,UX-04,UX-05,UX-19 |
| F06 | CR-024,CR-025,OP-02,UX-11 |
| F07 | CR-002,CR-017,CR-023,UX-09 |
| F08 | UX-03,UX-06,UX-12,OP-03 |
| F09 | OP-01,UX-08 |
| F10 | CR-006,CR-007 |
| F11 | CR-013 |
| F12 | CR-012,OP-04 |
| F13 | CR-003,CR-004,CR-015,CR-019 |
| F14 | CR-026,CR-027,UX-15,UX-16,UX-17 |
| F15 | CR-014,OP-05 |
| F16 | CR-005,CR-009,UX-07,UX-18,UX-20 |
| F17 | CR-021,UX-10 |

Tổng mapping:27 CR + 20 UX + 5 OP = 52 ID finding, mỗi ID đúng một gói chủ trì. Đây không phải52 bug độc lập: có các nhu cầu/biểu hiện liên quan và giả thuyết tác động đã được phân loại trongreview. F00/F18 là chuẩn bị/nghiệm thu nên không sởhữu finding riêng.

## 6. Sáu cổng nghiệm thu xuyên hệ thống

| Chuỗi | Phải chứng minh bằng cùng đối tượng và checkpoint |
|---|---|
| CH01 — COD nhiều Store | Chọn đúng variant/lượng → voucher/đặt → Seller nhận ra đơn/lấy đúng hàng/đủ người nhận → bàn giao → thu đúng COD → hoàn tất → thông báo/đánhgiá/report; quantity/reserved và collected/refunded đúng |
| CH02 — Hủy trước bàn giao | Customer/Seller hủy cạnh tranh xử lý → một kết quảhợp lệ theo version → nhả/hoàntồn mộtlần → tiền/voucher theo policy → ba vai trò cùng trạng thái, hủy–đặtlại không sửa đơn cũ |
| CH03 — Online chưa rõ kết quả | Adapter thật trongstacktest → mấtack/đóngtab → đọc lại/lookup → không trả lần hai → callback trùng/muộn/saitiền; đơn đã đóng cóđường hoàn/recovery đúng |
| CH04 — Giao thấtbại/hoànvề | Ghi thấtbại → tiếp nhận/kiểm đúng variant/số lượng/tình trạng → chỉ restock đủ điều kiện → CODchưa thu không cóthu/hoàngiả; online đã thu quyết toán đúng → report/timeline |
| CH05 — Đổi/trả | Yêucầu/đúng policy → quyết định/hướng dẫngửi → nhận/kiểm → gửi đúng hàng đổi hoặc hoàn đủ tiềnđã xác nhận → Customer nhận kết quả → đủ history/audit/quyền/tồn |
| CH06 — Kho đang giữ hàng | Tồnđầu → nhập → reserve → preview/điều chỉnh đúng nghĩa → hủy hoặc bán → release/consume/restock → ledgerquantity/reserved mỗi bước/actor và đầu/cuối kỳ khớp; duplicate command không cộng lại |

Mỗi chuỗi có success, từchối hợp lệ, lỗi dependency, cạnh tranh và kết quảchưa rõ. Không ghép ảnhUI của đơn A với hậu điều kiệnDB của đơn B, không dùng integration adapter thay providerproduction để tuyênbố production đã đạt.

## 7. Contract, migration và chuyển tiếp

- Chốt ADR cho directbuy, snapshot/readmodels, deliveryissue/receipt/stockeffects, CODrefundproof và reportperiod trước gói liên quan. Ghi matrix quyền, chuyển trạng thái, idempotency và tương thích consumer.
- Chỉnh nguồn contracts tại `docs/contracts/`; dùng scripts hiện có để generate types/runtime/fixtures, chạy check/drift. Kiểm ảnh hưởng consumer backend/frontend/mobilegenerated, dù không mởthêm chức năng mobile trong đợt web này.
- Migration ưu tiên thêm field/table/index có thể triển khai tương thích; dữ liệucũ có mapping rõ hoặc nhãn chưa có. Không tựđổi snapshot/lịch sử hay đánh dấu refund SUCCEEDED cho ca đang kẹt.
- Với event/worker mới, chuẩn bị reader/consumer/recovery trước khi bật writer; rollback tính năng không xóa dữ liệu tiền/tồn đã ghi. Mỗi gói chỉ rõ cách tắt writer và tiếp tụcđọc/đốisoát dữ liệucũ nếu phải quay lại.
- Mọi deploy/merge ngoài kế hoạch này là bước riêng; bảnplan không tựthực hiện cập nhật stack ứng dụng hoặc production.

## 8. Bằng chứng, kiểm tra và điều kiện đóng đợt sửa

Hồ sơ review cũ giữ làm bằng chứng trước sửa. Khi bắtđầu thi công tạo baseline mới và lưu kết quả ở `docs/implementation/core-fix/`, `artifacts/core-fix/<baseline>/`; nối finding/scenario/run/commit rõràng. Validatorreview cũ kiểm239hash nguồn cốđịnh sẽ báođổi khi source được sửa: **không nới validator hoặc cậpnhật baseline cũ để giả lịch sử không đổi**. Bộrepro kỳvọng lỗi được lưu lịch sử; acceptance mới phải kỳvọng hành vi đúng.

Các lệnh hiện có dùng tùyphạm vi thayđổi, không mặcđịnh chạy integration vào DB demo:

```text
npm run contracts:check
npm run contracts:drift
npm run build:backend
npm --prefix frontend run build
npm --prefix backend test -- <suite liên quan>
npm --prefix backend run test:integration -- <suite liên quan>
npm --prefix frontend run test:e2e -- <spec liên quan>
```

Chỉ regenerate bằng `npm run generate:types` / `npm run generate:contracts` khi chủ đích đổi nguồn contract, sau đó kiểm diff và consumer. Khi nghiệm thu cuối, chạy đủ unit/integration/browser liên quan cùng sáu chuỗi; không lấy112automation cũ hoặc54PASSreview làm kết quảsau sửa.

Một gói được chốt khi: hành vi đạt đúng mục tiêu; hậu điều kiện tiền/tồn/quyền đúng; error/loading/empty/uncertain và khả năng phục hồi rõ; test có ý nghĩa qua; tài liệu/contract thống nhất; có kế hoạch dữ liệu chuyển tiếp nếu cần. Không thêm test lặp lại implementation cho các sửa trình bày nhỏ đã có bằng chứng tương tác phù hợp.

Điều kiện đề xuất nghiệm thu vận hành: không còn P0/P1 hoặc FAIL/POLICY_GAP chưa xử lý ở công việc thiết yếu; sáu chuỗi có bằng chứng đầu-cuối; trạng thái cũ kẹt cóđường phục hồi; provider/capability được công bố đúng. Các hạn chế thiết bị/participant hoặc P2/P3 còn lại được ghi rõ và cần quyết định chấp nhận riêng, không tự nâng PASS hoặc lặng lẽ đưa chức năng thiết yếu ra ngoài phạm vi.

## 9. Điểm bắt đầu thực thi

Thực hiện F00 và ADRF02/F03 trước, rồi mở gói F01 song hành với dữ liệu nhận diện F02. Tiếp theo sửa F03/F04 và F06a, đưa F08 lên sớm để kiểm CH01 bằng công việc thật. Chốt POL-01/02/05/06 ngay từđầu để F06b/F09/F10 không bị kẹt; các sửa P2 độc lập có thể làm trong lúc chờ, nhưng không thay thế việc giải quyết các điểm chặn này.

**Bản này chỉ lập kế hoạch. Chưa sửa mã nghiệp vụ, contract, migration, cấu hình runtime hoặc triển khai.**
