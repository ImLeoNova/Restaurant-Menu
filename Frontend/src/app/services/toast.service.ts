import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  message: string;
  /** ms before auto-dismiss. 0 = stays until manually closed. */
  duration: number;
}

const DEFAULT_TITLES: Record<ToastType, string> = {
  success: 'موفق',
  error: 'خطا',
  warning: 'هشدار',
  info: 'اطلاع‌رسانی',
};

const DEFAULT_DURATION = 5000;

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private nextId = 1;

  readonly toasts = signal<ToastMessage[]>([]);

  success(message: string, title?: string, duration = DEFAULT_DURATION): void {
    this.push('success', message, title, duration);
  }

  error(message: string, title?: string, duration = DEFAULT_DURATION): void {
    this.push('error', message, title, duration);
  }

  warning(message: string, title?: string, duration = DEFAULT_DURATION): void {
    this.push('warning', message, title, duration);
  }

  info(message: string, title?: string, duration = DEFAULT_DURATION): void {
    this.push('info', message, title, duration);
  }

  /** Removes a toast immediately from state. The toast item component
   * calls this after playing its own exit animation. */
  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((toast) => toast.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }

  private push(
    type: ToastType,
    message: string,
    title: string | undefined,
    duration: number,
  ): void {
    const toast: ToastMessage = {
      id: this.nextId++,
      type,
      title: title ?? DEFAULT_TITLES[type],
      message,
      duration,
    };

    this.toasts.update((list) => [...list, toast]);
  }
}
