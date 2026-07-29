import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FoodMODEL } from '../../../../models/food-model';

@Component({
  selector: 'app-home-food-card',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home-food-card.component.html',
})
export class HomeFoodCardComponent {
  @Input({ required: true }) foodItem!: FoodMODEL;
  @Output() addToCart = new EventEmitter<{ quantity: number }>();

  quantity = 1;

  increaseQuantity(): void {
    this.quantity += 1;
  }

  decreaseQuantity(): void {
    this.quantity = Math.max(1, this.quantity - 1);
  }

  emitAddToCart(): void {
    this.addToCart.emit({ quantity: this.quantity });
  }
}
