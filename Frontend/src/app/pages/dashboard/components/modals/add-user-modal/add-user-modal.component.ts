import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-user-modal',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './add-user-modal.component.html',
})
export class AddUserModalComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() errorMessage?: string;
  @Input() successMessage?: string;

  @Output() submitForm = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  readonly roleOptions = [
    { value: 'user', label: 'کاربر', color: 'emerald' },
    { value: 'admin', label: 'ادمین', color: 'amber' },
    { value: 'founder', label: 'مدیر', color: 'purple' },
  ];

  setRole(value: string): void {
    this.form.get('role')?.setValue(value);
  }
}