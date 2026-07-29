import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';
import { FoodMODEL } from '../models/food-model';

describe('CartService', () => {
  let service: CartService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CartService);
  });

  it('should add a product and increment quantity when the same product is added again', () => {
    const product: FoodMODEL = {
      product_ID: '12',
      title: 'پیتزا',
      description: 'تست',
      category: 'pizza',
      price: '120',
      image: '/test.png',
    };

    service.addToCart(product, 1);
    service.addToCart(product, 2);

    const items = service.getItems();
    expect(items.length).toBe(1);
    expect(items[0].quantity).toBe(3);
    expect(service.getItemCount()).toBe(3);
    expect(service.getSubtotal()).toBe(360);
  });
});
