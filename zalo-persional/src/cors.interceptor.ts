import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class CorsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    const origin = request.headers.origin;

    // Set CORS headers (NO CREDENTIALS)
    response.header('Access-Control-Allow-Origin', '*');
    response.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD',
    );
    response.header('Access-Control-Allow-Headers', '*');
    response.header('Access-Control-Allow-Credentials', 'false'); // No credentials
    response.header('Access-Control-Expose-Headers', '*');
    response.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    console.log(
      `✅ CORS Interceptor: Set headers for origin ${origin || 'unknown'}`,
    );

    return next.handle().pipe(
      map((data) => {
        console.log('✅ Response sent with CORS headers');
        return data;
      }),
    );
  }
}
