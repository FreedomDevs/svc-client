import {
  ApiErrorResponse,
  ApiPaginationSuccessResponse,
  ApiSuccessResponse,
} from '@common/types/api-response.type';
import { ApiCode } from '@common/types/apiCode.type';

export function ok<T>(
  data: T,
  message: string,
  code: ApiCode,
): ApiSuccessResponse<T>;

export function ok<T, P>(
  data: T,
  message: string,
  code: ApiCode,
  pagination: P,
): ApiPaginationSuccessResponse<T, P>;

export function ok<T, P>(
  data: T,
  message: string,
  code: ApiCode,
  pagination?: P,
): any {
  const base = {
    data,
    message,
    meta: {
      code,
      traceId: '',
      timestamp: '',
    },
  };

  return pagination ? { ...base, pagination } : base;
}

export function efail(
  message: string,
  code: ApiCode,
  details?: unknown[],
): ApiErrorResponse {
  return {
    error: {
      message,
      code,
      details,
    },
    meta: {
      traceId: '',
      timestamp: '',
      code,
    },
  };
}
