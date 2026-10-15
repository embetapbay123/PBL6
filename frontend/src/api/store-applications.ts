import { callOperation, dataMode } from './operations';
import {
  mockListOwnStoreApplications,
  mockListStoreApplications,
  mockReviewStoreApplication,
  mockSubmitStoreApplication,
  type PageStoreApplications,
  type StoreApplication,
  type StoreApplicationDecision,
  type StoreApplicationSubmit,
} from './store-application.mock';

const fixture = dataMode === 'fixture';

export async function submitStoreApplication(body: StoreApplicationSubmit): Promise<StoreApplication> {
  if (fixture) return mockSubmitStoreApplication(body);
  return await callOperation('submitStoreApplication', { body }) as StoreApplication;
}

export async function listOwnStoreApplications(page = 1, size = 20): Promise<PageStoreApplications> {
  if (fixture) return mockListOwnStoreApplications(page, size);
  return await callOperation('listOwnStoreApplications', { query: { page, size } }) as PageStoreApplications;
}

export async function listStoreApplications(page = 1, size = 20): Promise<PageStoreApplications> {
  if (fixture) return mockListStoreApplications(page, size);
  return await callOperation('listStoreApplications', { query: { page, size } }) as PageStoreApplications;
}

export async function reviewStoreApplication(id: string, body: StoreApplicationDecision): Promise<StoreApplication> {
  if (fixture) return mockReviewStoreApplication(id, body);
  return await callOperation('reviewStoreApplication', { path: { id }, body }) as StoreApplication;
}
