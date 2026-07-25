import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FoodMODEL } from '../../../../models/food-model';

@Component({
  selector: 'app-dashboard-product-card',
  standalone: true,
  templateUrl: './dashboard-product-card.component.html',
})
export class DashboardProductCardComponent {
  @Input({ required: true }) foodItem!: FoodMODEL;
  @Input({ required: true }) imageUrl!: string;
  @Output() edit = new EventEmitter<FoodMODEL>();
  @Output() remove = new EventEmitter<FoodMODEL>();
}
