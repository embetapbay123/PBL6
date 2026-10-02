import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { runtimeDtos } from './dtos.generated';
import bundle from './contracts.runtime.generated.json';
import { assertSchema, normalizeParameters } from './contract-validation';
import type { OperationId, OperationInputs } from './operations.generated';
import { ApiError } from './errors';

export const operationContracts = bundle.operations;
export function validateOperation<K extends OperationId>(id: K, input: Partial<OperationInputs[K]>): OperationInputs[K] {
  const record = operationContracts[id];
  const dtos = runtimeDtos[id];
  const result: Record<string, unknown> = {};
  for (const part of ['body', 'path', 'query', 'headers'] as const) {
    const schema = record[part];
    const value = part === 'body' ? input[part] : normalizeParameters((input[part] ?? {}) as Record<string, unknown>, schema ?? {});
    if (!schema) { if (value !== undefined && value !== null && Object.keys(value as object).length) throw new ApiError(422,'VALIDATION_FAILED','API không nhận body.'); continue; }
    const required = part === 'body' ? record.body_required : true;
    assertSchema(value, schema, required);
    const ctor = dtos[part];
    if (ctor && value !== undefined) {
      const instance = plainToInstance(ctor as new () => object, value);
      if (validateSync(instance, { forbidUnknownValues: false }).length) throw new ApiError(422,'VALIDATION_FAILED','Dữ liệu không hợp lệ.');
    }
    result[part] = value;
  }
  return result as OperationInputs[K];
}
export function validateHttpRequest(id: OperationId, request: any) {
  request.contract = validateOperation(id, { body: request.body, path: request.params, query: request.query, headers: request.headers } as any);
  return request.contract;
}
@Injectable()
export class RequestContractInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const route = request.route?.path?.replace(/:([a-zA-Z_]+)/g, '{$1}');
    const id = (Object.keys(operationContracts) as OperationId[]).find(key => {
      const r = operationContracts[key];
      return r.service === process.env.SERVICE_ID && r.method === request.method &&
        (r.internal ? r.route : '/api/v1' + r.route) === route;
    });
    // Raw callback authentication belongs before body validation in its controller.
    if (id && !['sepayCallback','sandboxCallback'].includes(id)) validateHttpRequest(id, request);
    return next.handle();
  }
}
