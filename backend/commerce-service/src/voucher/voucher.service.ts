import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { audit } from '../../../shared/src/audit';
import { moneyNumber } from '../../../shared/src/money';
import { VoucherRepository, VoucherRow } from './voucher.repository';
import { OrderService } from '../order/order.service';
import { requireStorePermission } from '../scope';
import type { OperationOutputs, OperationInputs } from '../../../shared/src/operations.generated';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


export function voucherResponse(row: VoucherRow): OperationOutputs['createStoreVoucher'] {
  return {
    id: row.id,
    code: row.code,
    scope: row.scope as 'STORE' | 'PLATFORM',
    store_id: row.store_id ?? undefined,
    discount_type: row.discount_type as 'FIXED' | 'PERCENT',
    discount_value: moneyNumber(row.discount_value),
    min_goods_vnd: moneyNumber(row.min_goods_vnd ?? 0),
    max_discount_vnd: row.max_discount_vnd !== null && row.max_discount_vnd !== undefined ? moneyNumber(row.max_discount_vnd) : undefined,
    starts_at: row.starts_at instanceof Date ? row.starts_at.toISOString() : new Date(row.starts_at).toISOString(),
    ends_at: row.ends_at instanceof Date ? row.ends_at.toISOString() : new Date(row.ends_at).toISOString(),
    usage_limit: row.usage_limit,
    per_customer_limit: row.per_customer_limit,
    status: row.status as 'ACTIVE' | 'STOPPED',
    version: row.version,
  };
}

export class VoucherService {
  private verifyStoreOwner(auth: any): string {
    return requireStorePermission(auth,'voucher.store.manage');
  }

  private verifyAdmin(auth: any) {
    if (!auth?.roles?.includes('ADMIN')) {
      throw new ApiError(403, 'FORBIDDEN', 'Chỉ Quản trị viên (Admin) mới có quyền thao tác voucher toàn sàn.');
    }
  }

  // ================= STORE VOUCHERS =================
  async listStoreVouchers(
    query: { page?: number; size?: number },
    auth: any,
    _correlation: string
  ): Promise<OperationOutputs['listStoreVouchers']> {
    const storeId = this.verifyStoreOwner(auth);
    const page = Math.max(1, Number(query?.page ?? 1));
    const size = Math.min(100, Math.max(1, Number(query?.size ?? 20)));

    const repo = new VoucherRepository(database.manager);
    const { items, total } = await repo.pageStoreVouchers(storeId, page, size);

    return {
      items: items.map(voucherResponse),
      total,
      page,
      size,
    };
  }

  async createStoreVoucher(
    input: OperationInputs['createStoreVoucher']['body'],
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['createStoreVoucher']> {
    const storeId = this.verifyStoreOwner(auth);
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    if (input.scope && input.scope !== 'STORE') {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Scope voucher cửa hàng phải là STORE.');
    }

    const code = input.code?.trim().toUpperCase();
    if (!code) throw new ApiError(422, 'VALIDATION_FAILED', 'Mã voucher không được để trống.');

    if (input.discount_type === 'PERCENT') {
      if (input.discount_value < 1 || input.discount_value > 100) {
        throw new ApiError(422, 'VALIDATION_FAILED', 'Tỷ lệ giảm giá phần trăm phải từ 1 đến 100.');
      }
    } else if (input.discount_type === 'FIXED') {
      if (input.discount_value < 1) {
        throw new ApiError(422, 'VALIDATION_FAILED', 'Số tiền giảm giá cố định phải >= 1 VND.');
      }
    } else {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Loại giảm giá không hợp lệ (phải là FIXED hoặc PERCENT).');
    }

    const start = new Date(input.starts_at);
    const end = new Date(input.ends_at);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Thời gian kết thúc phải sau thời gian bắt đầu.');
    }

    if (input.usage_limit < 1 || input.per_customer_limit < 1) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Hạn mức sử dụng phải >= 1.');
    }

    if (input.min_goods_vnd !== undefined && input.min_goods_vnd < 0) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Giá trị đơn hàng tối thiểu không được âm.');
    }

    if (input.max_discount_vnd !== undefined && input.max_discount_vnd !== null && input.max_discount_vnd < 0) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Mức giảm tối đa không được âm.');
    }

    return database.transaction(async manager => {
      const repo = new VoucherRepository(manager);
      const existing = await repo.findByCode(code);
      if (existing) {
        throw new ApiError(409, 'VOUCHER_CODE_EXISTS', 'Mã voucher đã tồn tại trên hệ thống.');
      }

      const created = await repo.createStoreVoucher({
        code,
        store_id: storeId,
        owner_user_id: userId,
        discount_type: input.discount_type,
        discount_value: input.discount_value,
        max_discount_vnd: input.max_discount_vnd,
        min_goods_vnd: input.min_goods_vnd,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        usage_limit: input.usage_limit,
        per_customer_limit: input.per_customer_limit,
      });

      const response = voucherResponse(created);
      await audit(manager, 'M2', userId, 'Voucher', created.id, 'CREATE_STORE_VOUCHER', correlation, null, response);
      return response;
    });
  }

  async updateStoreVoucher(
    id: string,
    input: OperationInputs['updateStoreVoucher']['body'],
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['updateStoreVoucher']> {
    const storeId = this.verifyStoreOwner(auth);
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    if (input.expected_version === undefined || input.expected_version === null || input.expected_version < 0) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Thiếu hoặc sai expected_version.');
    }

    return database.transaction(async manager => {
      const repo = new VoucherRepository(manager);
      const before = await repo.lockStoreVoucherById(id, storeId);
      if (!before) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy voucher cửa hàng.');
      }

      if (before.version !== input.expected_version) {
        throw new ApiError(409, 'VERSION_CONFLICT', 'Dữ liệu đã thay đổi. Vui lòng tải lại.');
      }

      const discountType = input.discount_type ?? (before.discount_type as 'FIXED' | 'PERCENT');
      const discountValue = input.discount_value !== undefined ? input.discount_value : moneyNumber(before.discount_value);

      if (discountType === 'PERCENT') {
        if (discountValue < 1 || discountValue > 100) {
          throw new ApiError(422, 'VALIDATION_FAILED', 'Tỷ lệ giảm giá phần trăm phải từ 1 đến 100.');
        }
      } else if (discountType === 'FIXED') {
        if (discountValue < 1) {
          throw new ApiError(422, 'VALIDATION_FAILED', 'Số tiền giảm giá cố định phải >= 1 VND.');
        }
      }

      const start = input.starts_at ? new Date(input.starts_at) : before.starts_at;
      const end = input.ends_at ? new Date(input.ends_at) : before.ends_at;
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
        throw new ApiError(422, 'VALIDATION_FAILED', 'Thời gian kết thúc phải sau thời gian bắt đầu.');
      }

      if (input.usage_limit !== undefined && input.usage_limit < 1) {
        throw new ApiError(422, 'VALIDATION_FAILED', 'Hạn mức sử dụng phải >= 1.');
      }

      if (input.per_customer_limit !== undefined && input.per_customer_limit < 1) {
        throw new ApiError(422, 'VALIDATION_FAILED', 'Giới hạn mỗi khách hàng phải >= 1.');
      }

      const updated = await repo.updateStoreVoucher(id, storeId, {
        discount_type: input.discount_type,
        discount_value: input.discount_value,
        max_discount_vnd: input.max_discount_vnd,
        min_goods_vnd: input.min_goods_vnd,
        starts_at: input.starts_at ? start.toISOString() : undefined,
        ends_at: input.ends_at ? end.toISOString() : undefined,
        usage_limit: input.usage_limit,
        per_customer_limit: input.per_customer_limit,
        status: input.status,
      });

      const beforeResponse = voucherResponse(before);
      const afterResponse = voucherResponse(updated);
      await audit(manager, 'M2', userId, 'Voucher', id, 'UPDATE_STORE_VOUCHER', correlation, beforeResponse, afterResponse);
      return afterResponse;
    });
  }

  // ================= PLATFORM VOUCHERS =================
  async listPlatformVouchers(
    query: { page?: number; size?: number },
    auth: any,
    _correlation: string
  ): Promise<OperationOutputs['listPlatformVouchers']> {
    this.verifyAdmin(auth);
    const page = Math.max(1, Number(query?.page ?? 1));
    const size = Math.min(100, Math.max(1, Number(query?.size ?? 20)));

    const repo = new VoucherRepository(database.manager);
    const { items, total } = await repo.pagePlatformVouchers(page, size);

    return {
      items: items.map(voucherResponse),
      total,
      page,
      size,
    };
  }

  async createPlatformVoucher(
    input: OperationInputs['createPlatformVoucher']['body'],
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['createPlatformVoucher']> {
    this.verifyAdmin(auth);
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    if (input.scope && input.scope !== 'PLATFORM') {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Scope voucher phải là PLATFORM.');
    }

    const code = input.code?.trim().toUpperCase();
    if (!code) throw new ApiError(422, 'VALIDATION_FAILED', 'Mã voucher không được để trống.');

    if (input.discount_type === 'PERCENT') {
      if (input.discount_value < 1 || input.discount_value > 100) {
        throw new ApiError(422, 'VALIDATION_FAILED', 'Tỷ lệ giảm giá phần trăm phải từ 1 đến 100.');
      }
    } else if (input.discount_type === 'FIXED') {
      if (input.discount_value < 1) {
        throw new ApiError(422, 'VALIDATION_FAILED', 'Số tiền giảm giá cố định phải >= 1 VND.');
      }
    } else {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Loại giảm giá không hợp lệ (phải là FIXED hoặc PERCENT).');
    }

    const start = new Date(input.starts_at);
    const end = new Date(input.ends_at);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Thời gian kết thúc phải sau thời gian bắt đầu.');
    }

    if (input.usage_limit < 1 || input.per_customer_limit < 1) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Hạn mức sử dụng phải >= 1.');
    }

    if (input.min_goods_vnd !== undefined && input.min_goods_vnd < 0) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Giá trị đơn hàng tối thiểu không được âm.');
    }

    if (input.max_discount_vnd !== undefined && input.max_discount_vnd !== null && input.max_discount_vnd < 0) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Mức giảm tối đa không được âm.');
    }

    return database.transaction(async manager => {
      const repo = new VoucherRepository(manager);
      const existing = await repo.findByCode(code);
      if (existing) {
        throw new ApiError(409, 'VOUCHER_CODE_EXISTS', 'Mã voucher đã tồn tại trên hệ thống.');
      }

      const created = await repo.createPlatformVoucher({
        code,
        owner_user_id: userId,
        discount_type: input.discount_type,
        discount_value: input.discount_value,
        max_discount_vnd: input.max_discount_vnd,
        min_goods_vnd: input.min_goods_vnd,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        usage_limit: input.usage_limit,
        per_customer_limit: input.per_customer_limit,
      });

      const response = voucherResponse(created);
      await audit(manager, 'M2', userId, 'Voucher', created.id, 'CREATE_PLATFORM_VOUCHER', correlation, null, response);
      return response;
    });
  }

  async updatePlatformVoucher(
    id: string,
    input: OperationInputs['updatePlatformVoucher']['body'],
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['updatePlatformVoucher']> {
    this.verifyAdmin(auth);
    const userId = auth?.user_id;
    if (!userId) throw new ApiError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập.');

    if (input.expected_version === undefined || input.expected_version === null || input.expected_version < 0) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Thiếu hoặc sai expected_version.');
    }

    return database.transaction(async manager => {
      const repo = new VoucherRepository(manager);
      const before = await repo.lockPlatformVoucherById(id);
      if (!before) {
        throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy voucher toàn sàn.');
      }

      if (before.version !== input.expected_version) {
        throw new ApiError(409, 'VERSION_CONFLICT', 'Dữ liệu đã thay đổi. Vui lòng tải lại.');
      }

      const discountType = input.discount_type ?? (before.discount_type as 'FIXED' | 'PERCENT');
      const discountValue = input.discount_value !== undefined ? input.discount_value : moneyNumber(before.discount_value);

      if (discountType === 'PERCENT') {
        if (discountValue < 1 || discountValue > 100) {
          throw new ApiError(422, 'VALIDATION_FAILED', 'Tỷ lệ giảm giá phần trăm phải từ 1 đến 100.');
        }
      } else if (discountType === 'FIXED') {
        if (discountValue < 1) {
          throw new ApiError(422, 'VALIDATION_FAILED', 'Số tiền giảm giá cố định phải >= 1 VND.');
        }
      }

      const start = input.starts_at ? new Date(input.starts_at) : before.starts_at;
      const end = input.ends_at ? new Date(input.ends_at) : before.ends_at;
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
        throw new ApiError(422, 'VALIDATION_FAILED', 'Thời gian kết thúc phải sau thời gian bắt đầu.');
      }

      if (input.usage_limit !== undefined && input.usage_limit < 1) {
        throw new ApiError(422, 'VALIDATION_FAILED', 'Hạn mức sử dụng phải >= 1.');
      }

      if (input.per_customer_limit !== undefined && input.per_customer_limit < 1) {
        throw new ApiError(422, 'VALIDATION_FAILED', 'Giới hạn mỗi khách hàng phải >= 1.');
      }

      const updated = await repo.updatePlatformVoucher(id, {
        discount_type: input.discount_type,
        discount_value: input.discount_value,
        max_discount_vnd: input.max_discount_vnd,
        min_goods_vnd: input.min_goods_vnd,
        starts_at: input.starts_at ? start.toISOString() : undefined,
        ends_at: input.ends_at ? end.toISOString() : undefined,
        usage_limit: input.usage_limit,
        per_customer_limit: input.per_customer_limit,
        status: input.status,
      });

      const beforeResponse = voucherResponse(before);
      const afterResponse = voucherResponse(updated);
      await audit(manager, 'M2', userId, 'Voucher', id, 'UPDATE_PLATFORM_VOUCHER', correlation, beforeResponse, afterResponse);
      return afterResponse;
    });
  }

  // ================= VOUCHER-03 METHODS =================
  async validateVouchers(
    input: OperationInputs['validateVouchers']['body'],
    auth: any,
    correlation: string
  ): Promise<OperationOutputs['validateVouchers']> {
    const orderService = new OrderService();
    return orderService.quoteCheckout(input, auth, correlation);
  }

  async getStoreVoucherUsage(
    id: string,
    auth: any,
    _correlation: string
  ): Promise<OperationOutputs['getStoreVoucherUsage']> {
    const storeId = this.verifyStoreOwner(auth);
    if (!id || !UUID_REGEX.test(id)) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Mã voucher id không hợp lệ.');
    }

    const repo = new VoucherRepository(database.manager);
    const voucher = await repo.findStoreVoucherById(id, storeId);
    if (!voucher) {
      throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy voucher cửa hàng.');
    }

    const counts = await repo.getVoucherUsageCounts(id);

    return {
      voucher_id: voucher.id,
      reserved_count: counts.reserved_count,
      redeemed_count: counts.redeemed_count,
      remaining_count: Math.max(0, voucher.usage_limit - counts.reserved_count - counts.redeemed_count),
    };
  }

  async getPlatformVoucherUsage(
    id: string,
    auth: any,
    _correlation: string
  ): Promise<OperationOutputs['getPlatformVoucherUsage']> {
    this.verifyAdmin(auth);
    if (!id || !UUID_REGEX.test(id)) {
      throw new ApiError(422, 'VALIDATION_FAILED', 'Mã voucher id không hợp lệ.');
    }

    const repo = new VoucherRepository(database.manager);
    const voucher = await repo.findPlatformVoucherById(id);
    if (!voucher) {
      throw new ApiError(404, 'NOT_FOUND', 'Không tìm thấy voucher toàn sàn.');
    }

    const counts = await repo.getVoucherUsageCounts(id);

    return {
      voucher_id: voucher.id,
      reserved_count: counts.reserved_count,
      redeemed_count: counts.redeemed_count,
      remaining_count: Math.max(0, voucher.usage_limit - counts.reserved_count - counts.redeemed_count),
    };
  }
}

