# M2 / order

Owner: Hoa

- `POST /checkout/quotes` — quoteCheckout: **IMPLEMENTED**
- `POST /orders/batches` — confirmCheckout: **IMPLEMENTED**
- `GET /orders/batches/{id}` — getPurchaseGroupOrders: **IMPLEMENTED**
- `GET /me/orders` — listOwnOrders: **IMPLEMENTED**
- `GET /me/orders/{id}` — getOwnOrder: **IMPLEMENTED**
- `POST /me/orders/{id}/cancel` — cancelOwnOrder: **IMPLEMENTED**
- `GET /store/orders` — listStoreOrders: **IMPLEMENTED**
- `GET /store/orders/{id}` — getStoreOrder: **IMPLEMENTED**
- `PATCH /store/orders/{id}/status` — transitionStoreOrder: **IMPLEMENTED**
- `POST /store/orders/{id}/cancel` — cancelStoreOrder: **IMPLEMENTED**
- `POST /store/orders/{id}/cod-collection` — collectCod: **NOT_IMPLEMENTED**

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.
