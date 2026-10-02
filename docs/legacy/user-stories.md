# User Story

Nguồn: [User_Story.xlsm](../../docs_old/User_Story.xlsm).

> Bản chuyển đổi nội dung từ tài liệu gốc, chưa hợp nhất các mâu thuẫn nghiệp vụ. Xem [báo cáo rà soát](../RA_SOAT.md) trước khi dùng làm baseline triển khai.

<a id="sheet-1"></a>

## User Stories

Cột **Dòng Excel** giữ vị trí trong file gốc; các cột chữ cái tương ứng cột Excel. Ô trống được giữ nguyên, không tự điền dữ liệu từ dòng trên.

Ô gộp trong nguồn: `A2:F2`, `A1:F1`. Nội dung nằm ở ô đầu của vùng gộp.

| Dòng Excel | A | B | C | D | E | F |
| --- | --- | --- | --- | --- | --- | --- |
| <a id="sheet-1-row-1"></a>1 | PBL6 - DANH SÁCH USER STORY |  |  |  |  |  |
| <a id="sheet-1-row-2"></a>2 | Cấu trúc: Là \[VAI TRÒ\], tôi muốn \[MONG MUỐN\], để \[LỢI ÍCH\]. |  |  |  |  |  |
| <a id="sheet-1-row-4"></a>4 | Mã | Nhóm chức năng | Vai trò | Mong muốn | Lợi ích | Ưu tiên |
| <a id="sheet-1-row-5"></a>5 | US-AUTH-01 | Xác thực | Khách vãng lai | đăng ký tài khoản Khách hàng | tôi có thể tạo tài khoản mua sắm của riêng mình | Bắt buộc |
| <a id="sheet-1-row-6"></a>6 | US-AUTH-02 | Xác thực | Khách hàng | đăng nhập vào tài khoản của mình | tôi có thể sử dụng các chức năng mua sắm và cá nhân hóa | Bắt buộc |
| <a id="sheet-1-row-7"></a>7 | US-AUTH-03 | Xác thực | Khách hàng | đăng xuất khỏi tài khoản của mình | tôi có thể kết thúc phiên đăng nhập một cách an toàn | Bắt buộc |
| <a id="sheet-1-row-8"></a>8 | US-AUTH-04 | Xác thực | Khách hàng | đặt lại mật khẩu đã quên trên Client Web | tôi có thể lấy lại quyền truy cập tài khoản | Nên có |
| <a id="sheet-1-row-9"></a>9 | US-AUTH-05 | Xác thực | Khách hàng | đổi mật khẩu trên Client Web | tôi có thể cập nhật thông tin xác thực của tài khoản | Nên có |
| <a id="sheet-1-row-10"></a>10 | US-PROFILE-01 | Hồ sơ khách hàng | Khách hàng | xem thông tin hồ sơ của mình | tôi có thể kiểm tra thông tin cá nhân đang được lưu cho tài khoản | Bắt buộc |
| <a id="sheet-1-row-11"></a>11 | US-PROFILE-02 | Hồ sơ khách hàng | Khách hàng | cập nhật họ tên, số điện thoại và thông tin hồ sơ cơ bản | thông tin tài khoản của tôi luôn chính xác | Bắt buộc |
| <a id="sheet-1-row-12"></a>12 | US-ADDR-01 | Hồ sơ khách hàng | Khách hàng | thêm địa chỉ nhận hàng | tôi có thể sử dụng địa chỉ đó khi checkout | Bắt buộc |
| <a id="sheet-1-row-13"></a>13 | US-ADDR-02 | Hồ sơ khách hàng | Khách hàng | chỉnh sửa địa chỉ nhận hàng | tôi có thể sửa hoặc cập nhật thông tin giao hàng | Bắt buộc |
| <a id="sheet-1-row-14"></a>14 | US-ADDR-03 | Hồ sơ khách hàng | Khách hàng | xóa địa chỉ nhận hàng | tôi có thể loại bỏ các địa chỉ không còn sử dụng | Bắt buộc |
| <a id="sheet-1-row-15"></a>15 | US-ADDR-04 | Hồ sơ khách hàng | Khách hàng | đặt một địa chỉ nhận hàng làm mặc định | checkout có thể nhanh chóng sử dụng địa chỉ giao hàng ưu tiên của tôi | Bắt buộc |
| <a id="sheet-1-row-16"></a>16 | US-CAT-01 | Danh mục sản phẩm | Khách vãng lai hoặc Khách hàng | xem trang chủ với danh mục, sản phẩm nổi bật/mới và lối vào chatbot | tôi có thể nhanh chóng khám phá sản phẩm và bắt đầu mua sắm | Bắt buộc |
| <a id="sheet-1-row-17"></a>17 | US-CAT-02 | Danh mục sản phẩm | Khách vãng lai hoặc Khách hàng | duyệt sản phẩm theo Danh mục và Product Type | tôi có thể khám phá các sản phẩm phù hợp với loại mình quan tâm | Bắt buộc |
| <a id="sheet-1-row-18"></a>18 | US-SEARCH-01 | Tìm kiếm &amp; lọc | Khách vãng lai hoặc Khách hàng | tìm kiếm sản phẩm theo tên hoặc từ khóa | tôi có thể nhanh chóng tìm được sản phẩm phù hợp với nhu cầu | Bắt buộc |
| <a id="sheet-1-row-19"></a>19 | US-SEARCH-02 | Tìm kiếm &amp; lọc | Khách vãng lai hoặc Khách hàng | lọc sản phẩm theo giá, danh mục và thuộc tính động của từng Product Type | tôi có thể thu hẹp kết quả về các sản phẩm phù hợp với yêu cầu | Bắt buộc |
| <a id="sheet-1-row-20"></a>20 | US-SEARCH-03 | Tìm kiếm &amp; lọc | Khách vãng lai hoặc Khách hàng | sắp xếp kết quả sản phẩm theo các tùy chọn được hỗ trợ như giá hoặc mới nhất | tôi có thể xem sản phẩm theo thứ tự hữu ích nhất | Nên có |
| <a id="sheet-1-row-21"></a>21 | US-SEARCH-04 | Tìm kiếm &amp; lọc | Khách vãng lai hoặc Khách hàng | sử dụng tìm kiếm ngữ nghĩa khi chức năng này có trong MVP | tôi vẫn có thể tìm được sản phẩm liên quan dù cách diễn đạt không trùng chính xác tên sản phẩm | Có thể có |
| <a id="sheet-1-row-22"></a>22 | US-PROD-01 | Khám phá sản phẩm | Khách vãng lai hoặc Khách hàng | xem ảnh, giá, mô tả, thuộc tính động, trạng thái tồn kho và thông tin Store của sản phẩm | tôi có thể đánh giá sản phẩm có phù hợp trước khi mua | Bắt buộc |
| <a id="sheet-1-row-23"></a>23 | US-STOREVIEW-01 | Khám phá sản phẩm | Khách vãng lai hoặc Khách hàng | xem thông tin một Store và các sản phẩm của Store đó | tôi có thể khám phá sản phẩm được bán bởi một Store cụ thể | Bắt buộc |
| <a id="sheet-1-row-24"></a>24 | US-CART-01 | Giỏ hàng | Khách hàng | thêm một Product Variant vào giỏ hàng | tôi có thể mua sản phẩm đã chọn sau đó | Bắt buộc |
| <a id="sheet-1-row-25"></a>25 | US-CART-02 | Giỏ hàng | Khách hàng | cập nhật số lượng của một sản phẩm trong giỏ hàng | tôi có thể điều chỉnh số lượng muốn mua | Bắt buộc |
| <a id="sheet-1-row-26"></a>26 | US-CART-03 | Giỏ hàng | Khách hàng | xóa một sản phẩm khỏi giỏ hàng | tôi có thể loại bỏ sản phẩm không còn muốn mua | Bắt buộc |
| <a id="sheet-1-row-27"></a>27 | US-CART-04 | Giỏ hàng | Khách hàng | xem các sản phẩm trong giỏ được nhóm hoặc nhận biết theo Store | tôi có thể biết những sản phẩm nào có thể checkout cùng nhau | Bắt buộc |
| <a id="sheet-1-row-28"></a>28 | US-CHECKOUT-01 | Checkout | Khách hàng | chọn các sản phẩm của một Store cho lần checkout hiện tại | tôi có thể tạo đơn đúng quy tắc mỗi lần checkout chỉ một Store | Bắt buộc |
| <a id="sheet-1-row-29"></a>29 | US-CHECKOUT-02 | Checkout | Khách hàng | chọn địa chỉ nhận hàng trong quá trình checkout | đơn hàng có thể được giao đến đúng địa chỉ | Bắt buộc |
| <a id="sheet-1-row-30"></a>30 | US-CHECKOUT-03 | Checkout | Khách hàng | xem lại sản phẩm đã chọn, giá hiện tại, tồn kho và tổng tiền trước khi xác nhận | tôi có thể kiểm tra đơn hàng trước khi đặt | Bắt buộc |
| <a id="sheet-1-row-31"></a>31 | US-PAY-01 | Thanh toán | Khách hàng | thực hiện thanh toán sandbox hoặc mock | tôi có thể hoàn tất luồng mua hàng MVP mà không cần tích hợp thanh toán production | Bắt buộc |
| <a id="sheet-1-row-32"></a>32 | US-PAY-02 | Thanh toán | Khách hàng | xem kết quả hoặc trạng thái thanh toán đã được ghi nhận | tôi biết giao dịch mô phỏng thành công hay thất bại | Bắt buộc |
| <a id="sheet-1-row-33"></a>33 | US-ORDER-01 | Đơn hàng khách hàng | Khách hàng | đặt hàng sau khi các điều kiện checkout được kiểm tra hợp lệ | tôi có thể hoàn tất việc mua hàng từ Store đã chọn | Bắt buộc |
| <a id="sheet-1-row-34"></a>34 | US-ORDER-02 | Đơn hàng khách hàng | Khách hàng | xem lịch sử đơn hàng của mình | tôi có thể xem lại các đơn hàng đã mua | Bắt buộc |
| <a id="sheet-1-row-35"></a>35 | US-ORDER-03 | Đơn hàng khách hàng | Khách hàng | xem chi tiết một đơn hàng của mình | tôi có thể xem sản phẩm, Store, địa chỉ, số tiền, trạng thái thanh toán và trạng thái đơn | Bắt buộc |
| <a id="sheet-1-row-36"></a>36 | US-ORDER-04 | Đơn hàng khách hàng | Khách hàng | theo dõi đơn hàng qua các trạng thái được hỗ trợ | tôi biết tiến độ hiện tại của đơn hàng | Bắt buộc |
| <a id="sheet-1-row-37"></a>37 | US-ORDER-05 | Đơn hàng khách hàng | Khách hàng | yêu cầu hủy đơn khi đơn đang ở trạng thái cho phép | tôi có thể dừng đơn không còn muốn mua khi quy tắc nghiệp vụ cho phép | Bắt buộc |
| <a id="sheet-1-row-38"></a>38 | US-REC-01 | Gợi ý sản phẩm | Khách hàng | xem lại các sản phẩm đã xem gần đây | tôi có thể nhanh chóng quay lại những sản phẩm đang cân nhắc | Nên có |
| <a id="sheet-1-row-39"></a>39 | US-REC-02 | Gợi ý sản phẩm | Khách hàng | nhận danh sách sản phẩm “Dành cho bạn” dựa trên hành vi mua sắm hiện có | tôi có thể khám phá sản phẩm phù hợp hơn với sở thích | Bắt buộc |
| <a id="sheet-1-row-40"></a>40 | US-REC-03 | Gợi ý sản phẩm | Khách vãng lai hoặc Khách hàng | xem các sản phẩm liên quan trên trang chi tiết sản phẩm | tôi có thể so sánh hoặc khám phá các sản phẩm tương tự | Bắt buộc |
| <a id="sheet-1-row-41"></a>41 | US-REC-04 | Gợi ý sản phẩm | Khách hàng | nhận gợi ý fallback hữu ích khi chưa có đủ lịch sử | tôi vẫn có thể khám phá sản phẩm khi là người dùng mới hoặc cold-start | Bắt buộc |
| <a id="sheet-1-row-42"></a>42 | US-REC-05 | Gợi ý sản phẩm | Khách hàng | nhận gợi ý sản phẩm có xét đến lịch sử mua hàng | tôi có thể khám phá sản phẩm tương tự hoặc bổ trợ cho những gì đã mua | Nên có |
| <a id="sheet-1-row-43"></a>43 | US-REC-06 | Gợi ý sản phẩm | Chủ cửa hàng | xem các metric hoặc log recommendation hiện có của Store | tôi có thể hiểu chức năng recommendation đang hoạt động như thế nào ở mức MVP | Có thể có |
| <a id="sheet-1-row-44"></a>44 | US-REC-07 | Gợi ý sản phẩm | Quản trị viên | xem metric, log recommendation và trạng thái xử lý dữ liệu hành vi ở phạm vi toàn nền tảng | tôi có thể giám sát recommendation và điều tra sự cố | Nên có |
| <a id="sheet-1-row-45"></a>45 | US-CHAT-01 | Chatbot AI | Khách vãng lai hoặc Khách hàng | mô tả nhu cầu mua sắm bằng ngôn ngữ tự nhiên | tôi có thể nhận tư vấn sản phẩm mà không cần biết chính xác từ khóa | Bắt buộc |
| <a id="sheet-1-row-46"></a>46 | US-CHAT-02 | Chatbot AI | Khách vãng lai hoặc Khách hàng | tiếp tục hội thoại mua sắm qua nhiều lượt | tôi có thể bổ sung và tinh chỉnh nhu cầu mà không phải lặp lại toàn bộ yêu cầu | Bắt buộc |
| <a id="sheet-1-row-47"></a>47 | US-CHAT-03 | Chatbot AI | Khách hàng | nhận tư vấn mua sắm có thể sử dụng sở thích và lịch sử hành vi hiện có của tôi | nội dung tư vấn phù hợp hơn với sở thích của tôi | Bắt buộc |
| <a id="sheet-1-row-48"></a>48 | US-CHAT-04 | Chatbot AI | Khách vãng lai hoặc Khách hàng | nhận gợi ý dựa trên các sản phẩm được truy xuất từ dữ liệu marketplace | chatbot không bịa sản phẩm, giá hoặc thông số không tồn tại | Bắt buộc |
| <a id="sheet-1-row-49"></a>49 | US-CHAT-05 | Chatbot AI | Khách vãng lai hoặc Khách hàng | được thông báo khi dữ liệu sản phẩm chưa đủ và được hỏi thêm các tiêu chí hữu ích | tôi có thể làm rõ nhu cầu thay vì nhận tư vấn không có căn cứ | Bắt buộc |
| <a id="sheet-1-row-50"></a>50 | US-CHAT-06 | Chatbot AI | Khách vãng lai hoặc Khách hàng | mở trực tiếp sản phẩm được chatbot gợi ý | tôi có thể nhanh chóng chuyển từ tư vấn sang xem chi tiết sản phẩm | Bắt buộc |
| <a id="sheet-1-row-51"></a>51 | US-CHAT-07 | Chatbot AI | Khách hàng | xem lại các phiên chat đã lưu nếu lịch sử chat được đưa vào MVP cuối cùng | tôi có thể xem lại các tư vấn mua sắm trước đó | Có thể có |
| <a id="sheet-1-row-52"></a>52 | US-STORE-01 | Quản lý cửa hàng | Chủ cửa hàng | cập nhật tên Store, mô tả, logo và thông tin liên hệ | thông tin Store của tôi luôn chính xác và đầy đủ | Bắt buộc |
| <a id="sheet-1-row-53"></a>53 | US-STORE-02 | Quản lý nhân viên Seller | Chủ cửa hàng | xem các tài khoản Seller thuộc Store của mình | tôi có thể quản lý đúng các nhân viên phụ trách Store | Bắt buộc |
| <a id="sheet-1-row-54"></a>54 | US-STORE-03 | Quản lý nhân viên Seller | Chủ cửa hàng | tạo tài khoản Seller cho Store của mình | tôi có thể giao một phần công việc vận hành Store cho nhân viên | Bắt buộc |
| <a id="sheet-1-row-55"></a>55 | US-STORE-04 | Quản lý nhân viên Seller | Chủ cửa hàng | cập nhật thông tin của Seller trong Store | thông tin tài khoản nhân viên luôn được cập nhật | Bắt buộc |
| <a id="sheet-1-row-56"></a>56 | US-STORE-05 | Quản lý nhân viên Seller | Chủ cửa hàng | gán hoặc cập nhật quyền cho Seller trong Store | tôi có thể kiểm soát những gì nhân viên Store được phép thực hiện | Bắt buộc |
| <a id="sheet-1-row-57"></a>57 | US-STORE-06 | Quản lý nhân viên Seller | Chủ cửa hàng | khóa hoặc mở khóa tài khoản Seller trong Store | tôi có thể ngăn hoặc khôi phục quyền truy cập của nhân viên khi cần | Bắt buộc |
| <a id="sheet-1-row-58"></a>58 | US-ADMIN-STORE-01 | Quản trị nền tảng | Quản trị viên | duyệt, tạo, khóa, mở khóa hoặc cập nhật trạng thái Store và Seller trên toàn nền tảng | tôi có thể quản lý việc tham gia marketplace ở phạm vi toàn hệ thống | Bắt buộc |
| <a id="sheet-1-row-59"></a>59 | US-MPROD-01 | Quản lý sản phẩm | Seller hoặc Chủ cửa hàng | xem, tìm kiếm và lọc các sản phẩm thuộc Store của mình | tôi có thể quản lý danh mục sản phẩm của Store hiệu quả | Bắt buộc |
| <a id="sheet-1-row-60"></a>60 | US-MPROD-02 | Quản lý sản phẩm | Seller hoặc Chủ cửa hàng | tạo sản phẩm bằng cách chọn Category và Product Type | tôi có thể thêm sản phẩm được phân loại đúng vào Store | Bắt buộc |
| <a id="sheet-1-row-61"></a>61 | US-MPROD-03 | Quản lý sản phẩm | Seller hoặc Chủ cửa hàng | xem đúng các trường thuộc tính động sau khi chọn Product Type | tôi có thể nhập các thuộc tính phù hợp với loại sản phẩm | Bắt buộc |
| <a id="sheet-1-row-62"></a>62 | US-MPROD-04 | Quản lý sản phẩm | Seller hoặc Chủ cửa hàng | nhận phản hồi kiểm tra với thuộc tính động bắt buộc và kiểu dữ liệu | tôi có thể sửa dữ liệu sản phẩm không hợp lệ trước khi lưu | Bắt buộc |
| <a id="sheet-1-row-63"></a>63 | US-MPROD-05 | Quản lý sản phẩm | Seller hoặc Chủ cửa hàng | cập nhật thông tin sản phẩm, giá, thuộc tính động và trạng thái kinh doanh | danh mục sản phẩm của Store luôn chính xác | Bắt buộc |
| <a id="sheet-1-row-64"></a>64 | US-MPROD-06 | Quản lý sản phẩm | Seller hoặc Chủ cửa hàng | thêm, xóa và sắp xếp lại ảnh sản phẩm hoặc ảnh biến thể | tôi có thể trình bày sản phẩm với thông tin hình ảnh phù hợp | Nên có |
| <a id="sheet-1-row-65"></a>65 | US-MPROD-07 | Quản lý sản phẩm | Seller hoặc Chủ cửa hàng | tạo và cấu hình Product Variant hoặc SKU với giá, ảnh và thuộc tính biến thể riêng | tôi có thể bán sản phẩm có nhiều lựa chọn mua khác nhau | Bắt buộc |
| <a id="sheet-1-row-66"></a>66 | US-PTYPE-01 | Quản lý phân loại sản phẩm | Quản trị viên | tạo, cập nhật và xóa Product Type | tôi có thể duy trì cấu trúc phân loại sản phẩm của marketplace | Bắt buộc |
| <a id="sheet-1-row-67"></a>67 | US-PTYPE-02 | Quản lý phân loại sản phẩm | Quản trị viên | cấu hình Attribute Key cho Product Type | form tạo sản phẩm của Seller có thể thu thập đúng các thuộc tính động | Bắt buộc |
| <a id="sheet-1-row-68"></a>68 | US-CATEGORY-01 | Quản lý phân loại sản phẩm | Quản trị viên | tạo, cập nhật và xóa danh mục sản phẩm dùng chung | marketplace có hệ thống phân cấp danh mục được quản lý tập trung | Bắt buộc |
| <a id="sheet-1-row-69"></a>69 | US-INV-01 | Tồn kho | Seller hoặc Chủ cửa hàng | xem quantity và reserved quantity của từng Product Variant trong Store | tôi có thể nắm được tình trạng tồn kho hiện tại | Bắt buộc |
| <a id="sheet-1-row-70"></a>70 | US-INV-02 | Tồn kho | Seller hoặc Chủ cửa hàng | ghi nhận nhập kho, xuất kho hoặc điều chỉnh kho kèm lý do | tôi có thể duy trì số lượng tồn kho chính xác và có thể truy vết | Bắt buộc |
| <a id="sheet-1-row-71"></a>71 | US-INV-03 | Tồn kho | Seller hoặc Chủ cửa hàng | xem lịch sử Stock Movement | tôi có thể truy vết tồn kho đã thay đổi như thế nào và vì sao | Bắt buộc |
| <a id="sheet-1-row-72"></a>72 | US-SORDER-01 | Xử lý đơn hàng cửa hàng | Seller hoặc Chủ cửa hàng | xem danh sách đơn hàng thuộc Store của mình | tôi chỉ xử lý các đơn hàng mà mình chịu trách nhiệm | Bắt buộc |
| <a id="sheet-1-row-73"></a>73 | US-SORDER-02 | Xử lý đơn hàng cửa hàng | Seller hoặc Chủ cửa hàng | xem chi tiết một đơn hàng thuộc Store của mình | tôi có thể xem SKU, số lượng, người nhận và trạng thái thanh toán cần thiết để xử lý đơn | Bắt buộc |
| <a id="sheet-1-row-74"></a>74 | US-SORDER-03 | Xử lý đơn hàng cửa hàng | Seller hoặc Chủ cửa hàng | cập nhật đơn qua các trạng thái hợp lệ như Confirmed, Processing, Shipped, Completed hoặc Cancelled | tôi có thể vận hành đúng quy trình xử lý đơn của Store | Bắt buộc |
| <a id="sheet-1-row-75"></a>75 | US-REP-01 | Báo cáo cửa hàng | Chủ cửa hàng | xem dashboard Store gồm doanh thu, số đơn, sản phẩm bán chạy và sản phẩm tồn kho thấp | tôi có thể nắm được tình hình hoạt động hiện tại của Store | Bắt buộc |
| <a id="sheet-1-row-76"></a>76 | US-REP-02 | Báo cáo cửa hàng | Chủ cửa hàng | xem doanh thu theo ngày, tháng hoặc khoảng thời gian đã chọn | tôi có thể phân tích hiệu quả bán hàng của Store theo thời gian | Bắt buộc |
| <a id="sheet-1-row-77"></a>77 | US-REP-03 | Báo cáo cửa hàng | Chủ cửa hàng | xem thống kê sản phẩm của Store | tôi có thể nhận biết hiệu quả sản phẩm và các vấn đề về tồn kho | Nên có |
| <a id="sheet-1-row-78"></a>78 | US-ADMIN-01 | Quản trị nền tảng | Quản trị viên | xem dashboard toàn nền tảng gồm Store, Seller, Khách hàng, sản phẩm, đơn hàng và doanh thu | tôi có thể giám sát marketplace ở phạm vi toàn hệ thống | Bắt buộc |
| <a id="sheet-1-row-79"></a>79 | US-ADMIN-02 | Quản trị nền tảng | Quản trị viên | quản lý trạng thái tài khoản Khách hàng | tôi có thể kiểm soát quyền truy cập của khách hàng khi cần thao tác quản trị | Bắt buộc |
| <a id="sheet-1-row-80"></a>80 | US-ADMIN-03 | Quản trị nền tảng | Quản trị viên | quản lý Role và Permission | tôi có thể duy trì chính sách phân quyền của nền tảng | Bắt buộc |
| <a id="sheet-1-row-81"></a>81 | US-ADMIN-04 | Quản trị nền tảng | Quản trị viên | tìm kiếm và ẩn hoặc khóa sản phẩm vi phạm quy định nền tảng | tôi có thể kiểm soát nội dung danh mục sản phẩm trên marketplace | Bắt buộc |
| <a id="sheet-1-row-82"></a>82 | US-ADMIN-05 | Quản trị nền tảng | Quản trị viên | tìm kiếm và xem đơn hàng trên toàn nền tảng | tôi có thể giám sát hoạt động đơn hàng của marketplace | Nên có |
| <a id="sheet-1-row-83"></a>83 | US-AIMON-01 | Giám sát AI | Quản trị viên  | xem log, metric của Chatbot/RAG và trạng thái Vector Index | tôi có thể giám sát tình trạng dịch vụ AI và điều tra lỗi | Nên có |
