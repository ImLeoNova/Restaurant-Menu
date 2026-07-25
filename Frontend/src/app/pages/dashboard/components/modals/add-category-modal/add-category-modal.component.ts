import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-add-category-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './add-category-modal.component.html',
})
export class AddCategoryModalComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() imgSRC: string | ArrayBuffer | null = null;
  @Input() errorMessage?: string;
  @Input() successMessage?: string;

  @Output() imageSelected = new EventEmitter<Event>();
  @Output() submitForm = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
}
