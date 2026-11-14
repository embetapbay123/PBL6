# Kế hoạch hoàn thiện các mục còn lại trong bug.docx

Ngày lập: 14/11/2026. Trạng thái: **kế hoạch**, chưa phải xác nhận triển khai hoặc nghiệm thu các mục bên dưới.

Cập nhật thực hiện: đợt UI đầu đã được triển khai; các đợt sau chưa hoàn tất. Xem [bảng tiến độ và mức bằng chứng](bug-docx-plan-progress-2026-11-14.md).

## Mục tiêu và baseline

Hoàn thiện các góp ý còn lại của `C:/Users/congh/Downloads/bug.docx`, có thay đổi FE/BE đúng phạm vi và bằng chứng đóng từng mục B01–B33. Nội dung tài liệu được dùng làm nguồn yêu cầu để đối chiếu; những điểm mâu thuẫn được ghi rõ thành đề xuất.

Baseline tham chiếu:

- `bug-docx-ui-ux-audit-2026-11-14.md`: ánh xạ 33 nhóm, ảnh và kết quả trước sửa.
- `bug-docx-ui-fixes-2026-11-14.md`: đợt F01–F09. F04 mới bỏ composer media chưa được hỗ trợ; chưa có upload ảnh/video chat.
- `bug-docx-acceptance-2026-11-14.md`: kiểm tra nghiệp vụ trên demo thật và các mục chưa đạt.
- `bug-f10-f11-fixed-2026-11-14.md`: đóng sort gian hàng và Home tự chạm rate limit.
- `catalog-refresh-2026-11-14.md`: dữ liệu hiện tại gồm 106 sản phẩm đang bán; không dùng dữ liệu TEST đã thu hồi làm dữ liệu nghiệm thu mới.

Không lấy số lỗi F chia cho 33 góp ý B: một lỗi F có thể giải quyết nhiều góp ý B; một góp ý B có thể chứa cả lỗi và tính năng chưa có. Bảng cuối phải phân biệt “đã sửa”, “đã kiểm thử UI”, “đã nghiệm thu BE” và “còn phụ thuộc”.

## Các lựa chọn giao diện được đề xuất

**Thanh điều hướng phụ** là hàng ngay dưới logo/ô tìm kiếm: Sản phẩm · Danh mục ngành hàng · Sản phẩm đã lưu · Tin nhắn. Đây không phải header hay dock mobile.

- Đề xuất B09/B29: chỉ hiện thanh phụ ở trang chủ; bỏ Tin nhắn khỏi riêng thanh này vì header/dock/tài khoản đã có đường truy cập. Các trang khác có breadcrumb/nút quay lại theo route, không phụ thuộc người dùng đi từ đâu tới.
- Người dùng đã hỏi ý nghĩa thanh phụ; **chưa coi đề xuất phạm vi hiển thị là lựa chọn đã được xác nhận**. Các phần khác có thể làm độc lập.
- B15: giảm các mục trùng ở menu chính; giữ đường truy cập Tin nhắn, Thông báo và Đổi trả qua nhóm “Thêm”/trung tâm tài khoản và các liên kết từ đơn. Không bỏ khả năng truy cập một chức năng chỉ để giống ảnh.
- B26: bỏ khối đếm lớn trên trang khám phá mặc định; giữ số kết quả gọn khi tìm kiếm/lọc và trong phân trang.
- B27: dùng nhãn “Mặc định” cho thứ tự mặc định. Không ghi “Liên quan nhất” khi dữ liệu thực tế vẫn sort theo tên.

## Đợt 0 — Chốt bảng đối chiếu và bằng chứng

1. Đánh dấu lại từng góp ý nhỏ trong 33 nhóm theo code hiện tại, đối chiếu cả chữ và ảnh gốc.
2. Chụp baseline của các màn sẽ đổi, dùng dữ liệu có kiểm soát và các tài khoản demo phù hợp vai trò.
3. Ghi rõ route, viewport, thao tác, kết quả mong đợi và mức bằng chứng. Không mở lại F01–F11 đã sửa nếu chưa tái hiện hồi quy.

Đầu ra: một bảng theo dõi 33 nhóm, có liên kết đến test/ảnh cho từng mục; không giữ trạng thái lỗi cũ sau khi đã có bằng chứng mới.

## Đợt 1 — Hoàn thiện UI và câu chữ còn dang dở

Phạm vi chính: B03, B14–B16, B18, B24, B26–B27, B32; hồi quy B02/B22/B25/B30/B33. B09/B29 triển khai theo lựa chọn điều hướng sau khi thống nhất.

| Màn | Thay đổi dự kiến | Tiêu chí đóng |
|---|---|---|
| Giỏ hàng | Bấm tên phân loại dưới tên sản phẩm để mở bộ chọn tại dòng; giữ món đang chọn và báo tồn/giá mới | Bàn phím và touch dùng được; đổi đúng variant; không tạo dòng trùng hoặc vượt tồn; lỗi giữ lựa chọn cũ |
| Card đơn | Rà vị trí gian hàng, trạng thái, số lượng ở vùng giá và tổng số món; bỏ chữ lặp | Đơn nhiều dòng/biến thể và tên dài vẫn dễ đọc; số món là tổng quantity; tiền khớp dữ liệu đơn |
| Tài khoản/địa chỉ | Rút menu trùng; bỏ tiêu đề “Tài khoản của bạn” thừa; căn tên–điện thoại–địa chỉ, badge mặc định và CTA | Địa chỉ dài, mặc định/không mặc định, thêm/sửa/xóa đều rõ; focus và cảnh báo xóa vẫn có |
| Chi tiết sản phẩm/đơn | Bỏ link Giỏ hàng cuối trang theo B24; gom hướng dẫn phụ vào chi tiết; rút chữ trạng thái lặp | Giá, phí, số lượng, thanh toán, hạn đổi trả và cách phục hồi khi lỗi vẫn ở đúng bước |
| Danh sách sản phẩm | Số kết quả gọn theo B26, tên sort đúng theo B27 | Sort thực không đổi ý nghĩa; tìm/lọc/phân trang/reload giữ đúng URL |

Tuân thủ `frontend/CONTENT_GUIDELINES.md`. Tái sử dụng thành phần hiện có; không bổ sung thư viện chỉ cho các chỉnh sửa này.

**Nghiệm thu:** 320/390/768/1366 px, bàn phím, tên/số tiền dài, rỗng/lỗi/loading. Bao gồm hit-test CTA giỏ, tab Đổi trả, thông báo mobile, SKU theo vai trò và trường hợp kết quả thao tác chưa rõ.

## Đợt 2 — Voucher tự chọn tốt nhất, đúng tổng tiền

Phạm vi: B01, FE và M2.

Code hiện tại: `VoucherPicker.tsx` chỉ đọc danh sách theo trang và giữ lựa chọn thủ công. Mã nhập không nằm trên trang đang tải đang bị giả định là mã sàn. `OrderService` áp mã gian hàng trước, sau đó mới kiểm tra ngưỡng mã sàn trên tiền hàng sau giảm. Đây là rủi ro cần có ca tái hiện, không tự coi mọi mã ngoài trang đầu là lỗi đã nghiệm thu.

**BE:**

1. Tách phần tính voucher hiện có thành logic dùng chung cho gợi ý, quote và xác nhận đơn; giữ quy tắc làm tròn VND, phân bổ, ngưỡng và hạn mức sử dụng.
2. Thêm một operation gợi ý nhận đúng lựa chọn CART/BUY_NOW, số lượng, địa chỉ và phương thức thanh toán; trả mã theo scope, tổng trước/sau và quote tương ứng. Tên route dự kiến `/checkout/voucher-suggestions`; chốt theo quy ước contract trước code.
3. Tối ưu **tổng phải trả**, gồm phương án không dùng mã, tối đa một mã mỗi gian hàng và một mã sàn theo luật hiện hành. Không chọn tham lam mã giảm lớn nhất từng gian hàng: có thể làm mất điều kiện mã sàn.
4. Đọc ứng viên ở server, không giới hạn theo trang FE; không gửi hàng loạt request quote từ browser. Loại các tổ hợp tương đương, đặt giới hạn công việc và đo hiệu năng. Nếu chưa chứng minh được phương án tối ưu trong giới hạn thì trả trạng thái gợi ý chưa đầy đủ, không gọi là “tốt nhất”.
5. Nhập mã phải được server xác định scope và điều kiện, kể cả mã không nằm trên trang hiện tại. Gợi ý/quote không giữ lượt dùng; xác nhận đơn vẫn kiểm tra và đặt reservation trong transaction hiện có.

**FE:** mở lần đầu tự đề xuất khi chưa có lựa chọn; hiển thị số tiền tiết kiệm và tổng mới; cho đổi/bỏ mã. Không tự ghi đè lựa chọn thủ công sau refetch. Thay đổi món/số lượng/địa chỉ làm quote cũ hết hiệu lực; mất mạng hoặc mã vừa hết lượt phải hiện lỗi và cho chọn lại. Chống response cũ ghi đè giỏ mới.

**Nghiệm thu:** fixed/percent/cap; nhiều gian hàng; ngưỡng mã sàn sau giảm; hết hạn/hết lượt; mã trang 2; mã Store nhập tay; không có mã; bằng tiền; đổi giỏ; hai khách tranh lượt cuối. Tổng tiền UI = quote = order = sổ tiền tương ứng. Kiểm tra solver bằng vét cạn trên các bộ nhỏ để chứng minh lựa chọn, và kiểm tra ngân sách request/hiệu năng trên bộ lớn.

## Đợt 3 — Tìm hội thoại và lịch sử chat

Phạm vi: phần tìm kiếm còn thiếu của B10, FE và M3/M4.

- M3 hiện chỉ dùng `q` ở phía STORE; phía CUSTOMER chưa truyền/áp dụng tìm kiếm. Bổ sung query cho khách, tìm theo tên gian hàng và nội dung trong hội thoại thuộc chính khách đó, trước phân trang. Chuẩn hóa chữ có/không dấu và thứ tự ổn định.
- FE dùng input có nhãn, debounce, hủy request cũ, reset trang khi đổi từ khóa, có xóa lọc/rỗng/lỗi. Không lọc cục bộ chỉ 20 hội thoại đã tải.
- Đồng bộ tìm phiên AI qua dữ liệu phiên của người dùng; chỉ tìm trong dữ liệu đã lưu, không gọi model để tìm kiếm. Xóa lịch sử thật vẫn hoạt động với kết quả tìm và nhiều trang.
- Giữ riêng “lưu trữ hội thoại Store” và “xóa lịch sử AI”; không đổi nhãn của hai thao tác thành cùng một ý nghĩa.

**Nghiệm thu:** từ khóa có dấu/không dấu, trên 20 hội thoại, không kết quả, đổi nhanh từ khóa, reload; chặn đọc chéo Customer/Store; tìm sau xóa không làm phiên xuất hiện lại. Tin nhắn nghiệm thu chỉ gửi trong các tài khoản fixture do đợt kiểm thử tạo và kiểm soát, không gửi cho người dùng khác.

## Đợt 4 — Media chat có upload và quyền truy cập thật

Phạm vi: F04/B10. Đây là phần FE + M3/M4 + lưu trữ + contract; nút đính kèm chỉ bật khi luồng tương ứng đã đủ khả năng.

**4A. Hợp đồng và lưu trữ**

- Asset có ID, chủ sở hữu, phạm vi conversation/session, trạng thái upload/kiểm tra/READY/đã xóa. Tin nhắn tham chiếu asset ID; không nhét base64 vào 2.000 ký tự text hoặc chấp nhận URL tùy ý từ client.
- M3 sở hữu attachment chat gian hàng; M4 sở hữu attachment phiên AI. Có thể dùng chung quy ước/adapter lưu trữ, nhưng không dùng quyền truy cập hay vòng đời ảnh thử đồ cho ảnh chat.
- Bản demo dùng volume riêng bền vững và API đọc có xác thực; thiết kế adapter để thay object storage khi cần. File chat không đặt vào `frontend/public`.
- Giới hạn đề xuất ban đầu: tối đa 3 ảnh/tin, mỗi ảnh 5 MB; 1 video/tin, 20 MB, 30 giây. Kiểm tra type từ nội dung thật, số pixel/duration, loại metadata không cần thiết; xử lý preview trong worker có giới hạn tài nguyên. Chỉ nhận các định dạng đã kiểm tra được.
- Có quota file/byte theo người và IP, hết hạn upload dở, dọn file mồ côi. Retention gắn với chính sách lịch sử đã chọn; hiển thị rõ nếu file có hạn lưu, không âm thầm xóa ảnh của tin đang còn hiệu lực.
- Download/preview kiểm tra quyền, hỗ trợ range cho video. Nếu dùng URL ký phải có TTL ngắn và không lộ trong log. Xóa lịch sử phải thu hồi quyền đọc và lập lịch dọn file, kể cả tác vụ đến muộn.

**4B. Chat người dùng–gian hàng**

Preview trước gửi, bỏ tệp, tiến độ, hủy, lỗi/tải lại; cho gửi media không caption; ảnh mở viewer, video có điều khiển phát. Giữ `client_message_id` để retry không tạo hai tin. Tệp lỗi không hiện như đã gửi thành công; dọn object URL và request khi đóng view.

**4C. Chat AI**

Ảnh phải đi vào payload đa phương thức thật của adapter, không coi Markdown URL là khả năng đọc ảnh. Video cần pipeline trích frame có giới hạn và adapter nhận được các frame; chỉ công bố khả năng suy luận nội dung đã thực sự xử lý. Kiểm tra khả năng của provider đang cấu hình trước khi bật. Giữ giới hạn chi phí, timeout, hàng đợi và số lượng/tần suất người dùng; không nới ngân sách gen ảnh 1 USD/ngày, 10 USD/tháng đã cấu hình. Tính phí phân tích media phải được đưa vào budget tương ứng, không đi đường gọi provider riêng ngoài kiểm soát.

**Nghiệm thu:** file sai định dạng/quá lớn/quá thời lượng, upload dở, mất ACK/retry, asset của người khác, khóa tài khoản/gian hàng, xóa khi đang xử lý, hết hạn link, media nhiều trang, phát video mobile. Kiểm tra Store và AI là hai khả năng riêng. Test adapter giả để kiểm tra lỗi/chi phí không thay cho bằng chứng một lượt đọc ảnh/video thực tế; ghi rõ mức bằng chứng nếu chưa chạy provider thật.

## Đợt 5 — Trang gian hàng có nội dung do seller quản lý

Phạm vi B28; FE, M3, M1/M2 theo nguồn dữ liệu.

1. M3 bổ sung cấu hình storefront có version/audit: banner, tiêu đề ngắn, đích liên kết trong ứng dụng, lịch campaign, nhóm sản phẩm chọn tay và trạng thái nháp/xuất bản. Có API public chỉ trả nội dung hiệu lực của Store ACTIVE.
2. Seller có form tải banner, chọn sản phẩm của chính shop, sắp xếp nhóm, xem trước mobile/desktop, lưu nháp và xuất bản. Phân quyền theo membership/quyền quản lý gian hàng hiện có; không mặc định mọi nhân viên được sửa.
3. FE Store hiển thị banner/campaign → nhóm nổi bật → danh sách đầy đủ. Thiếu nội dung thì bỏ khu vực trống; tải batch sản phẩm qua cơ chế đang có, không `getProduct` cho từng card.
4. “Nổi bật” là lựa chọn của seller. “Mới” cần mốc xuất bản đáng tin cậy ở catalog; nếu phải thêm trường, không dùng ngày migration làm ngày đăng hàng cũ. “Bán chạy” dùng số lượng bán hợp lệ từ đơn hoàn tất trong khoảng thời gian xác định; xử lý đơn hủy/hoàn theo cùng định nghĩa số đã bán. Không dùng thứ tự ngẫu nhiên để gắn nhãn.
5. Sản phẩm trong nhóm phải thuộc Store, đang được phép hiển thị; dừng/ẩn sau khi xuất bản phải bị loại khi đọc dữ liệu hiện tại. Campaign có nội dung giảm giá phải trỏ đến điều kiện voucher có thật, không tự tạo luật giảm giá mới từ banner.

**Nghiệm thu:** nháp/xuất bản, sai quyền, sửa đồng thời, lịch bắt đầu/kết thúc, shop khóa, product ngoài shop/đã dừng, nhóm rỗng, banner dài, link sai, mobile và trường hợp tắt nội dung. Có demo nội dung riêng từng shop, không để TEST hoặc nhóm hàng sao chép.

## Đợt 6 — Hồi quy, triển khai và đóng đủ danh sách

- Tạo/cập nhật contract trước các operation mới; tái sinh DTO/runtime/client types và kiểm tra drift. Migration thêm mới, có kiểm tra trên bản sao dữ liệu và backup trước rollout.
- Kiểm tra đúng dịch vụ: M2 cho voucher; M3/M4 cho tìm kiếm/media; M3 và nguồn catalog/commerce cần thiết cho storefront. Triển khai BE/DB bằng quy trình riêng; feature flag tương thích khi FE mới chưa lên.
- Sau mỗi đợt FE: kiểm tra phù hợp → `npm --prefix frontend run build` → `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-demo-web.ps1` → chờ public smoke `DEPLOY_OK`.
- Chạy lại demo bằng UI/API thật: giỏ/voucher/COD fixture, tồn kho đổi và tranh món cuối, chat nhiều trang/quyền sở hữu, Store hơn 20 sản phẩm, Home → Store → Home. Không nới rate limit để làm test qua.
- Chụp desktop/mobile, bàn phím, console/network; ghi các lỗi 429/5xx và request dư. Thêm các ca unit/integration có giá trị cho tối ưu voucher, quyền media và lịch xuất bản; không dùng screenshot thay kiểm chứng số tiền/quyền truy cập.
- Thu hồi fixture: hủy đơn mẫu còn mở, giải phóng tồn, khóa danh tính/shop thử, dừng catalog/voucher thử; giữ audit và sổ tiền. Không làm thay đổi giỏ/đơn của người khác.
- Đầu ra cuối: bảng B01–B33 với trạng thái và evidence mới. Chỉ đóng nhóm khi các yêu cầu con đã đạt hoặc quyết định thiết kế thay thế đã được ghi nhận.

## Ánh xạ toàn bộ 33 nhóm vào kế hoạch

| Nhóm | Xử lý trong đợt |
|---|---|
| B01 Voucher tốt nhất | 2 |
| B02 Giỏ gọn, CTA và tiền | 1 + hồi quy 6; F01/F03 đã sửa |
| B03 Đổi phân loại dưới tên | 1 |
| B04 Hover thêm giỏ | 6, giữ baseline đã đạt |
| B05 Bộ lọc giá | 6, giữ baseline đã đạt |
| B06 Focus search | 6, giữ baseline đã đạt |
| B07 Cuộn bộ lọc/chữ phụ | 6, giữ baseline đã đạt |
| B08 Chữ tự cập nhật thông báo | 6, giữ baseline đã đạt |
| B09 Thanh phụ chỉ Home | 1 theo quyết định chung với B29 |
| B10 Media/tìm kiếm/xóa chat | 3 + 4; hồi quy xóa thật của F05 |
| B11 Thu nhỏ/mở rộng/đóng chat | Hồi quy 3 + 4 + 6 |
| B12 Form mở gian hàng | 6, giữ baseline đã đạt |
| B13 Link auth đổi mật khẩu | 6, giữ baseline đã đạt |
| B14 Card đơn | 1 |
| B15 Mục tài khoản/đổi trả | 1 |
| B16 Sổ địa chỉ | 1 |
| B17 Sidebar đổi mật khẩu | 6; F07 đã sửa |
| B18 Tiêu đề menu tài khoản | 1 |
| B19 Khóa cộng khi max tồn | 6; F06 đã sửa |
| B20 Báo hàng ít | 6; đã sửa ngưỡng 1–3 |
| B21 Thành tiền dự tính | 6; F03 đã sửa |
| B22 Chi tiết sản phẩm/số lượng | Rà phần chữ còn lại ở 1; hồi quy 6 |
| B23 Form đánh giá dài | 6, giữ baseline đã đạt |
| B24 Link Giỏ hàng cuối trang | 1 |
| B25 Ẩn SKU Customer | 6; F08 đã sửa |
| B26 Khối đếm sản phẩm | 1 |
| B27 Tên sort mặc định | 1 |
| B28 Storefront/campaign/nhóm hàng | 5; hồi quy sort F10 |
| B29 Thanh phụ/Tin nhắn | 1, quyết định chung với B09 |
| B30 Bố cục thông báo | 6; mobile đã chỉnh ở đợt trước |
| B31 Menu đơn bị tràn | 6, giữ luồng thao tác trực tiếp đã thay |
| B32 Chi tiết đơn gọn | 1 |
| B33 Tab Đổi trả | 6; đã đồng bộ, cần giữ sau thay đổi |

Thứ tự triển khai đề xuất: **0 → 1 → 2 → 3 → 4 → 5 → 6**. Kiểm tra/triển khai từng đợt xuyên suốt, không dồn mọi thay đổi BE/FE vào một lần phát hành. Media và storefront là hai phần lớn nhất vì cần hợp đồng, lưu trữ và quyền ghi mới.
