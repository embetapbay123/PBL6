// GENERATED; change source contracts, not this file.
import { ValidateBy } from 'class-validator';
import { Transform } from 'class-transformer';
import { valueMatches, normalizeParameters } from './contract-validation';
export class RegisterBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "email", "maxLength": 254},true),defaultMessage:()=> 'Invalid contract field'}})
  "email"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 72, "minLength": 1},true),defaultMessage:()=> 'Invalid contract field'}})
  "password"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "display_name"?: string;
}
export class RegisterPathDto {
}
export class RegisterQueryDto {
}
export class RegisterHeadersDto {
}
export class VerifyEmailBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 4096},true),defaultMessage:()=> 'Invalid contract field'}})
  "token"!: string;
}
export class VerifyEmailPathDto {
}
export class VerifyEmailQueryDto {
}
export class VerifyEmailHeadersDto {
}
export class LoginBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "email", "maxLength": 254},true),defaultMessage:()=> 'Invalid contract field'}})
  "email"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 72, "minLength": 1},true),defaultMessage:()=> 'Invalid contract field'}})
  "password"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["WEB", "MOBILE"], "default": "MOBILE"},false),defaultMessage:()=> 'Invalid contract field'}})
  "client_type"?: "WEB" | "MOBILE";
}
export class LoginPathDto {
}
export class LoginQueryDto {
}
export class LoginHeadersDto {
}
export class RefreshBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 256, "minLength": 32},false),defaultMessage:()=> 'Invalid contract field'}})
  "refresh_token"?: string;
}
export class RefreshPathDto {
}
export class RefreshQueryDto {
}
export class RefreshHeadersDto {
}
export class LogoutBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 256, "minLength": 32},false),defaultMessage:()=> 'Invalid contract field'}})
  "refresh_token"?: string;
}
export class LogoutPathDto {
}
export class LogoutQueryDto {
}
export class LogoutHeadersDto {
}
export class ResetPasswordBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "email", "maxLength": 254},true),defaultMessage:()=> 'Invalid contract field'}})
  "email"!: string;
}
export class ResetPasswordPathDto {
}
export class ResetPasswordQueryDto {
}
export class ResetPasswordHeadersDto {
}
export class ConfirmResetPasswordBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 4096},true),defaultMessage:()=> 'Invalid contract field'}})
  "token"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 8, "maxLength": 72},true),defaultMessage:()=> 'Invalid contract field'}})
  "new_password"!: string;
}
export class ConfirmResetPasswordPathDto {
}
export class ConfirmResetPasswordQueryDto {
}
export class ConfirmResetPasswordHeadersDto {
}
export class ChangePasswordBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 72, "minLength": 1},true),defaultMessage:()=> 'Invalid contract field'}})
  "current_password"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 8, "maxLength": 72},true),defaultMessage:()=> 'Invalid contract field'}})
  "new_password"!: string;
}
export class ChangePasswordPathDto {
}
export class ChangePasswordQueryDto {
}
export class ChangePasswordHeadersDto {
}
export class GetAuthContextPathDto {
}
export class GetAuthContextQueryDto {
}
export class GetAuthContextHeadersDto {
}
export class GetProfilePathDto {
}
export class GetProfileQueryDto {
}
export class GetProfileHeadersDto {
}
export class UpdateProfileBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "display_name"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "phone"?: string;
}
export class UpdateProfilePathDto {
}
export class UpdateProfileQueryDto {
}
export class UpdateProfileHeadersDto {
}
export class ListAddressesPathDto {
}
export class ListAddressesQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListAddressesHeadersDto {
}
export class CreateAddressBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "recipient_name"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "phone"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "line1"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "ward"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "district"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "city"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "boolean"},false),defaultMessage:()=> 'Invalid contract field'}})
  "is_default"?: boolean;
}
export class CreateAddressPathDto {
}
export class CreateAddressQueryDto {
}
export class CreateAddressHeadersDto {
}
export class UpdateAddressBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "recipient_name"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "phone"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "line1"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "ward"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "district"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "city"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "boolean"},false),defaultMessage:()=> 'Invalid contract field'}})
  "is_default"?: boolean;
}
export class UpdateAddressPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class UpdateAddressQueryDto {
}
export class UpdateAddressHeadersDto {
}
export class DeleteAddressPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class DeleteAddressQueryDto {
}
export class DeleteAddressHeadersDto {
}
export class SubmitStoreApplicationBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "proposed_name"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "contact"!: string;
}
export class SubmitStoreApplicationPathDto {
}
export class SubmitStoreApplicationQueryDto {
}
export class SubmitStoreApplicationHeadersDto {
}
export class ListOwnStoreApplicationsPathDto {
}
export class ListOwnStoreApplicationsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListOwnStoreApplicationsHeadersDto {
}
export class ListStoreApplicationsPathDto {
}
export class ListStoreApplicationsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "q"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["PENDING", "APPROVED", "REJECTED"]}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["PENDING", "APPROVED", "REJECTED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "status"?: "PENDING" | "APPROVED" | "REJECTED";
}
export class ListStoreApplicationsHeadersDto {
}
export class ReviewStoreApplicationBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["APPROVED", "REJECTED"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "status"!: "APPROVED" | "REJECTED";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "description": "Bắt buộc khi từ chối.", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "decision_reason"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "description": "Phiên bản hiện tại mà client đã đọc.", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class ReviewStoreApplicationPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class ReviewStoreApplicationQueryDto {
}
export class ReviewStoreApplicationHeadersDto {
}
export class GetOwnStorePathDto {
}
export class GetOwnStoreQueryDto {
}
export class GetOwnStoreHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class UpdateOwnStoreBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "name"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 10000},false),defaultMessage:()=> 'Invalid contract field'}})
  "description"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "format": "int64", "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "shipping_fee_vnd"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "object", "additionalProperties": false, "required": ["recipient_name", "phone", "line1", "ward", "district", "city"], "properties": {"recipient_name": {"type": "string", "minLength": 1, "maxLength": 200}, "phone": {"type": "string", "minLength": 1, "maxLength": 30}, "line1": {"type": "string", "minLength": 1, "maxLength": 500}, "ward": {"type": "string", "minLength": 1, "maxLength": 200}, "district": {"type": "string", "minLength": 1, "maxLength": 200}, "city": {"type": "string", "minLength": 1, "maxLength": 200}}},false),defaultMessage:()=> 'Invalid contract field'}})
  "return_address"?: {"recipient_name": string; "phone": string; "line1": string; "ward": string; "district": string; "city": string};
}
export class UpdateOwnStorePathDto {
}
export class UpdateOwnStoreQueryDto {
}
export class UpdateOwnStoreHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListStoreStaffPathDto {
}
export class ListStoreStaffQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListStoreStaffHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListStaffInvitationsPathDto {
}
export class ListStaffInvitationsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListStaffInvitationsHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class InviteStaffBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "email", "maxLength": 254},true),defaultMessage:()=> 'Invalid contract field'}})
  "invited_email"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "string", "maxLength": 200, "enum": ["product.store.read_write", "inventory.store.read_adjust", "order.store.read_status_cancel", "cod.store.collect"]}, "maxItems": 100},true),defaultMessage:()=> 'Invalid contract field'}})
  "permissions"!: Array<"product.store.read_write" | "inventory.store.read_adjust" | "order.store.read_status_cancel" | "cod.store.collect">;
}
export class InviteStaffPathDto {
}
export class InviteStaffQueryDto {
}
export class InviteStaffHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class RevokeStaffInvitationPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class RevokeStaffInvitationQueryDto {
}
export class RevokeStaffInvitationHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListOwnInvitationsPathDto {
}
export class ListOwnInvitationsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListOwnInvitationsHeadersDto {
}
export class AcceptInvitationPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class AcceptInvitationQueryDto {
}
export class AcceptInvitationHeadersDto {
}
export class ListCategoriesPathDto {
}
export class ListCategoriesQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListCategoriesHeadersDto {
}
export class ListProductTypesPathDto {
}
export class ListProductTypesQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListProductTypesHeadersDto {
}
export class ListProductsPathDto {
}
export class ListProductsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "q"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "category_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "product_type_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["title", "price_asc", "price_desc"], "default": "title"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["title", "price_asc", "price_desc"], "default": "title"},false),defaultMessage:()=> 'Invalid contract field'}})
  "sort": "title" | "price_asc" | "price_desc" = "title";
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 0, "maximum": 9007199254740991}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "min_price_vnd"?: number;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 0, "maximum": 9007199254740991}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "max_price_vnd"?: number;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 3699, "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(,[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}){0,99}$", "example": "11111111-1111-4111-8111-111111111111"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 3699, "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(,[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}){0,99}$", "example": "11111111-1111-4111-8111-111111111111"},false),defaultMessage:()=> 'Invalid contract field'}})
  "ids"?: string;
}
export class ListProductsHeadersDto {
}
export class GetProductPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class GetProductQueryDto {
}
export class GetProductHeadersDto {
}
export class ListStoreProductsPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class ListStoreProductsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListStoreProductsHeadersDto {
}
export class ListOwnStoreProductsPathDto {
}
export class ListOwnStoreProductsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "q"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["DRAFT", "ACTIVE", "STOPPED"]}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["DRAFT", "ACTIVE", "STOPPED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "status"?: "DRAFT" | "ACTIVE" | "STOPPED";
}
export class ListOwnStoreProductsHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class CreateProductBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "product_type_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200, "minLength": 1},true),defaultMessage:()=> 'Invalid contract field'}})
  "title"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 10000},false),defaultMessage:()=> 'Invalid contract field'}})
  "description"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "object", "additionalProperties": true},true),defaultMessage:()=> 'Invalid contract field'}})
  "attributes"!: {} & Record<string, unknown>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "sku": {"type": "string", "maxLength": 200}, "price_vnd": {"type": "integer", "format": "int64", "minimum": 0, "maximum": 9007199254740991}, "variant_values": {"type": "object", "additionalProperties": true}, "is_default": {"type": "boolean"}, "status": {"type": "string", "maxLength": 200}, "available_quantity": {"type": "integer", "minimum": 0, "maximum": 2147483647, "description": "Current sellable quantity (commercial quantity minus reservations); advisory read, checkout revalidates stock. Omitted by legacy or management-only readers."}}, "required": ["sku", "price_vnd", "variant_values"], "additionalProperties": false}, "maxItems": 100},false),defaultMessage:()=> 'Invalid contract field'}})
  "variants"?: Array<{"id"?: string; "sku": string; "price_vnd": number; "variant_values": {} & Record<string, unknown>; "is_default"?: boolean; "status"?: string; "available_quantity"?: number}>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["DRAFT", "ACTIVE", "STOPPED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "status"?: "DRAFT" | "ACTIVE" | "STOPPED";
}
export class CreateProductPathDto {
}
export class CreateProductQueryDto {
}
export class CreateProductHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class UpdateProductBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "product_type_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200, "minLength": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "title"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 10000},false),defaultMessage:()=> 'Invalid contract field'}})
  "description"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "object", "additionalProperties": true},false),defaultMessage:()=> 'Invalid contract field'}})
  "attributes"?: {} & Record<string, unknown>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "object", "properties": {"id": {"type": "string", "format": "uuid"}, "sku": {"type": "string", "maxLength": 200}, "price_vnd": {"type": "integer", "format": "int64", "minimum": 0, "maximum": 9007199254740991}, "variant_values": {"type": "object", "additionalProperties": true}, "is_default": {"type": "boolean"}, "status": {"type": "string", "maxLength": 200}, "available_quantity": {"type": "integer", "minimum": 0, "maximum": 2147483647, "description": "Current sellable quantity (commercial quantity minus reservations); advisory read, checkout revalidates stock. Omitted by legacy or management-only readers."}}, "required": ["sku", "price_vnd", "variant_values"], "additionalProperties": false}, "maxItems": 100},false),defaultMessage:()=> 'Invalid contract field'}})
  "variants"?: Array<{"id"?: string; "sku": string; "price_vnd": number; "variant_values": {} & Record<string, unknown>; "is_default"?: boolean; "status"?: string; "available_quantity"?: number}>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["DRAFT", "ACTIVE", "STOPPED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "status"?: "DRAFT" | "ACTIVE" | "STOPPED";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "description": "Phiên bản hiện tại mà client đã đọc.", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class UpdateProductPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class UpdateProductQueryDto {
}
export class UpdateProductHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class GetOwnStoreProductPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class GetOwnStoreProductQueryDto {
}
export class GetOwnStoreProductHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class CreateVariantBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "sku"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "format": "int64", "minimum": 0, "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "price_vnd"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "object", "additionalProperties": true},true),defaultMessage:()=> 'Invalid contract field'}})
  "variant_values"!: {} & Record<string, unknown>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "boolean"},false),defaultMessage:()=> 'Invalid contract field'}})
  "is_default"?: boolean;
}
export class CreateVariantPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class CreateVariantQueryDto {
}
export class CreateVariantHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class AddProductImageBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uri", "maxLength": 2048},true),defaultMessage:()=> 'Invalid contract field'}})
  "image_url"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "variant_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "position"?: number;
}
export class AddProductImagePathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class AddProductImageQueryDto {
}
export class AddProductImageHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListStoreInventoryPathDto {
}
export class ListStoreInventoryQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "q"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "product_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "variant_id"?: string;
}
export class ListStoreInventoryHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class AdjustInventoryBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "variant_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "delta_quantity"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "reason"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class AdjustInventoryPathDto {
}
export class AdjustInventoryQueryDto {
}
export class AdjustInventoryHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListStockMovementsPathDto {
}
export class ListStockMovementsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "q"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "product_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "variant_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "from"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "to"?: string;
}
export class ListStockMovementsHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListCartItemsPathDto {
}
export class ListCartItemsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListCartItemsHeadersDto {
}
export class AddCartItemBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "variant_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 2147483647},true),defaultMessage:()=> 'Invalid contract field'}})
  "quantity"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid", "description": "Product chứa Variant; M2 xác minh qua Catalog M1."},true),defaultMessage:()=> 'Invalid contract field'}})
  "product_id"!: string;
}
export class AddCartItemPathDto {
}
export class AddCartItemQueryDto {
}
export class AddCartItemHeadersDto {
}
export class UpdateCartItemBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 2147483647},true),defaultMessage:()=> 'Invalid contract field'}})
  "quantity"!: number;
}
export class UpdateCartItemPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class UpdateCartItemQueryDto {
}
export class UpdateCartItemHeadersDto {
}
export class RemoveCartItemPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class RemoveCartItemQueryDto {
}
export class RemoveCartItemHeadersDto {
}
export class QuoteCheckoutBodyDto {
}
export class QuoteCheckoutPathDto {
}
export class QuoteCheckoutQueryDto {
}
export class QuoteCheckoutHeadersDto {
}
export class ConfirmCheckoutBodyDto {
}
export class ConfirmCheckoutPathDto {
}
export class ConfirmCheckoutQueryDto {
}
export class ConfirmCheckoutHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "minLength": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1},true),defaultMessage:()=> 'Invalid contract field'}})
  "idempotency-key"!: string;
}
export class GetPurchaseGroupOrdersPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class GetPurchaseGroupOrdersQueryDto {
}
export class GetPurchaseGroupOrdersHeadersDto {
}
export class CreatePaymentAttemptBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_order_version"!: number;
}
export class CreatePaymentAttemptPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class CreatePaymentAttemptQueryDto {
}
export class CreatePaymentAttemptHeadersDto {
}
export class GetPaymentPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class GetPaymentQueryDto {
}
export class GetPaymentHeadersDto {
}
export class SandboxCallbackBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "provider_event_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "provider_reference"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["SUCCESS", "FAILED", "CANCELLED"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "result"!: "SUCCESS" | "FAILED" | "CANCELLED";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "signature"!: string;
}
export class SandboxCallbackPathDto {
}
export class SandboxCallbackQueryDto {
}
export class SandboxCallbackHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string"},true),defaultMessage:()=> 'Invalid contract field'}})
  "x-sandbox-signature"!: string;
}
export class GetOrderRefundPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class GetOrderRefundQueryDto {
}
export class GetOrderRefundHeadersDto {
}
export class ListOwnOrdersPathDto {
}
export class ListOwnOrdersQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "q"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["PREPARING", "AWAITING_PAYMENT", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED", "EXPIRED", "RECOVERING"]}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["PREPARING", "AWAITING_PAYMENT", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED", "EXPIRED", "RECOVERING"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "status"?: "PREPARING" | "AWAITING_PAYMENT" | "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "RECOVERING";
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["PENDING", "UNKNOWN", "SUCCEEDED", "FAILED", "CANCELLED", "REFUNDED"]}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["PENDING", "UNKNOWN", "SUCCEEDED", "FAILED", "CANCELLED", "REFUNDED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "payment_status"?: "PENDING" | "UNKNOWN" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "REFUNDED";
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["REQUESTED", "PROCESSING", "UNKNOWN", "SUCCEEDED", "FAILED"]}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["REQUESTED", "PROCESSING", "UNKNOWN", "SUCCEEDED", "FAILED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "refund_status"?: "REQUESTED" | "PROCESSING" | "UNKNOWN" | "SUCCEEDED" | "FAILED";
}
export class ListOwnOrdersHeadersDto {
}
export class GetOwnOrderPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class GetOwnOrderQueryDto {
}
export class GetOwnOrderHeadersDto {
}
export class CancelOwnOrderBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "reason"?: string;
}
export class CancelOwnOrderPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class CancelOwnOrderQueryDto {
}
export class CancelOwnOrderHeadersDto {
}
export class ListStoreOrdersPathDto {
}
export class ListStoreOrdersQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "q"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["PREPARING", "AWAITING_PAYMENT", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED", "EXPIRED", "RECOVERING"]}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["PREPARING", "AWAITING_PAYMENT", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED", "EXPIRED", "RECOVERING"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "status"?: "PREPARING" | "AWAITING_PAYMENT" | "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "RECOVERING";
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["PENDING", "UNKNOWN", "SUCCEEDED", "FAILED", "CANCELLED", "REFUNDED"]}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["PENDING", "UNKNOWN", "SUCCEEDED", "FAILED", "CANCELLED", "REFUNDED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "payment_status"?: "PENDING" | "UNKNOWN" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "REFUNDED";
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["REQUESTED", "PROCESSING", "UNKNOWN", "SUCCEEDED", "FAILED"]}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["REQUESTED", "PROCESSING", "UNKNOWN", "SUCCEEDED", "FAILED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "refund_status"?: "REQUESTED" | "PROCESSING" | "UNKNOWN" | "SUCCEEDED" | "FAILED";
}
export class ListStoreOrdersHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class GetStoreOrderPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class GetStoreOrderQueryDto {
}
export class GetStoreOrderHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class TransitionStoreOrderBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "to_status"!: "CONFIRMED" | "PROCESSING" | "SHIPPED" | "COMPLETED";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class TransitionStoreOrderPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class TransitionStoreOrderQueryDto {
}
export class TransitionStoreOrderHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string"},false),defaultMessage:()=> 'Invalid contract field'}})
  "if-match"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class CancelStoreOrderBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "reason"?: string;
}
export class CancelStoreOrderPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class CancelStoreOrderQueryDto {
}
export class CancelStoreOrderHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class CollectCodBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "format": "int64", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "amount_collected_vnd"!: number;
}
export class CollectCodPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class CollectCodQueryDto {
}
export class CollectCodHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ValidateVouchersBodyDto {
}
export class ValidateVouchersPathDto {
}
export class ValidateVouchersQueryDto {
}
export class ValidateVouchersHeadersDto {
}
export class ListStoreVouchersPathDto {
}
export class ListStoreVouchersQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListStoreVouchersHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class CreateStoreVoucherBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "code"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["STORE", "PLATFORM"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "scope"!: "STORE" | "PLATFORM";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "store_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["FIXED", "PERCENT"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "discount_type"!: "FIXED" | "PERCENT";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "discount_value"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "min_goods_vnd"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "max_discount_vnd"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},true),defaultMessage:()=> 'Invalid contract field'}})
  "starts_at"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},true),defaultMessage:()=> 'Invalid contract field'}})
  "ends_at"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "usage_limit"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "per_customer_limit"!: number;
}
export class CreateStoreVoucherPathDto {
}
export class CreateStoreVoucherQueryDto {
}
export class CreateStoreVoucherHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class UpdateStoreVoucherBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["FIXED", "PERCENT"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "discount_type"?: "FIXED" | "PERCENT";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "discount_value"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "min_goods_vnd"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991, "nullable": true, "description": "Omit to preserve the existing cap; null explicitly removes the cap. New orders use updated rules; committed orders retain their discount snapshots.", "minimum": 0},false),defaultMessage:()=> 'Invalid contract field'}})
  "max_discount_vnd"?: number | null;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "starts_at"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "ends_at"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "usage_limit"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "per_customer_limit"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["ACTIVE", "STOPPED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "status"?: "ACTIVE" | "STOPPED";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "description": "Phiên bản hiện tại mà client đã đọc.", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class UpdateStoreVoucherPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class UpdateStoreVoucherQueryDto {
}
export class UpdateStoreVoucherHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListPlatformVouchersPathDto {
}
export class ListPlatformVouchersQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListPlatformVouchersHeadersDto {
}
export class CreatePlatformVoucherBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "code"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["STORE", "PLATFORM"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "scope"!: "STORE" | "PLATFORM";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "store_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["FIXED", "PERCENT"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "discount_type"!: "FIXED" | "PERCENT";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "discount_value"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "min_goods_vnd"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "max_discount_vnd"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},true),defaultMessage:()=> 'Invalid contract field'}})
  "starts_at"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},true),defaultMessage:()=> 'Invalid contract field'}})
  "ends_at"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "usage_limit"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "per_customer_limit"!: number;
}
export class CreatePlatformVoucherPathDto {
}
export class CreatePlatformVoucherQueryDto {
}
export class CreatePlatformVoucherHeadersDto {
}
export class UpdatePlatformVoucherBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["FIXED", "PERCENT"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "discount_type"?: "FIXED" | "PERCENT";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "discount_value"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "min_goods_vnd"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991, "nullable": true, "description": "Omit to preserve the existing cap; null explicitly removes the cap. New orders use updated rules; committed orders retain their discount snapshots.", "minimum": 0},false),defaultMessage:()=> 'Invalid contract field'}})
  "max_discount_vnd"?: number | null;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "starts_at"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "ends_at"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "usage_limit"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "per_customer_limit"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["ACTIVE", "STOPPED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "status"?: "ACTIVE" | "STOPPED";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "description": "Phiên bản hiện tại mà client đã đọc.", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class UpdatePlatformVoucherPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class UpdatePlatformVoucherQueryDto {
}
export class UpdatePlatformVoucherHeadersDto {
}
export class ListProductReviewsPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class ListProductReviewsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 5}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 5},false),defaultMessage:()=> 'Invalid contract field'}})
  "rating"?: number;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["newest", "rating_desc", "rating_asc"], "default": "newest"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["newest", "rating_desc", "rating_asc"], "default": "newest"},false),defaultMessage:()=> 'Invalid contract field'}})
  "sort": "newest" | "rating_desc" | "rating_asc" = "newest";
}
export class ListProductReviewsHeadersDto {
}
export class CreateReviewBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "order_item_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 5},true),defaultMessage:()=> 'Invalid contract field'}})
  "rating"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 10000},false),defaultMessage:()=> 'Invalid contract field'}})
  "body"?: string;
}
export class CreateReviewPathDto {
}
export class CreateReviewQueryDto {
}
export class CreateReviewHeadersDto {
}
export class ListOwnReviewsPathDto {
}
export class ListOwnReviewsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "product_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "order_item_id"?: string;
}
export class ListOwnReviewsHeadersDto {
}
export class UpdateReviewBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 5},false),defaultMessage:()=> 'Invalid contract field'}})
  "rating"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 10000},false),defaultMessage:()=> 'Invalid contract field'}})
  "body"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "description": "Phiên bản hiện tại mà client đã đọc.", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class UpdateReviewPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class UpdateReviewQueryDto {
}
export class UpdateReviewHeadersDto {
}
export class HideReviewBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "reason"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class HideReviewPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class HideReviewQueryDto {
}
export class HideReviewHeadersDto {
}
export class RestoreReviewBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "reason"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class RestoreReviewPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class RestoreReviewQueryDto {
}
export class RestoreReviewHeadersDto {
}
export class ListUsersPathDto {
}
export class ListUsersQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "q"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["ACTIVE", "LOCKED"]}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["ACTIVE", "LOCKED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "status"?: "ACTIVE" | "LOCKED";
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "minLength": 36, "maxLength": 3699, "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(,[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}){0,99}$", "example": "11111111-1111-4111-8111-111111111111"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 36, "maxLength": 3699, "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(,[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}){0,99}$", "example": "11111111-1111-4111-8111-111111111111"},false),defaultMessage:()=> 'Invalid contract field'}})
  "ids"?: string;
}
export class ListUsersHeadersDto {
}
export class UpdateUserStateBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "status"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "reason"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class UpdateUserStatePathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class UpdateUserStateQueryDto {
}
export class UpdateUserStateHeadersDto {
}
export class ListStoresPathDto {
}
export class ListStoresQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "q"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["ACTIVE", "LOCKED"]}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["ACTIVE", "LOCKED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "status"?: "ACTIVE" | "LOCKED";
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "minLength": 36, "maxLength": 3699, "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(,[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}){0,99}$", "example": "11111111-1111-4111-8111-111111111111"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 36, "maxLength": 3699, "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(,[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}){0,99}$", "example": "11111111-1111-4111-8111-111111111111"},false),defaultMessage:()=> 'Invalid contract field'}})
  "ids"?: string;
}
export class ListStoresHeadersDto {
}
export class UpdateStoreStateBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "status"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "reason"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class UpdateStoreStatePathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class UpdateStoreStateQueryDto {
}
export class UpdateStoreStateHeadersDto {
}
export class ListAllOrdersPathDto {
}
export class ListAllOrdersQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "q"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["PREPARING", "AWAITING_PAYMENT", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED", "EXPIRED", "RECOVERING"]}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["PREPARING", "AWAITING_PAYMENT", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED", "EXPIRED", "RECOVERING"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "status"?: "PREPARING" | "AWAITING_PAYMENT" | "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "RECOVERING";
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["PENDING", "UNKNOWN", "SUCCEEDED", "FAILED", "CANCELLED", "REFUNDED"]}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["PENDING", "UNKNOWN", "SUCCEEDED", "FAILED", "CANCELLED", "REFUNDED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "payment_status"?: "PENDING" | "UNKNOWN" | "SUCCEEDED" | "FAILED" | "CANCELLED" | "REFUNDED";
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "store_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["REQUESTED", "PROCESSING", "UNKNOWN", "SUCCEEDED", "FAILED"]}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["REQUESTED", "PROCESSING", "UNKNOWN", "SUCCEEDED", "FAILED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "refund_status"?: "REQUESTED" | "PROCESSING" | "UNKNOWN" | "SUCCEEDED" | "FAILED";
}
export class ListAllOrdersHeadersDto {
}
export class GetPlatformDashboardPathDto {
}
export class GetPlatformDashboardQueryDto {
}
export class GetPlatformDashboardHeadersDto {
}
export class ListRolesPathDto {
}
export class ListRolesQueryDto {
}
export class ListRolesHeadersDto {
}
export class UpdateRoleBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "string", "format": "uuid"}, "maxItems": 100},true),defaultMessage:()=> 'Invalid contract field'}})
  "permission_ids"!: Array<string>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class UpdateRolePathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class UpdateRoleQueryDto {
}
export class UpdateRoleHeadersDto {
}
export class CreateChatSessionBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 2000, "minLength": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "first_message"?: string;
}
export class CreateChatSessionPathDto {
}
export class CreateChatSessionQueryDto {
}
export class CreateChatSessionHeadersDto {
}
export class SendChatMessageBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 2000, "minLength": 1},true),defaultMessage:()=> 'Invalid contract field'}})
  "content"!: string;
}
export class SendChatMessagePathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class SendChatMessageQueryDto {
}
export class SendChatMessageHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "pattern": "^[a-f0-9]{64}$", "example": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "pattern": "^[a-f0-9]{64}$", "example": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-chat-key"?: string;
}
export class ListOwnChatSessionsPathDto {
}
export class ListOwnChatSessionsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "session_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "message_page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "message_size": number = 20;
}
export class ListOwnChatSessionsHeadersDto {
}
export class GetForYouPathDto {
}
export class GetForYouQueryDto {
}
export class GetForYouHeadersDto {
}
export class GetRelatedProductsPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class GetRelatedProductsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class GetRelatedProductsHeadersDto {
}
export class UpdateStaffBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["ACTIVE", "LOCKED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "status"?: "ACTIVE" | "LOCKED";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "string", "maxLength": 200}, "maxItems": 100},false),defaultMessage:()=> 'Invalid contract field'}})
  "permissions"?: Array<string>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "description": "Phiên bản hiện tại mà client đã đọc.", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class UpdateStaffPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class UpdateStaffQueryDto {
}
export class UpdateStaffHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class GetStoreReportPathDto {
}
export class GetStoreReportQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},true),defaultMessage:()=> 'Invalid contract field'}})
  "from"!: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},true),defaultMessage:()=> 'Invalid contract field'}})
  "to"!: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["DAY", "MONTH"], "default": "DAY"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["DAY", "MONTH"], "default": "DAY"},false),defaultMessage:()=> 'Invalid contract field'}})
  "granularity": "DAY" | "MONTH" = "DAY";
}
export class GetStoreReportHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class GetStoreVoucherUsagePathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class GetStoreVoucherUsageQueryDto {
}
export class GetStoreVoucherUsageHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class GetPlatformVoucherUsagePathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class GetPlatformVoucherUsageQueryDto {
}
export class GetPlatformVoucherUsageHeadersDto {
}
export class CreateCategoryBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "name"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "parent_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "category_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "product_type_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "data_type"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "boolean"},false),defaultMessage:()=> 'Invalid contract field'}})
  "required"?: boolean;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "unit"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "boolean"},false),defaultMessage:()=> 'Invalid contract field'}})
  "variant_axis"?: boolean;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "string", "maxLength": 200}, "maxItems": 100},false),defaultMessage:()=> 'Invalid contract field'}})
  "allowed_values"?: Array<string>;
}
export class CreateCategoryPathDto {
}
export class CreateCategoryQueryDto {
}
export class CreateCategoryHeadersDto {
}
export class UpdateCategoryBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "name"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "parent_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "category_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "product_type_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "data_type"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "boolean"},false),defaultMessage:()=> 'Invalid contract field'}})
  "required"?: boolean;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "unit"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "boolean"},false),defaultMessage:()=> 'Invalid contract field'}})
  "variant_axis"?: boolean;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "string", "maxLength": 200}, "maxItems": 100},false),defaultMessage:()=> 'Invalid contract field'}})
  "allowed_values"?: Array<string>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "description": "Phiên bản hiện tại mà client đã đọc.", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class UpdateCategoryPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class UpdateCategoryQueryDto {
}
export class UpdateCategoryHeadersDto {
}
export class CreateProductTypeBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "name"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "parent_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "category_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "product_type_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "data_type"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "boolean"},false),defaultMessage:()=> 'Invalid contract field'}})
  "required"?: boolean;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "unit"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "boolean"},false),defaultMessage:()=> 'Invalid contract field'}})
  "variant_axis"?: boolean;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "string", "maxLength": 200}, "maxItems": 100},false),defaultMessage:()=> 'Invalid contract field'}})
  "allowed_values"?: Array<string>;
}
export class CreateProductTypePathDto {
}
export class CreateProductTypeQueryDto {
}
export class CreateProductTypeHeadersDto {
}
export class UpdateProductTypeBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "name"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "parent_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "category_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "product_type_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "data_type"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "boolean"},false),defaultMessage:()=> 'Invalid contract field'}})
  "required"?: boolean;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "unit"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "boolean"},false),defaultMessage:()=> 'Invalid contract field'}})
  "variant_axis"?: boolean;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "string", "maxLength": 200}, "maxItems": 100},false),defaultMessage:()=> 'Invalid contract field'}})
  "allowed_values"?: Array<string>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "description": "Phiên bản hiện tại mà client đã đọc.", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class UpdateProductTypePathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class UpdateProductTypeQueryDto {
}
export class UpdateProductTypeHeadersDto {
}
export class CreateAttributeDefinitionBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "name"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "product_type_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200, "enum": ["STRING", "TEXT", "NUMBER", "BOOLEAN"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "data_type"!: "STRING" | "TEXT" | "NUMBER" | "BOOLEAN";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "boolean"},false),defaultMessage:()=> 'Invalid contract field'}})
  "required"?: boolean;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "unit"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "boolean"},false),defaultMessage:()=> 'Invalid contract field'}})
  "variant_axis"?: boolean;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "string", "maxLength": 200}, "maxItems": 100},false),defaultMessage:()=> 'Invalid contract field'}})
  "allowed_values"?: Array<string>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200, "pattern": "^[a-zA-Z][a-zA-Z0-9_]*$", "example": "shirt_size"},false),defaultMessage:()=> 'Invalid contract field'}})
  "code"?: string;
}
export class CreateAttributeDefinitionPathDto {
}
export class CreateAttributeDefinitionQueryDto {
}
export class CreateAttributeDefinitionHeadersDto {
}
export class UpdateAttributeDefinitionBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "name"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "parent_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "category_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "product_type_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "data_type"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "boolean"},false),defaultMessage:()=> 'Invalid contract field'}})
  "required"?: boolean;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "unit"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "boolean"},false),defaultMessage:()=> 'Invalid contract field'}})
  "variant_axis"?: boolean;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "string", "maxLength": 200}, "maxItems": 100},false),defaultMessage:()=> 'Invalid contract field'}})
  "allowed_values"?: Array<string>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "description": "Phiên bản hiện tại mà client đã đọc.", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class UpdateAttributeDefinitionPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class UpdateAttributeDefinitionQueryDto {
}
export class UpdateAttributeDefinitionHeadersDto {
}
export class HideProductBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "reason"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class HideProductPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class HideProductQueryDto {
}
export class HideProductHeadersDto {
}
export class RestoreProductBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "reason"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class RestoreProductPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class RestoreProductQueryDto {
}
export class RestoreProductHeadersDto {
}
export class GetAiMetricsPathDto {
}
export class GetAiMetricsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "store_id"?: string;
}
export class GetAiMetricsHeadersDto {
}
export class GetPersonalizationConsentPathDto {
}
export class GetPersonalizationConsentQueryDto {
}
export class GetPersonalizationConsentHeadersDto {
}
export class UpdatePersonalizationConsentBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["GRANTED", "WITHDRAWN"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "status"!: "GRANTED" | "WITHDRAWN";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class UpdatePersonalizationConsentPathDto {
}
export class UpdatePersonalizationConsentQueryDto {
}
export class UpdatePersonalizationConsentHeadersDto {
}
export class SepayCallbackBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "maximum": 9007199254740991, "minimum": 1},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["in", "out"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "transferType"!: "in" | "out";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "transferAmount"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "accountNumber"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "nullable": true, "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "code"?: string | null;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 10000},true),defaultMessage:()=> 'Invalid contract field'}})
  "content"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "referenceCode"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "gateway"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 19, "pattern": "^\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}$", "example": "2026-10-07 10:30:00"},false),defaultMessage:()=> 'Invalid contract field'}})
  "transactionDate"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "nullable": true, "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "subAccount"?: string | null;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "nullable": true, "maxLength": 10000},false),defaultMessage:()=> 'Invalid contract field'}})
  "description"?: string | null;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "accumulated"?: number;
}
export class SepayCallbackPathDto {
}
export class SepayCallbackQueryDto {
}
export class SepayCallbackHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string"},true),defaultMessage:()=> 'Invalid contract field'}})
  "x-sepay-signature"!: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string"},true),defaultMessage:()=> 'Invalid contract field'}})
  "x-sepay-timestamp"!: string;
}
export class ListFavoritesPathDto {
}
export class ListFavoritesQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListFavoritesHeadersDto {
}
export class AddFavoritePathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class AddFavoriteQueryDto {
}
export class AddFavoriteHeadersDto {
}
export class RemoveFavoritePathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class RemoveFavoriteQueryDto {
}
export class RemoveFavoriteHeadersDto {
}
export class RemoveProductImagePathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "image_id"!: string;
}
export class RemoveProductImageQueryDto {
}
export class RemoveProductImageHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ReorderProductImagesBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "string", "format": "uuid"}, "uniqueItems": true, "maxItems": 100},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_image_ids"!: Array<string>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "string", "format": "uuid"}, "uniqueItems": true, "maxItems": 100},true),defaultMessage:()=> 'Invalid contract field'}})
  "image_ids"!: Array<string>;
}
export class ReorderProductImagesPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class ReorderProductImagesQueryDto {
}
export class ReorderProductImagesHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListOwnConversationsPathDto {
}
export class ListOwnConversationsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListOwnConversationsHeadersDto {
}
export class StartStoreConversationBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "store_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "order_id"?: string;
}
export class StartStoreConversationPathDto {
}
export class StartStoreConversationQueryDto {
}
export class StartStoreConversationHeadersDto {
}
export class ListStoreConversationsPathDto {
}
export class ListStoreConversationsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListStoreConversationsHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListOwnConversationMessagesPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class ListOwnConversationMessagesQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListOwnConversationMessagesHeadersDto {
}
export class SendOwnConversationMessageBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 2000},true),defaultMessage:()=> 'Invalid contract field'}})
  "content"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "client_message_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "order_id"?: string;
}
export class SendOwnConversationMessagePathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class SendOwnConversationMessageQueryDto {
}
export class SendOwnConversationMessageHeadersDto {
}
export class ListStoreConversationMessagesPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class ListStoreConversationMessagesQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListStoreConversationMessagesHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class SendStoreConversationMessageBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 2000},true),defaultMessage:()=> 'Invalid contract field'}})
  "content"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "client_message_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "order_id"?: string;
}
export class SendStoreConversationMessagePathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class SendStoreConversationMessageQueryDto {
}
export class SendStoreConversationMessageHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListNotificationsPathDto {
}
export class ListNotificationsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListNotificationsHeadersDto {
}
export class MarkNotificationReadPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 80, "minLength": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 80, "minLength": 1},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class MarkNotificationReadQueryDto {
}
export class MarkNotificationReadHeadersDto {
}
export class CreateReturnRequestBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["REFUND", "EXCHANGE"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "type"!: "REFUND" | "EXCHANGE";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 2000},true),defaultMessage:()=> 'Invalid contract field'}})
  "reason"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_order_version"!: number;
}
export class CreateReturnRequestPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class CreateReturnRequestQueryDto {
}
export class CreateReturnRequestHeadersDto {
}
export class ListOwnReturnRequestsPathDto {
}
export class ListOwnReturnRequestsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "order_id"?: string;
}
export class ListOwnReturnRequestsHeadersDto {
}
export class ListStoreReturnRequestsPathDto {
}
export class ListStoreReturnRequestsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "order_id"?: string;
}
export class ListStoreReturnRequestsHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class UpdateStoreReturnRequestBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["APPROVED", "REJECTED", "RECEIVED", "EXCHANGE_SENT", "COMPLETED"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "status"!: "APPROVED" | "REJECTED" | "RECEIVED" | "EXCHANGE_SENT" | "COMPLETED";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 2000},false),defaultMessage:()=> 'Invalid contract field'}})
  "decision_note"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "replacement_reference"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["STORE", "CUSTOMER", "DISPUTED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "fault_party"?: "STORE" | "CUSTOMER" | "DISPUTED";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 2000},false),defaultMessage:()=> 'Invalid contract field'}})
  "return_instructions"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "object", "properties": {"order_item_id": {"type": "string", "format": "uuid"}, "received_quantity": {"type": "integer", "minimum": 0, "maximum": 2147483647}, "resellable_quantity": {"type": "integer", "minimum": 0, "maximum": 2147483647}, "damaged_quantity": {"type": "integer", "minimum": 0, "maximum": 2147483647}, "pending_quantity": {"type": "integer", "minimum": 0, "maximum": 2147483647}}, "required": ["order_item_id", "received_quantity", "resellable_quantity", "damaged_quantity", "pending_quantity"], "additionalProperties": false}},false),defaultMessage:()=> 'Invalid contract field'}})
  "inspection"?: Array<{"order_item_id": string; "received_quantity": number; "resellable_quantity": number; "damaged_quantity": number; "pending_quantity": number}>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 2000},false),defaultMessage:()=> 'Invalid contract field'}})
  "inspection_note"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 2000},false),defaultMessage:()=> 'Invalid contract field'}})
  "legacy_reconciliation_note"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "minItems": 1, "maxItems": 100, "items": {"type": "object", "properties": {"order_item_id": {"type": "string", "format": "uuid"}, "variant_id": {"type": "string", "format": "uuid"}}, "required": ["order_item_id", "variant_id"], "additionalProperties": false}},false),defaultMessage:()=> 'Invalid contract field'}})
  "replacements"?: Array<{"order_item_id": string; "variant_id": string}>;
}
export class UpdateStoreReturnRequestPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class UpdateStoreReturnRequestQueryDto {
}
export class UpdateStoreReturnRequestHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListAdminReturnRequestsPathDto {
}
export class ListAdminReturnRequestsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "order_id"?: string;
}
export class ListAdminReturnRequestsHeadersDto {
}
export class UpdateAdminReturnRequestBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["APPROVED", "REJECTED", "RECEIVED", "EXCHANGE_SENT", "COMPLETED"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "status"!: "APPROVED" | "REJECTED" | "RECEIVED" | "EXCHANGE_SENT" | "COMPLETED";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 2000},false),defaultMessage:()=> 'Invalid contract field'}})
  "decision_note"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "replacement_reference"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["STORE", "CUSTOMER", "DISPUTED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "fault_party"?: "STORE" | "CUSTOMER" | "DISPUTED";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 2000},false),defaultMessage:()=> 'Invalid contract field'}})
  "return_instructions"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "object", "properties": {"order_item_id": {"type": "string", "format": "uuid"}, "received_quantity": {"type": "integer", "minimum": 0, "maximum": 2147483647}, "resellable_quantity": {"type": "integer", "minimum": 0, "maximum": 2147483647}, "damaged_quantity": {"type": "integer", "minimum": 0, "maximum": 2147483647}, "pending_quantity": {"type": "integer", "minimum": 0, "maximum": 2147483647}}, "required": ["order_item_id", "received_quantity", "resellable_quantity", "damaged_quantity", "pending_quantity"], "additionalProperties": false}},false),defaultMessage:()=> 'Invalid contract field'}})
  "inspection"?: Array<{"order_item_id": string; "received_quantity": number; "resellable_quantity": number; "damaged_quantity": number; "pending_quantity": number}>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 2000},false),defaultMessage:()=> 'Invalid contract field'}})
  "inspection_note"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 2000},false),defaultMessage:()=> 'Invalid contract field'}})
  "legacy_reconciliation_note"?: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "minItems": 1, "maxItems": 100, "items": {"type": "object", "properties": {"order_item_id": {"type": "string", "format": "uuid"}, "variant_id": {"type": "string", "format": "uuid"}}, "required": ["order_item_id", "variant_id"], "additionalProperties": false}},false),defaultMessage:()=> 'Invalid contract field'}})
  "replacements"?: Array<{"order_item_id": string; "variant_id": string}>;
}
export class UpdateAdminReturnRequestPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class UpdateAdminReturnRequestQueryDto {
}
export class UpdateAdminReturnRequestHeadersDto {
}
export class ConfirmExchangeReceivedBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class ConfirmExchangeReceivedPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class ConfirmExchangeReceivedQueryDto {
}
export class ConfirmExchangeReceivedHeadersDto {
}
export class ListAdminReviewsPathDto {
}
export class ListAdminReviewsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["VISIBLE", "HIDDEN"]}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["VISIBLE", "HIDDEN"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "status"?: "VISIBLE" | "HIDDEN";
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "product_id"?: string;
}
export class ListAdminReviewsHeadersDto {
}
export class ListAdminProductsPathDto {
}
export class ListAdminProductsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "q"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["DRAFT", "ACTIVE", "STOPPED"]}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["DRAFT", "ACTIVE", "STOPPED"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "status"?: "DRAFT" | "ACTIVE" | "STOPPED";
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["VISIBLE", "HIDDEN"]}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["VISIBLE", "HIDDEN"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "moderation_status"?: "VISIBLE" | "HIDDEN";
}
export class ListAdminProductsHeadersDto {
}
export class ListCatalogAuditPathDto {
}
export class ListCatalogAuditQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "minLength": 1, "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "action"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "minLength": 1, "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "target_type"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "actor_user_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "target_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "store_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "from"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "to"?: string;
}
export class ListCatalogAuditHeadersDto {
}
export class ListCommerceAuditPathDto {
}
export class ListCommerceAuditQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "minLength": 1, "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "action"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "minLength": 1, "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "target_type"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "actor_user_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "target_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "store_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "from"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "to"?: string;
}
export class ListCommerceAuditHeadersDto {
}
export class ListIdentityAuditPathDto {
}
export class ListIdentityAuditQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "minLength": 1, "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "action"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "minLength": 1, "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "target_type"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "actor_user_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "target_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "store_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "from"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "to"?: string;
}
export class ListIdentityAuditHeadersDto {
}
export class GetPublicStorePathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class GetPublicStoreQueryDto {
}
export class GetPublicStoreHeadersDto {
}
export class ConfirmCodRefundBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_order_version"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 9007199254740991},false),defaultMessage:()=> 'Invalid contract field'}})
  "expected_return_version"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "receipt_reference"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},true),defaultMessage:()=> 'Invalid contract field'}})
  "recipient_name"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},true),defaultMessage:()=> 'Invalid contract field'}})
  "refunded_at"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "boolean", "enum": [true]},true),defaultMessage:()=> 'Invalid contract field'}})
  "full_amount_confirmed"!: true;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 2147483647},false),defaultMessage:()=> 'Invalid contract field'}})
  "expected_case_version"?: number;
}
export class ConfirmCodRefundPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class ConfirmCodRefundQueryDto {
}
export class ConfirmCodRefundHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListStoreMoneyMovementsPathDto {
}
export class ListStoreMoneyMovementsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},true),defaultMessage:()=> 'Invalid contract field'}})
  "from"!: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},true),defaultMessage:()=> 'Invalid contract field'}})
  "to"!: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 9007199254740991, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 9007199254740991, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListStoreMoneyMovementsHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListAdminMoneyMovementsPathDto {
}
export class ListAdminMoneyMovementsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},true),defaultMessage:()=> 'Invalid contract field'}})
  "from"!: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},true),defaultMessage:()=> 'Invalid contract field'}})
  "to"!: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 9007199254740991, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 9007199254740991, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "store_id"?: string;
}
export class ListAdminMoneyMovementsHeadersDto {
}
export class OpenDeliveryReturnBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 2147483647},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_order_version"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 2000},true),defaultMessage:()=> 'Invalid contract field'}})
  "reason"!: string;
}
export class OpenDeliveryReturnPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class OpenDeliveryReturnQueryDto {
}
export class OpenDeliveryReturnHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListStoreDeliveryReturnsPathDto {
}
export class ListStoreDeliveryReturnsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 2147483647, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 2147483647, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "order_id"?: string;
}
export class ListStoreDeliveryReturnsHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListAdminDeliveryReturnsPathDto {
}
export class ListAdminDeliveryReturnsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 2147483647, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 2147483647, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListAdminDeliveryReturnsHeadersDto {
}
export class GetOwnDeliveryReturnPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class GetOwnDeliveryReturnQueryDto {
}
export class GetOwnDeliveryReturnHeadersDto {
}
export class InspectDeliveryReturnBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 2147483647},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "object", "properties": {"order_item_id": {"type": "string", "format": "uuid"}, "received_quantity": {"type": "integer", "minimum": 0, "maximum": 2147483647}, "resellable_quantity": {"type": "integer", "minimum": 0, "maximum": 2147483647}, "damaged_quantity": {"type": "integer", "minimum": 0, "maximum": 2147483647}, "pending_quantity": {"type": "integer", "minimum": 0, "maximum": 2147483647}}, "required": ["order_item_id", "received_quantity", "resellable_quantity", "damaged_quantity", "pending_quantity"], "additionalProperties": false}, "minItems": 1, "maxItems": 100},true),defaultMessage:()=> 'Invalid contract field'}})
  "lines"!: Array<{"order_item_id": string; "received_quantity": number; "resellable_quantity": number; "damaged_quantity": number; "pending_quantity": number}>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 2000},true),defaultMessage:()=> 'Invalid contract field'}})
  "note"!: string;
}
export class InspectDeliveryReturnPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class InspectDeliveryReturnQueryDto {
}
export class InspectDeliveryReturnHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class SettleDeliveryReturnBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 2147483647},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
}
export class SettleDeliveryReturnPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class SettleDeliveryReturnQueryDto {
}
export class SettleDeliveryReturnHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class IntegrationPaymentCallbackBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 128},true),defaultMessage:()=> 'Invalid contract field'}})
  "provider_event_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 128},true),defaultMessage:()=> 'Invalid contract field'}})
  "provider_reference"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "amount_vnd"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["SUCCESS", "FAILED", "CANCELLED"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "result"!: "SUCCESS" | "FAILED" | "CANCELLED";
}
export class IntegrationPaymentCallbackPathDto {
}
export class IntegrationPaymentCallbackQueryDto {
}
export class IntegrationPaymentCallbackHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 100}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 100},true),defaultMessage:()=> 'Invalid contract field'}})
  "x-integration-signature"!: string;
}
export class ResolveStoreReturnBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["PROPOSE_REFUND", "ACCEPT_REFUND", "DECLINE_REFUND", "DISPUTE", "RESOLVE"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "action"!: "PROPOSE_REFUND" | "ACCEPT_REFUND" | "DECLINE_REFUND" | "DISPUTE" | "RESOLVE";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 2000},true),defaultMessage:()=> 'Invalid contract field'}})
  "note"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["STORE", "CUSTOMER"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "fault_party"?: "STORE" | "CUSTOMER";
}
export class ResolveStoreReturnPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class ResolveStoreReturnQueryDto {
}
export class ResolveStoreReturnHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class RespondOwnReturnBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["PROPOSE_REFUND", "ACCEPT_REFUND", "DECLINE_REFUND", "DISPUTE", "RESOLVE"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "action"!: "PROPOSE_REFUND" | "ACCEPT_REFUND" | "DECLINE_REFUND" | "DISPUTE" | "RESOLVE";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 2000},true),defaultMessage:()=> 'Invalid contract field'}})
  "note"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["STORE", "CUSTOMER"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "fault_party"?: "STORE" | "CUSTOMER";
}
export class RespondOwnReturnPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class RespondOwnReturnQueryDto {
}
export class RespondOwnReturnHeadersDto {
}
export class ResolveAdminReturnBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 9007199254740991},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_version"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["PROPOSE_REFUND", "ACCEPT_REFUND", "DECLINE_REFUND", "DISPUTE", "RESOLVE"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "action"!: "PROPOSE_REFUND" | "ACCEPT_REFUND" | "DECLINE_REFUND" | "DISPUTE" | "RESOLVE";
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 2000},true),defaultMessage:()=> 'Invalid contract field'}})
  "note"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["STORE", "CUSTOMER"]},false),defaultMessage:()=> 'Invalid contract field'}})
  "fault_party"?: "STORE" | "CUSTOMER";
}
export class ResolveAdminReturnPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class ResolveAdminReturnQueryDto {
}
export class ResolveAdminReturnHeadersDto {
}
export class ListStoreCatalogAuditPathDto {
}
export class ListStoreCatalogAuditQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "minLength": 1, "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "action"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "minLength": 1, "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "target_type"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "actor_user_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "target_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "from"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "to"?: string;
}
export class ListStoreCatalogAuditHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListStoreCommerceAuditPathDto {
}
export class ListStoreCommerceAuditQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "minLength": 1, "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "action"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "minLength": 1, "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "target_type"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "actor_user_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "target_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "from"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "to"?: string;
}
export class ListStoreCommerceAuditHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListStoreIdentityAuditPathDto {
}
export class ListStoreIdentityAuditQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "minLength": 1, "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "action"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "minLength": 1, "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "target_type"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "actor_user_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "target_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "from"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},false),defaultMessage:()=> 'Invalid contract field'}})
  "to"?: string;
}
export class ListStoreIdentityAuditHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class LookupStoreAuditActorsBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "minItems": 0, "maxItems": 100, "uniqueItems": true, "items": {"type": "string", "format": "uuid"}},true),defaultMessage:()=> 'Invalid contract field'}})
  "user_ids"!: Array<string>;
}
export class LookupStoreAuditActorsPathDto {
}
export class LookupStoreAuditActorsQueryDto {
}
export class LookupStoreAuditActorsHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class LookupAdminAuditActorsBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "minItems": 0, "maxItems": 100, "uniqueItems": true, "items": {"type": "string", "format": "uuid"}},true),defaultMessage:()=> 'Invalid contract field'}})
  "user_ids"!: Array<string>;
}
export class LookupAdminAuditActorsPathDto {
}
export class LookupAdminAuditActorsQueryDto {
}
export class LookupAdminAuditActorsHeadersDto {
}
export class GetPlatformMoneyReportPathDto {
}
export class GetPlatformMoneyReportQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},true),defaultMessage:()=> 'Invalid contract field'}})
  "from"!: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},true),defaultMessage:()=> 'Invalid contract field'}})
  "to"!: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "store_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "enum": ["DAY", "MONTH"], "default": "DAY"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["DAY", "MONTH"], "default": "DAY"},false),defaultMessage:()=> 'Invalid contract field'}})
  "granularity": "DAY" | "MONTH" = "DAY";
}
export class GetPlatformMoneyReportHeadersDto {
}
export class ListStoreUnresolvedMoneyMovementsPathDto {
}
export class ListStoreUnresolvedMoneyMovementsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 9007199254740991, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 9007199254740991, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListStoreUnresolvedMoneyMovementsHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListAdminUnresolvedMoneyMovementsPathDto {
}
export class ListAdminUnresolvedMoneyMovementsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 9007199254740991, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 9007199254740991, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "store_id"?: string;
}
export class ListAdminUnresolvedMoneyMovementsHeadersDto {
}
export class GetInventoryReconciliationPathDto {
}
export class GetInventoryReconciliationQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "variant_id"!: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},true),defaultMessage:()=> 'Invalid contract field'}})
  "from"!: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "date-time"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},true),defaultMessage:()=> 'Invalid contract field'}})
  "to"!: string;
}
export class GetInventoryReconciliationHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListStockCommitmentsPathDto {
}
export class ListStockCommitmentsQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 200}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 200},false),defaultMessage:()=> 'Invalid contract field'}})
  "q"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "product_id"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "variant_id"?: string;
}
export class ListStockCommitmentsHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListOwnAfterSaleHistoryPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class ListOwnAfterSaleHistoryQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 512}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 512},false),defaultMessage:()=> 'Invalid contract field'}})
  "cursor"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 50, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 50, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListOwnAfterSaleHistoryHeadersDto {
}
export class ListStoreAfterSaleHistoryPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class ListStoreAfterSaleHistoryQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 512}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 512},false),defaultMessage:()=> 'Invalid contract field'}})
  "cursor"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 50, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 50, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListStoreAfterSaleHistoryHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class ListAdminAfterSaleHistoryPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class ListAdminAfterSaleHistoryQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 512}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 512},false),defaultMessage:()=> 'Invalid contract field'}})
  "cursor"?: string;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 50, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 50, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
}
export class ListAdminAfterSaleHistoryHeadersDto {
}
export class GetStoreRefundRecoveryPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class GetStoreRefundRecoveryQueryDto {
}
export class GetStoreRefundRecoveryHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class RequestStoreRefundRecoveryBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 2147483647},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_order_version"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 2147483647},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_refund_version"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 2000},true),defaultMessage:()=> 'Invalid contract field'}})
  "note"!: string;
}
export class RequestStoreRefundRecoveryPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class RequestStoreRefundRecoveryQueryDto {
}
export class RequestStoreRefundRecoveryHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-store-context"?: string;
}
export class GetAdminRefundRecoveryPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class GetAdminRefundRecoveryQueryDto {
}
export class GetAdminRefundRecoveryHeadersDto {
}
export class RequestAdminRefundRecoveryBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 2147483647},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_order_version"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 2147483647},true),defaultMessage:()=> 'Invalid contract field'}})
  "expected_refund_version"!: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 2000},true),defaultMessage:()=> 'Invalid contract field'}})
  "note"!: string;
}
export class RequestAdminRefundRecoveryPathDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "id"!: string;
}
export class RequestAdminRefundRecoveryQueryDto {
}
export class RequestAdminRefundRecoveryHeadersDto {
}
export class DemoLoginBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["customerA", "customerB", "ownerA", "ownerB", "staffA", "staffB", "admin"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "account"!: "customerA" | "customerB" | "ownerA" | "ownerB" | "staffA" | "staffB" | "admin";
}
export class DemoLoginPathDto {
}
export class DemoLoginQueryDto {
}
export class DemoLoginHeadersDto {
}
export class ListAvailableVouchersPathDto {
}
export class ListAvailableVouchersQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page": number = 1;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100, "default": 20}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size": number = 20;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 3699, "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(,[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}){0,99}$", "example": "11111111-1111-4111-8111-111111111111"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 3699, "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(,[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}){0,99}$", "example": "11111111-1111-4111-8111-111111111111"},true),defaultMessage:()=> 'Invalid contract field'}})
  "store_ids"!: string;
}
export class ListAvailableVouchersHeadersDto {
}
export class MarkAllNotificationsReadPathDto {
}
export class MarkAllNotificationsReadQueryDto {
}
export class MarkAllNotificationsReadHeadersDto {
}
export class ResolveContextBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 4096},true),defaultMessage:()=> 'Invalid contract field'}})
  "token"!: string;
}
export class ResolveContextPathDto {
}
export class ResolveContextQueryDto {
}
export class ResolveContextHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 64}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 64},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-correlation-id"?: string;
}
export class ActiveStoresPathDto {
}
export class ActiveStoresQueryDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "integer", "minimum": 1, "maximum": 100}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100},false),defaultMessage:()=> 'Invalid contract field'}})
  "size"?: number;
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "format": "uuid"}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "after"?: string;
}
export class ActiveStoresHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 64}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 64},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-correlation-id"?: string;
}
export class QuoteVariantsBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "object", "properties": {"variant_id": {"type": "string", "format": "uuid"}, "store_id": {"type": "string", "format": "uuid"}, "quantity": {"type": "integer", "minimum": 1, "maximum": 9007199254740991}}, "required": ["variant_id", "store_id", "quantity"], "additionalProperties": false}, "minItems": 1, "maxItems": 100},true),defaultMessage:()=> 'Invalid contract field'}})
  "items"!: Array<{"variant_id": string; "store_id": string; "quantity": number}>;
}
export class QuoteVariantsPathDto {
}
export class QuoteVariantsQueryDto {
}
export class QuoteVariantsHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 64}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 64},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-correlation-id"?: string;
}
export class ReserveInventoryBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "purchase_group_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "object", "properties": {"variant_id": {"type": "string", "format": "uuid"}, "store_id": {"type": "string", "format": "uuid"}, "order_id": {"type": "string", "format": "uuid"}, "quantity": {"type": "integer", "minimum": 1, "maximum": 9007199254740991}}, "required": ["variant_id", "store_id", "order_id", "quantity"], "additionalProperties": false}, "minItems": 1, "maxItems": 100},true),defaultMessage:()=> 'Invalid contract field'}})
  "items"!: Array<{"variant_id": string; "store_id": string; "order_id": string; "quantity": number}>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "date-time"},true),defaultMessage:()=> 'Invalid contract field'}})
  "expires_at"!: string;
}
export class ReserveInventoryPathDto {
}
export class ReserveInventoryQueryDto {
}
export class ReserveInventoryHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 64}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 64},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-correlation-id"?: string;
}
export class ConsumeReservationBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "order_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "string", "format": "uuid"}, "minItems": 1, "maxItems": 100},true),defaultMessage:()=> 'Invalid contract field'}})
  "reservation_ids"!: Array<string>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 500},false),defaultMessage:()=> 'Invalid contract field'}})
  "reason"?: string;
}
export class ConsumeReservationPathDto {
}
export class ConsumeReservationQueryDto {
}
export class ConsumeReservationHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 64}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 64},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-correlation-id"?: string;
}
export class ReleaseReservationBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "order_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "string", "format": "uuid"}, "minItems": 1, "maxItems": 100},true),defaultMessage:()=> 'Invalid contract field'}})
  "reservation_ids"!: Array<string>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 500},false),defaultMessage:()=> 'Invalid contract field'}})
  "reason"?: string;
}
export class ReleaseReservationPathDto {
}
export class ReleaseReservationQueryDto {
}
export class ReleaseReservationHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 64}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 64},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-correlation-id"?: string;
}
export class RestockOrderBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "order_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "object", "properties": {"variant_id": {"type": "string", "format": "uuid"}, "store_id": {"type": "string", "format": "uuid"}, "quantity": {"type": "integer", "minimum": 1, "maximum": 9007199254740991}}, "required": ["variant_id", "store_id", "quantity"], "additionalProperties": false}, "minItems": 1, "maxItems": 100},true),defaultMessage:()=> 'Invalid contract field'}})
  "items"!: Array<{"variant_id": string; "store_id": string; "quantity": number}>;
}
export class RestockOrderPathDto {
}
export class RestockOrderQueryDto {
}
export class RestockOrderHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 64}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 64},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-correlation-id"?: string;
}
export class VerifyReviewEligibilityBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "order_item_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "customer_user_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "product_id"?: string;
}
export class VerifyReviewEligibilityPathDto {
}
export class VerifyReviewEligibilityQueryDto {
}
export class VerifyReviewEligibilityHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 64}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 64},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-correlation-id"?: string;
}
export class ResolveCheckoutContextBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 4096},true),defaultMessage:()=> 'Invalid contract field'}})
  "token"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "address_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "string", "format": "uuid"}, "minItems": 1, "maxItems": 100, "uniqueItems": true},true),defaultMessage:()=> 'Invalid contract field'}})
  "store_ids"!: Array<string>;
}
export class ResolveCheckoutContextPathDto {
}
export class ResolveCheckoutContextQueryDto {
}
export class ResolveCheckoutContextHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 64}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 64},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-correlation-id"?: string;
}
export class ListLowStockVariantsBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 4096},true),defaultMessage:()=> 'Invalid contract field'}})
  "token"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "store_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 0, "maximum": 1000000, "default": 5},false),defaultMessage:()=> 'Invalid contract field'}})
  "threshold"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 1000000, "default": 1},false),defaultMessage:()=> 'Invalid contract field'}})
  "page"?: number;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "integer", "minimum": 1, "maximum": 100, "default": 20},false),defaultMessage:()=> 'Invalid contract field'}})
  "size"?: number;
}
export class ListLowStockVariantsPathDto {
}
export class ListLowStockVariantsQueryDto {
}
export class ListLowStockVariantsHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 64}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 64},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-correlation-id"?: string;
}
export class ResolveAiMetricsScopeBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 4096},true),defaultMessage:()=> 'Invalid contract field'}})
  "token"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},false),defaultMessage:()=> 'Invalid contract field'}})
  "store_id"?: string;
}
export class ResolveAiMetricsScopePathDto {
}
export class ResolveAiMetricsScopeQueryDto {
}
export class ResolveAiMetricsScopeHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 64}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 64},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-correlation-id"?: string;
}
export class RestockReceivedItemsBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "order_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "items": {"type": "object", "properties": {"variant_id": {"type": "string", "format": "uuid"}, "store_id": {"type": "string", "format": "uuid"}, "quantity": {"type": "integer", "minimum": 1, "maximum": 9007199254740991}}, "required": ["variant_id", "store_id", "quantity"], "additionalProperties": false}, "minItems": 0, "maxItems": 100},true),defaultMessage:()=> 'Invalid contract field'}})
  "items"!: Array<{"variant_id": string; "store_id": string; "quantity": number}>;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "receipt_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "actor_user_id"!: string;
}
export class RestockReceivedItemsPathDto {
}
export class RestockReceivedItemsQueryDto {
}
export class RestockReceivedItemsHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 64}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 64},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-correlation-id"?: string;
}
export class DispatchExchangeItemsBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "operation_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "receipt_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "order_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "actor_user_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "array", "minItems": 1, "maxItems": 100, "items": {"type": "object", "properties": {"original_variant_id": {"type": "string", "format": "uuid"}, "variant_id": {"type": "string", "format": "uuid"}, "store_id": {"type": "string", "format": "uuid"}, "quantity": {"type": "integer", "minimum": 1, "maximum": 2147483647}, "unit_price_vnd": {"type": "integer", "minimum": 0, "maximum": 9007199254740991}}, "required": ["original_variant_id", "variant_id", "store_id", "quantity", "unit_price_vnd"], "additionalProperties": false}},true),defaultMessage:()=> 'Invalid contract field'}})
  "items"!: Array<{"original_variant_id": string; "variant_id": string; "store_id": string; "quantity": number; "unit_price_vnd": number}>;
}
export class DispatchExchangeItemsPathDto {
}
export class DispatchExchangeItemsQueryDto {
}
export class DispatchExchangeItemsHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 64}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 64},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-correlation-id"?: string;
}
export class ResolveConversationOrderBodyDto {
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "minLength": 1, "maxLength": 20000},true),defaultMessage:()=> 'Invalid contract field'}})
  "token"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "format": "uuid"},true),defaultMessage:()=> 'Invalid contract field'}})
  "order_id"!: string;
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "enum": ["CUSTOMER", "STORE"]},true),defaultMessage:()=> 'Invalid contract field'}})
  "side"!: "CUSTOMER" | "STORE";
}
export class ResolveConversationOrderPathDto {
}
export class ResolveConversationOrderQueryDto {
}
export class ResolveConversationOrderHeadersDto {
  @Transform(({value})=>normalizeParameters({value},{properties:{value:{"type": "string", "maxLength": 64}}}).value)
  @ValidateBy({name:'contract', validator:{validate:v=>valueMatches(v,{"type": "string", "maxLength": 64},false),defaultMessage:()=> 'Invalid contract field'}})
  "x-correlation-id"?: string;
}
export const runtimeDtos = {
  register: {body: RegisterBodyDto, path: RegisterPathDto, query: RegisterQueryDto, headers: RegisterHeadersDto},
  verifyEmail: {body: VerifyEmailBodyDto, path: VerifyEmailPathDto, query: VerifyEmailQueryDto, headers: VerifyEmailHeadersDto},
  login: {body: LoginBodyDto, path: LoginPathDto, query: LoginQueryDto, headers: LoginHeadersDto},
  refresh: {body: RefreshBodyDto, path: RefreshPathDto, query: RefreshQueryDto, headers: RefreshHeadersDto},
  logout: {body: LogoutBodyDto, path: LogoutPathDto, query: LogoutQueryDto, headers: LogoutHeadersDto},
  resetPassword: {body: ResetPasswordBodyDto, path: ResetPasswordPathDto, query: ResetPasswordQueryDto, headers: ResetPasswordHeadersDto},
  confirmResetPassword: {body: ConfirmResetPasswordBodyDto, path: ConfirmResetPasswordPathDto, query: ConfirmResetPasswordQueryDto, headers: ConfirmResetPasswordHeadersDto},
  changePassword: {body: ChangePasswordBodyDto, path: ChangePasswordPathDto, query: ChangePasswordQueryDto, headers: ChangePasswordHeadersDto},
  getAuthContext: {body: undefined, path: GetAuthContextPathDto, query: GetAuthContextQueryDto, headers: GetAuthContextHeadersDto},
  getProfile: {body: undefined, path: GetProfilePathDto, query: GetProfileQueryDto, headers: GetProfileHeadersDto},
  updateProfile: {body: UpdateProfileBodyDto, path: UpdateProfilePathDto, query: UpdateProfileQueryDto, headers: UpdateProfileHeadersDto},
  listAddresses: {body: undefined, path: ListAddressesPathDto, query: ListAddressesQueryDto, headers: ListAddressesHeadersDto},
  createAddress: {body: CreateAddressBodyDto, path: CreateAddressPathDto, query: CreateAddressQueryDto, headers: CreateAddressHeadersDto},
  updateAddress: {body: UpdateAddressBodyDto, path: UpdateAddressPathDto, query: UpdateAddressQueryDto, headers: UpdateAddressHeadersDto},
  deleteAddress: {body: undefined, path: DeleteAddressPathDto, query: DeleteAddressQueryDto, headers: DeleteAddressHeadersDto},
  submitStoreApplication: {body: SubmitStoreApplicationBodyDto, path: SubmitStoreApplicationPathDto, query: SubmitStoreApplicationQueryDto, headers: SubmitStoreApplicationHeadersDto},
  listOwnStoreApplications: {body: undefined, path: ListOwnStoreApplicationsPathDto, query: ListOwnStoreApplicationsQueryDto, headers: ListOwnStoreApplicationsHeadersDto},
  listStoreApplications: {body: undefined, path: ListStoreApplicationsPathDto, query: ListStoreApplicationsQueryDto, headers: ListStoreApplicationsHeadersDto},
  reviewStoreApplication: {body: ReviewStoreApplicationBodyDto, path: ReviewStoreApplicationPathDto, query: ReviewStoreApplicationQueryDto, headers: ReviewStoreApplicationHeadersDto},
  getOwnStore: {body: undefined, path: GetOwnStorePathDto, query: GetOwnStoreQueryDto, headers: GetOwnStoreHeadersDto},
  updateOwnStore: {body: UpdateOwnStoreBodyDto, path: UpdateOwnStorePathDto, query: UpdateOwnStoreQueryDto, headers: UpdateOwnStoreHeadersDto},
  listStoreStaff: {body: undefined, path: ListStoreStaffPathDto, query: ListStoreStaffQueryDto, headers: ListStoreStaffHeadersDto},
  listStaffInvitations: {body: undefined, path: ListStaffInvitationsPathDto, query: ListStaffInvitationsQueryDto, headers: ListStaffInvitationsHeadersDto},
  inviteStaff: {body: InviteStaffBodyDto, path: InviteStaffPathDto, query: InviteStaffQueryDto, headers: InviteStaffHeadersDto},
  revokeStaffInvitation: {body: undefined, path: RevokeStaffInvitationPathDto, query: RevokeStaffInvitationQueryDto, headers: RevokeStaffInvitationHeadersDto},
  listOwnInvitations: {body: undefined, path: ListOwnInvitationsPathDto, query: ListOwnInvitationsQueryDto, headers: ListOwnInvitationsHeadersDto},
  acceptInvitation: {body: undefined, path: AcceptInvitationPathDto, query: AcceptInvitationQueryDto, headers: AcceptInvitationHeadersDto},
  listCategories: {body: undefined, path: ListCategoriesPathDto, query: ListCategoriesQueryDto, headers: ListCategoriesHeadersDto},
  listProductTypes: {body: undefined, path: ListProductTypesPathDto, query: ListProductTypesQueryDto, headers: ListProductTypesHeadersDto},
  listProducts: {body: undefined, path: ListProductsPathDto, query: ListProductsQueryDto, headers: ListProductsHeadersDto},
  getProduct: {body: undefined, path: GetProductPathDto, query: GetProductQueryDto, headers: GetProductHeadersDto},
  listStoreProducts: {body: undefined, path: ListStoreProductsPathDto, query: ListStoreProductsQueryDto, headers: ListStoreProductsHeadersDto},
  listOwnStoreProducts: {body: undefined, path: ListOwnStoreProductsPathDto, query: ListOwnStoreProductsQueryDto, headers: ListOwnStoreProductsHeadersDto},
  createProduct: {body: CreateProductBodyDto, path: CreateProductPathDto, query: CreateProductQueryDto, headers: CreateProductHeadersDto},
  updateProduct: {body: UpdateProductBodyDto, path: UpdateProductPathDto, query: UpdateProductQueryDto, headers: UpdateProductHeadersDto},
  getOwnStoreProduct: {body: undefined, path: GetOwnStoreProductPathDto, query: GetOwnStoreProductQueryDto, headers: GetOwnStoreProductHeadersDto},
  createVariant: {body: CreateVariantBodyDto, path: CreateVariantPathDto, query: CreateVariantQueryDto, headers: CreateVariantHeadersDto},
  addProductImage: {body: AddProductImageBodyDto, path: AddProductImagePathDto, query: AddProductImageQueryDto, headers: AddProductImageHeadersDto},
  listStoreInventory: {body: undefined, path: ListStoreInventoryPathDto, query: ListStoreInventoryQueryDto, headers: ListStoreInventoryHeadersDto},
  adjustInventory: {body: AdjustInventoryBodyDto, path: AdjustInventoryPathDto, query: AdjustInventoryQueryDto, headers: AdjustInventoryHeadersDto},
  listStockMovements: {body: undefined, path: ListStockMovementsPathDto, query: ListStockMovementsQueryDto, headers: ListStockMovementsHeadersDto},
  listCartItems: {body: undefined, path: ListCartItemsPathDto, query: ListCartItemsQueryDto, headers: ListCartItemsHeadersDto},
  addCartItem: {body: AddCartItemBodyDto, path: AddCartItemPathDto, query: AddCartItemQueryDto, headers: AddCartItemHeadersDto},
  updateCartItem: {body: UpdateCartItemBodyDto, path: UpdateCartItemPathDto, query: UpdateCartItemQueryDto, headers: UpdateCartItemHeadersDto},
  removeCartItem: {body: undefined, path: RemoveCartItemPathDto, query: RemoveCartItemQueryDto, headers: RemoveCartItemHeadersDto},
  quoteCheckout: {body: QuoteCheckoutBodyDto, path: QuoteCheckoutPathDto, query: QuoteCheckoutQueryDto, headers: QuoteCheckoutHeadersDto},
  confirmCheckout: {body: ConfirmCheckoutBodyDto, path: ConfirmCheckoutPathDto, query: ConfirmCheckoutQueryDto, headers: ConfirmCheckoutHeadersDto},
  getPurchaseGroupOrders: {body: undefined, path: GetPurchaseGroupOrdersPathDto, query: GetPurchaseGroupOrdersQueryDto, headers: GetPurchaseGroupOrdersHeadersDto},
  createPaymentAttempt: {body: CreatePaymentAttemptBodyDto, path: CreatePaymentAttemptPathDto, query: CreatePaymentAttemptQueryDto, headers: CreatePaymentAttemptHeadersDto},
  getPayment: {body: undefined, path: GetPaymentPathDto, query: GetPaymentQueryDto, headers: GetPaymentHeadersDto},
  sandboxCallback: {body: SandboxCallbackBodyDto, path: SandboxCallbackPathDto, query: SandboxCallbackQueryDto, headers: SandboxCallbackHeadersDto},
  getOrderRefund: {body: undefined, path: GetOrderRefundPathDto, query: GetOrderRefundQueryDto, headers: GetOrderRefundHeadersDto},
  listOwnOrders: {body: undefined, path: ListOwnOrdersPathDto, query: ListOwnOrdersQueryDto, headers: ListOwnOrdersHeadersDto},
  getOwnOrder: {body: undefined, path: GetOwnOrderPathDto, query: GetOwnOrderQueryDto, headers: GetOwnOrderHeadersDto},
  cancelOwnOrder: {body: CancelOwnOrderBodyDto, path: CancelOwnOrderPathDto, query: CancelOwnOrderQueryDto, headers: CancelOwnOrderHeadersDto},
  listStoreOrders: {body: undefined, path: ListStoreOrdersPathDto, query: ListStoreOrdersQueryDto, headers: ListStoreOrdersHeadersDto},
  getStoreOrder: {body: undefined, path: GetStoreOrderPathDto, query: GetStoreOrderQueryDto, headers: GetStoreOrderHeadersDto},
  transitionStoreOrder: {body: TransitionStoreOrderBodyDto, path: TransitionStoreOrderPathDto, query: TransitionStoreOrderQueryDto, headers: TransitionStoreOrderHeadersDto},
  cancelStoreOrder: {body: CancelStoreOrderBodyDto, path: CancelStoreOrderPathDto, query: CancelStoreOrderQueryDto, headers: CancelStoreOrderHeadersDto},
  collectCod: {body: CollectCodBodyDto, path: CollectCodPathDto, query: CollectCodQueryDto, headers: CollectCodHeadersDto},
  validateVouchers: {body: ValidateVouchersBodyDto, path: ValidateVouchersPathDto, query: ValidateVouchersQueryDto, headers: ValidateVouchersHeadersDto},
  listStoreVouchers: {body: undefined, path: ListStoreVouchersPathDto, query: ListStoreVouchersQueryDto, headers: ListStoreVouchersHeadersDto},
  createStoreVoucher: {body: CreateStoreVoucherBodyDto, path: CreateStoreVoucherPathDto, query: CreateStoreVoucherQueryDto, headers: CreateStoreVoucherHeadersDto},
  updateStoreVoucher: {body: UpdateStoreVoucherBodyDto, path: UpdateStoreVoucherPathDto, query: UpdateStoreVoucherQueryDto, headers: UpdateStoreVoucherHeadersDto},
  listPlatformVouchers: {body: undefined, path: ListPlatformVouchersPathDto, query: ListPlatformVouchersQueryDto, headers: ListPlatformVouchersHeadersDto},
  createPlatformVoucher: {body: CreatePlatformVoucherBodyDto, path: CreatePlatformVoucherPathDto, query: CreatePlatformVoucherQueryDto, headers: CreatePlatformVoucherHeadersDto},
  updatePlatformVoucher: {body: UpdatePlatformVoucherBodyDto, path: UpdatePlatformVoucherPathDto, query: UpdatePlatformVoucherQueryDto, headers: UpdatePlatformVoucherHeadersDto},
  listProductReviews: {body: undefined, path: ListProductReviewsPathDto, query: ListProductReviewsQueryDto, headers: ListProductReviewsHeadersDto},
  createReview: {body: CreateReviewBodyDto, path: CreateReviewPathDto, query: CreateReviewQueryDto, headers: CreateReviewHeadersDto},
  listOwnReviews: {body: undefined, path: ListOwnReviewsPathDto, query: ListOwnReviewsQueryDto, headers: ListOwnReviewsHeadersDto},
  updateReview: {body: UpdateReviewBodyDto, path: UpdateReviewPathDto, query: UpdateReviewQueryDto, headers: UpdateReviewHeadersDto},
  hideReview: {body: HideReviewBodyDto, path: HideReviewPathDto, query: HideReviewQueryDto, headers: HideReviewHeadersDto},
  restoreReview: {body: RestoreReviewBodyDto, path: RestoreReviewPathDto, query: RestoreReviewQueryDto, headers: RestoreReviewHeadersDto},
  listUsers: {body: undefined, path: ListUsersPathDto, query: ListUsersQueryDto, headers: ListUsersHeadersDto},
  updateUserState: {body: UpdateUserStateBodyDto, path: UpdateUserStatePathDto, query: UpdateUserStateQueryDto, headers: UpdateUserStateHeadersDto},
  listStores: {body: undefined, path: ListStoresPathDto, query: ListStoresQueryDto, headers: ListStoresHeadersDto},
  updateStoreState: {body: UpdateStoreStateBodyDto, path: UpdateStoreStatePathDto, query: UpdateStoreStateQueryDto, headers: UpdateStoreStateHeadersDto},
  listAllOrders: {body: undefined, path: ListAllOrdersPathDto, query: ListAllOrdersQueryDto, headers: ListAllOrdersHeadersDto},
  getPlatformDashboard: {body: undefined, path: GetPlatformDashboardPathDto, query: GetPlatformDashboardQueryDto, headers: GetPlatformDashboardHeadersDto},
  listRoles: {body: undefined, path: ListRolesPathDto, query: ListRolesQueryDto, headers: ListRolesHeadersDto},
  updateRole: {body: UpdateRoleBodyDto, path: UpdateRolePathDto, query: UpdateRoleQueryDto, headers: UpdateRoleHeadersDto},
  createChatSession: {body: CreateChatSessionBodyDto, path: CreateChatSessionPathDto, query: CreateChatSessionQueryDto, headers: CreateChatSessionHeadersDto},
  sendChatMessage: {body: SendChatMessageBodyDto, path: SendChatMessagePathDto, query: SendChatMessageQueryDto, headers: SendChatMessageHeadersDto},
  listOwnChatSessions: {body: undefined, path: ListOwnChatSessionsPathDto, query: ListOwnChatSessionsQueryDto, headers: ListOwnChatSessionsHeadersDto},
  getForYou: {body: undefined, path: GetForYouPathDto, query: GetForYouQueryDto, headers: GetForYouHeadersDto},
  getRelatedProducts: {body: undefined, path: GetRelatedProductsPathDto, query: GetRelatedProductsQueryDto, headers: GetRelatedProductsHeadersDto},
  updateStaff: {body: UpdateStaffBodyDto, path: UpdateStaffPathDto, query: UpdateStaffQueryDto, headers: UpdateStaffHeadersDto},
  getStoreReport: {body: undefined, path: GetStoreReportPathDto, query: GetStoreReportQueryDto, headers: GetStoreReportHeadersDto},
  getStoreVoucherUsage: {body: undefined, path: GetStoreVoucherUsagePathDto, query: GetStoreVoucherUsageQueryDto, headers: GetStoreVoucherUsageHeadersDto},
  getPlatformVoucherUsage: {body: undefined, path: GetPlatformVoucherUsagePathDto, query: GetPlatformVoucherUsageQueryDto, headers: GetPlatformVoucherUsageHeadersDto},
  createCategory: {body: CreateCategoryBodyDto, path: CreateCategoryPathDto, query: CreateCategoryQueryDto, headers: CreateCategoryHeadersDto},
  updateCategory: {body: UpdateCategoryBodyDto, path: UpdateCategoryPathDto, query: UpdateCategoryQueryDto, headers: UpdateCategoryHeadersDto},
  createProductType: {body: CreateProductTypeBodyDto, path: CreateProductTypePathDto, query: CreateProductTypeQueryDto, headers: CreateProductTypeHeadersDto},
  updateProductType: {body: UpdateProductTypeBodyDto, path: UpdateProductTypePathDto, query: UpdateProductTypeQueryDto, headers: UpdateProductTypeHeadersDto},
  createAttributeDefinition: {body: CreateAttributeDefinitionBodyDto, path: CreateAttributeDefinitionPathDto, query: CreateAttributeDefinitionQueryDto, headers: CreateAttributeDefinitionHeadersDto},
  updateAttributeDefinition: {body: UpdateAttributeDefinitionBodyDto, path: UpdateAttributeDefinitionPathDto, query: UpdateAttributeDefinitionQueryDto, headers: UpdateAttributeDefinitionHeadersDto},
  hideProduct: {body: HideProductBodyDto, path: HideProductPathDto, query: HideProductQueryDto, headers: HideProductHeadersDto},
  restoreProduct: {body: RestoreProductBodyDto, path: RestoreProductPathDto, query: RestoreProductQueryDto, headers: RestoreProductHeadersDto},
  getAiMetrics: {body: undefined, path: GetAiMetricsPathDto, query: GetAiMetricsQueryDto, headers: GetAiMetricsHeadersDto},
  getPersonalizationConsent: {body: undefined, path: GetPersonalizationConsentPathDto, query: GetPersonalizationConsentQueryDto, headers: GetPersonalizationConsentHeadersDto},
  updatePersonalizationConsent: {body: UpdatePersonalizationConsentBodyDto, path: UpdatePersonalizationConsentPathDto, query: UpdatePersonalizationConsentQueryDto, headers: UpdatePersonalizationConsentHeadersDto},
  sepayCallback: {body: SepayCallbackBodyDto, path: SepayCallbackPathDto, query: SepayCallbackQueryDto, headers: SepayCallbackHeadersDto},
  listFavorites: {body: undefined, path: ListFavoritesPathDto, query: ListFavoritesQueryDto, headers: ListFavoritesHeadersDto},
  addFavorite: {body: undefined, path: AddFavoritePathDto, query: AddFavoriteQueryDto, headers: AddFavoriteHeadersDto},
  removeFavorite: {body: undefined, path: RemoveFavoritePathDto, query: RemoveFavoriteQueryDto, headers: RemoveFavoriteHeadersDto},
  removeProductImage: {body: undefined, path: RemoveProductImagePathDto, query: RemoveProductImageQueryDto, headers: RemoveProductImageHeadersDto},
  reorderProductImages: {body: ReorderProductImagesBodyDto, path: ReorderProductImagesPathDto, query: ReorderProductImagesQueryDto, headers: ReorderProductImagesHeadersDto},
  listOwnConversations: {body: undefined, path: ListOwnConversationsPathDto, query: ListOwnConversationsQueryDto, headers: ListOwnConversationsHeadersDto},
  startStoreConversation: {body: StartStoreConversationBodyDto, path: StartStoreConversationPathDto, query: StartStoreConversationQueryDto, headers: StartStoreConversationHeadersDto},
  listStoreConversations: {body: undefined, path: ListStoreConversationsPathDto, query: ListStoreConversationsQueryDto, headers: ListStoreConversationsHeadersDto},
  listOwnConversationMessages: {body: undefined, path: ListOwnConversationMessagesPathDto, query: ListOwnConversationMessagesQueryDto, headers: ListOwnConversationMessagesHeadersDto},
  sendOwnConversationMessage: {body: SendOwnConversationMessageBodyDto, path: SendOwnConversationMessagePathDto, query: SendOwnConversationMessageQueryDto, headers: SendOwnConversationMessageHeadersDto},
  listStoreConversationMessages: {body: undefined, path: ListStoreConversationMessagesPathDto, query: ListStoreConversationMessagesQueryDto, headers: ListStoreConversationMessagesHeadersDto},
  sendStoreConversationMessage: {body: SendStoreConversationMessageBodyDto, path: SendStoreConversationMessagePathDto, query: SendStoreConversationMessageQueryDto, headers: SendStoreConversationMessageHeadersDto},
  listNotifications: {body: undefined, path: ListNotificationsPathDto, query: ListNotificationsQueryDto, headers: ListNotificationsHeadersDto},
  markNotificationRead: {body: undefined, path: MarkNotificationReadPathDto, query: MarkNotificationReadQueryDto, headers: MarkNotificationReadHeadersDto},
  createReturnRequest: {body: CreateReturnRequestBodyDto, path: CreateReturnRequestPathDto, query: CreateReturnRequestQueryDto, headers: CreateReturnRequestHeadersDto},
  listOwnReturnRequests: {body: undefined, path: ListOwnReturnRequestsPathDto, query: ListOwnReturnRequestsQueryDto, headers: ListOwnReturnRequestsHeadersDto},
  listStoreReturnRequests: {body: undefined, path: ListStoreReturnRequestsPathDto, query: ListStoreReturnRequestsQueryDto, headers: ListStoreReturnRequestsHeadersDto},
  updateStoreReturnRequest: {body: UpdateStoreReturnRequestBodyDto, path: UpdateStoreReturnRequestPathDto, query: UpdateStoreReturnRequestQueryDto, headers: UpdateStoreReturnRequestHeadersDto},
  listAdminReturnRequests: {body: undefined, path: ListAdminReturnRequestsPathDto, query: ListAdminReturnRequestsQueryDto, headers: ListAdminReturnRequestsHeadersDto},
  updateAdminReturnRequest: {body: UpdateAdminReturnRequestBodyDto, path: UpdateAdminReturnRequestPathDto, query: UpdateAdminReturnRequestQueryDto, headers: UpdateAdminReturnRequestHeadersDto},
  confirmExchangeReceived: {body: ConfirmExchangeReceivedBodyDto, path: ConfirmExchangeReceivedPathDto, query: ConfirmExchangeReceivedQueryDto, headers: ConfirmExchangeReceivedHeadersDto},
  listAdminReviews: {body: undefined, path: ListAdminReviewsPathDto, query: ListAdminReviewsQueryDto, headers: ListAdminReviewsHeadersDto},
  listAdminProducts: {body: undefined, path: ListAdminProductsPathDto, query: ListAdminProductsQueryDto, headers: ListAdminProductsHeadersDto},
  listCatalogAudit: {body: undefined, path: ListCatalogAuditPathDto, query: ListCatalogAuditQueryDto, headers: ListCatalogAuditHeadersDto},
  listCommerceAudit: {body: undefined, path: ListCommerceAuditPathDto, query: ListCommerceAuditQueryDto, headers: ListCommerceAuditHeadersDto},
  listIdentityAudit: {body: undefined, path: ListIdentityAuditPathDto, query: ListIdentityAuditQueryDto, headers: ListIdentityAuditHeadersDto},
  getPublicStore: {body: undefined, path: GetPublicStorePathDto, query: GetPublicStoreQueryDto, headers: GetPublicStoreHeadersDto},
  confirmCodRefund: {body: ConfirmCodRefundBodyDto, path: ConfirmCodRefundPathDto, query: ConfirmCodRefundQueryDto, headers: ConfirmCodRefundHeadersDto},
  listStoreMoneyMovements: {body: undefined, path: ListStoreMoneyMovementsPathDto, query: ListStoreMoneyMovementsQueryDto, headers: ListStoreMoneyMovementsHeadersDto},
  listAdminMoneyMovements: {body: undefined, path: ListAdminMoneyMovementsPathDto, query: ListAdminMoneyMovementsQueryDto, headers: ListAdminMoneyMovementsHeadersDto},
  openDeliveryReturn: {body: OpenDeliveryReturnBodyDto, path: OpenDeliveryReturnPathDto, query: OpenDeliveryReturnQueryDto, headers: OpenDeliveryReturnHeadersDto},
  listStoreDeliveryReturns: {body: undefined, path: ListStoreDeliveryReturnsPathDto, query: ListStoreDeliveryReturnsQueryDto, headers: ListStoreDeliveryReturnsHeadersDto},
  listAdminDeliveryReturns: {body: undefined, path: ListAdminDeliveryReturnsPathDto, query: ListAdminDeliveryReturnsQueryDto, headers: ListAdminDeliveryReturnsHeadersDto},
  getOwnDeliveryReturn: {body: undefined, path: GetOwnDeliveryReturnPathDto, query: GetOwnDeliveryReturnQueryDto, headers: GetOwnDeliveryReturnHeadersDto},
  inspectDeliveryReturn: {body: InspectDeliveryReturnBodyDto, path: InspectDeliveryReturnPathDto, query: InspectDeliveryReturnQueryDto, headers: InspectDeliveryReturnHeadersDto},
  settleDeliveryReturn: {body: SettleDeliveryReturnBodyDto, path: SettleDeliveryReturnPathDto, query: SettleDeliveryReturnQueryDto, headers: SettleDeliveryReturnHeadersDto},
  integrationPaymentCallback: {body: IntegrationPaymentCallbackBodyDto, path: IntegrationPaymentCallbackPathDto, query: IntegrationPaymentCallbackQueryDto, headers: IntegrationPaymentCallbackHeadersDto},
  resolveStoreReturn: {body: ResolveStoreReturnBodyDto, path: ResolveStoreReturnPathDto, query: ResolveStoreReturnQueryDto, headers: ResolveStoreReturnHeadersDto},
  respondOwnReturn: {body: RespondOwnReturnBodyDto, path: RespondOwnReturnPathDto, query: RespondOwnReturnQueryDto, headers: RespondOwnReturnHeadersDto},
  resolveAdminReturn: {body: ResolveAdminReturnBodyDto, path: ResolveAdminReturnPathDto, query: ResolveAdminReturnQueryDto, headers: ResolveAdminReturnHeadersDto},
  listStoreCatalogAudit: {body: undefined, path: ListStoreCatalogAuditPathDto, query: ListStoreCatalogAuditQueryDto, headers: ListStoreCatalogAuditHeadersDto},
  listStoreCommerceAudit: {body: undefined, path: ListStoreCommerceAuditPathDto, query: ListStoreCommerceAuditQueryDto, headers: ListStoreCommerceAuditHeadersDto},
  listStoreIdentityAudit: {body: undefined, path: ListStoreIdentityAuditPathDto, query: ListStoreIdentityAuditQueryDto, headers: ListStoreIdentityAuditHeadersDto},
  lookupStoreAuditActors: {body: LookupStoreAuditActorsBodyDto, path: LookupStoreAuditActorsPathDto, query: LookupStoreAuditActorsQueryDto, headers: LookupStoreAuditActorsHeadersDto},
  lookupAdminAuditActors: {body: LookupAdminAuditActorsBodyDto, path: LookupAdminAuditActorsPathDto, query: LookupAdminAuditActorsQueryDto, headers: LookupAdminAuditActorsHeadersDto},
  getPlatformMoneyReport: {body: undefined, path: GetPlatformMoneyReportPathDto, query: GetPlatformMoneyReportQueryDto, headers: GetPlatformMoneyReportHeadersDto},
  listStoreUnresolvedMoneyMovements: {body: undefined, path: ListStoreUnresolvedMoneyMovementsPathDto, query: ListStoreUnresolvedMoneyMovementsQueryDto, headers: ListStoreUnresolvedMoneyMovementsHeadersDto},
  listAdminUnresolvedMoneyMovements: {body: undefined, path: ListAdminUnresolvedMoneyMovementsPathDto, query: ListAdminUnresolvedMoneyMovementsQueryDto, headers: ListAdminUnresolvedMoneyMovementsHeadersDto},
  getInventoryReconciliation: {body: undefined, path: GetInventoryReconciliationPathDto, query: GetInventoryReconciliationQueryDto, headers: GetInventoryReconciliationHeadersDto},
  listStockCommitments: {body: undefined, path: ListStockCommitmentsPathDto, query: ListStockCommitmentsQueryDto, headers: ListStockCommitmentsHeadersDto},
  listOwnAfterSaleHistory: {body: undefined, path: ListOwnAfterSaleHistoryPathDto, query: ListOwnAfterSaleHistoryQueryDto, headers: ListOwnAfterSaleHistoryHeadersDto},
  listStoreAfterSaleHistory: {body: undefined, path: ListStoreAfterSaleHistoryPathDto, query: ListStoreAfterSaleHistoryQueryDto, headers: ListStoreAfterSaleHistoryHeadersDto},
  listAdminAfterSaleHistory: {body: undefined, path: ListAdminAfterSaleHistoryPathDto, query: ListAdminAfterSaleHistoryQueryDto, headers: ListAdminAfterSaleHistoryHeadersDto},
  getStoreRefundRecovery: {body: undefined, path: GetStoreRefundRecoveryPathDto, query: GetStoreRefundRecoveryQueryDto, headers: GetStoreRefundRecoveryHeadersDto},
  requestStoreRefundRecovery: {body: RequestStoreRefundRecoveryBodyDto, path: RequestStoreRefundRecoveryPathDto, query: RequestStoreRefundRecoveryQueryDto, headers: RequestStoreRefundRecoveryHeadersDto},
  getAdminRefundRecovery: {body: undefined, path: GetAdminRefundRecoveryPathDto, query: GetAdminRefundRecoveryQueryDto, headers: GetAdminRefundRecoveryHeadersDto},
  requestAdminRefundRecovery: {body: RequestAdminRefundRecoveryBodyDto, path: RequestAdminRefundRecoveryPathDto, query: RequestAdminRefundRecoveryQueryDto, headers: RequestAdminRefundRecoveryHeadersDto},
  demoLogin: {body: DemoLoginBodyDto, path: DemoLoginPathDto, query: DemoLoginQueryDto, headers: DemoLoginHeadersDto},
  listAvailableVouchers: {body: undefined, path: ListAvailableVouchersPathDto, query: ListAvailableVouchersQueryDto, headers: ListAvailableVouchersHeadersDto},
  markAllNotificationsRead: {body: undefined, path: MarkAllNotificationsReadPathDto, query: MarkAllNotificationsReadQueryDto, headers: MarkAllNotificationsReadHeadersDto},
  ResolveContext: {body: ResolveContextBodyDto, path: ResolveContextPathDto, query: ResolveContextQueryDto, headers: ResolveContextHeadersDto},
  ActiveStores: {body: undefined, path: ActiveStoresPathDto, query: ActiveStoresQueryDto, headers: ActiveStoresHeadersDto},
  QuoteVariants: {body: QuoteVariantsBodyDto, path: QuoteVariantsPathDto, query: QuoteVariantsQueryDto, headers: QuoteVariantsHeadersDto},
  ReserveInventory: {body: ReserveInventoryBodyDto, path: ReserveInventoryPathDto, query: ReserveInventoryQueryDto, headers: ReserveInventoryHeadersDto},
  ConsumeReservation: {body: ConsumeReservationBodyDto, path: ConsumeReservationPathDto, query: ConsumeReservationQueryDto, headers: ConsumeReservationHeadersDto},
  ReleaseReservation: {body: ReleaseReservationBodyDto, path: ReleaseReservationPathDto, query: ReleaseReservationQueryDto, headers: ReleaseReservationHeadersDto},
  RestockOrder: {body: RestockOrderBodyDto, path: RestockOrderPathDto, query: RestockOrderQueryDto, headers: RestockOrderHeadersDto},
  VerifyReviewEligibility: {body: VerifyReviewEligibilityBodyDto, path: VerifyReviewEligibilityPathDto, query: VerifyReviewEligibilityQueryDto, headers: VerifyReviewEligibilityHeadersDto},
  ResolveCheckoutContext: {body: ResolveCheckoutContextBodyDto, path: ResolveCheckoutContextPathDto, query: ResolveCheckoutContextQueryDto, headers: ResolveCheckoutContextHeadersDto},
  ListLowStockVariants: {body: ListLowStockVariantsBodyDto, path: ListLowStockVariantsPathDto, query: ListLowStockVariantsQueryDto, headers: ListLowStockVariantsHeadersDto},
  ResolveAiMetricsScope: {body: ResolveAiMetricsScopeBodyDto, path: ResolveAiMetricsScopePathDto, query: ResolveAiMetricsScopeQueryDto, headers: ResolveAiMetricsScopeHeadersDto},
  RestockReceivedItems: {body: RestockReceivedItemsBodyDto, path: RestockReceivedItemsPathDto, query: RestockReceivedItemsQueryDto, headers: RestockReceivedItemsHeadersDto},
  DispatchExchangeItems: {body: DispatchExchangeItemsBodyDto, path: DispatchExchangeItemsPathDto, query: DispatchExchangeItemsQueryDto, headers: DispatchExchangeItemsHeadersDto},
  ResolveConversationOrder: {body: ResolveConversationOrderBodyDto, path: ResolveConversationOrderPathDto, query: ResolveConversationOrderQueryDto, headers: ResolveConversationOrderHeadersDto},
};
