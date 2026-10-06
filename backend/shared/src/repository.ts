import { EntityManager } from 'typeorm';
import { ApiError } from './errors';
// Parameterized queries; the owner supplies a transaction-scoped manager.
export abstract class OwnedRepository {
  constructor(protected readonly manager: EntityManager) {}
  // Postgres UPDATE returns [rows, affectedCount] through TypeORM's raw query API.
  protected async updateReturning<T=any>(sql:string,parameters:unknown[]):Promise<T|undefined> {
    const result=await this.manager.query(sql,parameters);
    const rows=Array.isArray(result[0]) ? result[0] : result;
    return rows[0];
  }
  protected conflict(): never {throw new ApiError(409,'VERSION_CONFLICT','Dữ liệu đã thay đổi. Vui lòng tải lại.');}
}
