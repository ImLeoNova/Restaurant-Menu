import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, throwError } from 'rxjs';
import { LoaderService } from '../services/loader.service';
import { ToastService } from '../services/toast.service';

/**
 * Requests matching any of these are background/system calls the user
 * never directly triggered (e.g. the silent token check on app boot).
 * A failure there isn't a user-facing "error" — surfacing it as a toast
 * would just be noise, so we skip the toast (but the request/error still
 * flows through normally for whatever code called it).
 */
const SILENT_URL_PATTERNS: RegExp[] = [/\/api\/user\/verify-token/];

function isSilentRequest(url: string): boolean {
  return SILENT_URL_PATTERNS.some((pattern) => pattern.test(url));
}

function resolveErrorMessage(error: HttpErrorResponse): string {
  const backendMessage =
    error.error && typeof error.error === 'object'
      ? (error.error as { message?: string }).message
      : null;

  if (backendMessage) {
    return backendMessage;
  }

  switch (error.status) {
    case 0:
      return 'ارتباط با سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید.';
    case 401:
      return 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید.';
    case 403:
      return 'شما اجازه‌ی انجام این کار را ندارید.';
    case 404:
      return 'مورد درخواستی پیدا نشد.';
    case 429:
      return 'درخواست‌های شما بیش از حد مجاز است. کمی صبر کنید.';
    case 500:
    case 502:
    case 503:
      return 'خطایی در سرور رخ داد. لطفاً کمی بعد دوباره امتحان کنید.';
    default:
      return 'خطایی غیرمنتظره رخ داد.';
  }
}

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const loaderService = inject(LoaderService);
  const toastService = inject(ToastService);

  loaderService.show();

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && !isSilentRequest(req.url)) {
        toastService.error(resolveErrorMessage(error));
      }
      // Re-throw so components that still need their own local
      // error handling (e.g. inline form validation messages) keep working.
      return throwError(() => error);
    }),
    finalize(() => {
      loaderService.hide();
    }),
  );
};
