import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { VoucherService } from '../../commerce-service/src/voucher/voucher.service';
import { VoucherRepository } from '../../commerce-service/src/voucher/voucher.repository';

const postgres = process.env.M2_DATABASE_URL ? describe : describe.skip;
postgres('Voucher lifecycle with the caller PostgreSQL transaction', () => {
  let db: DataSource;
  const service = new VoucherService();
  let vouchers: string[] = [], orders: string[] = [];
  const tx = <T>(work: (manager: any) => Promise<T>) => db.transaction(work);
  const reserve = (input: any) => tx(manager => service.reserveVoucher(manager, input));
  const commit = (group: string, rows: any[]) => tx(manager => service.commitVoucherRedemptions(manager, group, rows));
  const release = (group: string) => tx(manager => service.releaseVoucherReservations(manager, group));

  async function voucher(options: { scope?: string; store?: string; limit?: number; customerLimit?: number } = {}) {
    const id = randomUUID(); vouchers.push(id);
    await db.query(`INSERT INTO voucher(id,code,scope,store_id,owner_user_id,discount_type,discount_value,
      min_goods_vnd,starts_at,ends_at,usage_limit,per_customer_limit,status)
      VALUES($1,$2,$3,$4,$5,'FIXED',10000,0,now()-interval '1 hour',now()+interval '1 day',$6,$7,'ACTIVE')`,
    [id, 'LIFECYCLE-' + id, options.scope ?? 'STORE', options.store ?? store, randomUUID(),
      options.limit ?? 10, options.customerLimit ?? 10]);
    // Platform reservations deliberately have no Store scope.
    if (options.scope === 'PLATFORM') await db.query('UPDATE voucher SET store_id=NULL WHERE id=$1', [id]);
    return id;
  }
  const store = randomUUID(), customer = randomUUID();
  function hold(id: string, options: Record<string, unknown> = {}) {
    return { voucher_id: id, purchase_group_id: randomUUID(), customer_user_id: customer, store_id: store,
      discount_vnd: 10000, expires_at: new Date(Date.now() + 600000), ...options };
  }
  async function order(input: ReturnType<typeof hold>, options: Record<string, unknown> = {}) {
    const id = randomUUID(); orders.push(id);
    const row = { customer: input.customer_user_id, store: input.store_id ?? store, group: input.purchase_group_id,
      storeDiscount: input.store_id ? input.discount_vnd : 0, platformDiscount: input.store_id ? 0 : input.discount_vnd,
      status: 'CONFIRMED', ...options };
    await db.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,
      goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd)
      VALUES($1,$2,$3,$4,$5,'COD',100000,$6,$7,0,$8)`,
    [id, row.group, row.customer, row.store, row.status, row.storeDiscount, row.platformDiscount,
      100000 - Number(row.storeDiscount) - Number(row.platformDiscount)]);
    return id;
  }
  const redemption = (input: ReturnType<typeof hold>, id: string, amount = input.discount_vnd) => ({
    voucher_id: input.voucher_id, order_id: id, customer_user_id: input.customer_user_id, discount_vnd: amount,
  });
  async function ledger(id: string) { return db.query('SELECT * FROM voucher_redemption WHERE voucher_id=$1', [id]); }
  async function status(input: ReturnType<typeof hold>) {
    const [row] = await db.query('SELECT status FROM voucher_reservation WHERE voucher_id=$1 AND purchase_group_id=$2',
      [input.voucher_id, input.purchase_group_id]);
    return row?.status;
  }
  beforeAll(async () => { db = new DataSource({ type: 'postgres', url: process.env.M2_DATABASE_URL }); await db.initialize(); });
  afterEach(async () => {
    if (vouchers.length) {
      await db.query('DELETE FROM voucher_redemption WHERE voucher_id=ANY($1::uuid[])', [vouchers]);
      await db.query('DELETE FROM voucher_reservation WHERE voucher_id=ANY($1::uuid[])', [vouchers]);
      await db.query('DELETE FROM voucher WHERE id=ANY($1::uuid[])', [vouchers]);
    }
    if (orders.length) await db.query('DELETE FROM "order" WHERE id=ANY($1::uuid[])', [orders]);
    vouchers = []; orders = [];
  });
  afterAll(async () => { await db.destroy(); });

  test('identical reserve replay keeps its ID; changed customer, Store, amount or expiry returns 409', async () => {
    const input = hold(await voucher()); const first = await reserve(input);
    expect(await reserve(input)).toEqual(first);
    for (const changed of [{ customer_user_id: randomUUID() }, { store_id: randomUUID() }, { discount_vnd: 1 },
      { expires_at: new Date(input.expires_at.getTime() + 1000) }])
      await expect(reserve({ ...input, ...changed })).rejects.toMatchObject({ status: 409 });
    const [row] = await db.query('SELECT customer_user_id,store_id,discount_vnd,expires_at,status FROM voucher_reservation WHERE id=$1', [first.id]);
    expect(row).toMatchObject({ customer_user_id: customer, store_id: store, discount_vnd: '10000', status: 'ACTIVE' });
    expect(new Date(row.expires_at).getTime()).toBe(input.expires_at.getTime());
  });

  test.each(['total', 'customer'])('concurrent reservations respect the %s quota', async scope => {
    const id = await voucher({ limit: scope === 'total' ? 1 : 10, customerLimit: scope === 'customer' ? 1 : 10 });
    const a = hold(id), b = hold(id, { customer_user_id: scope === 'total' ? randomUUID() : customer });
    const results = await Promise.allSettled([reserve(a), reserve(b)]);
    expect(results.filter(row => row.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find(row => row.status === 'rejected') as PromiseRejectedResult;
    expect(failed.reason).toMatchObject({ status: 422, response: { code: 'VOUCHER_OUT_OF_QUOTA' } });
    expect(await db.query('SELECT id FROM voucher_reservation WHERE voucher_id=$1', [id])).toHaveLength(1);
  });

  test('commit without any reservation cannot redeem a quota-one voucher', async () => {
    const id = await voucher({ limit: 1 });
    for (let index = 0; index < 2; index++) {
      const input = hold(id), created = await order(input);
      await expect(commit(input.purchase_group_id, [redemption(input, created)])).rejects.toMatchObject({ status: 409 });
    }
    expect(await ledger(id)).toHaveLength(0);
  });

  test.each(['future', 'expired'])('voucher validity rejects new holds and commit when %s', async mode => {
    const input = hold(await voucher()); await reserve(input); const created = await order(input);
    await db.query(mode === 'future'
      ? "UPDATE voucher SET starts_at=now()+interval '1 hour',ends_at=now()+interval '2 hours' WHERE id=$1"
      : "UPDATE voucher SET starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour' WHERE id=$1", [input.voucher_id]);
    await expect(reserve(hold(input.voucher_id))).rejects.toMatchObject({ status: 422 });
    await expect(commit(input.purchase_group_id, [redemption(input, created)])).rejects.toMatchObject({ status: 422 });
    expect(await ledger(input.voucher_id)).toHaveLength(0);
  });

  test('valid commit is replay-safe, survives later expiry/stop/cancel, and cannot restore committed quota', async () => {
    const input = hold(await voucher({ limit: 1 })); await reserve(input); const created = await order(input);
    const rows = [redemption(input, created)]; await commit(input.purchase_group_id, rows);
    await db.query("UPDATE voucher SET status='STOPPED' WHERE id=$1", [input.voucher_id]);
    await db.query("UPDATE voucher_reservation SET expires_at=now()-interval '1 hour' WHERE voucher_id=$1", [input.voucher_id]);
    await db.query("UPDATE \"order\" SET status='CANCELLED' WHERE id=$1", [created]);
    await commit(input.purchase_group_id, rows); await release(input.purchase_group_id);
    expect(await ledger(input.voucher_id)).toHaveLength(1); expect(await status(input)).toBe('RESERVED');
    await expect(commit(input.purchase_group_id, [redemption(input, created, 1)])).rejects.toMatchObject({ status: 409 });
    await db.query("UPDATE voucher SET status='ACTIVE' WHERE id=$1", [input.voucher_id]);
    await expect(reserve(hold(input.voucher_id))).rejects.toMatchObject({ status: 422 });
  });

  test.each(['customer', 'Store', 'discount', 'Order', 'allocation'])('commit rejects the wrong %s snapshot without ledger effects', async mismatch => {
    const input = hold(await voucher()); await reserve(input);
    const created = await order(input, mismatch === 'Store' ? { store: randomUUID() } : mismatch === 'customer' ? { customer: randomUUID() } :
      mismatch === 'discount' ? { storeDiscount: 5000 } : {});
    const rows = [redemption(input, mismatch === 'Order' ? randomUUID() : created, mismatch === 'allocation' ? 5000 : 10000)];
    await expect(commit(input.purchase_group_id, rows)).rejects.toMatchObject({ status: 409 });
    expect(await ledger(input.voucher_id)).toHaveLength(0); expect(await status(input)).toBe('ACTIVE');
  });

  test.each(['expired', 'released', 'stopped'])('commit rejects a %s reservation/voucher and never reactivates it', async mode => {
    const input = hold(await voucher()); await reserve(input); const created = await order(input);
    if (mode === 'released') await release(input.purchase_group_id);
    if (mode === 'expired') { input.expires_at = new Date(Date.now() - 1000); await db.query('UPDATE voucher_reservation SET expires_at=$2 WHERE voucher_id=$1', [input.voucher_id, input.expires_at]); }
    if (mode === 'stopped') await db.query("UPDATE voucher SET status='STOPPED' WHERE id=$1", [input.voucher_id]);
    await expect(commit(input.purchase_group_id, [redemption(input, created)])).rejects.toMatchObject({ status: mode === 'stopped' ? 422 : 409 });
    if (mode !== 'stopped') await expect(reserve(input)).rejects.toMatchObject({ status: 409 });
    expect(await ledger(input.voucher_id)).toHaveLength(0);
  });

  test('release is replay-safe, frees only uncommitted quota and excludes the hold from active reads', async () => {
    const input = hold(await voucher({ limit: 1 })); await reserve(input);
    await release(input.purchase_group_id); await release(input.purchase_group_id);
    expect(await status(input)).toBe('RELEASED');
    expect(await new VoucherRepository(db.manager).findActiveReservationsByPurchaseGroup(input.purchase_group_id)).toEqual([]);
    await expect(reserve(input)).rejects.toMatchObject({ status: 409 });
    await expect(reserve(hold(input.voucher_id))).resolves.toHaveProperty('id');
  });

  test('concurrent commit and release have one winner without ledger/hold disagreement', async () => {
    const input = hold(await voucher()); await reserve(input); const created = await order(input);
    await Promise.allSettled([commit(input.purchase_group_id, [redemption(input, created)]), release(input.purchase_group_id)]);
    const rows = await ledger(input.voucher_id), state = await status(input);
    expect(rows.length === 1 ? state === 'RESERVED' : state === 'RELEASED').toBe(true);
  });

  test('concurrent committed replays write exactly one redemption', async () => {
    const input = hold(await voucher()); await reserve(input); const created = await order(input);
    await Promise.all([commit(input.purchase_group_id, [redemption(input, created)]), commit(input.purchase_group_id, [redemption(input, created)])]);
    expect(await ledger(input.voucher_id)).toHaveLength(1);
  });

  test('platform discount covers the group allocation, counts one use and does not restore a cancelled sibling share', async () => {
    const id = await voucher({ scope: 'PLATFORM', limit: 1 });
    const input = hold(id, { store_id: null }); await reserve(input);
    const a = await order(input, { store: randomUUID(), platformDiscount: 4000 });
    const b = await order(input, { store: randomUUID(), platformDiscount: 6000 });
    await expect(commit(input.purchase_group_id, [redemption(input, a, 4000)])).rejects.toMatchObject({ status: 409 });
    expect(await ledger(id)).toHaveLength(0);
    const rows = [redemption(input, a, 4000), redemption(input, b, 6000)];
    await commit(input.purchase_group_id, rows);
    expect(await new VoucherRepository(db.manager).getVoucherUsageCounts(id)).toEqual({ redeemed_count: 1, reserved_count: 0 });
    await db.query("UPDATE \"order\" SET status='CANCELLED' WHERE id=$1", [b]);
    await commit(input.purchase_group_id, [...rows].reverse()); await release(input.purchase_group_id);
    expect(await ledger(id)).toHaveLength(2);
    const [first] = await db.query('SELECT platform_discount_vnd,payable_vnd FROM "order" WHERE id=$1', [a]);
    expect(first).toEqual({ platform_discount_vnd: '4000', payable_vnd: '96000' });
  });

  test('all vouchers of the group must commit atomically', async () => {
    const a = hold(await voucher()); const platform = hold(await voucher({ scope: 'PLATFORM' }), { store_id: null, purchase_group_id: a.purchase_group_id });
    await reserve(a); await reserve(platform);
    const created = await order(a, { platformDiscount: 10000 });
    await expect(commit(a.purchase_group_id, [redemption(a, created)])).rejects.toMatchObject({ status: 409 });
    await commit(a.purchase_group_id, [redemption(a, created), redemption(platform, created)]);
    expect(await ledger(a.voucher_id)).toHaveLength(1); expect(await ledger(platform.voucher_id)).toHaveLength(1);
  });

  test('scope and per-group voucher slot conflicts do not create extra reservations', async () => {
    const a = hold(await voucher());
    await expect(reserve({ ...a, store_id: randomUUID() })).rejects.toMatchObject({ status: 409 });
    await reserve(a);
    const another = hold(await voucher(), { purchase_group_id: a.purchase_group_id });
    await expect(reserve(another)).rejects.toMatchObject({ status: 409 });
    const platform = hold(await voucher({ scope: 'PLATFORM' }), { purchase_group_id: a.purchase_group_id });
    await expect(reserve(platform)).rejects.toMatchObject({ status: 409 });
    const otherCustomer = { ...platform, store_id: null, customer_user_id: randomUUID() };
    await expect(reserve(otherCustomer)).rejects.toMatchObject({ status: 409 });
  });

  test('an empty payload cannot skip held vouchers or discounted Orders', async () => {
    const input = hold(await voucher()); await reserve(input);
    await expect(commit(input.purchase_group_id, [])).rejects.toMatchObject({ status: 409 });
    const withoutHold = hold(input.voucher_id); await order(withoutHold);
    await expect(commit(withoutHold.purchase_group_id, [])).rejects.toMatchObject({ status: 409 });
    await expect(commit(randomUUID(), [])).resolves.toBeUndefined();
  });

  test('a quota reduced below existing holds rejects commit without changing the ledger', async () => {
    const id = await voucher(); const a = hold(id), b = hold(id); await reserve(a); await reserve(b);
    const created = await order(a); await db.query('UPDATE voucher SET usage_limit=1 WHERE id=$1', [id]);
    await expect(commit(a.purchase_group_id, [redemption(a, created)])).rejects.toMatchObject({ status: 422 });
    expect(await ledger(id)).toHaveLength(0); expect(await status(a)).toBe('ACTIVE');
  });

  test('a caller failure rolls back Order, ledger and reservation state together', async () => {
    const input = hold(await voucher()); await reserve(input); const created = randomUUID(); orders.push(created);
    await expect(tx(async manager => {
      await manager.query(`INSERT INTO "order"(id,purchase_group_id,customer_user_id,store_id,status,payment_method,
        goods_vnd,store_discount_vnd,platform_discount_vnd,shipping_vnd,payable_vnd)
        VALUES($1,$2,$3,$4,'PREPARING','COD',100000,10000,0,0,90000)`,
      [created, input.purchase_group_id, customer, store]);
      await service.commitVoucherRedemptions(manager, input.purchase_group_id, [redemption(input, created)]);
      throw new Error('CALLER_FAILED');
    })).rejects.toThrow('CALLER_FAILED');
    expect(await db.query('SELECT id FROM "order" WHERE id=$1', [created])).toEqual([]);
    expect(await ledger(input.voucher_id)).toHaveLength(0); expect(await status(input)).toBe('ACTIVE');
    await release(input.purchase_group_id); expect(await status(input)).toBe('RELEASED');
  });
});
