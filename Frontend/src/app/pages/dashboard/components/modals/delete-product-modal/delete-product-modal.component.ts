import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FoodMODEL } from '../../../../../models/food-model';

@Component({
  selector: 'app-delete-product-modal',
  standalone: true,
  templateUrl: './delete-product-modal.component.html',
})
export class DeleteProductModalComponent {
  @Input() selectedProduct: FoodMODEL | null = null;
  @Input() errorMessage?: string;
  @Input() successMessage?: string;

  @Output() confirm = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
}
