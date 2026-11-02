# Review theo nhu cầu và thao tác thực tế — 29/10/2026

**Bổ sung lượt mới:** [catalog 158 ID](scenario-catalog.md), [mapping 325 góp ý](plan-review-decisions.md), [kết quả từng lần chạy](scenario-results.csv), [findings và policy](usability-findings.md), [readiness/giới hạn](operational-readiness.md). Sáu ca browser trong tài liệu này là bằng chứng lịch sử, không phải 150/158 hành trình đã hoàn tất. Các UX-01–UX-12 giữ ID để nối bằng chứng mới, không đếm trùng.

## Cách đọc kết quả

Báo cáo core trước kiểm tra tính đúng của chức năng và dữ liệu. Báo cáo này xem một người mua/người bán có hoàn thành công việc thực tế bằng những gì giao diện cung cấp hay không. Một luồng API chạy thành công không chứng minh người dùng biết chọn gì, có đủ thông tin hoặc đủ khả năng thực hiện công việc ngoài đời.

Đây là walkthrough có cấu trúc của người review, kết hợp đọc mã và sáu ca browser với dữ liệu có nghĩa: áo có màu/size, giỏ nhiều đơn vị, đơn có tên/điện thoại/địa chỉ người nhận. Chưa phỏng vấn hoặc thử nghiệm với người dùng thật; không đưa tỷ lệ hoàn thành, thời gian hay số click giả định thành số liệu đo.

Các đề xuất dưới đây là tiêu chí sửa và nghiệm thu tương tác, chưa được triển khai. Không cộng máy móc các UX finding vào 19 bug kỹ thuật: một số cùng nguyên nhân hoặc cùng tác động.

## Công việc thực tế phải làm được

| Tình huống | Đầu ra người dùng cần | Đánh giá hiện tại |
|---|---|---|
| Tôi muốn mua áo đỏ size M | Chọn đúng màu/size, biết giá và xem lại lựa chọn trước khi trả tiền | VƯỚNG: chi tiết và giỏ dùng SKU thay cho thuộc tính phân loại |
| Tôi muốn mua 3 món, bỏ bớt để vừa túi tiền | Biết số lượng, tiền từng dòng và tổng tạm tính khi chọn/bỏ chọn | VƯỚNG: giỏ chỉ có đơn giá hiện tại, số lượng và số mục đã chọn |
| Tôi đang mua nhưng chưa đăng nhập | Đăng nhập xong tiếp tục ở đúng món và lựa chọn trước đó | ĐỨT MẠCH: đăng nhập thành công vẫn ở màn Đã đăng nhập |
| Tôi cần giao tới địa chỉ khác | Thêm/sửa/chọn địa chỉ trong lúc đặt và tiếp tục đặt | VƯỚNG: rời checkout, không có sửa địa chỉ hiện có; phần nhập voucher/payment chưa xác nhận không được lưu như một draft |
| Tôi muốn biết đơn áo tuần trước đang ở đâu | Nhận ra đơn qua tên/ảnh/Store/ngày, hiểu trạng thái và bước tiếp theo | VƯỚNG: danh sách chủ yếu là mã đơn, mã trạng thái, tiền; chưa có điều hướng theo công việc |
| Tôi muốn hỏi Store về đúng đơn này | Mở chat đúng Store, có ngữ cảnh đơn | VÒNG VÈO: chi tiết đơn không có liên hệ Store theo đơn |
| Tôi cần đổi một món bị sai size | Biết phạm vi đổi, ai duyệt, gửi tới đâu, phí do ai trả và theo dõi bước tiếp | THIẾU: form yêu cầu toàn đơn và chuỗi trạng thái, chưa đủ hướng dẫn gửi hàng thực tế |
| Tôi cần đăng áo có 3 màu × 4 size | Tạo đủ 12 phân loại, giá/tồn/ảnh rõ ràng và kiểm tra trước khi đăng | NHIỀU BƯỚC RỜI: tạo một variant, sửa để thêm tiếp, qua trang kho, quay lại đăng; chưa có luồng hoàn thiện sản phẩm |
| Tôi muốn tìm sản phẩm cũ trong 300 sản phẩm | Tìm một lần trên toàn gian hàng | KHÔNG ĐÁP ỨNG: tìm trên từng trang 20 sản phẩm |
| Tôi vừa nhập thêm hàng hoặc vừa kiểm kê | Chọn đúng nghiệp vụ, thấy tồn trước/sau và xác nhận | DỄ NHẦM: chỉ nhập số thay đổi có dấu, không xem trước kết quả |
| Tôi có đơn cần đóng gói và giao hôm nay | Xem người nhận/địa chỉ/điện thoại, đúng phân loại, chuyển bước sau khi đã thực hiện | BỊ CHẶN VẬN HÀNH: thiếu thông tin giao hàng và phân loại dễ đọc |
| Tôi cần xử lý nhiều đơn chờ xác nhận | Tập trung đúng hàng đợi và nhận ra đơn, không dò từng trang bằng UUID | VƯỚNG: Seller orders chưa có tìm/lọc trạng thái, danh sách ít thông tin nhận diện |

## Các vấn đề cần xử lý

### UX-01 — Khách không thể chọn màu/size một cách tự tin

- **Nhu cầu:** mua áo đỏ size M, không biết quy ước SKU của người bán.
- **Thao tác đang có:** mở chi tiết, thấy `SKU: TS-001-A` và `SKU: TS-001-B`. Dữ liệu có `variant_values: {color: 'Đỏ', size: 'M'}` nhưng không xuất hiện ở nút chọn. Trong giỏ cũng chỉ thấy SKU.
- **Tác động:** phải đoán, hỏi Store hoặc mua nhầm. Thẻ catalog mở modal có thể hiển thị giá trị phân loại trong khi chi tiết lại chỉ hiện SKU, khiến hai đường mua không nhất quán.
- **Mức cần thiết:** bắt buộc trước khi nghiệm thu mua sản phẩm nhiều phân loại.
- **Sửa tối thiểu:** tên hiển thị `Đỏ / M`; nêu rõ thuộc tính Màu, Kích cỡ; đánh dấu lựa chọn hiện tại, giá tương ứng và phân loại không thể mua. SKU là thông tin phụ. Dùng cùng cách gọi ở modal, chi tiết, giỏ, checkout và đơn.
- **Nghiệm thu:** với các SKU vô nghĩa nhưng màu/size khác nhau, người review chọn đúng theo tên thuộc tính và xác nhận được lựa chọn ở mọi bước, không phải hiểu SKU.
- **Bằng chứng:** browser `UX-01`, `UX-02`; `ProductDetail.tsx:186`, `CartProduct.tsx:44`.

### UX-02 — Giỏ hàng chưa giúp người mua cân đối tiền

- **Nhu cầu:** có nhiều món, tăng/giảm số lượng, bỏ bớt để phù hợp ngân sách trước khi đặt.
- **Hiện tại:** mỗi dòng có giá hiện tại, số lượng; không có thành tiền dòng. Tóm tắt chỉ đếm mục/số lượng và yêu cầu sang checkout mới có giá cuối.
- **Tác động:** người mua phải tính nhẩm, khó so sánh các lựa chọn và khó hiểu tiền thay đổi khi chọn/bỏ chọn. Không yêu cầu giỏ cam kết số tiền cuối cùng để giải quyết vấn đề này.
- **Mức cần thiết:** quan trọng trong luồng mua nhiều món.
- **Sửa tối thiểu:** hiện thành tiền tạm tính từng dòng và tổng hàng tạm tính theo phần được chọn; ghi rõ chưa bao gồm phí/ưu đãi và được xác nhận ở checkout. Cho đổi phân loại hoặc có đường quay sửa rõ ràng. Giữ nguyên quote server là nguồn xác nhận tiền cuối.
- **Nghiệm thu:** đơn giá 100.000 × 3 hiện tạm tính 300.000; bỏ chọn/tăng giảm cập nhật phần tạm tính; giá không tải được hiện trạng thái chưa xác định thay vì 0.
- **Bằng chứng:** `UX-02`; `CartPage.tsx:254`, `CartProduct.tsx`. Liên quan CR-001/018 nhưng là vấn đề hiểu và điều khiển giỏ, không chỉ request đúng.

### UX-03 — Seller không có đủ thông tin để giao đơn

- **Nhu cầu:** đóng gói đúng phân loại và gửi hàng cho đúng người nhận.
- **Hiện tại:** mở đơn Seller thấy tổng tiền, trạng thái, tên sản phẩm và số lượng; có nút chuyển `SHIPPED`. Không có tên người nhận, điện thoại, địa chỉ; phân loại/SKU snapshot cũng không được hiển thị ở dòng hàng trong dialog này.
- **Tác động:** thao tác đổi trạng thái tồn tại nhưng công việc giao hàng thực tế không hoàn thành được trong sản phẩm. Người bán phải tìm thông tin ngoài hệ thống hoặc hỏi khách lại.
- **Mức cần thiết:** **chặn vận hành bán hàng**, ưu tiên trước việc thêm biểu đồ hoặc nút hàng loạt.
- **Sửa tối thiểu:** API đơn được phân quyền trả snapshot người nhận/điện thoại/địa chỉ của đơn cho đúng Customer và Seller có quyền đơn; UI hiển thị/copy được, kèm tên hàng, thuộc tính phân loại, SKU, số lượng. Trạng thái “Đã giao cho đơn vị vận chuyển” chỉ dùng sau hành động tương ứng. Nếu dự án chưa tích hợp hãng vận chuyển, vẫn phải hỗ trợ bàn giao thủ công bằng đủ thông tin này.
- **Nghiệm thu:** Seller chỉ dùng màn đơn để xác định người nhận, đóng gói đúng màu/size, chuẩn bị bàn giao; Seller Store khác không đọc được PII. Customer xem lại đúng snapshot đã đặt, không phải địa chỉ hiện tại vừa sửa.
- **Bằng chứng:** `UX-03` còn inject thêm `address_snapshot` nhưng UI vẫn không dùng. Repository có đọc/lưu snapshot; `order.service.ts:104` mapper không trả snapshot; `SellerWorkspace.tsx:640` dialog không có đích giao. Cần sửa cả contract/DTO lẫn UI khi triển khai, không chỉ thêm nhãn.

### UX-04 — Đăng nhập làm đứt hành trình mua

- **Nhu cầu:** người chưa đăng nhập đã quyết định mua một món, sẵn sàng đăng nhập để tiếp tục.
- **Hiện tại:** nút mua dẫn tới `/login`; đăng nhập xong vẫn hiện “Đã đăng nhập”. Không có return path hoặc ý định mua được chuyển qua từ trang sản phẩm.
- **Tác động:** phải tự tìm đường quay lại, chọn lại sản phẩm/phân loại/số lượng. Đăng nhập là bước phụ nhưng trở thành điểm kết thúc luồng mua.
- **Mức cần thiết:** bắt buộc cho luồng Guest → Customer.
- **Sửa tối thiểu:** giữ đường quay lại nội bộ và draft lựa chọn trong phiên; sau đăng nhập quay lại đúng nơi, hiển thị rõ lựa chọn còn hợp lệ. Không tự đặt hàng hoặc thực hiện lại giao dịch có tiền. Nếu ý định thêm giỏ cần xác nhận lại, hiện nút tiếp tục rõ ràng.
- **Nghiệm thu:** Guest chọn variant/số lượng → đăng nhập → thấy lại cùng lựa chọn; xác minh lại trạng thái/giá/tồn trước khi tiếp tục. Return URL ngoài domain bị từ chối.
- **Bằng chứng:** `UX-05` xác nhận sau login vẫn `/login`; `LoginForm.tsx`, các link Guest trong `ProductDetail.tsx`. Bảo toàn variant chưa được kiểm trọn vòng bằng browser ở lượt này.

### UX-05 — Thay địa chỉ trong lúc đặt hàng gây vòng ra/vào

- **Nhu cầu:** mua gửi tới nhà khác, phát hiện sai số điện thoại hoặc chưa có địa chỉ.
- **Hiện tại:** checkout có select và link quản lý địa chỉ; thiếu thêm/sửa tại bước đặt. Sổ địa chỉ không có sửa nội dung (CR-010). Voucher/payment chưa tới bước confirm nằm trong state của checkout và bị khởi tạo lại khi remount.
- **Tác động:** người dùng rời luồng mua, phải tự quay lại, có thể phải chọn lại phương thức/nhập lại ưu đãi. Với khách mới, thông báo thiếu địa chỉ trở thành lỗi chặn thay vì bước cần hoàn thiện.
- **Mức cần thiết:** quan trọng, đặc biệt người mua lần đầu.
- **Sửa tối thiểu:** thêm/sửa địa chỉ bằng dialog/drawer ngay checkout hoặc tuyến quản lý có return path và draft rõ ràng; chọn địa chỉ mới sau lưu. Draft chỉ là ý định, phải lấy quote mới khi dữ liệu thay đổi; không sửa body của attempt đã gửi chưa rõ kết quả.
- **Nghiệm thu:** thêm địa chỉ đầu tiên ngay trong luồng mua, sửa điện thoại, đóng dialog không lưu, quay lại sau validation lỗi; giữ lựa chọn không liên quan và không dùng quote cũ.
- **Bằng chứng:** walkthrough source `CheckoutPage.tsx:274, 552`, state input không persist trước attempt; CR-010. Chưa đo thao tác với người dùng thật.

### UX-06 — Lịch sử đơn khó nhận diện và không nói rõ bước tiếp theo

- **Nhu cầu:** tìm đơn áo mua trước đó, biết đang chờ ai và có cần thanh toán/hành động gì không.
- **Hiện tại:** danh sách dùng mã đơn rút gọn, `PENDING`, `SANDBOX`, số tiền và các link. Không dùng tên/ảnh sản phẩm, tên Store, thời điểm đặt để nhận diện; không có bộ lọc trạng thái. Chi tiết còn hiển thị phiên bản nghiệp vụ.
- **Tác động:** người mua phải mở nhiều đơn và dịch mã kỹ thuật; “đang chờ” không rõ chờ thanh toán hay chờ người bán. Các trạng thái payment/order/refund cần được giải thích cùng nhau.
- **Mức cần thiết:** bắt buộc cho theo dõi sau mua.
- **Sửa tối thiểu:** tóm tắt tên/ảnh món, Store, ngày đặt và số lượng; nhãn trạng thái tiếng Việt, mô tả ngắn bước tiếp theo; lọc theo công việc như Chờ thanh toán/Chờ xác nhận/Đang giao/Hoàn tất. Vẫn giữ mã đơn để đối chiếu nhưng không làm thông tin nhận diện chính.
- **Nghiệm thu:** nhiều đơn cùng số tiền vẫn nhận ra đúng đơn theo món/ngày/Store; AWAITING_PAYMENT có CTA thanh toán, UNKNOWN có hướng kiểm tra/đối soát, không gợi ý trả lần nữa.
- **Bằng chứng:** `UX-04` dữ liệu có tên hàng nhưng danh sách không hiển thị; `OrderHistoryPage.tsx:22`, `OrderDetailPage.tsx:30`.

### UX-07 — Hỏi về một đơn hàng thiếu đường liên hệ có ngữ cảnh

- **Nhu cầu:** “đơn này bao giờ giao?”, “tôi đã chuyển khoản nhưng chưa cập nhật”, “món bị sai”.
- **Hiện tại:** chi tiết đơn không có CTA nhắn đúng Store. Đường chat thường bắt đầu từ trang sản phẩm/Store và chỉ có hội thoại theo Store; người mua phải tự mang mã đơn vào cuộc trò chuyện.
- **Tác động:** phải quay nhiều màn, dễ hỏi nhầm Store hoặc người bán phải hỏi lại đơn nào. Có module chat chưa đồng nghĩa đã hỗ trợ tác vụ sau mua.
- **Mức cần thiết:** quan trọng với marketplace nhiều Store.
- **Sửa tối thiểu:** nút “Liên hệ gian hàng về đơn này”; mở đúng thread và cho đính kèm/tham chiếu đơn sau xác nhận. Giữ quyền participant/order; không gửi PII hoặc tin nhắn tự động ngoài ý định người dùng.
- **Nghiệm thu:** từ đơn của Store B mở đúng B, hiện ngữ cảnh đơn, người dùng chỉnh/gửi nội dung; không mở nhầm Store A.
- **Bằng chứng:** source `OrderDetailPage.tsx`, `ContactStoreButton.tsx`, conversation được định danh Customer–Store. Chưa thêm test browser riêng cho đề xuất.

### UX-08 — Đổi trả có trạng thái nhưng chưa đủ hướng dẫn thực hiện ngoài đời

- **Nhu cầu:** đổi size hoặc trả hàng: biết món nào, gửi đi đâu, liên hệ ai, chi phí và cần cung cấp gì.
- **Hiện tại:** form áp dụng toàn đơn, chọn REFUND/EXCHANGE và nhập lý do; sau duyệt chủ yếu có decision_note và trạng thái. Không có cấu trúc hướng dẫn nơi nhận hàng trả, cách gửi, phí vận chuyển hoặc đối tượng xử lý. Đổi hàng chưa thể chọn size/màu thay thế trong UI.
- **Tác động:** API có thể chạy qua APPROVED → RECEIVED, nhưng khách/người bán phải tự thỏa thuận phần quyết định ở ngoài luồng. Không thể nghiệm thu “đổi size thành công” chỉ bằng đổi enum.
- **Mức cần thiết:** phải chốt nghiệp vụ trước nghiệm thu sau bán.
- **Sửa tối thiểu:** công bố rõ chỉ toàn đơn hay từng món; sau duyệt có hướng dẫn và đầu mối, địa chỉ nhận hàng trả, bên chịu phí, tham chiếu gửi hàng; EXCHANGE có thỏa thuận hàng thay thế. Nếu dự án giữ toàn đơn, ghi rõ từ trước khi gửi thay vì giả lập khả năng đổi từng món.
- **Nghiệm thu:** khách có một món sai trong đơn nhiều món biết chính xác phải trả phần nào; cả hai bên biết bước kế tiếp và căn cứ xác nhận nhận/gửi. Không tự mở REFUND COD chưa hỗ trợ (CR-006).
- **Bằng chứng:** `OrderReturnsPanel.tsx`, `ReturnsPage.tsx`, `ReturnRequestView.tsx`; hành trình core trước mới xác minh state machine. Các chính sách phí/phạm vi phải được chủ sản phẩm xác nhận trước triển khai, review không tự bịa chính sách.

### UX-09 — Đăng sản phẩm nhiều phân loại chưa thành một công việc liền mạch

- **Nhu cầu:** đăng áo 3 màu × 4 size với giá, ảnh, tồn kho để bán được.
- **Hiện tại:** dialog tạo một biến thể; thêm các biến thể ở trang edit; nhập từng tồn kho ở màn khác; trạng thái ACTIVE có thể được chọn ngay trong form trong khi biến thể mới tồn bằng 0. Chỉ có lời nhắc nhập kho, không dẫn tới chính SKU cần nhập.
- **Tác động:** người bán tự nhớ các bước, dễ bỏ sót phân loại hoặc đăng xong mà khách không mua được. Hệ thống nhận create thành công chưa đủ để nói “đã đưa sản phẩm lên bán”.
- **Mức cần thiết:** quan trọng cho nghiệp vụ Seller.
- **Sửa tối thiểu:** luồng Nháp → thông tin → phân loại/giá → ảnh/tồn ban đầu → xem trước/đăng; checklist phần còn thiếu, link thẳng bước cần hoàn thiện. Trường hợp nhiều tổ hợp nên có bảng tạo/sửa danh sách, không bắt nhập lại từng form cùng cấu trúc. Không cần thêm wizard phức tạp nếu một trang có checklist và các vùng nhập đủ rõ.
- **Nghiệm thu:** người bán hoàn thành sản phẩm 12 phân loại, nhìn thấy phân loại thiếu giá/tồn/ảnh, biết variant nào đang bán; không phải tự đối chiếu UUID giữa trang sản phẩm và kho.
- **Bằng chứng:** `ProductList.tsx:42`, `ProductEdit.tsx:106`, `VariantEditor.tsx`, `SellerWorkspace.tsx:199`; đây là walkthrough source, chưa đo toàn bộ thao tác 12 biến thể.

### UX-10 — “Tìm trên trang” chưa đáp ứng tìm sản phẩm để làm việc

- **Nhu cầu:** sửa giá một sản phẩm bất kỳ trong gian hàng lớn.
- **Hiện tại:** search chỉ lọc 20 mục của page đang mở; UI nói rõ phạm vi nhưng không có tìm toàn Store. Seller orders cũng cần hàng đợi theo trạng thái và tìm đơn, hiện chủ yếu phân trang toàn bộ.
- **Tác động:** phải dò nhiều trang hoặc biết sản phẩm nằm ở trang nào; người dùng không thể hoàn thành tác vụ tìm một lần. Nhãn trung thực không khắc phục thiếu khả năng thao tác cần thiết.
- **Mức cần thiết:** quan trọng khi dữ liệu vượt một trang.
- **Sửa tối thiểu:** tìm toàn Store theo tên/SKU và filter trạng thái qua server; đơn theo mã/trạng thái/khoảng thời gian, URL giữ bộ lọc. Không thay tìm toàn Store bằng tải vô hạn mọi sản phẩm về browser.
- **Nghiệm thu:** tìm đúng sản phẩm nằm ngoài page đầu, lọc đúng total và giữ kết quả khi mở rồi quay về; đơn cần xử lý không lẫn đơn hoàn tất.
- **Bằng chứng:** `ProductList.tsx:20–23`; `SellerWorkspace.tsx:482`; cần bổ sung query contract tương ứng nếu triển khai.

### UX-11 — Nhập kho/kiểm kê đang buộc người bán tính nhẩm số có dấu

- **Nhu cầu:** nhập thêm 5 hoặc xác nhận kiểm kê thực tế còn 5, đây là hai nghiệp vụ khác nhau.
- **Hiện tại:** dialog chỉ hỏi “Số lượng thay đổi”, hiển thị hiện có/đang giữ, nhập một số có thể âm; không cho xem tồn kết quả.
- **Tác động:** tồn 12, muốn kiểm kê còn 5 mà nhập 5 sẽ thành 17; người hiểu trường đúng vẫn phải tính nhẩm. Backend làm đúng phép cộng không ngăn được sai ý định.
- **Mức cần thiết:** quan trọng vì sai thao tác ảnh hưởng tồn bán.
- **Sửa tối thiểu:** lựa chọn Nhập thêm/Giảm hàng/Đặt tồn kiểm kê, số nhập không mơ hồ, preview “12 → 17; giữ 2; có thể bán 15”. Nếu chỉ hỗ trợ delta thì ghi rõ `+5` là cộng thêm và bắt xác nhận kết quả; không cho xuống dưới hàng giữ.
- **Nghiệm thu:** nhập thêm 5 và kiểm kê còn 5 cho kết quả khác nhau đúng ý định; preview giữ/reserved rõ; uncertain retry giữ nguyên operation/body hiện có.
- **Bằng chứng:** `UX-06`; `SellerWorkspace.tsx:426`; chưa có thử nghiệm xem người dùng thật có hiểu trường đến mức nào.

### UX-12 — Người vận hành cần dấu hiệu công việc, không chỉ enum và dialog

- **Nhu cầu:** biết đơn nào cần xác nhận, đơn nào đã đủ điều kiện giao, nhận tiền, hoàn tất; biết điều gì chưa thể thực hiện và tại sao.
- **Hiện tại:** bảng Seller có UUID, status/payment status, tiền; dialog dùng “Chuyển sang CONFIRMED/PROCESSING/SHIPPED/COMPLETED”. Một số nút disabled nhưng bước xử lý cần dựa vào trạng thái thô; CR-017 còn làm mất khả năng nhận diện sản phẩm trên mobile.
- **Tác động:** người vận hành phải hiểu state machine mới thao tác được; có thể bấm để đổi trạng thái thay vì làm công việc rồi ghi nhận.
- **Mức cần thiết:** bắt buộc cho vận hành đơn hằng ngày.
- **Sửa tối thiểu:** nhãn hành động “Xác nhận nhận đơn”, “Đã chuẩn bị xong”, “Đã bàn giao vận chuyển”, “Ghi nhận đã thu đủ COD”; kèm điều kiện và hậu quả, đối tượng đơn/người nhận rõ. Mỗi bước hiển thị hành động kế tiếp; quyền thiếu hoặc payment UNKNOWN có lời giải thích cụ thể.
- **Nghiệm thu:** từ hàng đợi, Seller xác định đơn cần làm và hiểu điều kiện hoàn tất COD mà không biết tên enum; thao tác tiền có xác nhận số tiền, không ghi nhận thu tiền chỉ vì đã chuyển trạng thái giao.
- **Bằng chứng:** `UX-03`, source Seller order actions; logic quyền/COD kỹ thuật đã được core review kiểm tra, phần này yêu cầu cách người dùng hiểu và sử dụng nó.

## Ưu tiên sửa theo hành trình

1. **Đủ khả năng mua và giao đúng:** UX-01/02/03/04; đồng thời sửa CR-001 và CR-016. Không coi luồng bán hàng hoàn tất nếu Seller chưa lấy được đích giao.
2. **Theo dõi và xử lý sau mua:** UX-05/06/07/08; chốt phạm vi đổi trả và các thao tác thực tế, chặn luồng hoàn COD không hỗ trợ.
3. **Vận hành Seller khi có dữ liệu thật:** UX-09/10/11/12; kiểm tra với nhiều sản phẩm, nhiều đơn, nhiều variant, không chỉ ba sản phẩm mẫu.

Không ưu tiên thêm chức năng như in hàng loạt, xuất Excel, gợi ý AI hoặc dashboard mới trước khi các thao tác trên có thể hoàn thành rõ ràng. Các tiện ích đó cần được quyết định theo nhu cầu vận hành đã xác minh.

## Kịch bản nghiệm thu với người dùng

Thực hiện trên test data; không hướng dẫn đường đi trước. Người review chỉ giao mục tiêu, ghi điểm do dự, thao tác sai, bước quay lại, thông tin phải hỏi thêm và trường hợp không hoàn tất. Chỉ ghi thời gian/số thao tác sau khi thực sự đo.

| Mục tiêu giao cho người thử | Điều kiện đạt |
|---|---|
| Tìm áo đỏ M, mua 2 chiếc trong ngân sách, ban đầu chưa đăng nhập | Chọn đúng variant, hiểu tạm tính, đăng nhập không mất ý định, xác nhận đúng món/số lượng/địa chỉ/tổng cuối |
| Đổi địa chỉ và bỏ một món trước khi đặt | Không nhập lại dữ liệu không liên quan; quote mới rõ ràng; không giao tới địa chỉ cũ |
| Tìm đơn áo đã mua, hỏi lúc giao và yêu cầu đổi size | Nhận ra đơn, liên hệ đúng Store với ngữ cảnh; hiểu phạm vi/điều kiện và bước gửi hàng tiếp theo |
| Đăng áo 12 phân loại rồi nhập tồn | Đăng được sản phẩm mua được, không sót phân loại, hiểu variant nào chưa đủ điều kiện |
| Tìm và sửa sản phẩm ở ngoài page đầu | Tìm một lần trên toàn Store, quay về còn vị trí/bộ lọc phù hợp |
| Nhận đơn, đóng gói và bàn giao | Có đủ người nhận/địa chỉ/điện thoại/màu-size/SKU/số lượng mà không hỏi lại khách |
| Nhập thêm 5 và kiểm kê tồn còn 5 | Hiểu hai việc khác nhau, xác nhận đúng tồn mới và tồn khả dụng |

Hiện mới có sáu ca browser xác nhận thiếu thông tin/hành vi ở UX-01…06 tương ứng tên test. Đây chưa phải bằng chứng người dùng thật hoàn thành các kịch bản trên. Artifact: `artifacts/core-review/usability.spec.ts`, `usability-results.json`, `usability-screenshots/`.
