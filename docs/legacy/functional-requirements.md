# Yêu cầu chức năng và thuộc tính chất lượng

Nguồn: [Functional_Requirements.xlsm](../../docs_old/Functional_Requirements.xlsm).

> Bản chuyển đổi nội dung từ tài liệu gốc, chưa hợp nhất các mâu thuẫn nghiệp vụ. Xem [báo cáo rà soát](../RA_SOAT.md) trước khi dùng làm baseline triển khai.

<a id="sheet-1"></a>

## Functional Requirements

Cột **Dòng Excel** giữ vị trí trong file gốc; các cột chữ cái tương ứng cột Excel. Ô trống được giữ nguyên, không tự điền dữ liệu từ dòng trên.

Ô gộp trong nguồn: `A1:D1`. Nội dung nằm ở ô đầu của vùng gộp.

| Dòng Excel | A | B | C | D |
| --- | --- | --- | --- | --- |
| <a id="sheet-1-row-1"></a>1 | FUNCTIONAL REQUIREMENTS - YÊU CẦU CHỨC NĂNG |  |  |  |
| <a id="sheet-1-row-2"></a>2 | Mã | Nhóm chức năng | Yêu cầu | Actor |
| <a id="sheet-1-row-3"></a>3 | FR-AUTH-01 | Xác thực &amp; tài khoản  | Hệ thống phải cho phép Guest đăng ký tài khoản Customer. | Guest |
| <a id="sheet-1-row-4"></a>4 | FR-AUTH-02 | Xác thực &amp; tài khoản | Hệ thống phải cho phép Customer/Seller/Store Owner/Admin đăng nhập và đăng xuất theo tài khoản được cấp. | Tất cả actor có tài khoản |
| <a id="sheet-1-row-5"></a>5 | FR-AUTH-03 | Xác thực &amp; tài khoản | Hệ thống phải hỗ trợ quên/đổi mật khẩu cho Customer trên Client Web theo phạm vi đề cương. | Guest/Customer |
| <a id="sheet-1-row-6"></a>6 | FR-AUTH-04 | Xác thực &amp; tài khoản | Hệ thống phải xác thực request quản trị bằng JWT và áp dụng role + ownership check ở backend. | Seller/Store Owner/Admin |
| <a id="sheet-1-row-7"></a>7 | FR-PROFILE-01 | Hồ sơ Customer | Customer phải có thể xem/cập nhật họ tên, số điện thoại và thông tin cơ bản. | Customer |
| <a id="sheet-1-row-8"></a>8 | FR-ADDR-01 | Địa chỉ nhận hàng | Customer phải có thể thêm/sửa/xóa/chọn địa chỉ nhận hàng mặc định. | Customer |
| <a id="sheet-1-row-9"></a>9 | FR-CAT-01 | Danh mục &amp; khám phá | Hệ thống phải hiển thị trang chủ với banner, danh mục, sản phẩm nổi bật/mới và lối vào chatbot. | Guest/Customer |
| <a id="sheet-1-row-10"></a>10 | FR-CAT-02 | Danh mục &amp; khám phá | Hệ thống phải cho phép duyệt sản phẩm theo danh mục và Product Type. | Guest/Customer |
| <a id="sheet-1-row-11"></a>11 | FR-SEARCH-01 | Tìm kiếm &amp; lọc | Hệ thống phải cho phép tìm sản phẩm theo tên/từ khóa. | Guest/Customer |
| <a id="sheet-1-row-12"></a>12 | FR-SEARCH-02 | Tìm kiếm &amp; lọc | Hệ thống phải cho phép lọc theo giá, danh mục và thuộc tính động phù hợp Product Type. | Guest/Customer |
| <a id="sheet-1-row-13"></a>13 | FR-SEARCH-03 | Tìm kiếm &amp; lọc | Hệ thống phải hỗ trợ sắp xếp tối thiểu theo giá và mới nhất trên Client Web. | Guest/Customer |
| <a id="sheet-1-row-14"></a>14 | FR-SEARCH-04 | Tìm kiếm &amp; lọc | Hệ thống có thể kết hợp semantic search ở mức phù hợp với MVP. | Guest/Customer |
| <a id="sheet-1-row-15"></a>15 | FR-PROD-01 | Chi tiết sản phẩm | Trang chi tiết phải hiển thị ảnh, giá, mô tả, thuộc tính động, tồn kho và thông tin Store. | Guest/Customer |
| <a id="sheet-1-row-16"></a>16 | FR-STOREVIEW-01 | Trang Store | Hệ thống phải cho phép xem thông tin một Store và danh sách sản phẩm thuộc Store đó. | Guest/Customer |
| <a id="sheet-1-row-17"></a>17 | FR-CART-01 | Giỏ hàng | Customer phải có thể thêm sản phẩm/biến thể vào giỏ hàng. | Customer |
| <a id="sheet-1-row-18"></a>18 | FR-CART-02 | Giỏ hàng | Customer phải có thể xóa và cập nhật số lượng CartItem. | Customer |
| <a id="sheet-1-row-19"></a>19 | FR-CART-03 | Giỏ hàng | Giỏ hàng phải nhóm hoặc nhận biết sản phẩm theo Store để hỗ trợ quy tắc checkout 1 Store/lần. | Customer |
| <a id="sheet-1-row-20"></a>20 | FR-CHECKOUT-01 | Checkout | Tại checkout, Customer chỉ được chọn sản phẩm thuộc một Store cho giao dịch hiện tại. | Customer |
| <a id="sheet-1-row-21"></a>21 | FR-CHECKOUT-02 | Checkout | Hệ thống phải kiểm tra lại giá và tồn kho trước khi tạo đơn. | Customer |
| <a id="sheet-1-row-22"></a>22 | FR-CHECKOUT-03 | Checkout | Customer phải chọn địa chỉ giao hàng và xác nhận thông tin/tổng tiền trước khi đặt đơn. | Customer |
| <a id="sheet-1-row-23"></a>23 | FR-PAY-01 | Thanh toán | Hệ thống phải hỗ trợ thanh toán sandbox/mock và ghi nhận trạng thái giao dịch. | Customer |
| <a id="sheet-1-row-24"></a>24 | FR-ORDER-01 | Đơn hàng Customer | Hệ thống phải tạo Order sau khi xác nhận điều kiện tồn kho và thông tin thanh toán theo luồng MVP. | Customer |
| <a id="sheet-1-row-25"></a>25 | FR-ORDER-02 | Đơn hàng Customer | Customer phải xem được lịch sử đơn và chi tiết từng đơn. | Customer |
| <a id="sheet-1-row-26"></a>26 | FR-ORDER-03 | Đơn hàng Customer | Customer phải theo dõi trạng thái Pending/Confirmed/Processing/Shipped/Completed/Cancelled. | Customer |
| <a id="sheet-1-row-27"></a>27 | FR-ORDER-04 | Đơn hàng Customer | Customer phải có thể yêu cầu hủy đơn khi đơn còn ở trạng thái cho phép. | Customer |
| <a id="sheet-1-row-28"></a>28 | FR-REC-01 | Recommendation | Hệ thống phải ghi nhận lịch sử tìm kiếm của Customer đăng nhập để phục vụ cá nhân hóa. | Customer |
| <a id="sheet-1-row-29"></a>29 | FR-REC-02 | Recommendation | Hệ thống phải ghi nhận lịch sử xem sản phẩm của Customer. | Customer |
| <a id="sheet-1-row-30"></a>30 | FR-REC-03 | Recommendation | Hệ thống phải sử dụng tín hiệu giỏ hàng và lịch sử mua hàng khi tổng hợp sở thích người dùng ở mức MVP. | Customer |
| <a id="sheet-1-row-31"></a>31 | FR-REC-04 | Recommendation | Trang chủ phải hiển thị khu vực “Dành cho bạn” cho Customer đăng nhập khi có dữ liệu phù hợp. | Customer |
| <a id="sheet-1-row-32"></a>32 | FR-REC-05 | Recommendation | Tại trang chi tiết, hệ thống phải trả về sản phẩm liên quan dựa trên Category, ProductType, PriceSimilarity và SameStore theo mô hình điểm MVP. | Guest/Customer |
| <a id="sheet-1-row-33"></a>33 | FR-REC-06 | Recommendation | Recommendation hành vi phải khai thác tìm kiếm gần đây, sản phẩm đã xem, giỏ hàng và dữ liệu hành vi đã có để xác định nhóm quan tâm. | Customer |
| <a id="sheet-1-row-34"></a>34 | FR-REC-07 | Recommendation | Nếu Customer chưa có lịch sử, hệ thống phải fallback sang sản phẩm bán chạy nhất hoặc mới nhất theo cấu hình MVP. | Customer |
| <a id="sheet-1-row-35"></a>35 | FR-REC-08 | Recommendation | Store Owner/Admin có thể xem metric/log recommendation ở mức được triển khai. | Store Owner/Admin |
| <a id="sheet-1-row-36"></a>36 | FR-AI-01 | Chatbot AI &amp; RAG | Guest/Customer phải có thể gửi yêu cầu mua sắm bằng ngôn ngữ tự nhiên và nhận gợi ý sản phẩm. | Guest/Customer |
| <a id="sheet-1-row-37"></a>37 | FR-AI-02 | Chatbot AI &amp; RAG | Chatbot phải hỗ trợ hội thoại nhiều lượt và sử dụng Conversation Context. | Guest/Customer |
| <a id="sheet-1-row-38"></a>38 | FR-AI-03 | Chatbot AI &amp; RAG | Với Customer đăng nhập, chatbot phải có thể kết hợp User Preference và lịch sử hành vi để cá nhân hóa tư vấn. | Customer |
| <a id="sheet-1-row-39"></a>39 | FR-AI-04 | Chatbot AI &amp; RAG | Chatbot phải truy xuất Top-K product context thông qua semantic/vector search trước khi tạo câu trả lời RAG. | Guest/Customer |
| <a id="sheet-1-row-40"></a>40 | FR-AI-05 | Chatbot AI &amp; RAG | Chatbot chỉ được giới thiệu sản phẩm có trong retrieved context và không tự tạo giá/thông số/khuyến mãi không tồn tại. | Guest/Customer |
| <a id="sheet-1-row-41"></a>41 | FR-AI-06 | Chatbot AI &amp; RAG | Nếu dữ liệu không đủ, chatbot phải nêu rõ giới hạn và gợi ý người dùng bổ sung tiêu chí; câu hỏi ngoài phạm vi mua sắm phải được từ chối/định hướng lại. | Guest/Customer |
| <a id="sheet-1-row-42"></a>42 | FR-AI-07 | Chatbot AI &amp; RAG | Người dùng phải có thể mở nhanh trang chi tiết sản phẩm từ card/link do chatbot trả về. | Guest/Customer |
| <a id="sheet-1-row-43"></a>43 | FR-AI-08 | Chatbot AI &amp; RAG | Customer phải có thể xem lại lịch sử phiên chat nếu chức năng lưu hội thoại được triển khai theo MVP đã chốt. | Customer |
| <a id="sheet-1-row-44"></a>44 | FR-STORE-01 | Quản lý Store &amp; Seller | Store Owner phải có thể cập nhật tên Store, mô tả, logo và thông tin liên hệ. | Store Owner |
| <a id="sheet-1-row-45"></a>45 | FR-STORE-02 | Quản lý Store &amp; Seller | Store Owner phải có thể tạo/cập nhật/cấp quyền/khóa tài khoản Seller thuộc Store. | Store Owner |
| <a id="sheet-1-row-46"></a>46 | FR-STORE-03 | Quản lý Store &amp; Seller | Seller phải thuộc đúng một Store và mọi dữ liệu nghiệp vụ của Seller phải bị giới hạn theo store\_id. | Seller |
| <a id="sheet-1-row-47"></a>47 | FR-STORE-04 | Quản lý Store &amp; Seller | Administrator phải có thể duyệt tạo, khóa/mở hoặc cập nhật trạng thái Store/Seller ở phạm vi toàn nền tảng. | Administrator |
| <a id="sheet-1-row-48"></a>48 | FR-MPROD-01 | Quản lý sản phẩm | Seller/Owner phải xem, tìm và lọc danh sách sản phẩm của Store. | Seller/Store Owner |
| <a id="sheet-1-row-49"></a>49 | FR-MPROD-02 | Quản lý sản phẩm | Seller/Owner phải có thể tạo sản phẩm bằng cách chọn Category và ProductType. | Seller/Store Owner |
| <a id="sheet-1-row-50"></a>50 | FR-MPROD-03 | Quản lý sản phẩm | Sau khi chọn ProductType, hệ thống phải trả về AttributeKeys tương ứng để tạo form thuộc tính động. | Seller/Store Owner |
| <a id="sheet-1-row-51"></a>51 | FR-MPROD-04 | Quản lý sản phẩm | Hệ thống phải validate thuộc tính bắt buộc và kiểu dữ liệu trước khi lưu sản phẩm. | Seller/Store Owner |
| <a id="sheet-1-row-52"></a>52 | FR-MPROD-05 | Quản lý sản phẩm | Seller/Owner phải có thể cập nhật thông tin, giá, thuộc tính động và trạng thái kinh doanh của sản phẩm Store. | Seller/Store Owner |
| <a id="sheet-1-row-53"></a>53 | FR-MPROD-06 | Quản lý sản phẩm | Seller/Owner phải có thể thêm/xóa/sắp xếp ảnh sản phẩm và ảnh biến thể. | Seller/Store Owner |
| <a id="sheet-1-row-54"></a>54 | FR-MPROD-07 | Quản lý sản phẩm | Seller/Owner phải có thể tạo và cấu hình ProductVariant/SKU với giá, ảnh và thuộc tính biến thể. | Seller/Store Owner |
| <a id="sheet-1-row-55"></a>55 | FR-MPROD-08 | Quản lý sản phẩm | Khi lưu sản phẩm, hệ thống phải tự động gắn store\_id của actor; không cho phép actor tự gán Store khác. | Seller/Store Owner |
| <a id="sheet-1-row-56"></a>56 | FR-MPROD-09 | Quản lý sản phẩm | Sau thay đổi sản phẩm phù hợp, hệ thống phải đồng bộ dữ liệu sang M4 để phục vụ Product Embedding/RAG Index. | Seller/Store Owner/System |
| <a id="sheet-1-row-57"></a>57 | FR-PTYPE-01 | Product Type &amp; Attribute | Administrator phải CRUD Product Types và cấu hình Attribute Keys dùng chung toàn sàn. | Administrator |
| <a id="sheet-1-row-58"></a>58 | FR-CATEGORY-ADMIN-01 | Danh mục quản trị | Administrator phải CRUD danh mục sản phẩm dùng chung toàn sàn. | Administrator |
| <a id="sheet-1-row-59"></a>59 | FR-INV-01 | Tồn kho | Seller/Owner phải xem quantity và reserved\_quantity theo biến thể. | Seller/Store Owner |
| <a id="sheet-1-row-60"></a>60 | FR-INV-02 | Tồn kho | Seller/Owner phải có thể nhập kho/xuất kho/điều chỉnh kho kèm lý do thay đổi. | Seller/Store Owner |
| <a id="sheet-1-row-61"></a>61 | FR-INV-03 | Tồn kho | Seller/Owner phải xem được lịch sử Stock Movement. | Seller/Store Owner |
| <a id="sheet-1-row-62"></a>62 | FR-SORDER-01 | Đơn hàng Store | Seller/Owner phải xem danh sách và chi tiết đơn hàng thuộc Store theo store\_id. | Seller/Store Owner |
| <a id="sheet-1-row-63"></a>63 | FR-SORDER-02 | Đơn hàng Store | Seller/Owner phải cập nhật trạng thái đơn theo luồng Confirmed → Processing → Shipped → Completed hoặc Cancelled theo rule. | Seller/Store Owner |
| <a id="sheet-1-row-64"></a>64 | FR-SORDER-03 | Đơn hàng Store | Khi trạng thái đơn thay đổi, hệ thống phải cập nhật dữ liệu và hỗ trợ thông báo trạng thái cho Customer theo thiết kế triển khai. | Seller/Store Owner/System |
| <a id="sheet-1-row-65"></a>65 | FR-REP-01 | Báo cáo Store | Store Owner phải xem Dashboard tổng quan Store gồm doanh thu, số đơn, sản phẩm bán chạy và tồn kho thấp. | Store Owner |
| <a id="sheet-1-row-66"></a>66 | FR-REP-02 | Báo cáo Store | Store Owner phải xem doanh thu theo ngày/tháng/khoảng thời gian và thống kê sản phẩm Store. | Store Owner |
| <a id="sheet-1-row-67"></a>67 | FR-ADMIN-01 | Quản trị nền tảng | Administrator phải xem Platform Dashboard về Store/Seller/Customer/sản phẩm/đơn hàng/doanh thu toàn sàn. | Administrator |
| <a id="sheet-1-row-68"></a>68 | FR-ADMIN-02 | Quản trị nền tảng | Administrator phải quản lý trạng thái tài khoản Customer. | Administrator |
| <a id="sheet-1-row-69"></a>69 | FR-ADMIN-03 | Quản trị nền tảng | Administrator phải quản lý Role &amp; Permission theo thiết kế RBAC. | Administrator |
| <a id="sheet-1-row-70"></a>70 | FR-ADMIN-04 | Quản trị nền tảng | Administrator phải tra cứu và có thể ẩn/khóa sản phẩm vi phạm. | Administrator |
| <a id="sheet-1-row-71"></a>71 | FR-ADMIN-05 | Quản trị nền tảng | Administrator phải tra cứu đơn hàng toàn nền tảng để giám sát. | Administrator |
| <a id="sheet-1-row-72"></a>72 | FR-ADMIN-06 | Quản trị nền tảng | Administrator phải có chức năng theo dõi log/metric Chatbot &amp; RAG và trạng thái Vector Index ở mức MVP. | Administrator |
| <a id="sheet-1-row-73"></a>73 | FR-ADMIN-07 | Quản trị nền tảng | Administrator phải có chức năng theo dõi metric/log Recommendation và dữ liệu hành vi ở mức MVP. | Administrator |

<a id="sheet-2"></a>

## Quality Attributes

Cột **Dòng Excel** giữ vị trí trong file gốc; các cột chữ cái tương ứng cột Excel. Ô trống được giữ nguyên, không tự điền dữ liệu từ dòng trên.

Ô gộp trong nguồn: `A1:C1`. Nội dung nằm ở ô đầu của vùng gộp.

| Dòng Excel | A | B | C |
| --- | --- | --- | --- |
| <a id="sheet-2-row-1"></a>1 | QUALITY ATTRIBUTES - THUỘC TÍNH CHẤT LƯỢNG |  |  |
| <a id="sheet-2-row-2"></a>2 | Mã | Thuộc tính chất lượng | Yêu cầu / Tiêu chí |
| <a id="sheet-2-row-3"></a>3 | NFR-PERF-01 | Hiệu năng | API nghiệp vụ thông thường phản hồi mục tiêu dưới 2 giây trong điều kiện kiểm thử MVP. |
| <a id="sheet-2-row-4"></a>4 | NFR-PERF-02 | Hiệu năng | Chatbot RAG phản hồi mục tiêu dưới 4 giây trong điều kiện kiểm thử MVP. |
| <a id="sheet-2-row-5"></a>5 | NFR-SEC-01 | Bảo mật | Mật khẩu phải được hash bằng BCrypt. |
| <a id="sheet-2-row-6"></a>6 | NFR-SEC-02 | Bảo mật | Authentication sử dụng JWT; API quản trị kiểm tra user\_id, role, store\_id. |
| <a id="sheet-2-row-7"></a>7 | NFR-SEC-03 | Bảo mật | Input phải được validate; quyền truy cập dữ liệu phải được kiểm tra ở backend. |
| <a id="sheet-2-row-8"></a>8 | NFR-SEC-04 | Bảo mật | Không commit API key, JWT Secret hoặc database credentials lên Git; quản lý bằng biến môi trường/.env. |
| <a id="sheet-2-row-9"></a>9 | NFR-ISO-01 | Cô lập dữ liệu | Seller/Owner chỉ truy cập tài nguyên thuộc store\_id; lịch sử Customer bảo vệ theo customer\_id. |
| <a id="sheet-2-row-10"></a>10 | NFR-REL-01 | Độ tin cậy | Luồng đặt hàng/tồn kho phải duy trì trạng thái nhất quán và tránh race condition. |
| <a id="sheet-2-row-11"></a>11 | NFR-AI-01 | An toàn AI | Câu trả lời chatbot phải grounded theo retrieval context và hạn chế hallucination. |
| <a id="sheet-2-row-12"></a>12 | NFR-PRIV-01 | Quyền riêng tư | Không truyền secret key hoặc dữ liệu nhạy cảm không cần thiết của người dùng vào prompt LLM. |
| <a id="sheet-2-row-13"></a>13 | NFR-API-01 | Khả năng bảo trì | API contract chuẩn REST/JSON và được mô tả bằng OpenAPI/Swagger. |
| <a id="sheet-2-row-14"></a>14 | NFR-ARCH-01 | Kiến trúc | Các service giữ loose coupling, autonomy và không đọc trực tiếp DB nội bộ của service khác. |
