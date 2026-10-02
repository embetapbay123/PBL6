"""Remove server-owned fields from invitation, variant and chat request bodies."""
from pathlib import Path
import json

path = Path(__file__).resolve().parents[1] / "docs/contracts/openapi.json"
api = json.loads(path.read_text(encoding="utf-8"))
schemas = api["components"]["schemas"]
schemas["StaffInvitationCreate"] = {
    "type": "object",
    "properties": {
        "invited_email": schemas["StaffInvitation"]["properties"]["invited_email"],
        "permissions": schemas["StaffInvitation"]["properties"]["permissions"],
    },
    "required": ["invited_email", "permissions"],
    "description": "Owner mời email; Store, trạng thái và hạn mời do M3 xác định.",
}
schemas["ProductVariantCreate"] = {
    "type": "object",
    "properties": {key: schemas["ProductVariant"]["properties"][key]
                   for key in ("sku", "price_vnd", "variant_values", "is_default")},
    "required": ["sku", "price_vnd", "variant_values"],
}
schemas["ChatMessageCreate"] = {
    "type": "object",
    "properties": {"content": schemas["ChatMessage"]["properties"]["content"]},
    "required": ["content"],
    "description": "Client gửi câu hỏi; product_cards và fallback là kết quả do M4 tạo.",
}
new_refs = {
    "inviteStaff": "StaffInvitationCreate",
    "createVariant": "ProductVariantCreate",
    "sendChatMessage": "ChatMessageCreate",
}
seen = set()
for methods in api["paths"].values():
    for op in methods.values():
        if op["operationId"] in new_refs:
            op["requestBody"]["content"]["application/json"]["schema"]["$ref"] = (
                "#/components/schemas/" + new_refs[op["operationId"]]
            )
            seen.add(op["operationId"])
assert seen == set(new_refs)
path.write_text(json.dumps(api, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
