import { Component, Input } from '@angular/core';
import { FoodMODEL } from '../../../../models/food-model';
import { HomeFoodCardComponent } from '../home-food-card/home-food-card.component';

@Component({
  selector: 'app-home-products',
  standalone: true,
  imports: [HomeFoodCardComponent],
  templateUrl: './home-products.component.html',
})
export class HomeProductsComponent {
  @Input({ required: true }) products!: FoodMODEL[];
}
