import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CategoryMODEL } from '../../../../../models/category-model';

@Component({
  selector: 'app-delete-category-modal',
  standalone: true,
  imports: [],
  templateUrl: './delete-category-modal.component.html',
})
export class DeleteCategoryModalComponent {
  @Input() selectedCategory: CategoryMODEL | null = null;
  @Input() errorMessage?: string;
  @Input() successMessage?: string;

  @Output() confirm = new EventEmitter<number | undefined>();
  @Output() close = new EventEmitter<void>();
}
