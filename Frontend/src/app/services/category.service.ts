import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { CategoryMODEL } from '../models/category-model';
import { FoodMODEL } from '../models/food-model';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly API = environment.websiteAPI + '/api/category';

  categorys: CategoryMODEL[] = [];
  foodItems: FoodMODEL[] = [];
  nowCategory = '';
  isLoadingCategories = false;

  private readonly categoriesSubject = new BehaviorSubject<CategoryMODEL[]>([]);
  readonly categories$ = this.categoriesSubject.asObservable();

  constructor(private http: HttpClient) {
    this.refreshCategories();
    this.loadProducts().subscribe({
      next: (response) => {
        this.foodItems = response.data || [];
      },
      error: () => {
        this.foodItems = [];
      },
    });
  }

  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json' });
  }

  private applyCategories(list: CategoryMODEL[]): void {
    this.categorys = list || [];
    this.categoriesSubject.next(this.categorys);

    if (!this.nowCategory && this.categorys.length) {
      this.nowCategory = this.categorys[0].category;
    } else if (
      this.nowCategory &&
      !this.categorys.some((item) => item.category === this.nowCategory)
    ) {
      this.nowCategory = this.categorys[0]?.category || '';
    }
  }

  refreshCategories(): void {
    this.isLoadingCategories = true;
    this.getCategoriesFromApi().subscribe({
      next: (response) => {
        this.applyCategories(response.data || []);
        this.isLoadingCategories = false;
      },
      error: () => {
        this.applyCategories([]);
        this.isLoadingCategories = false;
      },
    });
  }

  getCategoriesFromApi(): Observable<ApiResponse<CategoryMODEL[]>> {
    return this.http.get<ApiResponse<CategoryMODEL[]>>(`${this.API}/list`);
  }

  loadProducts(): Observable<ApiResponse<FoodMODEL[]>> {
    return this.http.get<ApiResponse<FoodMODEL[]>>(
      environment.websiteAPI + '/api/product/list',
    );
  }

  public getCategories(): CategoryMODEL[] {
    return this.categorys;
  }

  public getFoodsByCategory(category: string): FoodMODEL[] {
    return this.foodItems.filter((food) => food.category === category);
  }

  public getCATEGORY(categoryID: string): CategoryMODEL | 'not found' {
    const found = this.getCategories().find(
      (item) => item.category === categoryID,
    );
    return found || 'not found';
  }

  getCategoryProducts(
    categoryId: number,
  ): Observable<
    ApiResponse<{ category: CategoryMODEL; products: FoodMODEL[] }>
  > {
    return this.http.get<
      ApiResponse<{ category: CategoryMODEL; products: FoodMODEL[] }>
    >(`${this.API}/${categoryId}/products`);
  }

  addCategory(formData: FormData): Observable<ApiResponse<CategoryMODEL[]>> {
    return this.http
      .post<ApiResponse<CategoryMODEL[]>>(`${this.API}/add`, formData, {
        headers: this.getAuthHeaders(),
        withCredentials: true,
      })
      .pipe(
        tap((response) => {
          if (response?.data) {
            this.applyCategories(response.data);
          } else {
            this.refreshCategories();
          }
        }),
      );
  }

  updateCategory(
    categoryId: number,
    formData: FormData,
  ): Observable<ApiResponse<CategoryMODEL>> {
    return this.http
      .put<ApiResponse<CategoryMODEL>>(`${this.API}/${categoryId}`, formData, {
        headers: this.getAuthHeaders(),
        withCredentials: true,
      })
      .pipe(tap(() => this.refreshCategories()));
  }

  deleteCategory(categoryId: number): Observable<ApiResponse<unknown>> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.API}/${categoryId}`, {
        headers: this.getAuthHeaders(),
        withCredentials: true,
      })
      .pipe(tap(() => this.refreshCategories()));
  }

  getCategoryImageURL(categoryId: number | string): string {
    return `${this.API}/image/${categoryId}`;
  }
}
