# Đợt62 — Sáu chuỗi chung baseline và lỗi điều chỉnh kho liên tiếp

**Sáu chuỗi đã chạy PASS trên `Node61c/AI56/frontend62`; chưa đóng nghiệm thu tổng vì còn audit158nhiệm vụ và rà hồi quy cuối.** 52finding gốc vẫn VERIFIED. Không chạy mobile; kết quả thiết bị thật/screen reader/nativezoom/nghiên cứu người dùng không được chuyển thành PASS.

Mã backend396file giữ61c, AI43file giữ56, provider kiểm thử giữ37. Frontend chỉ sửa nút mở điều chỉnh kho; contract/migration không đổi. Manifest327frontend/contract/test/config và10image đối chiếu với container đang chạy. HEAD `49ce6ee9b6f5ad473ca40244614d3c79cd2c1846` cộng working tree; stack riêng3109/18080. Không commit/deploy production.

## CF-062-01 — P2, CONFIRMED → FIXED/VERIFIED

Sau một lần nhập thêm thành công, dialog đóng nhưng GET tồn mới chưa kết thúc; nút Điều chỉnh vẫn mở form với version/số tồn cache cũ. Lần bù ngay sau có thể nhận409 dù không có người khác sửa. Server bảo vệ version nên không ghi đè hoặc sai tồn; người dùng phải đóng/tải lại. Khác CR-024 về lịch sử không được invalidation: ở đây GET đã được invalidation, lỗi nằm ở mở lại form trước response.

`final-stock-chain62-trial.json` dừng tại lần điều chỉnh kế tiếp. SELECT `stock-trial-ledger62.json` xác nhận +5đã ghi, không có−5trùng; không đoán rằng lần nhập bị mất. `stock-adjustment-refresh-baseline62.json` giữ GET sau201, chứng minh nút vẫn enabled. `StoreInventory` nay disable nút trong lúc `inventory.isFetching`, có thông báo đang cập nhật. Giữ409 cho xung đột thật, không sửa version gửi hoặc tự replay body mới. `stock-adjustment-refresh62.json`: **6PASS**, gồm GET chậm và hai operation6/+5 rồi7/−5; CH06runtime sau sửa qua.

## Sáu chuỗi và bằng chứng riêng

Root artifact `artifacts/core-fix/fix-20261030T100153Z/`. Mỗi báo cáo Playwright bên dưới có1test; CH01/CH02 là cùng một test với hai chuỗi riêng, không cộng thành hai test.

| Chuỗi | Báo cáo cuối | Checkpoint và giới hạn |
|---|---|---|
| CH01 COD nhiều Store | `final-multistore-chains62-accepted.json` | Hai Store, voucher Store+sàn giảm101đ phân bổ51/50, tổng419899; mất phản hồi checkout và completion sau commit, replay body/key hoặc đọc lại đúng; hai đơn hoàn tất; notification/đánh giá UI; tiền báo cáo Owner/Admin vàSQL khớp. |
| CH02 Hủy cạnh tranh | Cùng báo cáo CH01 | Hai đơn cùng nhóm219899; Customer cancel cạnh tranh Owner confirm ra200/409, đọc version rồi hủy hợp lệ; Store khác hủy; mỗi đơn một lịch sử hủy, tồn về8, voucher giữ redeemed2/hold0 đúng quy tắc không phục hồi. Race thực hiện HTTP, không giả thao tác browser đồng thời. |
| CH03 Online chưa rõ | `final-online-return-chain62-final.json`; `final-online-late-chain62.json` | Đóng tab trước callback, quay qua Menu→Đơn hàng. Callback sai219999thay220000 nhận422; callback thành công lặp cùng event không thu lần hai. Nhánh còn mở giao/hoàn tất; nhánh đã hủy nhận tiền muộn→một refund/lookup/effect, tồnRELEASED không consume lại. Provider là simulator, không có tiền ngân hàng thật. |
| CH04 Giao thất bại/hoàn về | `final-delivery-chain62-final.json` | COD chưa thu nhận thiếu/chờ kiểm rồi đủ, chỉ lượng2/3đủđiềukiện cộng tồn; COD đã thu nhận hỏngkhôngrestock, Owner hoàn đủ; onlineUNKNOWN giữSETTLING trướclookupSUCCEEDED, không phát lệnh hoàn mới khirefresh; Admin đọc ba hồ sơCLOSED. |
| CH05 Đổi/trả | `final-exchange-chain62.json` | Customer yêu cầu→hướng dẫn địa chỉ/phí→kiểm hàng→đổiM/Lgiá100000→Customer nhận. Catalog đổi sau xuất không đổi snapshot. Đơn khác hết hàng: Store đề nghịREFUND cạnh tranh dispatch, Customer đồng ý (mấtACK/retry cùngbody), Owner hoàn đủ120000và kết thúc, giữ original_typeEXCHANGE. |
| CH06 Kho giữ hàng | `final-stock-chain62-final.json` | Inventory-onlySELLER: tồnđầu10; CODconsume2; onlinehold1; nhậpnhầm+5/bù−5; releaseonline/hủyCOD; bánCOD1. Đối chiếu kỳ quantity0+17−8=9, reserved0+4−4=0,10movement/versionliền; nguồnSQL khớp. Thu quyền khi phiên mở→403, không lộ order/product/audit. |

UI dùng đường hiển thị cho các thao tác được nêu; dữ liệu tiền đề tạo qua API, riêng identity của các bộ mới là verified fixture được công bố. Không dùng seed tiền/tồn/đơn để thay kết quả mutation. CH06 đầu còn chạy đăng ký/capture/invite thật; lượt nhiều Store cuối dùng identity fixture sau khi đạt giới hạn email giờ. Không xóa/flush Redis hoặc retry email429giờ để vượt giới hạn.

## SQL độc lập và cleanup

`final-chains-state62.json`, verifierSELECT-only `verify-final-chains62.cjs`: **7Store/14đơn nghiệm thu,6COMPLETED/8CANCELLED;9khoản thu tổng1459899,4khoản hoàn tổng580000.** Mỗi amount khớp payment.collected/refunded, source duy nhất, có occurred_at. Ba hồ sơ hoàn vềCLOSED, hai returnCOMPLETED, snapshot hàng đổi M1/M2 giống nhau. All12Store của cả nghiệm thu/lượt thử LOCKED,12productSTOPPED,14variant khớp quantity/reserved-ledger vàreserved0. Lịch sử/audit không xóa.

Giữ8đơn từ các lượt trước riêng; không cộng chúng thành test/chuỗi đạt. `trial-cleanup-recovery62.json` khép ba đơn dở bằng API sau khi qua cửa sổ quota email tự nhiên: Customer hủyCOD, Customer hủyonlineđãthu→workerhoànđủ, Owner mở/kiểm/đóng hoàn vềCODchưathu. Chỉ reset3tài khoản fixture do chính các lượt này tạo, token/mật khẩu chỉ trong memory. Store của Owner recovery được mở tạm rồi khóa lại; product luônSTOPPED. Không sửa DB tiền/tồn/trạng thái để cleanup hoặc làm ca qua. Đơn online chưa trả của lượt kho đầu đã EXPIRED tự nhiên, không sửa timestamp.

## Lượt không đạt được giữ nguyên

- `final-stock-chain62-trial.json`: phát hiện CF-062-01. Ledger chứng minh lần+5commit, không dùng timeout làm số lần ghi.
- `final-multistore-chains62-trial.json`: PASS trước sửa cuối frontend; chỉ giữ lịch sử. `final-multistore-chains62-final.json` FAIL ở429email, không lỗi nghiệp vụ; không có đơn từ lượt này. Lượt accepted dùng identityfixture, không tuyên bố kiểm đăng ký/email.
- `final-delivery-chain62.json`: helper đăng nhập bị đặt nhầm trong function khác nênReferenceError; sửa test, không sửa ứng dụng để né. ĐơnSHIPPEDdở đã khép riêng qua recovery.
- `final-online-return-chain62.json`: UI đọc đơn trước khi worker thêm bướcPENDING; test mặc định có auto-poll timeline, trong khi màn cung cấp nút Làm mới đơn. Lượt cuối thực hiện đúng nút rồi kiểm timeline, không thêm polling chỉ để test qua. Đơn đãthu dở của lượt đầu được hủy/hoàn quaAPI riêng, không tínhPASS.

Đã xem ảnh checkout/packing/kho/online hoàn về/online đã hoàn. Packing đủ người nhận/điệnthoại/địa chỉ/món/lượng; kho hiển thị0+17−8=9; đơn onlinehủy giải thích không giao/thu thêm và đãhoàn. Một số screenshot vùng dài có header/sidebarsticky ở vị tríscroll, không dùng ảnh đó để kết luận không có che lấp ở mọi tọa độ. Hit-test/keyboard có bộUI riêng; ảnh không thay hậu điều kiệnSQL.

Buildfrontend62 PASS2076modules (cảnh báo mainchunkcũ); OpenAPI/drift/type không đổi. Không chạy lại backend/AI test62vì source không đổi61c; giữ385unit/12SQL61c. Tiếp tục audit158 và hồi quy theo phạm vi từng ca; USER_VALIDATION_PENDING được giữ độc lập với nghiệm thu chuyên gia.
