import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ApiErrorResponse, ApiSuccessResponse } from '@common/types';
import { randomUUID } from 'crypto';

interface TraceRequest extends Request {
  traceId?: string;
}

function isApiResponse<T>(
  data: unknown,
): data is ApiSuccessResponse<T> | ApiErrorResponse {
  return (
    data !== null &&
    typeof data === 'object' &&
    'meta' in (data as Record<string, unknown>)
  );
}

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccessResponse<any> | ApiErrorResponse> {
    const request = context.switchToHttp().getRequest<TraceRequest>();

    const traceId =
      (request.headers['x-trace-id'] as string) ||
      (request.headers['trace-id'] as string) ||
      randomUUID();

    request.traceId = traceId;

    return next.handle().pipe(
      map<
        ApiSuccessResponse<any> | ApiErrorResponse,
        ApiSuccessResponse<any> | ApiErrorResponse
      >((data) => {
        if (!isApiResponse(data)) return data;

        return {
          ...data,
          meta: {
            ...data.meta,
            traceId,
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
