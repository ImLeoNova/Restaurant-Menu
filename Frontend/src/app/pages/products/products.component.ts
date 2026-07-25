import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { HomeFoodCardComponent } from '../home/components/home-food-card/home-food-card.component';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { FoodMODEL } from '../../models/food-model';
import { CategoryMODEL } from '../../models/category-model';
import {
  DropDownListDirective,
  DropDownOptionSelected,
} from '../../directives/drop-down-list.directive';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'title';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    FormsModule,
    HeaderComponent,
    FooterComponent,
    HomeFoodCardComponent,
    DropDownListDirective,
  ],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css',
})
export class ProductsComponent implements OnInit, OnDestroy {
  products: FoodMODEL[] = [];
  filteredProducts: FoodMODEL[] = [];
  categories: CategoryMODEL[] = [];

  isLoading = true;
  filtersOpen = false;

  searchTerm = '';
  selectedCategory = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  sortBy: SortOption = 'newest';

  readonly sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'جدیدترین' },
    { value: 'price-asc', label: 'ارزان‌ترین' },
    { value: 'price-desc', label: 'گران‌ترین' },
    { value: 'title', label: 'نام (الفبا)' },
  ];

  private routeSub?: Subscription;

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private route: ActivatedRoute,
    private router: Router,
    private title: Title,
  ) {}

  ngOnInit(): void {
    this.title.setTitle('محصولات | فست فود آرین');
    this.categories = this.categoryService.getCategories();

    this.routeSub = this.route.queryParamMap.subscribe((params) => {
      this.searchTerm = params.get('search') || '';
      this.selectedCategory = params.get('category') || '';
      this.sortBy = (params.get('sort') as SortOption) || 'newest';

      const min = params.get('min');
      const max = params.get('max');
      this.minPrice = min !== null && min !== '' ? Number(min) : null;
      this.maxPrice = max !== null && max !== '' ? Number(max) : null;

      if (this.products.length) {
        this.applyFilters();
      }
    });

    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  get priceBounds(): { min: number; max: number } {
    if (!this.products.length) return { min: 0, max: 0 };
    const prices = this.products.map((p) => this.toPrice(p.price));
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.searchTerm.trim() ||
      this.selectedCategory ||
      this.minPrice !== null ||
      this.maxPrice !== null ||
      this.sortBy !== 'newest'
    );
  }

  categoryTitle(category: string): string {
    return (
      this.categories.find((item) => item.category === category)?.title ||
      category
    );
  }

  loadProducts(): void {
    this.isLoading = true;

    this.productService.getProducts().subscribe({
      next: (response) => {
        this.products = response.data || [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.products = [];
        this.filteredProducts = [];
        this.isLoading = false;
      },
    });
  }

  onSearchChange(): void {
    this.applyFilters();
    this.syncQueryParams();
  }

  selectCategory(category: string): void {
    this.selectedCategory =
      this.selectedCategory === category ? '' : category;
    this.applyFilters();
    this.syncQueryParams();
  }

  onPriceChange(): void {
    this.applyFilters();
    this.syncQueryParams();
  }

  get sortLabel(): string {
    return (
      this.sortOptions.find((item) => item.value === this.sortBy)?.label ||
      'جدیدترین'
    );
  }

  onSortChange(): void {
    this.applyFilters();
    this.syncQueryParams();
  }

  onSortSelected(event: DropDownOptionSelected): void {
    this.sortBy = event.value as SortOption;
    this.onSortChange();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.sortBy = 'newest';
    this.applyFilters();
    this.syncQueryParams();
  }

  toggleFilters(): void {
    this.filtersOpen = !this.filtersOpen;
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    let list = [...this.products];

    if (this.selectedCategory) {
      list = list.filter((item) => item.category === this.selectedCategory);
    }

    if (term) {
      list = list.filter(
        (item) =>
          item.title?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term),
      );
    }

    if (this.minPrice !== null && !Number.isNaN(this.minPrice)) {
      list = list.filter((item) => this.toPrice(item.price) >= this.minPrice!);
    }

    if (this.maxPrice !== null && !Number.isNaN(this.maxPrice)) {
      list = list.filter((item) => this.toPrice(item.price) <= this.maxPrice!);
    }

    switch (this.sortBy) {
      case 'price-asc':
        list.sort((a, b) => this.toPrice(a.price) - this.toPrice(b.price));
        break;
      case 'price-desc':
        list.sort((a, b) => this.toPrice(b.price) - this.toPrice(a.price));
        break;
      case 'title':
        list.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'fa'));
        break;
      default:
        list.sort((a, b) => Number(b.product_ID) - Number(a.product_ID));
        break;
    }

    this.filteredProducts = list;
  }

  private syncQueryParams(): void {
    const queryParams: Record<string, string | null> = {
      search: this.searchTerm.trim() || null,
      category: this.selectedCategory || null,
      min:
        this.minPrice !== null && !Number.isNaN(this.minPrice)
          ? String(this.minPrice)
          : null,
      max:
        this.maxPrice !== null && !Number.isNaN(this.maxPrice)
          ? String(this.maxPrice)
          : null,
      sort: this.sortBy !== 'newest' ? this.sortBy : null,
    };

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: '',
      replaceUrl: true,
    });
  }

  private toPrice(value: string | number): number {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
  }
}
