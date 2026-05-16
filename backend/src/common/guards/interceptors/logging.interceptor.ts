import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers, body, query, params } = request;
    const userAgent = headers['user-agent'] || 'unknown';
    const requestId = headers['x-request-id'] || this.generateRequestId();
    const startTime = Date.now();

    // Sanitize body for logging (remove sensitive data)
    const sanitizedBody = this.sanitizeBody(body);

    this.logger.log(
      `[${requestId}] → ${method} ${url} - ${userAgent} ${ip}`,
    );
    
    if (Object.keys(sanitizedBody).length > 0) {
      this.logger.debug(`[${requestId}] Body: ${JSON.stringify(sanitizedBody)}`);
    }
    if (Object.keys(query).length > 0) {
      this.logger.debug(`[${requestId}] Query: ${JSON.stringify(query)}`);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;

          this.logger.log(
            `[${requestId}] ← ${method} ${url} - ${statusCode} - ${duration}ms`,
          );
          
          if (statusCode >= 400) {
            this.logger.warn(
              `[${requestId}] Response error status: ${statusCode}`,
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const status = error.status || error.statusCode || 500;
          
          this.logger.error(
            `[${requestId}] ✗ ${method} ${url} - ${status} - ${duration}ms - ${error.message}`,
          );
          
          if (error.stack && process.env.NODE_ENV !== 'production') {
            this.logger.debug(`[${requestId}] Stack: ${error.stack}`);
          }
        },
      }),
    );
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  }

  private sanitizeBody(body: any): any {
    if (!body) return {};
    
    const sensitiveFields = ['password', 'token', 'secret', 'privateKey', 'seed'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }
    
    return sanitized;
  }
}