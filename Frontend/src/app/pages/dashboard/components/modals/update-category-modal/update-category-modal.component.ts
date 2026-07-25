import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CategoryMODEL } from '../../../../../models/category-model';

@Component({
  selector: 'app-update-category-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './update-category-modal.component.html',
})
export class UpdateCategoryModalComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() selectedCategory: CategoryMODEL | null = null;
  @Input() imgSRC: string | ArrayBuffer | null = null;
  @Input() errorMessage?: string;
  @Input() successMessage?: string;

  @Output() imageSelected = new EventEmitter<Event>();
  @Output() submitForm = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
}
