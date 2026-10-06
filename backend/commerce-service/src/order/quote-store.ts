import Redis from 'ioredis';
import { required } from '../../../shared/src/config';
import { ApiError } from '../../../shared/src/errors';

export interface CheckoutQuoteRecord {
  user_id: string;
  request_hash: string;
  snapshot_hash: string;
  expires_at: string;
}
export interface QuoteStore {
  put(id: string, record: CheckoutQuoteRecord): Promise<void>;
  get(id: string): Promise<CheckoutQuoteRecord | undefined>;
}
export class RedisQuoteStore implements QuoteStore {
  private connection?: Redis;
  private connecting?: Promise<void>;
  private redis(): Redis {
    if (!this.connection) {
      this.connection = new Redis(required('REDIS_URL'), {
        lazyConnect: true, connectTimeout:1000, commandTimeout:1000, maxRetriesPerRequest: 0, enableOfflineQueue: false, retryStrategy: () => null,
      });
      this.connection.on('error', () => {});
    }
    return this.connection;
  }
  private async ready(): Promise<Redis> {
    const client = this.redis();
    if (client.status !== 'ready') {
      this.connecting ??= client.connect().finally(()=>{this.connecting=undefined;});
      await this.connecting;
    }
    return client;
  }
  async put(id: string, record: CheckoutQuoteRecord): Promise<void> {
    try {
      await (await this.ready()).set(`M2:checkout-quote:${id}`, JSON.stringify(record), 'PX', 15 * 60 * 1000);
    } catch { throw new ApiError(503, 'QUOTE_STORE_UNAVAILABLE', 'Không lưu được quote.'); }
  }
  async get(id: string): Promise<CheckoutQuoteRecord | undefined> {
    try {
      const value = await (await this.ready()).get(`M2:checkout-quote:${id}`);
      return value ? JSON.parse(value) : undefined;
    } catch { throw new ApiError(503, 'QUOTE_STORE_UNAVAILABLE', 'Không đọc được quote.'); }
  }
}
