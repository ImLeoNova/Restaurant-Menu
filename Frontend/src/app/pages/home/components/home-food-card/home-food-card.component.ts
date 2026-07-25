import { Component, Input } from '@angular/core';
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
}
