import { callOperation, dataMode } from './operations';
import type { components } from './generated.d';

export type PersonalizationConsentView = components['schemas']['PersonalizationConsentView'];
export type PersonalizationConsentUpdate = components['schemas']['PersonalizationConsentUpdate'];

const fixture = dataMode === 'fixture';


export async function getPersonalizationConsent(): Promise<PersonalizationConsentView> {
  if (fixture) {
    
    return {
      status: 'GRANTED',
      version: 1,
      changed_at: new Date().toISOString(),
    };
  }
  return await callOperation('getPersonalizationConsent', {}) as PersonalizationConsentView;
}


export async function updatePersonalizationConsent(body: PersonalizationConsentUpdate): Promise<PersonalizationConsentView> {
  if (fixture) {
    return {
      status: body.status,
      version: body.expected_version + 1,
      changed_at: new Date().toISOString(),
    };
  }
  return await callOperation('updatePersonalizationConsent', { body }) as PersonalizationConsentView;
}