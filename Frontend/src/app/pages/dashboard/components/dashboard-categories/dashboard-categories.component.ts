import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CategoryMODEL } from '../../../../models/category-model';
import { FoodMODEL } from '../../../../models/food-model';
import { DashboardCategoryCardComponent } from '../dashboard-category-card/dashboard-category-card.component';
import { HomeFoodCardComponent } from '../../../home/components/home-food-card/home-food-card.component';

@Component({
  selector: 'app-dashboard-categories',
  standalone: true,
  imports: [DashboardCategoryCardComponent, HomeFoodCardComponent],
  templateUrl: './dashboard-categories.component.html',
})
export class DashboardCategoriesComponent {
  @Input({ required: true }) categories!: CategoryMODEL[];
  @Input() isLoading = false;
  @Input() selectedCategory: CategoryMODEL | null = null;
  @Input() categoryProducts: FoodMODEL[] = [];
  @Input() isLoadingProducts = false;

  @Output() addCategory = new EventEmitter<void>();
  @Output() editCategory = new EventEmitter<CategoryMODEL>();
  @Output() deleteCategory = new EventEmitter<CategoryMODEL>();
  @Output() viewCategory = new EventEmitter<CategoryMODEL>();
  @Output() clearSelection = new EventEmitter<void>();
}
