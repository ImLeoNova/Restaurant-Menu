import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { ToastMessage } from '../../services/toast.service';

const EXIT_ANIMATION_MS = 220;

@Component({
  selector: 'app-toast-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-item.component.html',
  styleUrl: './toast-item.component.css',
})
export class ToastItemComponent implements OnInit, OnDestroy {
  @Input({ required: true }) toast!: ToastMessage;
  @Output() dismissed = new EventEmitter<number>();

  leaving = signal(false);

  private autoDismissTimer?: ReturnType<typeof setTimeout>;
  private exitTimer?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    if (this.toast.duration > 0) {
      this.autoDismissTimer = setTimeout(() => {
        this.close();
      }, this.toast.duration);
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.autoDismissTimer);
    clearTimeout(this.exitTimer);
  }

  close(): void {
    if (this.leaving()) return;
    clearTimeout(this.autoDismissTimer);
    this.leaving.set(true);
    this.exitTimer = setTimeout(() => {
      this.dismissed.emit(this.toast.id);
    }, EXIT_ANIMATION_MS);
  }

  get iconPath(): string {
    switch (this.toast.type) {
      case 'success':
        return 'M5 13l4 4L19 7';
      case 'error':
        return 'M6 6l12 12M18 6L6 18';
      case 'warning':
        return 'M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z';
      case 'info':
      default:
        return 'M12 8h.01M11 12h1v4h1';
    }
  }
}
