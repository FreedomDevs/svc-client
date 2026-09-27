import { ApiCode } from '@common/types/apiCode.type';

export type ApiMeta = {
  code: ApiCode;
  traceId: string;
  timestamp: string;
};

export type ApiSuccessResponse<T> = {
  data: T;
  message: string;
  meta: ApiMeta;
};

export type ApiPaginationSuccessResponse<T, D> = {
  data: T;
  message: string;
  meta: ApiMeta;
  pagination: D;
};

export type ApiErrorResponse = {
  error: {
    code: ApiCode;
    message: string;
    details?: unknown[];
  };
  meta: ApiMeta;
};