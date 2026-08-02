import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartItem } from '../../models/cart-item';
import { ThousandTomanPipe } from '../../pipes/persian-number.pipe';

@Component({
  selector: 'app-cart-drawer',
  standalone: true,
  imports: [CommonModule, ThousandTomanPipe],
  templateUrl: './cart-drawer.component.html',
})
export class CartDrawerComponent {
  @Input() items: CartItem[] = [];
  @Input() subtotal = 0;
  @Input() grandTotal = 0;
  @Input() itemCount = 0;
  @Input() isOpen = false;
  @Input() loading = false;

  @Output() close = new EventEmitter<void>();
  @Output() increase = new EventEmitter<CartItem>();
  @Output() decrease = new EventEmitter<CartItem>();
  @Output() remove = new EventEmitter<CartItem>();
  @Output() clear = new EventEmitter<void>();
  @Output() checkout = new EventEmitter<void>();

  trackByItemId(index: number, item: CartItem): string {
    return `${item.product.product_ID}-${index}`;
  }

  lineTotal(item: CartItem): number {
    const price = Number(item.product.price);
    return Number.isFinite(price) ? price * item.quantity : 0;
  }
}
