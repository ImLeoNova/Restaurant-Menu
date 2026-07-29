import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CartItem } from '../models/cart-item';
import { FoodMODEL } from '../models/food-model';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly storageKey = 'restaurant-menu-cart';
  private readonly itemsSubject = new BehaviorSubject<CartItem[]>([]);
  readonly items$: Observable<CartItem[]> = this.itemsSubject.asObservable();

  constructor() {
    this.restoreFromStorage();
  }

  getItems(): CartItem[] {
    return this.itemsSubject.getValue();
  }

  addToCart(product: FoodMODEL, quantity = 1): void {
    const normalizedQuantity = Math.max(1, Math.floor(quantity));
    const currentItems = this.getItems();
    const existingItem = currentItems.find(
      (item) => item.product.product_ID === product.product_ID,
    );

    if (existingItem) {
      existingItem.quantity += normalizedQuantity;
      this.itemsSubject.next([...currentItems]);
    } else {
      this.itemsSubject.next([
        ...currentItems,
        { product, quantity: normalizedQuantity },
      ]);
    }

    this.persist();
  }

  removeFromCart(productId: number | string): void {
    const nextItems = this.getItems().filter(
      (item) => String(item.product.product_ID) !== String(productId),
    );
    this.itemsSubject.next(nextItems);
    this.persist();
  }

  updateQuantity(productId: number | string, quantity: number): void {
    const normalizedQuantity = Math.max(0, Math.floor(quantity));
    const nextItems = this.getItems()
      .map((item) => {
        if (String(item.product.product_ID) !== String(productId)) {
          return item;
        }

        return normalizedQuantity > 0
          ? { ...item, quantity: normalizedQuantity }
          : null;
      })
      .filter((item): item is CartItem => item !== null);

    this.itemsSubject.next(nextItems);
    this.persist();
  }

  clearCart(): void {
    this.itemsSubject.next([]);
    this.persist();
  }

  getSubtotal(): number {
    return this.getItems().reduce((total, item) => {
      const price = Number(item.product.price);
      return total + (Number.isFinite(price) ? price : 0) * item.quantity;
    }, 0);
  }

  getItemCount(): number {
    return this.getItems().reduce((count, item) => count + item.quantity, 0);
  }

  getGrandTotal(): number {
    return this.getSubtotal();
  }

  private restoreFromStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const rawValue = window.localStorage.getItem(this.storageKey);
    if (!rawValue) {
      return;
    }

    try {
      const parsed = JSON.parse(rawValue) as CartItem[];
      if (Array.isArray(parsed)) {
        this.itemsSubject.next(parsed);
      }
    } catch {
      window.localStorage.removeItem(this.storageKey);
    }
  }

  private persist(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      this.storageKey,
      JSON.stringify(this.getItems()),
    );
  }
}
