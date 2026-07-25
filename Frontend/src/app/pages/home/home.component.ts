import { Component } from '@angular/core';
import { HeaderComponent } from '../../components/header/header.component';
import { Title } from '@angular/platform-browser';
import { FooterComponent } from '../../components/footer/footer.component';
import { AiComponent } from '../../AI/ai/ai.component';
import { CategoryService } from '../../services/category.service';
import { CategoryMODEL } from '../../models/category-model';
import { FoodMODEL } from '../../models/food-model';
import { HomeBackgroundComponent } from './components/home-background/home-background.component';
import { HomeHeroComponent } from './components/home-hero/home-hero.component';
import { HomeFeaturesComponent } from './components/home-features/home-features.component';
import { HomeCategoriesComponent } from './components/home-categories/home-categories.component';
import { HomeProductsHeaderComponent } from './components/home-products-header/home-products-header.component';
import { HomeProductsComponent } from './components/home-products/home-products.component';
import { HomeAboutComponent } from './components/home-about/home-about.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    HeaderComponent,
    FooterComponent,
    AiComponent,
    HomeBackgroundComponent,
    HomeHeroComponent,
    HomeFeaturesComponent,
    HomeCategoriesComponent,
    HomeProductsHeaderComponent,
    HomeProductsComponent,
    HomeAboutComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  constructor(
    private title: Title,
    public categoryService: CategoryService,
  ) {
    title.setTitle('Arian Restaurant');
  }

  get categories(): CategoryMODEL[] {
    return this.categoryService.getCategories();
  }

  get currentCategory(): CategoryMODEL {
    const category = this.categoryService.getCATEGORY(
      this.categoryService.nowCategory,
    );
    return typeof category === 'string'
      ? new CategoryMODEL()
      : category;
  }

  get currentProducts(): FoodMODEL[] {
    return this.categoryService.getFoodsByCategory(
      this.categoryService.nowCategory,
    );
  }

  onCategoryChange(category: string): void {
    this.categoryService.nowCategory = category;
  }
}
