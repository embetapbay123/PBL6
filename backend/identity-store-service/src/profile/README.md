# M3 / profile

Owner: Trí

- `GET /me/context` — getAuthContext: **IMPLEMENTED_SAMPLE**
- `GET /me` — getProfile: **IMPLEMENTED_SAMPLE**
- `PATCH /me` — updateProfile: **IMPLEMENTED**
- `GET /me/addresses` — listAddresses: **IMPLEMENTED**
- `POST /me/addresses` — createAddress: **IMPLEMENTED**
- `PATCH /me/addresses/{id}` — updateAddress: **IMPLEMENTED**
- `DELETE /me/addresses/{id}` — deleteAddress: **IMPLEMENTED**

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.

Profile/Address dùng DTO generated, chỉ ghi theo user từ token; khóa User trước Address để serialize default changes, audit và ghi trong cùng transaction. UPDATE RETURNING được chuẩn hóa; response datetime là ISO. Audit chỉ chứa tên field/default flag, không lưu địa chỉ, số điện thoại hoặc email. Đọc [M3 handoff](../../../../docs/implementation/tri-lookup-handoff.md).
