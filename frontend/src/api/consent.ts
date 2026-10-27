import {callOperation} from './operations';
import type {OperationInputs,OperationOutputs} from './operations.generated';
export type PersonalizationConsentView=OperationOutputs['getPersonalizationConsent'];
export const getPersonalizationConsent=()=>callOperation('getPersonalizationConsent');
export const updatePersonalizationConsent=(body:OperationInputs['updatePersonalizationConsent']['body'])=>callOperation('updatePersonalizationConsent',{body});
