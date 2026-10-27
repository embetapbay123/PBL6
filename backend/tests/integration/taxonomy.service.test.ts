import { randomUUID } from 'node:crypto';
import { initializeDatabase, database } from '../../shared/src/database';
import { ModerationService } from '../../catalog-service/src/moderation/moderation.service';
import { ApiError } from '../../shared/src/errors';

process.env.SERVICE_ID = 'M1';

/**
 * Taxonomy writes exercised through the service against real PostgreSQL.
 *
 * No HTTP and therefore no login on purpose: the integration run shares a 30-per-minute login
 * budget across every suite, and the Admin routing itself is already covered by @Roles metadata.
 */
const service = new ModerationService();
const actor = '10000000-0000-4000-8000-000000000021'; // seeded ADMIN user
const created = { categories: [] as string[], types: [] as string[], attributes: [] as string[], products: [] as string[] };
let requestIds: string[] = [];

function requestId() {
  const id = 'taxonomy-svc-' + randomUUID();
  requestIds.push(id);
  return id;
}

async function rejected(run: Promise<unknown>): Promise<ApiError> {
  try { await run; } catch (error) { return error as ApiError; }
  throw new Error('expected the call to be rejected');
}

beforeAll(async () => { await initializeDatabase(); });
afterAll(async () => {
  for (const id of requestIds) await database.query('DELETE FROM m1_audit WHERE request_id=$1', [id]);
  for (const id of created.products) await database.query('DELETE FROM product WHERE id=$1', [id]);
  for (const id of created.attributes) await database.query('DELETE FROM attribute_definition WHERE id=$1', [id]);
  for (const id of created.types) await database.query('DELETE FROM product_type WHERE id=$1', [id]);
  // Children were created after their parents, so unwinding the list keeps category_parent_id_fkey happy.
  for (const id of [...created.categories].reverse()) await database.query('DELETE FROM category WHERE id=$1', [id]);
  if (database?.isInitialized) await database.destroy();
});

test('createCategory stores the row with version 0 and one audit entry', async () => {
  const id = requestId();
  const category = await service.createCategory({ name: 'Áo Thun ' + randomUUID().slice(0, 6) }, actor, id);
  created.categories.push(category.id);

  expect(category).toMatchObject({ status: 'ACTIVE', version: 0 });
  // The response projection is the contract's: no slug, and parent_id only when set.
  expect((category as any).slug).toBeUndefined();
  expect(category).not.toHaveProperty('parent_id');
  expect(await database.query('SELECT action, actor_user_id FROM m1_audit WHERE request_id=$1', [id]))
    .toEqual([{ action: 'CATEGORY_CREATED', actor_user_id: actor }]);
});

test('a duplicate category name answers 409 instead of a unique-violation 500', async () => {
  const name = 'Trùng Tên ' + randomUUID().slice(0, 6);
  const first = await service.createCategory({ name }, actor, requestId());
  created.categories.push(first.id);

  const error = await rejected(service.createCategory({ name }, actor, requestId()));
  expect(error.getStatus()).toBe(409);
  expect((error.getResponse() as any).code).toBe('SLUG_CONFLICT');
});

test('a category parent must exist, and the tree must stay a tree', async () => {
  const missing = await rejected(service.createCategory({ name: 'Mồ côi ' + randomUUID().slice(0, 6), parent_id: randomUUID() }, actor, requestId()));
  expect(missing.getStatus()).toBe(422);
  expect((missing.getResponse() as any).code).toBe('PARENT_NOT_FOUND');

  const root = await service.createCategory({ name: 'Root ' + randomUUID().slice(0, 6) }, actor, requestId());
  const child = await service.createCategory({ name: 'Child ' + randomUUID().slice(0, 6), parent_id: root.id }, actor, requestId());
  created.categories.push(root.id, child.id);
  expect(child).toMatchObject({ parent_id: root.id });

  // A node cannot become its own ancestor, directly or through a descendant.
  const self = await rejected(service.updateCategory(root.id, { parent_id: root.id, expected_version: 0 }, actor, requestId()));
  expect(self.getStatus()).toBe(422);
  expect((self.getResponse() as any).code).toBe('CATEGORY_CYCLE');
  const throughChild = await rejected(service.updateCategory(root.id, { parent_id: child.id, expected_version: 0 }, actor, requestId()));
  expect((throughChild.getResponse() as any).code).toBe('CATEGORY_CYCLE');

  // The refused edits left the row untouched.
  expect(await database.query('SELECT parent_id, version FROM category WHERE id=$1', [root.id]))
    .toEqual([{ parent_id: null, version: 0 }]);
});

test('updateCategory enforces expected_version and bumps it on success', async () => {
  const category = await service.createCategory({ name: 'Versioned ' + randomUUID().slice(0, 6) }, actor, requestId());
  created.categories.push(category.id);

  const stale = await rejected(service.updateCategory(category.id, { name: 'Stale', expected_version: 7 }, actor, requestId()));
  expect(stale.getStatus()).toBe(409);
  expect((stale.getResponse() as any).code).toBe('VERSION_CONFLICT');

  const updated = await service.updateCategory(category.id, { name: 'Đã đổi ' + randomUUID().slice(0, 6), expected_version: 0 }, actor, requestId());
  expect(updated.version).toBe(1);
});

test('a product type needs an existing category and returns its empty definition list', async () => {
  const noCategory = await rejected(service.createProductType({ name: 'Thiếu category' }, actor, requestId()));
  expect(noCategory.getStatus()).toBe(422);

  const unknownCategory = await rejected(service.createProductType({ name: 'Category lạ', category_id: randomUUID() }, actor, requestId()));
  expect((unknownCategory.getResponse() as any).code).toBe('CATEGORY_NOT_FOUND');

  const parent = await service.createCategory({ name: 'Danh mục ' + randomUUID().slice(0, 6) }, actor, requestId());
  created.categories.push(parent.id);
  const type = await service.createProductType({ name: 'Loại ' + randomUUID().slice(0, 6), category_id: parent.id }, actor, requestId());
  created.types.push(type.id);

  expect(type).toMatchObject({ category_id: parent.id, status: 'ACTIVE', version: 0, attribute_definitions: [] });
});

test('attribute definitions validate the Product type, the data type and the code', async () => {
  const unknownType = await rejected(service.createAttributeDefinition({ product_type_id: randomUUID(), name: 'Màu', data_type: 'STRING' }, actor, requestId()));
  expect((unknownType.getResponse() as any).code).toBe('PRODUCT_TYPE_NOT_FOUND');

  const category = await service.createCategory({ name: 'Loại cho attr ' + randomUUID().slice(0, 6) }, actor, requestId());
  const type = await service.createProductType({ name: 'Type attr ' + randomUUID().slice(0, 6), category_id: category.id }, actor, requestId());
  created.categories.push(category.id); created.types.push(type.id);

  const badType = await rejected(service.createAttributeDefinition({ product_type_id: type.id, name: 'Hạn', data_type: 'DATE' }, actor, requestId()));
  expect(badType.getStatus()).toBe(422);
  expect((badType.getResponse() as any).code).toBe('INVALID_DATA_TYPE');

  const definition = await service.createAttributeDefinition(
    { product_type_id: type.id, name: 'Kích thước', data_type: 'STRING', variant_axis: true, allowed_values: ['S', 'M'] }, actor, requestId());
  created.attributes.push(definition.id);
  // The contract exposes `variant_axis`; the column is `variant_factor`.
  expect(definition).toMatchObject({ product_type_id: type.id, variant_axis: true, required: false, version: 0 });
  expect((definition as any).variant_factor).toBeUndefined();

  const duplicate = await rejected(service.createAttributeDefinition(
    { product_type_id: type.id, name: 'Kích thước', data_type: 'NUMBER' }, actor, requestId()));
  expect(duplicate.getStatus()).toBe(409);
  expect((duplicate.getResponse() as any).code).toBe('ATTRIBUTE_CODE_CONFLICT');
});

test('an attribute already stored by Products cannot change its data type', async () => {
  const category = await service.createCategory({ name: 'Danh mục dùng thật ' + randomUUID().slice(0, 6) }, actor, requestId());
  const type = await service.createProductType({ name: 'Type dùng thật ' + randomUUID().slice(0, 6), category_id: category.id }, actor, requestId());
  const definition = await service.createAttributeDefinition(
    { product_type_id: type.id, name: 'Chất liệu', data_type: 'STRING' }, actor, requestId());
  created.categories.push(category.id); created.types.push(type.id); created.attributes.push(definition.id);

  // Nothing uses it yet: the type may change.
  const free = await service.updateAttributeDefinition(definition.id, { data_type: 'NUMBER', expected_version: 0 }, actor, requestId());
  expect(free.version).toBe(1);
  await service.updateAttributeDefinition(definition.id, { data_type: 'STRING', expected_version: 1 }, actor, requestId());

  const productId = randomUUID();
  await database.query(
    `INSERT INTO product(id,store_id,product_type_id,title,description,attributes_json,status,moderation_status,version)
     VALUES($1,'10000000-0000-4000-8000-000000000061',$2,'Dùng attribute','x',$3::jsonb,'DRAFT','VISIBLE',0)`,
    [productId, type.id, JSON.stringify({ chat_lieu: 'Cotton' })]);
  created.products.push(productId);

  const used = await rejected(service.updateAttributeDefinition(definition.id, { data_type: 'NUMBER', expected_version: 2 }, actor, requestId()));
  expect(used.getStatus()).toBe(409);
  expect((used.getResponse() as any).code).toBe('ATTRIBUTE_IN_USE');

  // Renaming is still allowed while the value itself is unchanged.
  const renamed = await service.updateAttributeDefinition(definition.id, { name: 'Chất liệu vải', expected_version: 2 }, actor, requestId());
  expect(renamed.data_type).toBe('STRING');
  expect(renamed.version).toBe(3);
});

test('a rejected edit leaves no audit entry behind', async () => {
  const id = requestId();
  const error = await rejected(service.updateCategory(randomUUID(), { name: 'x', expected_version: 0 }, actor, id));
  expect(error.getStatus()).toBe(404);
  expect(await database.query('SELECT id FROM m1_audit WHERE request_id=$1', [id])).toHaveLength(0);
});
