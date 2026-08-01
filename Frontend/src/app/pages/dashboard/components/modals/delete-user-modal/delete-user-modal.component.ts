import { Component, EventEmitter, Input, Output } from '@angular/core';
import { User } from '../../../../../models/user';
import { UserContactPipe } from '../../../../../pipes/user-display.pipe';

@Component({
  selector: 'app-delete-user-modal',
  standalone: true,
  imports: [UserContactPipe],
  templateUrl: './delete-user-modal.component.html',
})
export class DeleteUserModalComponent {
  @Input() selectedUser: User | null = null;
  @Input() errorMessage?: string;
  @Input() successMessage?: string;

  @Output() confirm = new EventEmitter<string | undefined>();
  @Output() close = new EventEmitter<void>();
}
