# M2 / order

Owner: Hoa

- `POST /checkout/quotes` — quoteCheckout: **IMPLEMENTED**
- `POST /orders/batches` — confirmCheckout: **NOT_IMPLEMENTED**
- `GET /orders/batches/{id}` — getPurchaseGroupOrders: **NOT_IMPLEMENTED**
- `GET /me/orders` — listOwnOrders: **NOT_IMPLEMENTED**
- `GET /me/orders/{id}` — getOwnOrder: **NOT_IMPLEMENTED**
- `POST /me/orders/{id}/cancel` — cancelOwnOrder: **NOT_IMPLEMENTED**
- `GET /store/orders` — listStoreOrders: **NOT_IMPLEMENTED**
- `GET /store/orders/{id}` — getStoreOrder: **NOT_IMPLEMENTED**
- `PATCH /store/orders/{id}/status` — transitionStoreOrder: **NOT_IMPLEMENTED**
- `POST /store/orders/{id}/cancel` — cancelStoreOrder: **NOT_IMPLEMENTED**
- `POST /store/orders/{id}/cod-collection` — collectCod: **NOT_IMPLEMENTED**

Xem [backlog](../../../../docs/implementation/member-backlog.md). DTO runtime/fixture đã có trong [foundation handoff](../../../../docs/implementation/foundation-handoff.md). Hoàn thiện service/repository, ownership, migration, audit, timeout/recovery và test trước khi đổi trạng thái endpoint.
