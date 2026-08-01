import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { User } from '../../../../../models/user';
import { Roles } from '../../../../../enums/enums';
import { UserContactPipe } from '../../../../../pipes/user-display.pipe';

@Component({
  selector: 'app-edit-user-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, UserContactPipe],
  templateUrl: './edit-user-modal.component.html',
})
export class EditUserModalComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() selectedUser: User | null = null;
  @Input() errorMessage?: string;
  @Input() successMessage?: string;

  @Output() submitForm = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  protected readonly Roles = Roles;

  readonly roleOptions = [
    { value: 'user', label: 'کاربر', color: 'emerald' },
    { value: 'admin', label: 'ادمین', color: 'amber' },
    { value: 'founder', label: 'مدیر', color: 'purple' },
  ];

  setRole(value: string): void {
    this.form.get('role')?.setValue(value);
  }
}
