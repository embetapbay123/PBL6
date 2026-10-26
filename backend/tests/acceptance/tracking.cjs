const { randomUUID } = require('node:crypto');
const { envelope, broker } = require('./broker.cjs');

module.exports = async function tracking(t) {
  const { token, db, check, wait, query, row, request, login, uid, correlation, newCorrelation } = t;
  const user = uid(1), otherUser = uid(2);
  const ownEvents = (service, type) => query(service,
    'SELECT * FROM outbox WHERE correlation_id=$1 AND event_type=$2 ORDER BY created_at,id', [correlation(), type]);
  const received = async (producer, id) => !!await row('M4', 'SELECT event_id FROM inbox WHERE producer=$1 AND event_id=$2', [producer, id]);
  const ingest = async (service, type, action) => {
    newCorrelation();
    await action();
    const events = await ownEvents(service, type);
    check(service + ' writes actual ' + type + ' to its outbox', events.length === 1);
    await wait(service + ' event reaches M4 through RabbitMQ', () => received(service, events[0].id), Boolean);
    await wait(service + ' commits its outbox publication', () => row(service,
      'SELECT published_at FROM outbox WHERE id=$1', [events[0].id]), r => !!r.published_at);
    check(service + ' publisher acknowledges its outbox row', true);
    return envelope(events[0], service);
  };
  const count = async table => (await row('M4', `SELECT count(*)::int AS n FROM ${table} WHERE user_id=$1`, [user])).n;
  const revision = async () => (await row('M4', 'SELECT version::int AS n FROM behavior_dataset_revision')).n;
  const defaults = await request('getPersonalizationConsent', { token });
  check('Consent defaults to WITHDRAWN/version 0 over live M3 authentication', defaults.status === 'WITHDRAWN' && defaults.version === 0);
  await request('updatePersonalizationConsent', { status: 401, body: {} });
  await request('updatePersonalizationConsent', { token, status: 422, body: { status: 'GRANTED', expected_version: '0' } });
  await request('updatePersonalizationConsent', { token, status: 422, body: { status: 'GRANTED', expected_version: 0, user_id: otherUser } });
  const beforeGrant = await ingest('M1', 'SearchRecorded', () => request('listProducts', { token, query: { q: 'before-opt-in' } }));
  check('No-consent search is received but never saved as personal history', await count('search_history') === 0);
  const granted = await request('updatePersonalizationConsent', { token, body: { status: 'GRANTED', expected_version: 0 } });
  check('Consent grant is versioned', granted.status === 'GRANTED' && granted.version === 1);
  await request('updatePersonalizationConsent', { token, status: 409, body: { status: 'WITHDRAWN', expected_version: 0 } });
  const other = await login('customer2@pbl6.test');
  const otherConsent = await request('getPersonalizationConsent', { token: other });
  check('Customer cannot grant consent on behalf of another User', otherConsent.status === 'WITHDRAWN' && otherConsent.version === 0);
  const revisionBefore = await revision();
  const search = await ingest('M1', 'SearchRecorded', () => request('listProducts', { token, query: { q: 'mẫu' } }));
  const view = await ingest('M1', 'InteractionRecorded', () => request('getProduct', { token, id: uid(80) }));
  const cart = await ingest('M2', 'InteractionRecorded', () => request('addCartItem', {
    token, body: { product_id: uid(80), variant_id: uid(90), quantity: 1 },
  }));
  check('Real search is stored exactly once', await count('search_history') === 1);
  check('Actual search/view/cart advance the versioned behavior dataset once each', await revision() === revisionBefore + 3);
  const behaviors = await query('M4', 'SELECT event_type,weight FROM recommendation_interaction WHERE user_id=$1 ORDER BY event_type', [user]);
  check('Real M1 VIEW and M2 CART have the contracted weights', behaviors.length === 2 &&
    behaviors.some(b => b.event_type === 'VIEW' && b.weight === 1) && behaviors.some(b => b.event_type === 'CART' && b.weight === 3));
  const personal = await request('getForYou', { token });
  check('Consented live behavior enables recent views without inventing model evaluation', personal.source === 'BASELINE' &&
    personal.recently_viewed_product_ids.includes(uid(80)) && personal.evaluation_status === 'NOT_RUN');
  newCorrelation();
  const guestCorrelation = correlation();
  await request('listProducts', { query: { q: 'guest-only' } });
  await request('getProduct', { id: uid(80) });
  check('Guest Catalog reads do not emit personal telemetry', (await row('M1',
    "SELECT count(*)::int AS n FROM outbox WHERE correlation_id=$1 AND event_type IN ('SearchRecorded','InteractionRecorded')", [guestCorrelation])).n === 0);

  const owner = await login('owner@pbl6.test');
  const pending = await query('M2', 'SELECT id,payment_method FROM "order" WHERE customer_user_id=$1 AND status=\'PENDING\' ORDER BY payment_method', [user]);
  check('Purchase acceptance starts with real paid-online and COD Orders', pending.length === 2 && new Set(pending.map(o => o.payment_method)).size === 2);
  const purchases = [];
  for (const order of pending) {
    for (const to_status of ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'COMPLETED']) {
      const current = await row('M2', 'SELECT version,payable_vnd FROM "order" WHERE id=$1', [order.id]);
      if (to_status === 'COMPLETED' && order.payment_method === 'COD') {
        await request('collectCod', { token: owner, id: order.id, body: {
          expected_version: current.version, amount_collected_vnd: Number(current.payable_vnd),
        } });
      }
      const body = { to_status, expected_version: (await row('M2', 'SELECT version FROM "order" WHERE id=$1', [order.id])).version };
      if (to_status === 'COMPLETED') purchases.push(await ingest('M2', 'OrderCompleted', () =>
        request('transitionStoreOrder', { token: owner, id: order.id, body })));
      else await request('transitionStoreOrder', { token: owner, id: order.id, body });
    }
  }
  const bought = await query('M4', "SELECT event_id,product_id,weight FROM recommendation_interaction WHERE user_id=$1 AND event_type='PURCHASE'", [user]);
  check('Actual online/COD completion produces one PURCHASE per Order item', bought.length === 2 && bought.every(b => b.weight === 5) &&
    purchases.every(e => bought.some(b => b.event_id === 'M2:' + e.event_id + ':0' && b.product_id === e.payload.items[0].product_id)));
  check('Purchase tombstones retain no Customer/items payload', (await query('M4',
    "SELECT payload FROM event_entity_state WHERE kind='OrderCompleted'")).every(s => Object.keys(s.payload).length === 0));
  const purchaseRevision = await revision();
  await broker(async ({ publish, channel }) => {
    for (const event of [search, view, cart, ...purchases, beforeGrant]) await publish(event);
    // A fresh envelope with the same real Order payload exercises entity-level dedup and is a FIFO barrier.
    const entityReplay = { ...purchases[0], event_id: randomUUID() };
    await publish(entityReplay);
    await wait('new-envelope Order replay is processed', () => received('M2', entityReplay.event_id), Boolean);
    check('Broker redelivery and new-envelope Order replay do not duplicate behavior', await count('recommendation_interaction') === 4 && await count('search_history') === 1);
    check('Duplicate deliveries do not advance dataset revision', await revision() === purchaseRevision);
    const invalid = { ...search, event_id: randomUUID(), producer: 'M2' };
    await publish(invalid);
    const dead = await wait('wrong-producer event enters DLQ', async () => channel.get('pbl6.m4.tracking.v1.dead', { noAck: true }), Boolean);
    check('DLQ contains the exact rejected event rather than an unrelated message', JSON.parse(dead.content.toString()).event_id === invalid.event_id);
    check('Wrong-producer event cannot enter inbox', !await received('M2', invalid.event_id));
  });

  await db.M4.query(`ALTER TABLE acceptance.environment ADD COLUMN fail_tracking boolean NOT NULL DEFAULT true;
    CREATE SEQUENCE acceptance.tracking_attempts;
    CREATE FUNCTION acceptance.fail_tracking() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF (SELECT fail_tracking FROM acceptance.environment) THEN
      PERFORM nextval('acceptance.tracking_attempts');
      RAISE EXCEPTION 'controlled tracking fault' USING ERRCODE='40001'; END IF; RETURN NEW; END $$;
    CREATE TRIGGER acceptance_tracking_fault BEFORE INSERT ON search_history FOR EACH ROW EXECUTE FUNCTION acceptance.fail_tracking()`);
  newCorrelation();
  await request('listProducts', { token, query: { q: 'retry-control' } });
  const [retryRow] = await ownEvents('M1', 'SearchRecorded');
  await wait('actual worker attempts a failing behavior transaction', () => row('M4', 'SELECT is_called FROM acceptance.tracking_attempts'), r => r.is_called);
  check('Database failure rolls back inbox and search effect together', !await received('M1', retryRow.id) && await count('search_history') === 1);
  await db.M4.query('UPDATE acceptance.environment SET fail_tracking=false');
  await wait('worker redelivery recovers after database fault', () => received('M1', retryRow.id), Boolean);
  check('Recovered event is recorded exactly once', await count('search_history') === 2);
  await db.M4.query('DROP TRIGGER acceptance_tracking_fault ON search_history; DROP FUNCTION acceptance.fail_tracking()');

  await db.M4.query("INSERT INTO search_history(user_id,query,created_at) VALUES($1,'retention-control',now()-interval '31 days')", [user]);
  await db.M4.query("INSERT INTO recommendation_interaction(user_id,product_id,event_id,event_type,weight,occurred_at) VALUES($1,$2,'acceptance-old','VIEW',1,now()-interval '31 days')", [user, uid(80)]);
  await request('getPersonalizationConsent', { token });
  check('Retention removes only aged fixtures and keeps current behavior', await count('search_history') === 2 && await count('recommendation_interaction') === 4);
  await request('updatePersonalizationConsent', { token: other, body: { status: 'GRANTED', expected_version: 0 } });
  await ingest('M1', 'InteractionRecorded', () => request('getProduct', { token: other, id: uid(81) }));
  await db.M4.query("INSERT INTO user_preference(user_id,profile_json,updated_at) VALUES($1,'{}',now())", [user]);
  await request('updatePersonalizationConsent', { token, body: { status: 'WITHDRAWN', expected_version: 1 } });
  check('Withdrawal immediately erases personal searches/interactions/preferences', await count('search_history') === 0 &&
    await count('recommendation_interaction') === 0 && await count('user_preference') === 0);
  check('Withdrawal preserves another consented Customer behavior', (await row('M4', 'SELECT count(*)::int AS n FROM recommendation_interaction WHERE user_id=$1', [otherUser])).n === 1);
  const fallback = await request('getForYou', { token });
  check('Withdrawn consent serves explicit non-personalized fallback', fallback.source === 'FALLBACK' && fallback.recently_viewed_product_ids.length === 0 && fallback.evaluation_status === 'NOT_RUN');
  await ingest('M1', 'SearchRecorded', () => request('listProducts', { token, query: { q: 'after-withdrawal' } }));
  await ingest('M2', 'InteractionRecorded', () => request('addCartItem', { token,
    body: { product_id: uid(80), variant_id: uid(90), quantity: 1 } }));
  check('New traffic while withdrawn is received but not stored personally', await count('search_history') === 0 && await count('recommendation_interaction') === 0);
  await request('updatePersonalizationConsent', { token, body: { status: 'GRANTED', expected_version: 2 } });
  await broker(async ({ publish }) => {
    const old = { ...search, event_id: randomUUID() };
    await publish(old);
    await wait('pre-grant event receives a durable skip', () => received('M1', old.event_id), Boolean);
    check('Regrant cannot resurrect delayed pre-grant behavior', await count('search_history') === 0);
  });
  await ingest('M1', 'InteractionRecorded', () => request('getProduct', { token, id: uid(80) }));
  const admin = await login('admin@pbl6.test');
  newCorrelation();
  const otherVersion = await row('M3', 'SELECT version FROM "user" WHERE id=$1', [otherUser]);
  await request('updateUserState', { token: admin, id: otherUser, body: {
    expected_version: otherVersion.version, status: 'ACTIVE', reason: 'Controlled active-state update',
  } });
  check('An ACTIVE user update does not falsely emit UserLocked', (await ownEvents('M3', 'UserLocked')).length === 0);
  const currentUser = await row('M3', 'SELECT version FROM "user" WHERE id=$1', [user]);
  await ingest('M3', 'UserLocked', () => request('updateUserState', { token: admin, id: user,
    body: { expected_version: currentUser.version, status: 'LOCKED', reason: 'Controlled acceptance lock' } }));
  const locked = await row('M4', 'SELECT status,source FROM personalization_consent WHERE user_id=$1', [user]);
  check('Actual M3 UserLocked withdraws consent and purges behavior', locked.status === 'WITHDRAWN' && locked.source === 'USER_LOCKED' &&
    await count('search_history') === 0 && await count('recommendation_interaction') === 0);
  await request('getPersonalizationConsent', { token, status: 401 });
  check('Live M3 revocation rejects the locked Customer token', true);
  const storeVersion = await row('M3', 'SELECT version FROM store WHERE id=$1', [uid(61)]);
  await ingest('M3', 'StoreStatusChanged', () => request('updateStoreState', { token: admin, id: uid(61), body: {
    expected_version: storeVersion.version, status: 'LOCKED', reason: 'Controlled Store suspension',
  } }));
  const suspended = await request('getForYou', { token: other });
  check('Live Store suspension removes only its Products from recommendation', suspended.product_ids.every(id => ![uid(80), uid(81), uid(82)].includes(id)) &&
    suspended.product_ids.includes(uid(1080)) && suspended.recently_viewed_product_ids.length === 0);
  await request('getRelatedProducts', { id: uid(80), status: 404 });
  check('Related relies on authoritative M1 visibility and rejects a locked Store Product', true);
  await ingest('M3', 'StoreStatusChanged', () => request('updateStoreState', { token: admin, id: uid(61), body: {
    expected_version: storeVersion.version + 1, status: 'ACTIVE', reason: 'Restore isolated fixture Store',
  } }));
  const storeState = await row('M4', "SELECT version,payload FROM event_entity_state WHERE kind='StoreStatusChanged' AND entity_id=$1", [uid(61)]);
  check('Actual StoreStatusChanged versions preserve the latest reactivation', Number(storeState.version) === storeVersion.version + 2 && storeState.payload.status === 'ACTIVE');
};
