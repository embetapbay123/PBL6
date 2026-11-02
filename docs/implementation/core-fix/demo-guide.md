# Demo marketplace

**Đủ để demo trên stack riêng. Dừng mở rộng sửa/kiểm thử theo mục tiêu mới: “dừng khi đã đủ để demo”.** Mã ứng dụng `Node61c/AI56/frontend62`; đợt63chỉ thêm test/hồ sơ và bộ dữ liệu demo riêng. Frontend: [mở ứng dụng](http://127.0.0.1:3109). Gateway `127.0.0.1:18080`; Docker project `pbl6-fe-verify`.

## Đăng nhập

Mật khẩu của các tài khoản dưới đây là **giá trị `SEED_PASSWORD` đang có trong `infrastructure/.env`**. Không sao chép mật khẩu/token vào tài liệu hoặc artifact. Dùng ba cửa sổ/profile riêng để giữ ba vai trò đồng thời; nếu dùng cùng cửa sổ thì đăng xuất trước khi đổi tài khoản.

| Vai trò | Email |
|---|---|
| Customer | `coredemo-1793626417598.buyer@pbl6.test` |
| STORE_OWNER | `coredemo-1793626417598.owner@pbl6.test` |
| Admin | `admin@pbl6.test` |

SELLER là nhân viên cửa hàng, không phải chủ Store. Bộ này dùng Owner để có quyền xử lý đơn và xác nhận COD. Tài khoản seed `customer1@pbl6.test`/`owner@pbl6.test` vẫn giữ nguyên, nhưng chưa đủ cấu hình để mua ngay; dùng bộ riêng bên trên.

## Kịch bản chính khoảng5–10phút

1. **Customer:** vào Trang chủ, tìm `Áo sơ mi Oxford`. Mở `Áo sơ mi Oxford · Demo`; chọn rõ màu/cỡ, lượng1, Mua ngay. Có4phân loại Trắng/Xanh × M/L, đơn giá150000đ. Địa chỉ giao đã có sẵn.
2. **Checkout:** giữ COD. Nhập voucher **`DEMO6419068`** tại Store May Việt, chọn Áp dụng ưu đãi. Kiểm hàng150000−giảm10000+giao20000=**160000đ**, địa chỉ và màu/cỡ trước xác nhận. Mã voucher chính xác được đối chiếu lại trong `artifacts/core-fix/fix-20261030T100153Z/demo-fixture63.json`; không tự dùng mã khác nếu tài liệu được tái tạo.
3. **Owner:** Menu tài khoản→Store Portal→Đơn hàng Store. Tìm mã đơn mới, Xem đơn; kiểm phiếu lấy hàng, người nhận/điện thoại/địa chỉ. Lần lượt Xác nhận đơn→Bắt đầu chuẩn bị hàng→Đã kiểm đủ hàng và bàn giao.
4. **COD/hoàn tất:** tick xác nhận nhận đủ160000đ, Ghi nhận đã thu tiền, rồi Xác nhận giao thành công và hoàn tất. Đây là thao tác mô phỏng buổi demo; không phải ngân hàng xác minh hoặc tiền mặt thật.
5. **Customer:** Menu tài khoản→Đơn hàng, mở chi tiết, dùng Làm mới đơn nếu cần. Thấy Hoàn tất/Đã thu; có thể viết đánh giá hoặc đi theo yêu cầu đổi/trả. Có sẵn địa chỉ nhận trả và chính sách7×24giờ cho đơn mới.
6. **Owner/Admin:** Owner xem Báo cáo/nhật ký; Admin mở Admin Portal để xem đúng Store/đơn và trạng thái tiền. Không dùng số tiền bằng nhau để xác định đơn; dùng mã đơn và thông tin nguồn.

Nếu muốn demo sau bán, dùng một đơn đã hoàn tất: Customer yêu cầuEXCHANGE→Ownerduyệt với trách nhiệm/phí→nhập biên bản thực nhận→chọn phân loại cùng sản phẩm/cùng giá→xuất hàng đổi→Customerxác nhận. Hoặc Stoređề nghị hoàn đủ tiền và **Customerđồng ý**; Ownerxác nhận hoànCODvới mãbiênnhận/thờigian/ngườinhận/đủtiền rồi kết thúc. Không có hoàn một phần hoặc đổi khác giá. Có thể dùng đơn smoke bên dưới để không phải tạo lại từ đầu.

## Những gì đã kiểm thật

- Sáu chuỗi vận hành trên cùng source62đãPASS: CODnhiềuStore, hủy cạnh tranh, onlinekhôngrõkếtquả/callbackmuộn, giao thấtbại/hoànvề, đổi/trả, khođanggiữ vàđiềuchỉnhbù. Provideronline là adapter kiểmthử, không chuyển tiền thật.
- `demo-runtime63.json`: **UI Customer→Owner→CODhoàn tất PASS**, đúngTrắng/M,1món, voucher/tổng160000đ. Đơn smoke: `ffcbead1-d4b1-434b-9b22-30e7f8bb65cd` (mã chính xác đối chiếu `demo-fixture63.json`).
- `demo-final-state63.json`: StoreACTIVE,2tài khoản đãxácminh, Customercó1địa chỉ,4variantkhớpledger/reserved0; tồn9/10/10/10 sau smoke, đúng1khoảnthu160000/hoàn0. Writer/workerđangbật. Đơn/tồn/tiền được tạo qua UI/API, SQLchỉđọc đốichiếu.
- 52findinggốc và24CFđã có bằng chứng sửa theo từng phạm vi. Hồi quydesktop397case:392PASS/5SKIPPED sau các rerun được ghi rõ;12probe startup mới qua. Không lấy sốtestlàm sốnhiệm vụ/ngườidùngđạt.

## Giới hạn khi trình diễn

Dữ liệu là bộ mô phỏng riêng, không giao hàng/tiền thật. Không cần demo mobile theo yêu cầu. 158nhiệm vụ đã có audit và lịch sử; chỉ33mục tiêu được walkthroughruntime mới trong đợt cuối,122chưa lặp trọn mới, screenreader/nativezoom chưa thựcthi, nghiên cứu người thật cònpending. Không gọi đây là nghiệm thu production.

Có3lần trắng lúc startup ở đợt test lớn, chưa xác định nguyên nhân;3rerunriêng và12probe mới đềuqua. Nếu tab chưa render trong buổi demo, tải lại trang và đăng nhập lại khi cần; không nhấn xác nhận tiền/đặt hàng lần nữa khi chưa rõ kết quả. Dùng Đọc lại/Làm mới để xem server trước. Đây là ghi nhận giới hạn môi trường hiện tại, không tuyên bố đã sửa một nguyên nhân chưa biết.

Giữ stack đang chạy. Bộ `coredemo-1793626417598` được giữACTIVEcó chủ ý để trình diễn; không thay Store/dữ liệu seed chung. Sau khi buổi demo kết thúc, Ownerdừng sảnphẩm vàAdminkhóa đúngStoretag này; giữ lịch sử giao dịch/audit. Không xóa DB hoặc flushRedis. Xem [audit/giới hạn](wave-37-coverage-audit.md) và [sáu chuỗi](wave-36-final-chains.md) khi cần bằng chứng chi tiết.
