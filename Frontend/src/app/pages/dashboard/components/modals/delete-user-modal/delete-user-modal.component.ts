import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '../../../../../models/user';

@Component({
  selector: 'app-delete-user-modal',
  standalone: true,
  templateUrl: './delete-user-modal.component.html',
})
export class DeleteUserModalComponent {
  @Input() selectedUser: User | null = null;
  @Input() errorMessage?: string;
  @Input() successMessage?: string;

  @Output() confirm = new EventEmitter<string | undefined>();
  @Output() close = new EventEmitter<void>();
}
