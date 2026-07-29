import { FoodMODEL } from './food-model';

export interface CartItem {
  product: FoodMODEL;
  quantity: number;
  discount?: number;
  tax?: number;
  shipping?: number;
}
