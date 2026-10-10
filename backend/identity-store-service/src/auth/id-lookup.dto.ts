import { IsArray, IsOptional, IsUUID, ArrayMinSize } from 'class-validator';

export class ResolveCheckoutContextRequestDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  addressId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  storeIds!: string[];
}

export class ResolveCheckoutContextResponseDto {
  address_snapshot!: {
    recipient_name: string;
    phone: string;
    line1: string;
    ward: string;
    district: string;
    city: string;
  };
  stores!: Array<{
    store_id: string;
    shipping_fee_vnd: string;
    version: number;
  }>;
}

export class ResolveAiMetricsScopeRequestDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsUUID()
  requestedStoreId?: string;
}

export class ResolveAiMetricsScopeResponseDto {
  is_platform_scope!: boolean;
  store_ids?: string[];
}
