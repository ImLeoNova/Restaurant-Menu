import { Component } from '@angular/core';
import { ToastItemComponent } from '../toast-item/toast-item.component';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [ToastItemComponent],
  templateUrl: './toast-container.component.html',
})
export class ToastContainerComponent {
  constructor(public toastService: ToastService) {}
}
