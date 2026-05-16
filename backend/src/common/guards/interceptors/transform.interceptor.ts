import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
  requestId?: string;
  version?: string;
}

export const SKIP_TRANSFORM_KEY = 'skipTransform';
export const SkipTransform = () => Reflect.createDecorator({ key: SKIP_TRANSFORM_KEY });

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  private readonly apiVersion = '1.0.0';

  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const requestId = request.headers['x-request-id'] || this.generateRequestId();

    return next.handle().pipe(
      map((data) => {
        // Handle paginated responses differently
        if (data && typeof data === 'object' && 'data' in data && 'total' in data) {
          response.header('X-Total-Count', data.total);
          response.header('X-Page', data.page || 1);
          response.header('X-Limit', data.limit || data.total);
          
          return {
            statusCode: response.statusCode || HttpStatus.OK,
            message: 'Success',
            data: data.data,
            pagination: {
              total: data.total,
              page: data.page || 1,
              limit: data.limit || data.total,
              totalPages: Math.ceil((data.total || 0) / (data.limit || 1)),
            },
            timestamp: new Date().toISOString(),
            path: request.url,
            requestId,
            version: this.apiVersion,
          };
        }

        // Handle standard response
        return {
          statusCode: response.statusCode || HttpStatus.OK,
          message: data?.message || 'Success',
          data: data?.data !== undefined ? data.data : data,
          timestamp: new Date().toISOString(),
          path: request.url,
          requestId,
          version: this.apiVersion,
        };
      }),
    );
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }
}