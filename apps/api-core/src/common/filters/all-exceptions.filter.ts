import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ZodError, type ZodIssue } from 'zod';
import type { Response } from 'express';

function formatPath(path: PropertyKey[]) {
  return path.length > 0 ? path.join('.') : 'Dữ liệu';
}

function formatZodIssue(issue: ZodIssue) {
  const path = formatPath(issue.path);
  const detail = issue as ZodIssue & { minimum?: number; format?: string };

  if (issue.code === 'invalid_format') {
    if (detail.format === 'email') return `${path} không đúng định dạng email.`;
    if (detail.format === 'uuid') return `${path} không đúng định dạng UUID.`;
    return `${path} không đúng định dạng.`;
  }

  if (issue.code === 'invalid_value') {
    return `${path} không nằm trong danh sách giá trị cho phép.`;
  }

  if (issue.code === 'too_small') {
    return `${path} phải có tối thiểu ${detail.minimum ?? 1} ký tự.`;
  }

  if (issue.code === 'invalid_type') {
    return `${path} không đúng kiểu dữ liệu.`;
  }

  return issue.message ? `${path}: ${issue.message}` : `${path} không hợp lệ.`;
}

function normalizeMessage(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const messages = value.map((item) => normalizeMessage(item)).filter(Boolean);
    return messages.length > 0 ? messages.join(' ') : undefined;
  }
  if (value && typeof value === 'object') {
    const maybeIssue = value as Partial<ZodIssue>;
    if (maybeIssue.code && Array.isArray(maybeIssue.path)) {
      return formatZodIssue(maybeIssue as ZodIssue);
    }
    if ('message' in value) return normalizeMessage((value as { message?: unknown }).message);
  }
  return undefined;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof ZodError) {
      return response.status(422).json({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: exception.issues.map(formatZodIssue).join(' '),
        details: exception.issues,
      });
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        return response.status(statusCode).json({
          statusCode,
          error: exception.name,
          message: payload,
        });
      }

      const body = payload as Record<string, unknown>;
      return response.status(statusCode).json({
        ...body,
        statusCode: typeof body.statusCode === 'number' ? body.statusCode : statusCode,
        message: normalizeMessage(body.message) ?? exception.message,
      });
    }

    console.error(exception);
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      error: 'Internal Server Error',
    });
  }
}
