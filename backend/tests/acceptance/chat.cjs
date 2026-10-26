const { createHash, randomUUID } = require('node:crypto');

module.exports = async function chat(t) {
  const { token, db, check, wait, row, request, login, uid } = t;
  const owner = await login('owner@pbl6.test');
  const admin = await login('admin@pbl6.test');
  const session = await request('createChatSession', { token, body: {} });
  check('Authenticated chat session belongs to the live Customer', session.user_id === uid(2) && !session.anonymous_key);
  await request('sendChatMessage', { token: owner, id: session.id, status: 404, body: { content: 'mẫu' } });
  await request('listOwnChatSessions', { token: owner, status: 404, query: { session_id: session.id } });
  await request('sendChatMessage', { token, id: session.id, status: 422, body: { content: 'mẫu', product_cards: [] } });
  check('Another authenticated User cannot read or write this chat', true);
  const product = await request('getProduct', { id: uid(80) });
  const title = 'Acceptance camera updated';
  const updated = await request('updateProduct', { token: owner, id: uid(80), body: { expected_version: product.version, title } });
  await wait('actual ProductChanged invalidates the live index', () => row('M4',
    'SELECT status FROM product_embedding WHERE product_id=$1', [uid(80)]), r => r?.status === 'STALE');
  check('Index was built from actual Catalog before invalidation', !!await row('M4', 'SELECT product_id FROM product_document WHERE product_id=$1', [uid(80)]));
  const answer = await request('sendChatMessage', { token, id: session.id, body: { content: title } });
  check('No configured model is explicitly disclosed in the API', answer.mode === 'real' && answer.fallback === true && answer.fallback_reason === 'PROVIDER_NOT_CONFIGURED');
  check('Stale index cannot return cached title or price', answer.content.includes(title) &&
    answer.product_cards.some(c => c.product_id === uid(80) && c.current_price_vnd === product.variants[0].price_vnd));
  const history = await request('listOwnChatSessions', { token, query: { session_id: session.id, message_size: 1 } });
  check('History is owned, paginated and does not replay old cards as current quotes', history.items.length === 1 &&
    history.items[0].messages.total === 2 && history.items[0].messages.items.length === 1 &&
    history.items[0].messages.items.every(m => !('product_cards' in m)));
  await request('updateProduct', { token: owner, id: uid(80), body: { expected_version: updated.version, status: 'STOPPED' } });
  const stopped = await request('sendChatMessage', { token, id: session.id, body: { content: title } });
  check('Current stopped Product is excluded despite stale embeddings/history', stopped.product_cards.every(c => c.product_id !== uid(80)));
  const recs = await request('getForYou', { token });
  check('Recommendation excludes stopped Products and does not claim trained-model quality', !recs.product_ids.includes(uid(80)) && recs.evaluation_status === 'NOT_RUN');

  const guest = await request('createChatSession', { body: {} });
  const stored = await row('M4', 'SELECT anonymous_key FROM chat_session WHERE id=$1', [guest.id]);
  check('Guest capability is returned once and stored only as a hash', /^[a-f0-9]{64}$/.test(guest.anonymous_key) &&
    stored.anonymous_key === createHash('sha256').update(guest.anonymous_key).digest('hex'));
  await request('sendChatMessage', { id: guest.id, status: 401, body: {} });
  await request('sendChatMessage', { id: guest.id, status: 404, headers: { 'x-chat-key': 'f'.repeat(64) }, body: { content: 'mẫu' } });
  await request('sendChatMessage', { token, id: guest.id, status: 404, body: { content: 'mẫu' } });
  const guestAnswer = await request('sendChatMessage', { id: guest.id,
    headers: { 'x-chat-key': guest.anonymous_key }, body: { content: 'mẫu' } });
  check('Guest answer needs the correct private capability and remains explicit fallback', guestAnswer.fallback && guestAnswer.fallback_reason === 'PROVIDER_NOT_CONFIGURED');

  const platform = await request('getAiMetrics', { token: admin });
  const store = await request('getAiMetrics', { token: owner });
  await request('getAiMetrics', { token, status: 403 });
  await request('getAiMetrics', { token: owner, status: 403, query: { store_id: randomUUID() } });
  const allTraces = await row('M4', 'SELECT count(*)::int AS n FROM ai_request_trace');
  const scopedTraces = await row('M4', 'SELECT count(*)::int AS n FROM ai_request_trace WHERE store_ids=$1::jsonb', [JSON.stringify([uid(61)])]);
  check('Admin and Owner metrics match actual global and exact-Store trace scopes',
    allTraces.n === 3 && platform.metrics.requests === allTraces.n && store.metrics.requests === scopedTraces.n);
  check('Actual metrics keep unknown tokens/cost null and evaluation NOT_RUN', [platform, store].every(m =>
    m.evaluation_status === 'NOT_RUN' && m.metrics.actual_tokens === null && m.metrics.cost_usd === null &&
    m.metrics.versions.every(v => v.provider === 'none')) && !('model_version' in store));
  const before = await row('M4', 'SELECT count(*)::int AS n FROM chat_message WHERE session_id=$1', [session.id]);
  await db.M4.query('UPDATE ai_usage_budget SET requests=100 WHERE scope_hash=$1 AND day=current_date', [
    createHash('sha256').update('turn:' + uid(2)).digest('hex'),
  ]);
  await request('sendChatMessage', { token, id: session.id, status: 429, body: { content: 'mẫu' } });
  check('Persisted chat budget fails closed without writing a half-turn', (await row('M4', 'SELECT count(*)::int AS n FROM chat_message WHERE session_id=$1', [session.id])).n === before.n);
  await db.M4.query("UPDATE chat_session SET created_at=now()-interval '31 days' WHERE id=$1", [session.id]);
  await request('listOwnChatSessions', { token, status: 404, query: { session_id: session.id } });
  await request('sendChatMessage', { token, id: session.id, status: 404, body: { content: 'mẫu' } });
  check('Expired sessions are inaccessible before periodic deletion runs', true);
};
