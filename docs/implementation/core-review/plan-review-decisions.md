# Quyết định cho bản góp ý vận hành

Nguồn: attachment `Pasted text.txt` của người dùng, 325 ID bổ sung; 150 ID nền được giữ nguyên và thêm N01–N08. SHA-256 của nguồn được lưu trong registry.json. Bản góp ý là nguồn ý tưởng, không phải bằng chứng lỗi hoặc đặc tả Shopify/Shopee. Không kế thừa P0 hoặc quy tắc giao hai lần.

Phạm vi đã chốt: giao thủ công có đủ thông tin; kho điều chỉnh hiện có; sửa đơn bằng hủy–đặt lại; SELLER là nhân viên. Hoãn phí sàn, ví, hoa hồng và payout, partial/tách đơn/đổi khác giá; ngoài đợt gồm POS/đa kênh/đa kho/hàng đặc thù/CRM/quảng cáo/thuê bao. Không chấm FAIL chỉ vì mục bị hoãn chưa triển khai.

Với đề xuất chứa nhiều ý, quyết định áp cho phần tối thiểu được giữ; cột lý do ghi rõ phần cắt/hoãn. Không dùng MERGED để âm thầm kéo cả tính năng mới vào phạm vi. IN_SCOPE/MERGED chỉ quyết định review; không đồng nghĩa kết quả PASS hoặc sửa ứng dụng đã được duyệt.

Tổng: IN_SCOPE: 6, MERGED: 169, DEFERRED: 115, OUT_OF_SCOPE: 35. Có đúng một hàng cho mỗi ID nguồn; kiểm tra tự động không thiếu/trùng ID.

| ID nguồn | Nhiệm vụ nguồn | Quyết định | ID đích | Lý do/phần giữ và phần hoãn |
|---|---|---|---|---|
| V01 | Tạo voucher áp dụng cho nhóm/khách được chọn | DEFERRED | - | Voucher nhắm khách/nhóm khách chuyển roadmap. |
| V02 | Gợi ý mã dùng được theo giỏ hiện tại | MERGED | C28,C29 | Gợi ý mã là cải thiện usability, không mặc định chặn mua khi chưa có. |
| V03 | Voucher hết lượt hoặc hết hạn đúng lúc đang thanh toán | MERGED | C29,X13 | Hết lượt/hạn khi confirm, lỗi rõ và quote lại. |
| V04 | Giới hạn lượt dùng theo khách; hủy/hoàn đơn rồi có được lại lượt không | MERGED | C28,C49 | Giới hạn theo khách và phục hồi lượt cần quy tắc cụ thể. |
| V05 | Kết hợp voucher sàn + Store + phí giao | MERGED | C28,C36 | Tách giảm sàn/Store/phí, kiểm tổng. |
| V06 | Sửa/dừng voucher khi đã có đơn dùng | MERGED | S38,X13 | Đổi voucher không thay snapshot đơn. |
| V07 | Voucher chỉ dùng được khi nhập mã (không hiện công khai); thu hồi khi mã bị lộ | MERGED | S38,C29 | Nhập mã/dừng mã; không bắt thêm cơ chế phân phối riêng. |
| V08 | Chiến dịch/voucher do sàn tạo | MERGED | C28,S37,A24 | Ưu đãi sàn hiện có; phân bổ chi phí/payout hoãn. |
| V09 | Điều kiện tối thiểu/giảm tối đa với giỏ nhiều Store | MERGED | C28,C29 | Min/cap theo Store và tổng đa Store. |
| V10 | Hoàn tiền một phần của đơn có voucher | DEFERRED | - | Hoàn một phần và phân bổ tiền từng món chưa trong phạm vi. |
| O01 | Đi hết chuỗi đơn: đặt → xác nhận → đóng gói → bàn giao → giao → hoàn tất | MERGED | S25,S26,S27,S31,S32,S33,C37 | Chuỗi CH01 đối chiếu ba vai trò. |
| O02 | Mốc giờ + người thực hiện của từng thay đổi trạng thái | MERGED | N05 | Timeline theo quyền, không đòi raw audit công khai. |
| O03 | Khách muốn đổi số lượng sau khi đặt; Seller/Owner duyệt hoặc từ chối | MERGED | C50 | Chỉ hủy–đặt lại; duyệt sửa lượng/thu chênh bị hoãn. |
| O04 | Seller đề xuất giảm số lượng do thiếu hàng | MERGED | S29,C50 | Thiếu hàng xử lý hủy–đặt lại; không đề xuất sửa lượng trực tiếp. |
| O05 | Đơn chờ xác nhận quá hạn | MERGED | C45,S25 | Review hướng dẫn chờ/quá hạn hiện có; không tự đặt SLA hoặc tự duyệt. |
| O06 | Khách hủy khi Seller đang đóng gói | MERGED | C49,X18 | Hủy cạnh tranh xử lý, đúng version và tồn. |
| O07 | Seller hủy đơn (thiếu hàng, nghi gian lận) | MERGED | S29,C49,N05 | Hủy do thiếu hàng trong quyền hiện có; không tự thêm quyền/tuỳ chọn restock. |
| O08 | Admin hủy đơn | MERGED | A19,A20,A23 | Review hỗ trợ/hủy theo quyền hiện có; không bắt Admin có quyền hủy mới. |
| O09 | Hủy một phần / giao một phần / tách đơn | DEFERRED | - | Partial/tách/giao từng phần chuyển roadmap. |
| O10 | Hai nhân viên cùng thao tác một đơn | MERGED | X18,S26 | Hai nhân viên dùng version, không ghi đè. |
| O11 | Sửa địa chỉ/người nhận sau khi đặt | MERGED | C50 | Không sửa snapshot sau đặt; hướng hủy–đặt lại và giới hạn. |
| O12 | Màn xử lý đơn hiện tồn còn lại và tồn đang giữ của từng phân loại | MERGED | S22,S27,S29 | Đủ dữ liệu lấy hàng và tồn giữ; vòng tránh ghi FRICTION nếu vẫn an toàn. |
| O13 | Hành động hủy không hoàn tác | MERGED | X24,C49 | Kiểm tra hậu quả hủy trước submit, không tự yêu cầu undo giao dịch. |
| R01 | Giao lần đầu thất bại | IN_SCOPE | N01 | Giao thất bại tối thiểu; số lần/hẹn lại cần chính sách dự án. |
| R02 | Giao thất bại lần hai hoặc khách từ chối nhận | MERGED | N01 | Không áp lần giao thứ hai của Shopee. |
| R03 | Nhận hàng hoàn về | IN_SCOPE | N02 | Nhận đúng kiện và tình trạng thực nhận. |
| R04 | Nhập lại kho đúng phân loại; hàng hỏng không nhập | MERGED | N02,N03,N06 | Chỉ tăng tồn bán được sau kiểm hàng có căn cứ. |
| R05 | COD hoàn về | IN_SCOPE | N03 | Không tạo tiền thu/hoàn COD giả; phí hai chiều là câu hỏi chính sách. |
| R06 | Đã thanh toán online rồi hoàn về | IN_SCOPE | N04 | Online paid và refund có trạng thái riêng. |
| R07 | Hoàn về do sai/thiếu địa chỉ | MERGED | N01,C50 | Sai địa chỉ có đường hỗ trợ/hủy–đặt lại theo giai đoạn. |
| R08 | Hàng hoàn về thiếu hoặc hỏng so với lúc gửi | MERGED | N02,A22 | Ghi tình trạng thiếu/hỏng và liên hệ; tự động phân xử hoãn. |
| R09 | Đơn hoàn về trong bộ lọc và báo cáo | MERGED | N03,N04,S42,A24 | Không trộn hoàn về với hoàn tất/tiền thu. |
| R10 | Cảnh báo COD trước khi đóng gói | DEFERRED | - | Chấm rủi ro khách COD/CRM chưa cam kết. |
| K01 | Tạo phiếu nhập: ngày, nhà cung cấp, giá vốn, lô/ghi chú | MERGED | S19,S24 | Chỉ ngày ghi nhận/actor/variant/lượng/lý do; nhà cung cấp/giá vốn/lô hoãn. |
| K02 | Nhập một phần / nhiều đợt cho cùng một lần đặt | DEFERRED | - | Mua hàng và nhận từng phần theo purchase order hoãn. |
| K03 | Sửa ngày/số lượng nhập nhầm; hủy phiếu nhập | MERGED | N07 | Sửa bằng bù, không xoá/sửa im lặng lịch sử; không phiếu mua. |
| K04 | Giá vốn thay đổi theo lần nhập | DEFERRED | - | Giá vốn/kế toán nhập kho hoãn. |
| K05 | Cảnh báo tồn thấp và tìm phân loại cần nhập | MERGED | S23 | Tìm variant cần nhập; ngưỡng/cảnh báo tự động là cải thiện chưa bắt buộc. |
| K06 | Hai khách đặt song song món cuối cùng | MERGED | X14 | Món cuối hai khách, kiểm hậu điều kiện kho. |
| K07 | Kiểm kê chênh lệch | MERGED | S20,X18 | Kiểm kê đang giữ không phá reservation. |
| K08 | Giữ hàng cho đơn chưa thanh toán | MERGED | S22,X10,C49 | Giữ/nhả/hết hạn và chống lặp. |
| K09 | Lịch sử tồn có lý do | MERGED | S24,N06,N08 | Dấu vết kho theo thời gian/actor, không kế thừa giới hạn 90 ngày. |
| K10 | Nhân viên kho chỉ nhập hàng, không đổi giá, không xem doanh thu | MERGED | S40,X16 | Nhân viên kho theo permission, Owner quản quyền. |
| L01 | Thống kê nhập - bán - tồn theo kỳ | IN_SCOPE | N06 | Dùng hai sổ physical/reserved, không công thức nhập−bán±hủy giản lược. |
| L02 | Doanh thu trừ hủy/hoàn | MERGED | S42,A24,N03,N04 | Tách doanh số, thu, hoàn; không lợi nhuận. |
| L03 | Báo cáo hủy/hoàn theo lý do | MERGED | S42,A24 | Truy lý do từ đơn; không bắt dashboard mới nếu truy được. |
| L04 | Log thao tác của nhân viên (giá, tồn, voucher, quyền) | IN_SCOPE | N08 | Owner truy nhân viên đúng Store, bảo vệ thông tin nhạy cảm. |
| L05 | Tra log theo đơn / Store / người dùng | MERGED | A23,N08 | Trace theo scope quyền, không đọc Store khác. |
| L06 | Lọc và xuất báo cáo theo ngày/Store/trạng thái | MERGED | S42,A24 | Giữ lọc kỳ/scope; xuất file mới là cải thiện không bắt buộc. |
| L07 | Đối soát COD theo ngày giao / người thu | MERGED | S33,S42 | Đối chiếu collected theo nguồn; settlement hãng vận chuyển hoãn. |
| L08 | Ngày giờ, múi giờ, định dạng nhất quán | MERGED | N05,A24 | Cùng thời điểm/múi giờ, kỳ UTC+7 không lệch ngày. |
| L09 | Thông báo khi đơn mới, đơn bị hủy, đổi số lượng, đổi trạng thái | MERGED | C48,S25 | Thông báo đúng người/liên kết; không thông báo sửa lượng chưa hỗ trợ. |
| SEC01 | Quên mật khẩu: liên kết hết hạn, dùng lại lần hai, yêu cầu nhiều lần | MERGED | C16 | Token hết hạn/dùng lại, email adapter ghi rõ loại bằng chứng. |
| SEC02 | Nhập sai mật khẩu nhiều lần | MERGED | C15 | Review phản hồi/auth an toàn; không tự đặt ngưỡng khóa. |
| SEC03 | Đăng nhập nhiều thiết bị; đăng xuất tất cả; đổi mật khẩu | MERGED | C17,C18,X17 | Đổi mật khẩu/phiên và isolation; logout-all mới hoãn. |
| SEC04 | Xác minh email/SĐT: mã hết hạn, gửi lại, sai mã, đổi email giữa chừng | MERGED | C15 | Email hiện có; xác minh số điện thoại/đổi email mới hoãn. |
| SEC05 | Nội dung người dùng nhập (tên sản phẩm, ghi chú, đánh giá, tên người nhận) có ký tự đặc biệt, HTML, rất dài | MERGED | X27,X22 | Tên dài/ký tự đặc biệt, rendering an toàn trong luồng đang review. |
| SEC06 | Mở trực tiếp URL/API của vai trò khác | MERGED | X04,S40,A11 | Truy cập trực tiếp vẫn kiểm ownership và quyền hiện hành. |
| SEC07 | Yêu cầu xóa tài khoản/dữ liệu cá nhân (*phạm vi*) | DEFERRED | - | Quy trình xóa tài khoản/pháp lý riêng, không thêm trong audit vận hành này. |
| SEC08 | Dữ liệu cá nhân (SĐT, địa chỉ) hiển thị | MERGED | S28,N08,A11 | Đủ PII để giao đúng; giới hạn vai trò/Store. |
| DIS01 | Tìm có dấu/không dấu, sai chính tả, viết tắt | MERGED | C01,C02,C05 | Tiếng Việt/nhu cầu; fuzzy/viết tắt là cải thiện nếu chưa cam kết. |
| DIS02 | Kết hợp lọc và sắp xếp (giá, danh mục, đánh giá) khi phân trang và quay lại | MERGED | C04,C06,X01,X02 | Bộ lọc/sort/page giữ qua lịch sử. |
| DIS03 | Sản phẩm hết hàng/ngừng bán trong kết quả và trang chi tiết | MERGED | C10 | Hết hàng/ngừng mua được nhận biết. |
| DIS04 | Mở liên kết chia sẻ của sản phẩm đã ẩn/kiểm duyệt/xóa | MERGED | C10,X04 | Deep link unavailable có lỗi và đường quay lại. |
| DIS05 | Danh mục rỗng hoặc rất nhiều mục; phân trang sâu | MERGED | C03,C05,C06 | Danh mục rỗng/phân trang, không coi mỗi viewport là ca. |
| DIS06 | Store bị khóa hoặc tạm nghỉ | MERGED | C10,A08 | Store khóa không nhận đơn mới trái quyền. |
| DIS07 | Yêu thích / đã xem gần đây (*phạm vi*) | MERGED | C06,C07 | Yêu thích/đã xem hiện có kiểm đồng bộ, link CR003/004/019; không ID mới. |
| DIS08 | Gợi ý sản phẩm liên quan | MERGED | C02,C10 | Gợi ý hiện có tôn trọng visibility; không đòi thuật toán mới. |
| DIS09 | Banner/chiến dịch trên trang chủ | OUT_OF_SCOPE | - | CMS banner/chiến dịch ngoài chuỗi vận hành đã chốt. |
| LST01 | Tải ảnh lỗi, quá nặng, sai định dạng | MERGED | S11,S18 | Ảnh lỗi giữ nháp và báo lỗi; không tự đặt limit mới. |
| LST02 | Giá 0, âm, thừa số 0, dấu phân cách VND | MERGED | S10,X24 | Giá hợp lệ và xem lại trước lưu. |
| LST03 | Thuộc tính bắt buộc theo danh mục; đổi danh mục sau khi đã có biến thể | MERGED | S09,A17 | Taxonomy và bảo toàn variant khi sửa. |
| LST04 | Sao chép sản phẩm/biến thể; SKU trùng | MERGED | S10 | Giữ kiểm SKU trùng; chức năng sao chép mới hoãn. |
| LST05 | Nhập hàng loạt từ file lỗi nửa chừng (*phạm vi*) | DEFERRED | - | Import file hàng loạt chưa cần. |
| LST06 | Sản phẩm bị báo cáo/kiểm duyệt | MERGED | S17,A13,A14 | Lý do kiểm duyệt/hỗ trợ, không hệ thống kháng nghị tự động mới. |
| LST07 | Ẩn/xóa/đổi phân loại sản phẩm đang có đơn xử lý | MERGED | S16,C50,N05 | Snapshot đơn không bị sửa theo catalog mới. |
| LST08 | Đổi giá khi khách đã có món trong giỏ hoặc đang thanh toán | MERGED | X13,C36 | Giá đổi cần quote lại và xác nhận rõ. |
| LST09 | Mô tả dài, tiếng Việt có dấu, xuống dòng | MERGED | C07,X27 | Mô tả có dấu/dài/xuống dòng rõ. |
| PAY01 | Thanh toán đơn nhiều Store | MERGED | C35,C38,C53 | Nhóm nhiều Store và trạng thái tiền riêng. |
| PAY02 | Bấm thanh toán hai lần hoặc mở hai tab | MERGED | X11,X10 | Double submit và key/body retry. |
| PAY03 | Đã trả tiền nhưng đóng tab hoặc mất mạng | MERGED | C40,X10 | Không trả lại vì mất phản hồi. |
| PAY04 | Làm tròn tiền: tổng dòng khác tổng đơn; phần giảm chia cho nhiều món | MERGED | C25,C28,C36,A24 | Tiền VND nguyên, tổng khớp nguồn; partial allocation hoãn. |
| PAY05 | Phí giao theo vùng/cân nặng/Store | MERGED | C27,S05 | Chỉ shipping fee Store hiện có; tính vùng/cân nặng mới hoãn. |
| PAY06 | Yêu cầu hóa đơn/chứng từ (*phạm vi*) | DEFERRED | - | Hóa đơn/chứng từ thuế riêng. |
| PAY07 | Hoàn tiền về đâu và khi nào | MERGED | C53,S36,A21 | Refund requested/pending/success và nơi/khi nào theo adapter/chính sách. |
| PAY08 | Đơn giá trị lớn hoặc vượt hạn mức COD | MERGED | C35,C36 | Review hạn mức nếu contract có; không bịa hạn mức COD. |
| PAY09 | Quá hạn thanh toán | MERGED | C41,C49,S22 | Hết hạn, nhả giữ, voucher, callback muộn. |
| SHP01 | Địa chỉ ngoài vùng giao | MERGED | C31,C35 | Chỉ review vùng nếu cấu hình hỗ trợ, không tự đòi carrier integration. |
| SHP02 | Đơn vị hành chính đổi tên hoặc hợp nhất | MERGED | C32,X27 | Địa chỉ snapshot cũ còn đọc được; tự động cập nhật địa giới hoãn. |
| SHP03 | SĐT sai định dạng; người nhận khác người đặt | MERGED | C32,S28 | Validation contact và người nhận đúng. |
| SHP04 | Ghi chú giao hàng và ghi chú gửi Seller | MERGED | S28,S31 | Ghi chú giao nếu hiện có; không bắt thêm field ngoài cam kết. |
| SHP05 | Đơn nhiều kiện hoặc nhiều Store | MERGED | C38,C46 | Tách Store hiện có; nhiều kiện trong một đơn hoãn. |
| SHP06 | Nhập/sửa mã vận đơn khi bàn giao thủ công | MERGED | S31,C46,N05 | Manual delivery đủ thông tin/dấu vết, không bắt hãng vận chuyển. |
| SHP07 | Giao trễ so với cam kết | MERGED | C45,C46 | Biết bước chờ/liên hệ; không bịa cam kết SLA. |
| COM01 | Hỏi Store từ trang sản phẩm hoặc đơn | MERGED | C47,S41 | Đúng participant/Store và ngữ cảnh. |
| COM02 | Tin nhắn spam hoặc ngôn từ xấu | DEFERRED | - | Công cụ chống spam/moderation chat mới hoãn; quyền đọc vẫn trong scope. |
| COM03 | Nhắn Store đang tạm nghỉ hoặc bị khóa | MERGED | C47,A08 | Khóa Store có thông báo và đường hỗ trợ. |
| COM04 | Email/SMS mẫu | MERGED | C15,C48 | Email hiện có và riêng tư; SMS mới hoãn. |
| COM05 | Thông báo trùng, trễ hoặc không đến | MERGED | C48,X21 | Thông báo trễ/lặp không lẫn trạng thái nguồn. |
| COM06 | Hỏi đáp công khai về sản phẩm (*phạm vi*) | OUT_OF_SCOPE | - | Q&A công khai chưa trong phạm vi. |
| REP01 | Điều kiện được đánh giá | MERGED | C54 | Review đúng completed owned item và uniqueness. |
| REP02 | Sửa/xóa đánh giá; ảnh trong đánh giá | MERGED | C54,X18 | Sửa/version hiện có; ảnh/xóa mới hoãn. |
| REP03 | Báo cáo đánh giá; Admin gỡ; Seller phản hồi | MERGED | A13,A15,C54 | Kiểm duyệt hiện có; phản hồi Store/reporting mới hoãn. |
| REP04 | Chỉ số Seller (tỉ lệ hủy, giao trễ, phản hồi) | DEFERRED | - | Điểm hiệu suất Store/Seller mới hoãn. |
| REP05 | Cảnh báo, hạn chế hoặc khóa Store do vi phạm | MERGED | A08,A09,C45 | Khóa/mở đúng scope và đơn dở; hệ thống điểm vi phạm hoãn. |
| REP06 | Gỡ sản phẩm vi phạm và kháng nghị | MERGED | S17,A15,A16 | Ẩn/khôi phục có lý do; kháng nghị tự động hoãn. |
| STO01 | Nộp giấy tờ Store, bị từ chối, nộp lại | MERGED | S01,S02,S03,A04 | Hồ sơ hiện có; không thêm yêu cầu giấy phép mới. |
| STO02 | Đổi thông tin nhận tiền (*phạm vi*) | DEFERRED | - | Thông tin tài khoản nhận payout hoãn. |
| STO03 | Store tạm nghỉ (nghỉ lễ) | DEFERRED | - | Chế độ nghỉ Store mới hoãn; khóa/dừng bán hiện có vẫn kiểm. |
| STO04 | Chuyển quyền Owner hoặc nhân viên rời đi | MERGED | S40,X16 | Giữ nhân viên rời/thu quyền; chuyển Owner mới hoãn. |
| STO05 | Một Owner nhiều Store | DEFERRED | - | Một Owner nhiều Store chưa chốt; vẫn kiểm cách ly hai Store bằng hai tài khoản. |
| STO06 | Chính sách đổi trả và giao hàng của Store | MERGED | C52,S35 | Chính sách đổi trả/giao thủ công rõ trước thực hiện. |
| STO07 | Đóng hoặc xóa Store | DEFERRED | - | Đóng Store và chi trả cuối cùng hoãn; lock tác động đơn trong A08. |
| PRM01 | Giá theo giờ / flash sale | DEFERRED | - | Flash sale chưa trong đợt. |
| PRM02 | Combo hoặc mua kèm | DEFERRED | - | Combo/bundle và tồn thành phần hoãn. |
| PRM03 | Miễn phí giao theo ngưỡng | DEFERRED | - | Free shipping threshold mới hoãn; fee hiện có vẫn review. |
| PRM04 | Giới hạn số lượng mua mỗi khách | MERGED | C23,C29 | Giới hạn contract hiện có; không thêm quota mua mới. |
| PRM05 | Quà tặng kèm | DEFERRED | - | Quà tặng kèm chưa cần. |
| PRM06 | Giá gạch / giá so sánh | MERGED | C11 | Giá hiển thị không gây hiểu nhầm; không đòi compare-price mới. |
| ADM01 | Đổi cấu hình phí vận chuyển, hoa hồng, ngưỡng | MERGED | S05,C27,X13 | Giữ phí Store và snapshot; phí sàn/hoa hồng hoãn. |
| ADM02 | Thao tác hàng loạt (khóa/ẩn) (*phạm vi*) | DEFERRED | - | Bulk moderation/lock mới hoãn. |
| ADM03 | Tài khoản trùng hoặc nghi gian lận | MERGED | A07,A09,A23 | Tìm tài khoản và quyết định có dấu vết; fraud scoring mới hoãn. |
| ADM04 | Cảnh báo bất thường (nhiều đơn COD hủy, đổi giá đột ngột) | DEFERRED | - | Cảnh báo bất thường tự động mới hoãn. |
| ADM05 | Xuất dữ liệu đối soát/pháp lý (*phạm vi*) | DEFERRED | - | Xuất pháp lý/kế toán ngoài đợt. |
| ADM06 | Bảo trì hoặc thông báo hệ thống khi người dùng đang giữa chừng | MERGED | X03,X06,X12 | Đứt quãng có phục hồi; không yêu cầu module thông báo bảo trì mới. |
| SYS01 | Tác vụ nền (hết hạn đơn, nhả hàng, tự hủy) lỗi hoặc chạy hai lần | MERGED | X10,X11,S22,N03 | Worker lặp không nhả/hoàn hai lần. |
| SYS02 | Dữ liệu trễ (cache/đồng bộ): khách thấy còn hàng, Seller đã hết | MERGED | X13,X14 | Cache chậm không cho chốt giá/tồn sai. |
| SYS03 | Sao lưu và khôi phục | OUT_OF_SCOPE | - | Diễn tập disaster recovery riêng; không đánh FAIL vì chưa tổ chức. |
| SYS04 | Tải cao như flash sale | DEFERRED | - | Load test flash sale riêng; cạnh tranh món cuối vẫn X14. |
| SYS05 | Dữ liệu lớn (300 sản phẩm, 12 biến thể, 100 đơn) | MERGED | S09,S13,S25,X28,X29 | 300 sản phẩm/12 variant/100 đơn có tag. |
| SYS06 | Báo cáo quá lớn hoặc quá lâu | MERGED | S42,A24,X07 | Loading/error báo cáo hiện có; không chạy benchmark tải chưa đo. |
| SYS07 | Gửi email/SMS lỗi | MERGED | C15,C48,X08 | Adapter lỗi và delivery không báo thành công giả. |
| SYS08 | Nâng phiên bản hoặc đổi cấu hình khi có đơn đang xử lý | OUT_OF_SCOPE | - | Diễn tập upgrade/deployment ngoài review ứng dụng này. |
| FRD01 | Tạo nhiều tài khoản để lấy voucher khách mới | DEFERRED | - | Hệ thống chống lạm dụng đa tài khoản mới hoãn. |
| FRD02 | Đặt ảo COD hàng loạt | DEFERRED | - | Fraud tooling COD hàng loạt mới hoãn; hủy trong scope. |
| FRD03 | Tự mua đơn hoặc đánh giá giả | MERGED | C54,A13 | Review eligibility/moderation hiện có, không chống thông đồng tự động. |
| FRD04 | Nhập nhầm giá cực thấp, bị mua hàng loạt | MERGED | S10,X24 | Validation và xem lại giá; anomaly engine mới hoãn. |
| FRD05 | Sản phẩm hoặc từ khóa bị cấm | MERGED | A13,A15 | Kiểm duyệt hiện có; tự động phân loại từ cấm chưa bắt buộc. |
| FRD06 | Spam đăng ký Store hoặc đăng sản phẩm | DEFERRED | - | Anti-spam chuyên dụng và bulk cleanup mới hoãn. |
| PUR01 | Đặt hàng nhà cung cấp trước khi hàng về | DEFERRED | - | Purchase order/nhà cung cấp ngoài kho điều chỉnh. |
| PUR02 | Nhận hàng thiếu, thừa hoặc sai mẫu so với phiếu đặt | DEFERRED | - | Purchase order/nhà cung cấp ngoài kho điều chỉnh. |
| PUR03 | Trả hàng lỗi cho nhà cung cấp | DEFERRED | - | Purchase order/nhà cung cấp ngoài kho điều chỉnh. |
| PUR04 | Công nợ nhà cung cấp (*phạm vi*) | DEFERRED | - | Purchase order/nhà cung cấp ngoài kho điều chỉnh. |
| PUR05 | Giá vốn thay đổi giữa các lần nhập | DEFERRED | - | Purchase order/nhà cung cấp ngoài kho điều chỉnh. |
| PUR06 | Nhập nhiều biến thể trong một phiếu (3 màu × 4 size) | DEFERRED | - | Purchase order/nhà cung cấp ngoài kho điều chỉnh. |
| PUR07 | Chi phí nhập kèm (vận chuyển, thuế) phân bổ vào giá vốn (*phạm vi*) | DEFERRED | - | Chi phí mua và phân bổ giá vốn ngoài phạm vi. |
| PUR08 | Gợi ý nhập hàng theo tốc độ bán và tồn an toàn (*phạm vi*) | DEFERRED | - | Dự báo nhập hàng mới hoãn; tìm tồn thấp S23 giữ. |
| INV01 | Hàng hỏng, mất, hết hạn: xuất hủy | MERGED | S21,N07 | Giảm hàng hỏng có lý do; giá trị/giá vốn và expiry mới hoãn. |
| INV02 | Điều chỉnh hoặc kiểm kê khi có hàng đang giữ cho đơn | MERGED | S20,S22 | Điều chỉnh không xâm phạm hàng đang giữ. |
| INV03 | Hết hàng nhưng nhận đặt trước (*phạm vi*) | DEFERRED | - | Preorder và phân bổ đơn chờ mới hoãn. |
| INV04 | Báo khi có hàng lại (*phạm vi*) | DEFERRED | - | Thông báo có hàng lại mới hoãn. |
| INV05 | Tồn nhiều vị trí/kho (*phạm vi*) | OUT_OF_SCOPE | - | Đa kho/vị trí ngoài đợt. |
| INV06 | Phân loại tồn: bán được / đang giữ / hỏng / đang về | MERGED | S22,N02 | Giữ physical/reserved/available và kiểm hàng hoàn; bucket đang về/hỏng mới hoãn. |
| INV07 | Hàng tồn lâu hoặc cận hạn (*phạm vi*) | OUT_OF_SCOPE | - | Hạn dùng/lô và tồn cận hạn ngoài hàng chuẩn. |
| INV08 | Bán combo/bộ trừ tồn thành phần | DEFERRED | - | Bundle và tồn thành phần mới hoãn. |
| INV09 | Đổi SKU hoặc gộp biến thể khi đã có đơn và tồn | MERGED | S15,N05 | Sửa variant giữ lịch sử/snapshot; chức năng gộp variant mới hoãn. |
| INV10 | Kiểm kê định kỳ khi vẫn đang bán | MERGED | S20,X18,N06 | Kiểm kê cạnh tranh đơn giữ theo contract hiện có. |
| ORX01 | Seller tạo đơn hộ khách (khách nhắn tin hoặc gọi) | DEFERRED | - | Tạo đơn hộ/manual order mới hoãn. |
| ORX02 | Đơn nháp / báo giá chờ khách xác nhận (*phạm vi*) | DEFERRED | - | Báo giá/đơn nháp mới hoãn. |
| ORX03 | Đơn COD giữ chờ xác nhận qua điện thoại | MERGED | S26,C45 | Hiểu pending và liên hệ thủ công; không thêm trạng thái gọi xác nhận. |
| ORX04 | Khách đặt trùng hai đơn giống nhau | MERGED | X11,C49 | Idempotency thao tác và hủy đúng đơn; phát hiện giống nhau tự động hoãn. |
| ORX05 | Gộp đơn cùng khách để giao chung (*phạm vi*) | DEFERRED | - | Gộp đơn/giao chung mới hoãn. |
| ORX06 | Đơn quà tặng: người nhận khác, ẩn giá, lời nhắn | DEFERRED | - | Gift wrapping/ẩn giá/lời nhắn mới hoãn; người nhận khác C32 giữ. |
| ORX07 | Món đặt riêng (khắc tên, may đo) | OUT_OF_SCOPE | - | Hàng cá nhân hóa ngoài hàng chuẩn. |
| ORX08 | Giao bù hoặc gửi lại món thiếu/sai | DEFERRED | - | Đơn bù mới/partial fulfillment hoãn; exchange hiện có giữ. |
| ORX09 | Khách chỉ nhận được một phần đơn | DEFERRED | - | Partial delivery/receipt hoãn; ghi nhận vấn đề qua hỗ trợ vẫn A22. |
| ORX10 | Giờ cắt đơn và thời hạn xử lý: đặt sau giờ cắt | DEFERRED | - | Giờ cắt/SLA xử lý mới hoãn, không bịa hạn. |
| FUL01 | Lấy hàng nhiều đơn theo danh sách | MERGED | S27 | Giữ lấy đúng hàng từng đơn; batch picking mới hoãn. |
| FUL02 | In phiếu đóng gói/giao | MERGED | S27,S28,S31 | Thông tin packing đủ; chức năng in mới không bắt buộc. |
| FUL03 | Chọn đơn vị vận chuyển và nhập mã vận đơn thủ công | MERGED | S31,C46 | Giao thủ công đủ dấu vết; carrier adapter mới hoãn. |
| FUL04 | Phí ship thực tế khác phí thu khách | DEFERRED | - | Kế toán chênh phí carrier hoãn; phí khách và snapshot giữ. |
| FUL05 | Tiền thu hộ COD và thời điểm nhận từ đơn vị vận chuyển | MERGED | S33,S42 | Giữ xác nhận tiền thực thu; đối soát carrier/payout hoãn. |
| FUL06 | Đơn gấp hoặc ưu tiên | DEFERRED | - | Ưu tiên gấp mới hoãn; hàng đợi hiện có giữ. |
| FUL07 | Hàng quá khổ hoặc quá cân | OUT_OF_SCOPE | - | Hàng quá khổ/cân nặng ngoài hàng chuẩn. |
| FUL08 | Bàn giao theo lô cho đơn vị vận chuyển | DEFERRED | - | Bàn giao theo lô/biên bản tự động mới hoãn. |
| FUL09 | Đơn quá hạn chưa bàn giao | MERGED | S25,C45 | Nhận ra đơn chờ và liên hệ; không bịa SLA mới. |
| AFT01 | Đổi size cùng sản phẩm còn hàng | MERGED | C51,S35,S36 | Exchange hiện có, không mặc định partial/khác giá. |
| AFT02 | Đổi sang món khác giá chênh lệch | DEFERRED | - | Đổi khác giá/thu thêm/hoàn chênh hoãn. |
| AFT03 | Đổi hàng nhưng món mới đã hết | MERGED | S36,C53 | Hết hàng đổi phải chỉ đường hỗ trợ/chính sách, không báo hoàn tất giả. |
| AFT04 | Hoàn tiền một phần (hàng lỗi nhẹ, thiếu phụ kiện) | DEFERRED | - | Hoàn một phần chưa trong phạm vi. |
| AFT05 | Hoàn bằng tín dụng Store thay tiền (*phạm vi*) | DEFERRED | - | Store credit/ví hoãn. |
| AFT06 | Từ chối trả hàng (quá hạn, đã dùng, thiếu tem) | MERGED | C51,S35 | Từ chối có lý do; hạn/điều kiện cần chủ sản phẩm chốt. |
| AFT07 | Khách gửi trả sai kiện hoặc thiếu món | MERGED | N02,S35 | Ghi tình trạng thực nhận; không tự hoàn tồn mọi hàng. |
| AFT08 | Hoàn tiền thất bại hoặc bị trả lại | MERGED | C53,S36,A21 | Lỗi/UNKNOWN giữ trạng thái và đường recovery. |
| AFT09 | Bảo hành hoặc sửa chữa (*phạm vi*) | OUT_OF_SCOPE | - | Bảo hành/sửa chữa chuyên biệt ngoài đợt. |
| AFT10 | Hạn đổi trả tính từ ngày giao hay ngày đặt | MERGED | C51,C52 | Câu hỏi cửa sổ đổi trả, không nhập hạn từ bên thứ ba. |
| AFT11 | Khiếu nại ngân hàng hoặc chargeback (*phạm vi*) | DEFERRED | - | Chargeback ngân hàng/giữ tiền tự động hoãn. |
| AFT12 | Đổi/trả đơn có voucher | MERGED | C53,C28 | Refund toàn đơn có voucher trong contract; partial allocation hoãn. |
| FIN01 | Doanh thu tạm tính và doanh thu đã đối soát | MERGED | S42,A24 | Tách order value/collected/refunded; settlement hoãn. |
| FIN02 | Đối soát COD theo ngày hoặc theo lô vận chuyển | DEFERRED | - | Đối soát COD hãng vận chuyển/ca mới hoãn; tổng collected vẫn S42. |
| FIN03 | Tiền COD thực nhận khác giá trị đơn | MERGED | S33,A20 | Thu COD sai số tiền bị chặn/giải thích; sổ thiếu-thừa mới hoãn. |
| FIN04 | Đặt cọc, thanh toán một phần, ghi nợ (*phạm vi*) | DEFERRED | - | Deposit/partial payment/debt hoãn. |
| FIN05 | Phí cổng thanh toán, phí sàn, hoa hồng trừ vào doanh thu | DEFERRED | - | Phí cổng/phí sàn/hoa hồng chưa trong phạm vi. |
| FIN06 | Chi phí khuyến mãi do Seller chịu | DEFERRED | - | Báo cáo lợi nhuận/chi phí marketing hoãn. |
| FIN07 | Lãi gộp theo đơn và sản phẩm | DEFERRED | - | Giá vốn/lãi gộp hoãn. |
| FIN08 | Sổ thu chi của Store (*phạm vi*) | DEFERRED | - | Sổ thu chi/kế toán hoãn. |
| FIN09 | Chốt ngày hoặc chốt ca | DEFERRED | - | Khóa sổ/chốt ca mới hoãn. |
| FIN10 | Số dư Seller âm do hoàn tiền sau khi đã rút | DEFERRED | - | Số dư/rút tiền/payout hoãn. |
| FIN11 | Thuế và hóa đơn bán hàng (*phạm vi*) | OUT_OF_SCOPE | - | Kê khai thuế/hóa đơn cần dự án riêng. |
| FIN12 | Hoàn tiền sau khi đơn đã đối soát | DEFERRED | - | Settlement kỳ sau/payout hoãn; refund đơn vẫn C53. |
| FIN13 | Phí giao khách trả khác phí đơn vị vận chuyển tính | DEFERRED | - | Kế toán chênh phí carrier ngoài đợt. |
| FIN14 | Xuất bảng đối soát cho kế toán (*phạm vi*) | DEFERRED | - | Xuất đối soát kế toán mới hoãn. |
| CRM01 | Danh sách khách đã mua: lịch sử đơn, tổng chi | DEFERRED | - | CRM khách/tổng chi mới hoãn; ownership đơn vẫn kiểm. |
| CRM02 | Gắn nhóm khách (VIP, hay hoàn) và gửi ưu đãi cho nhóm | DEFERRED | - | VIP/nhắm ưu đãi nhóm khách hoãn. |
| CRM03 | Chặn khách hay bom hàng | DEFERRED | - | Blacklist/risk customer mới hoãn. |
| CRM04 | Thống kê khách mới và khách quay lại | DEFERRED | - | Dashboard khách mới/quay lại mới hoãn. |
| CRM05 | Nhắc giỏ hàng bỏ quên (*phạm vi*) | DEFERRED | - | Abandoned cart marketing hoãn. |
| CRM06 | Điểm thưởng/thành viên (*phạm vi*) | DEFERRED | - | Loyalty/điểm thưởng hoãn. |
| CRM07 | Ghi chú nội bộ về khách hoặc đơn | DEFERRED | - | CRM note nội bộ mới hoãn; note xử lý trả hiện có giữ. |
| CRM08 | Khách không muốn nhận thông báo khuyến mãi (*phạm vi*) | DEFERRED | - | Marketing opt-out mới hoãn; settings consent hiện có vẫn kiểm. |
| CRM09 | Khảo sát sau mua (*phạm vi*) | DEFERRED | - | Khảo sát/CRM mới hoãn. |
| TEA01 | Phân đơn cho nhân viên đóng gói | DEFERRED | - | Assignment đóng gói mới hoãn; quyền Store vẫn S40. |
| TEA02 | Nhân viên nghỉ giữa chừng: chuyển việc | MERGED | S40,X16,N05 | Thu quyền không mất đơn đang dở; assignment transfer mới hoãn. |
| TEA03 | Bàn giao ca: tồn, đơn dở, tiền COD | DEFERRED | - | Bàn giao/chốt ca nghiệp vụ mới hoãn. |
| TEA04 | Hiệu suất xử lý theo nhân viên (*phạm vi*) | DEFERRED | - | Đo hiệu suất nhân viên mới hoãn. |
| TEA05 | Hủy, hoàn, đổi giá vượt mức tiền cần Owner duyệt | DEFERRED | - | Approval threshold theo số tiền mới hoãn. |
| TEA06 | Mời nhân viên và gán vai trò kho / bán hàng / kế toán | MERGED | S39,S40 | Mời nhân viên SELLER và quyền công việc hiện có, không tự thêm role kế toán. |
| TEA07 | Nhật ký ai xử lý đơn nào, khi nào | MERGED | N05,N08 | Actor/time theo đơn/nhân viên và scope. |
| RPT01 | Sản phẩm bán chạy và tồn chậm theo kỳ | MERGED | S42,N06 | Đối chiếu bán/tồn theo kỳ từ gốc; dashboard tồn chậm mới hoãn. |
| RPT02 | Tỉ lệ hủy/hoàn theo sản phẩm, size, nguyên nhân | MERGED | S42,A24 | Giải thích hủy/hoàn từ gốc; phân tích nâng cao mới hoãn. |
| RPT03 | Doanh thu theo danh mục, Store, ngày, phương thức thanh toán | MERGED | S42,A24 | Kỳ/scope/method đúng theo dữ liệu hiện có; không bắt mọi chiều BI mới. |
| RPT04 | So sánh kỳ này với kỳ trước | MERGED | S42,A24 | Kỳ so sánh hiện có không lệch timezone; so sánh mới là cải thiện. |
| RPT05 | Báo cáo đơn theo trạng thái (đang xử lý, chờ bàn giao, quá hạn) | MERGED | S25,C45 | Tìm đơn cần làm hiện tại; SLA dashboard mới hoãn. |
| RPT06 | Báo cáo tồn: giá trị, tồn thấp, tồn âm | MERGED | N06,S23 | Số lượng khớp, không giá trị theo cost/lợi nhuận. |
| RPT07 | Báo cáo voucher: lượt dùng, chi phí, doanh thu kéo theo | MERGED | S37,S42 | Lượt dùng/giảm từ đơn gốc, không tự đòi marketing ROI. |
| RPT08 | Dự báo nhu cầu nhập (*phạm vi*) | DEFERRED | - | Dự báo nhập hàng mới hoãn. |
| RPT09 | Truy ngược báo cáo về đơn gốc khi nghi sai | MERGED | S42,A24 | Có thể truy từ báo cáo về dữ liệu gốc, ghi workaround nếu phải mở nơi khác. |
| PLT01 | Hoa hồng theo danh mục hoặc Store; đổi từ ngày nào | DEFERRED | - | Hoa hồng/phí sàn hoãn. |
| PLT02 | Lịch thanh toán cho Seller; giữ tiền khi có tranh chấp (*phạm vi*) | DEFERRED | - | Payout/giữ tiền hoãn. |
| PLT03 | Phạt hoặc trừ điểm Seller vi phạm (*phạm vi*) | DEFERRED | - | Điểm phạt/tài chính chế tài mới hoãn. |
| PLT04 | Duyệt Seller tham gia chiến dịch | DEFERRED | - | Đăng ký chiến dịch marketing mới hoãn. |
| PLT05 | Ngân sách voucher sàn: ai chịu, hết ngân sách thì sao | MERGED | C29,S37 | Voucher usage/cap hiện có; ngân sách campaign và phân bổ payout hoãn. |
| PLT06 | Báo cáo tổng giá trị đơn, hoa hồng, hoàn tiền toàn sàn | MERGED | A24 | Giữ giá trị đơn/hoàn tiền; commission/payout hoãn. |
| PLT07 | Chính sách đổi trả mặc định của sàn và ngoại lệ theo Store | MERGED | C51,C52,S35 | Chính sách trả trong phạm vi cần chốt; policy engine ngoại lệ mới hoãn. |
| PLT08 | Seller ngừng hoạt động còn đơn và tiền (liên quan STO07) | DEFERRED | - | Offboarding/settlement cuối cùng hoãn; khóa hiện tại vẫn A08. |
| PLT09 | Đối soát với cổng thanh toán hoặc đơn vị vận chuyển (*phạm vi*) | DEFERRED | - | Đối soát cổng/carrier tự động mới hoãn; payment recovery hiện có vẫn C40. |
| PLT10 | Duyệt lại khi đổi thông tin quan trọng của Store | DEFERRED | - | Workflow duyệt lại hồ sơ mới hoãn. |
| PRC01 | Giá sỉ theo bậc số lượng | OUT_OF_SCOPE | - | Giá sỉ/bậc số lượng ngoài marketplace hàng chuẩn. |
| PRC02 | Số lượng mua tối thiểu và bội số đóng gói | OUT_OF_SCOPE | - | MOQ/bội đóng gói riêng ngoài phạm vi; quantity min1/maxstock vẫn C23. |
| PRC03 | Nhập theo thùng, bán theo lẻ (quy đổi đơn vị tính) | OUT_OF_SCOPE | - | Quy đổi đơn vị thùng/lẻ ngoài phạm vi. |
| PRC04 | Hàng bán theo cân, khối lượng thực giao khác lượng đặt (*phạm vi*) | OUT_OF_SCOPE | - | Hàng cân thực giao/thu chênh ngoài hàng chuẩn. |
| PRC05 | Giá theo nhóm khách (khách sỉ, VIP) | DEFERRED | - | Giá theo nhóm/VIP hoãn. |
| PRC06 | Đổi giá hàng loạt (ví dụ tăng 5% toàn Store) | DEFERRED | - | Bulk price editor mới hoãn; single variant và snapshot S15 giữ. |
| PRC07 | Giá bán hoặc giá sau voucher thấp hơn giá vốn | DEFERRED | - | So sánh giá vốn cần ERP/kế toán đã hoãn. |
| PRC08 | Phụ phí (đóng gói, bảo hiểm, thu hộ COD) | DEFERRED | - | Phụ phí đóng gói/bảo hiểm/COD mới hoãn; tổng quote hiện có vẫn review. |
| PRC09 | Giá đã gồm hay chưa gồm thuế (*phạm vi*) | OUT_OF_SCOPE | - | Thuế/hóa đơn cần scope riêng. |
| PRD01 | Hàng có lô và hạn dùng: bán lô cũ trước (*phạm vi*) | OUT_OF_SCOPE | - | Lô/hạn dùng/hàng đặc thù ngoài đợt. |
| PRD02 | Hàng dễ vỡ hoặc cần đóng gói đặc biệt | OUT_OF_SCOPE | - | Hàng đặc biệt và phụ phí riêng ngoài đợt. |
| PRD03 | Hàng lạnh hoặc hạn giao ngắn (*phạm vi*) | OUT_OF_SCOPE | - | Chuỗi lạnh/hạn giao hàng đặc thù ngoài đợt. |
| PRD04 | Hàng số hoặc dịch vụ không giao vật lý (*phạm vi*) | OUT_OF_SCOPE | - | Hàng số/dịch vụ ngoài hàng vật lý chuẩn. |
| PRD05 | Thẻ quà tặng, mã nạp (*phạm vi*) | OUT_OF_SCOPE | - | Gift card/mã nạp ngoài scope. |
| PRD06 | Hàng ký gửi của người khác (*phạm vi*) | OUT_OF_SCOPE | - | Ký gửi/settlement chủ hàng ngoài scope. |
| PRD07 | Hàng hạn chế (độ tuổi, giấy phép) (*phạm vi*) | OUT_OF_SCOPE | - | Hàng hạn chế/giấy phép cần scope riêng. |
| PRD08 | Một sản phẩm giao nhiều kiện | DEFERRED | - | Multi-parcel fulfillment mới hoãn. |
| PRD09 | Hết hàng, Seller đề xuất món tương đương | MERGED | S29,C50 | Thiếu hàng hủy–đặt lại, không tự thay món/giá trong đơn. |
| CHN01 | Bán tại cửa hàng chung tồn với online (*phạm vi*) | OUT_OF_SCOPE | - | POS/đa kênh ngoài đợt. |
| CHN02 | Đồng bộ tồn với sàn khác (*phạm vi*) | OUT_OF_SCOPE | - | Đồng bộ sàn khác ngoài đợt. |
| CHN03 | Dropship: nhà cung cấp gửi thẳng cho khách (*phạm vi*) | OUT_OF_SCOPE | - | Dropship/nhà cung cấp ngoài đợt. |
| CHN04 | Lấy hàng từ Store khác trong sàn (*phạm vi*) | OUT_OF_SCOPE | - | Liên Store/điều chuyển/đối soát ngoài đợt. |
| CHN05 | Ủy quyền thương hiệu, hàng chính hãng (*phạm vi*) | OUT_OF_SCOPE | - | Ủy quyền thương hiệu chuyên biệt ngoài đợt. |
| CHN06 | Nhập tay đơn nhận qua tin nhắn hoặc mạng xã hội | DEFERRED | - | Manual order/channel source mới hoãn. |
| CHN07 | Chốt đơn nhanh khi livestream (*phạm vi*) | OUT_OF_SCOPE | - | Livestream/đa kênh ngoài đợt. |
| CHN08 | Bán sỉ doanh nghiệp: báo giá, hợp đồng, công nợ (*phạm vi*) | OUT_OF_SCOPE | - | B2B báo giá/hợp đồng/công nợ ngoài đợt. |
| SEA01 | Chuẩn bị tồn trước sự kiện lớn | MERGED | S23,N06 | Giữ xem tồn và nhập hiện có; event forecasting mới hoãn. |
| SEA02 | Khóa chỉnh giá và tồn trong sự kiện | MERGED | S40,X16,N08 | Quyền sửa và audit hiện có; khóa theo event mới hoãn. |
| SEA03 | Đơn đổ về vượt khả năng xử lý | MERGED | S25,S30 | Giữ hàng đợi/tìm đơn; capacity/SLA/priority mới hoãn. |
| SEA04 | Tạm dừng nhận đơn (nghỉ Tết, thiếu nhân lực) | DEFERRED | - | Holiday/vacation nhận đơn mới hoãn. |
| SEA05 | Báo giao trễ do cao điểm | MERGED | C45,C47 | Biết tình trạng/liên hệ; ETA/SLA tự động mới hoãn. |
| SEA06 | Sau sự kiện: gỡ banner và giá khuyến mãi | DEFERRED | - | Campaign banner/flash pricing lifecycle mới hoãn. |
| SEA07 | Khu vực ngưng giao do thiên tai hoặc sự cố vận chuyển | DEFERRED | - | Geo delivery disruption rule engine mới hoãn. |
| SEA08 | Hoàn đơn tăng bất thường sau sự kiện | MERGED | A24,S42 | Truy nguyên đơn hoàn từ nguồn; anomaly alert tự động hoãn. |
| DLV01 | Chọn ngày hoặc khung giờ giao (*phạm vi*) | DEFERRED | - | Scheduled delivery slot mới hoãn. |
| DLV02 | Nhận tại cửa hàng (*phạm vi*) | DEFERRED | - | Pickup mã nhận hàng mới hoãn. |
| DLV03 | Giao nhiều địa chỉ trong một đơn (*phạm vi*) | DEFERRED | - | Nhiều địa chỉ trong đơn mới hoãn. |
| DLV04 | Đổi địa chỉ khi hàng đã giao cho vận chuyển | MERGED | C50,C46 | Không sửa snapshot sau bàn giao; chỉ đường hỗ trợ phù hợp. |
| DLV05 | Hủy khi hàng đã giao cho vận chuyển | MERGED | C49,N01,N02 | Giới hạn hủy sau handoff và xử lý hoàn về, không hứa chặn carrier tự động. |
| DLV06 | Trả một phần làm đơn tụt dưới ngưỡng miễn phí giao | DEFERRED | - | Partial return/free-ship recalculation hoãn. |
| DLV07 | Hẹn giao lại theo yêu cầu khách | MERGED | N01,C47 | Ghi vấn đề và liên hệ theo policy; schedule/retry tự động hoãn. |
| DLV08 | Giao tại điểm nhận hộ (*phạm vi*) | OUT_OF_SCOPE | - | Điểm nhận hộ chuyên biệt ngoài phạm vi. |
| MOD01 | Thêm món vào đơn đã đặt (chưa giao) | MERGED | C50 | Không thêm món trực tiếp; review hủy–đặt lại và giới hạn. |
| MOD02 | Đổi phương thức thanh toán (COD sang online) | MERGED | C50,C35 | Không đổi method của đơn đã chốt; hủy–đặt lại nếu hợp lệ. |
| MOD03 | Thanh toán bằng nhiều phương thức (*phạm vi*) | DEFERRED | - | Split tender trong một đơn hoãn; per-Store method C35 giữ. |
| MOD04 | Thanh toán một phần rồi bù (*phạm vi*) | DEFERRED | - | Thanh toán một phần/deposit hoãn. |
| MOD05 | Thêm hoặc bớt món sau khi đã trả online | MERGED | C50,C53 | Hủy–đặt lại và refund toàn đơn; sửa món/thu chênh hoãn. |
| MOD06 | Chuyển đơn sang Store khác khi hết hàng (*phạm vi*) | DEFERRED | - | Chuyển Store trong đơn mới hoãn. |
| MOD07 | Tách đơn nhiều món thành hai lần giao | DEFERRED | - | Tách lần giao/partial fulfillment hoãn. |
| MOD08 | Đổi người nhận sau khi đã thanh toán | MERGED | C50 | Không sửa người nhận trong đơn đã chốt; đường hủy–đặt lại/hỗ trợ. |
| MOD09 | Đặt hộ nhầm rồi hủy bản sai | MERGED | C49,X10 | Hủy đúng đơn và nhả giữ idempotent. |
| CLM01 | Hàng đến nơi bị hư hoặc vỡ | MERGED | C51,S35,A22 | Ghi vấn đề/liên hệ/trả hiện có; bồi thường carrier tự động hoãn. |
| CLM02 | Mất hàng trong vận chuyển | MERGED | N01,A22 | Ghi mất hàng và đường hỗ trợ; tự động đòi bồi thường hoãn. |
| CLM03 | Giao nhầm người hoặc nhận hộ sai | MERGED | C46,C47,A22 | Ghi vụ việc và ngữ cảnh; tự động phân xử hoãn. |
| CLM04 | Vận chuyển báo đã giao nhưng khách nói chưa nhận | MERGED | N05,A22 | Đối chiếu timeline và tiếp nhận vụ việc, không bịa bên quyết định. |
| CLM05 | Hồ sơ yêu cầu bồi thường vận chuyển (*phạm vi*) | DEFERRED | - | Hồ sơ carrier claim tự động hoãn. |
| CLM06 | Bảo hiểm hàng hóa (*phạm vi*) | DEFERRED | - | Bảo hiểm/chi trả hoãn. |
| CLM07 | Thiếu hàng trong kiện khi nhận | MERGED | C47,C51,A22 | Đường liên hệ đủ ngữ cảnh; partial remedy mới hoãn. |
| CLM08 | Giao đúng nhưng quá trễ, khách muốn hủy | MERGED | C49,N01 | Giới hạn hủy và policy hoàn về, không nhập luật bên thứ ba. |
| LIF01 | Hẹn ngày mở bán sản phẩm mới | DEFERRED | - | Scheduled publish mới hoãn. |
| LIF02 | Ngừng kinh doanh: bán hết tồn rồi ẩn | MERGED | S16,N05 | Dừng/ẩn giữ snapshot và xử lý đơn đang có. |
| LIF03 | Thanh lý, xả kho | DEFERRED | - | Chiến dịch clearance mới hoãn; sửa giá hiện có giữ. |
| LIF04 | Thay mẫu thế hệ mới | DEFERRED | - | Chuyển thế hệ/gộp review mới hoãn. |
| LIF05 | Bán lại hàng trả đã mở hộp với giá thấp | OUT_OF_SCOPE | - | Open-box resale/condition pricing chuyên biệt ngoài đợt. |
| LIF06 | Một biến thể ngừng (hết màu) khi sản phẩm vẫn bán | MERGED | C10,S15 | Variant ngừng không đổi snapshot đơn cũ. |
| LIF07 | Xuất hàng mẫu, hàng chụp ảnh, hàng tặng (không bán) | MERGED | S21,S24 | Điều chỉnh giảm có lý do, không tính doanh thu giả. |
| ONB01 | Nhập tồn đầu kỳ cho Store mới | MERGED | S19,N07 | Tồn đầu bằng adjustment có lý do; bulk mới hoãn. |
| ONB02 | Nhập giá vốn ban đầu | DEFERRED | - | Giá vốn đầu kỳ hoãn. |
| ONB03 | Chuyển dữ liệu từ nơi khác bằng file (*phạm vi*) | DEFERRED | - | Migration/import file mới hoãn. |
| ONB04 | Đóng sổ cuối tháng: đối chiếu tồn, doanh thu, COD | MERGED | N06,S42 | Giữ đối chiếu kỳ; khóa sổ kế toán mới hoãn. |
| ONB05 | Hao hụt cuối kỳ cần giải thích | MERGED | N06,S24 | Giải thích hao hụt bằng biến động gốc. |
| ONB06 | Tạo Store thứ hai dựa trên Store đầu (*phạm vi*) | DEFERRED | - | Clone Store/multi-Store-owner mới hoãn. |
| ONB07 | Danh sách việc cần làm để bắt đầu bán | MERGED | S06,S12 | Biết điều kiện để bán thực sự, không yêu cầu wizard mới nếu đã rõ. |
| SUB01 | Phí thuê bao hoặc gói dịch vụ (*phạm vi*) | OUT_OF_SCOPE | - | Thuê bao/gói dịch vụ ngoài đợt. |
| SUB02 | Quảng cáo trong sàn: ví, ngân sách, hết tiền (*phạm vi*) | OUT_OF_SCOPE | - | Ví quảng cáo/ngân sách ngoài đợt. |
| SUB03 | Hoàn tiền quảng cáo khi đơn bị hủy (*phạm vi*) | OUT_OF_SCOPE | - | Advertising refund ngoài đợt. |
| SUB04 | Đổi chính sách đổi trả khi có đơn đang chạy | MERGED | C51,C52 | Chính sách áp dụng đơn cũ/mới cần rõ; policy version engine mới hoãn. |
| SUB05 | Đổi biểu phí hoặc hoa hồng giữa kỳ | DEFERRED | - | Hoa hồng/biểu phí sàn hoãn. |
| SUB06 | Đổi điều khoản Seller, yêu cầu chấp nhận lại | DEFERRED | - | Reaccept terms workflow mới hoãn. |
| SUB07 | Seller vượt mức vi phạm chuyển sang hạn chế (*phạm vi*) | DEFERRED | - | Điểm vi phạm/kháng nghị tự động mới hoãn. |
| SUB08 | Dùng thử gói rồi chuyển đổi (*phạm vi*) | OUT_OF_SCOPE | - | Trial/subscription ngoài đợt. |
| SUB09 | Thông báo thay đổi chính sách cho khách và Seller | MERGED | C48 | Thông báo đúng người hiện có; policy-read-ack mới hoãn. |
| ALC01 | Thiếu hàng cho nhiều đơn: đơn nào được giữ trước | MERGED | X14,S29 | Reservation cạnh tranh không oversell; ưu tiên ngoài first successful chưa tự đặt. |
| ALC02 | Đơn chờ hàng về (đặt trước hoặc thiếu hàng) | DEFERRED | - | Backorder/preorder chưa hỗ trợ trong scope. |
| ALC03 | Giữ hàng cho khách quen hoặc đơn lớn (*phạm vi*) | DEFERRED | - | Giữ hàng riêng khách quen/đơn lớn mới hoãn. |
| ALC04 | Hàng về chỉ đủ cho một phần đơn chờ | DEFERRED | - | Phân bổ hàng cho backorder mới hoãn. |
| ALC05 | Gỡ giữ hàng thủ công | MERGED | C49,S24 | Nhả qua hủy/hết hạn có dấu vết; nút gỡ giữ tùy ý mới hoãn. |
| ALC06 | Tồn đệm an toàn (giữ lại không bán) | DEFERRED | - | Safety stock buffer mới hoãn. |
