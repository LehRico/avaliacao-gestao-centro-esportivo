import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { user?: { userId: string } }>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : { message: 'Erro interno do servidor.' };

    const userId = request.user?.userId ?? 'anônimo';

    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.originalUrl} ${statusCode} - user:${userId}`,
        isHttpException ? undefined : (exception as Error)?.stack,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.originalUrl} ${statusCode} - user:${userId}`,
      );
    }

    const body =
      typeof exceptionResponse === 'string'
        ? { message: exceptionResponse }
        : exceptionResponse;

    response.status(statusCode).json({
      ...body,
      statusCode,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }
}
