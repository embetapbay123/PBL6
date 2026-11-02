# Tạm dừng writer xuất hàng đổi

Áp dụng từ image `pbl6-node:core-fix-20261102-61c`. Chỉ dừng **lệnh xuất hàng đổi mới**; giữ reader, contract, snapshot đã lưu và consumer đối chiếu. Không hạ reader về bản chưa hiểu snapshot, không xóa operation result, receipt, ledger hoặc lịch sử để rollback.

## Cơ chế

M1 đọc `EXCHANGE_DISPATCH_WRITES_ENABLED` khi xử lý command. Không khai báo giữ hành vi tương thích; chuỗi đúng `true` bật writer. `false`, rỗng hoặc giá trị sai đều dừng lệnh mới. Compose dùng `${EXCHANGE_DISPATCH_WRITES_ENABLED-true}` để giá trị rỗng không bị đổi thành bật.

Trong transaction: `once` kiểm operation/body trước; receipt đã xuất trả snapshot cũ trước gate. Chỉ lệnh chưa có kết quả mới nhận HTTP503 `EXCHANGE_DISPATCH_PAUSED`, trước mọi ghi dispatch/trừ tồn. Không ghi operation result cho lần tạm dừng. Cùng operation với body khác vẫn409. Gate không chặn reserve/consume/release, nhận hàng trả hoặc đọc dữ liệu.

M2 giữ `RECEIVED / exchange_status=PENDING`, command và operation ID đã đóng băng. Worker lưu lý do, nhả lease và đối chiếu lại sau5giây. UI giải thích tạm dừng, không báo đã gửi và không cho tạo lệnh xuất khác. Khi bật lại, worker dùng đúng command. GET lỗi không phát lại mutation từ UI.

Đây là cấu hình khi khởi động tiến trình, không phải công tắc tức thời xuyên các replica. Transaction đã vượt gate trước lúc dừng có thể commit: chờ/drain lệnh đang chạy, ghi nhận command liên quan và đối chiếu receipt thay vì suy rằng mọi request đều chưa ghi. Triển khai đủ reader/consumer trước khi bật writer; giữ consumer hoạt động khi tạm dừng writer.

## Stack kiểm thử riêng

Dùng đúng tập Compose đang chạy của `pbl6-fe-verify`, kết thúc bằng `artifacts/compose-core-fix-exchange-writer61.yaml`. Không dùng các lệnh này với stack/database demo chung. Giữ biến PowerShell `$reviewComposeFiles` là danh sách các file `-f` của cấu hình hiện tại; không dùng `docker compose config` để đưa secrets ra artifact.

```powershell
# Nối sau toàn bộ file Compose bình thường, bao gồm overlay61.
docker compose --env-file infrastructure/.env -p pbl6-fe-verify @reviewComposeFiles `
  -f artifacts/compose-core-fix-exchange-writer61-paused.yaml up -d --no-deps m1

# Khôi phục: bỏ duy nhất overlay paused, vẫn giữ image/reader61c.
docker compose --env-file infrastructure/.env -p pbl6-fe-verify @reviewComposeFiles `
  up -d --no-deps m1
```

Danh sách Compose đầy đủ được dùng thực tế trong `frontend/tests/exchange-writer-runtime.spec.ts`; chạy bằng opt-in `CORE_FIX_EXCHANGE_WRITER=1`. Script khôi phục flag/worker trong `finally`. Overlay61 bình thường đặt rõ `true`, nên chỉ đổi biến môi trường ngoài container không thay được cấu hình overlay này. Không stop toàn bộ consumer để thực hiện rollback thường lệ; bài test chỉ stop workerM2 tạm thời để tạo mất ACK có kiểm soát.

## Đối chiếu bắt buộc

- Kiểm image/flag M1 thực tế và workerM2 đang chạy. Không chỉ đọc file cấu hình.
- Lệnh mới bị dừng: không có dispatch/snapshot/movement/operation result mới; M2 còn command và trạng thái chờ, không chuyển `EXCHANGE_SENT`.
- Lệnh đã commit: đối chiếu receipt và snapshot M1/M2; replay cùng operation/body phải phục hồi đúng snapshot. Tồn và movement không tăng số lần, dù catalog hiện tại đã đổi.
- Bật lại: cùng command chuyển đúng một lần; Customer/Store/Admin đọc cùng hàng đã bàn giao. Kiểm số tiền độc lập, không giả phát sinh thu/hoàn từ rollback.
- Thu hồi hiển thị dữ liệu test sau nghiệm thu; giữ lịch sử. Không xem dừng bán hàng test là lỗi writer nếu command chưa được thực hiện trước cleanup.

Bằng chứng đã chạy nằm tại [đợt61](wave-35-exchange-writer-rollback.md). Không suy từ bài này rằng toàn bộ database downgrade, mọi writer khác hoặc provider tiền thật đã được nghiệm thu.
