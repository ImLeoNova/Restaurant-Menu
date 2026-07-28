import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { FoodMODEL } from '../../../../models/food-model';
import { CategoryMODEL } from '../../../../models/category-model';
import { DashboardProductCardComponent } from '../dashboard-product-card/dashboard-product-card.component';

@Component({
  selector: 'app-dashboard-products',
  standalone: true,
  imports: [NgClass, DashboardProductCardComponent],
  templateUrl: './dashboard-products.component.html',
})
export class DashboardProductsComponent {
  @Input({ required: true }) products!: FoodMODEL[];
  @Input({ required: true }) categories!: CategoryMODEL[];
  @Input() nowCategory: string | null = null;

  @Output() addProduct = new EventEmitter<void>();
  @Output() searchProduct = new EventEmitter<void>();
  @Output() categoryChange = new EventEmitter<string>();
  @Output() editProduct = new EventEmitter<FoodMODEL>();
  @Output() deleteProduct = new EventEmitter<FoodMODEL>();

  resolveImage(foodItem: FoodMODEL): string {
    return foodItem.image || "";
  }
}
