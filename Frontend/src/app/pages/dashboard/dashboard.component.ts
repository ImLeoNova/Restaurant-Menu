import { FoodMODEL } from './../../models/food-model';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { AuthState } from '../../state/app.state';
import { logout } from '../../state/auth.actions';
import { isTokenExpired } from '../../state/auth';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { JwtDecoded } from '../../interfaces/interfaces';
import { DashboardService } from '../../services/dashboard.service';
import { User } from '../../models/user';
import { Roles } from '../../enums/enums';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CategoryService } from '../../services/category.service';
import { ProductService } from '../../services/product.service';
import { ApiResponse } from '../../models/api-response';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { UserService } from '../../services/user.service';
import { LoaderService } from '../../services/loader.service';
import { CategoryMODEL } from '../../models/category-model';
import { DashboardBackgroundComponent } from './components/dashboard-background/dashboard-background.component';
import { DashboardSidebarComponent } from './components/dashboard-sidebar/dashboard-sidebar.component';
import { DashboardWelcomeHeaderComponent } from './components/dashboard-welcome-header/dashboard-welcome-header.component';
import { DashboardHomeComponent } from './components/dashboard-home/dashboard-home.component';
import { DashboardProductsComponent } from './components/dashboard-products/dashboard-products.component';
import { DashboardUsersComponent } from './components/dashboard-users/dashboard-users.component';
import { DashboardCategoriesComponent } from './components/dashboard-categories/dashboard-categories.component';
import { AddProductModalComponent } from './components/modals/add-product-modal/add-product-modal.component';
import { SearchProductModalComponent } from './components/modals/search-product-modal/search-product-modal.component';
import { UpdateProductModalComponent } from './components/modals/update-product-modal/update-product-modal.component';
import { DeleteProductModalComponent } from './components/modals/delete-product-modal/delete-product-modal.component';
import { DeleteUserModalComponent } from './components/modals/delete-user-modal/delete-user-modal.component';
import { EditUserModalComponent } from './components/modals/edit-user-modal/edit-user-modal.component';
import { AddCategoryModalComponent } from './components/modals/add-category-modal/add-category-modal.component';
import { UpdateCategoryModalComponent } from './components/modals/update-category-modal/update-category-modal.component';
import { DeleteCategoryModalComponent } from './components/modals/delete-category-modal/delete-category-modal.component';
import { AddUserModalComponent } from './components/modals/add-user-modal/add-user-modal.component';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DashboardBackgroundComponent,
    DashboardSidebarComponent,
    DashboardWelcomeHeaderComponent,
    DashboardHomeComponent,
    DashboardProductsComponent,
    DashboardUsersComponent,
    DashboardCategoriesComponent,
    AddProductModalComponent,
    SearchProductModalComponent,
    UpdateProductModalComponent,
    DeleteProductModalComponent,
    DeleteUserModalComponent,
    EditUserModalComponent,
    AddCategoryModalComponent,
    UpdateCategoryModalComponent,
    DeleteCategoryModalComponent,
    AddUserModalComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit, OnDestroy {
  token: string | null = null;
  private authSub?: Subscription;
  user: User = new User('', '', '', '', '', '[]');

  nowPage: string = 'home';
  nowModal: string | undefined = undefined;

  imageADD: File | undefined = undefined;
  imgSRC: string | ArrayBuffer | null = null;

  updateImageFile: File | undefined = undefined;
  updateImgSRC: string | ArrayBuffer | null = null;

  categoryImageFile: File | undefined = undefined;
  categoryImgSRC: string | ArrayBuffer | null = null;
  updateCategoryImageFile: File | undefined = undefined;
  updateCategoryImgSRC: string | ArrayBuffer | null = null;

  errorMessage: string | undefined = undefined;
  successMessage: string | undefined = undefined;

  searchKeyword: string = '';

  products: FoodMODEL[] = [];
  filteredProducts: FoodMODEL[] = [];
  selectedProduct: FoodMODEL | null = null;

  selectedCategoryItem: CategoryMODEL | null = null;
  selectedCategoryProducts: FoodMODEL[] = [];
  isLoadingCategoryProducts = false;

  isLoadingProducts: boolean = false;
  isSubmitting: boolean = false;

  addFoodFORM: FormGroup = new FormGroup({
    foodName: new FormControl('', [Validators.required]),
    foodCategory: new FormControl('', [Validators.required]),
    foodDescription: new FormControl('', [Validators.required]),
    foodPrice: new FormControl('', [Validators.required]),
  });

  updateFoodFORM: FormGroup = new FormGroup({
    product_id: new FormControl('', [Validators.required]),
    foodName: new FormControl('', [Validators.required]),
    foodCategory: new FormControl('', [Validators.required]),
    foodDescription: new FormControl('', [Validators.required]),
    foodPrice: new FormControl('', [Validators.required]),
  });

  addCategoryFORM: FormGroup = new FormGroup({
    title: new FormControl('', [Validators.required]),
    slug: new FormControl('', [Validators.required]),
  });

  updateCategoryFORM: FormGroup = new FormGroup({
    category_id: new FormControl('', [Validators.required]),
    title: new FormControl('', [Validators.required]),
    slug: new FormControl('', [Validators.required]),
  });

  updateUserFORM: FormGroup = new FormGroup({
    user_id: new FormControl('', [Validators.required]),
    username: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required]),
    role: new FormControl('', [Validators.required]),
  });

  addUserFORM: FormGroup = new FormGroup({
    username: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required]),
    role: new FormControl('', [Validators.required]),
  });
  users: User[] = [];
  filteredUsers: User[] = [];
  isLoadingUsers: boolean = false;
  searchUserKeyword: string = '';
  selectedUser: User | null = null;

  constructor(
    private store: Store<{ auth: AuthState }>,
    public categoryService: CategoryService,
    private router: Router,
    private dashboardService: DashboardService,
    public productService: ProductService,
    public userService: UserService,
    private loaderService: LoaderService,
  ) {
    this.authSub = this.store
      .select((state) => state.auth)
      .pipe(
        map((auth: AuthState) => auth.token),
        distinctUntilChanged(),
      )
      .subscribe((token: string | null) => {
        this.token = token;

        if (this.token && !isTokenExpired(this.token)) {
          const decodedJWT: JwtDecoded = jwtDecode<JwtDecoded>(this.token);
          const userID: string = decodedJWT.user_id;

          this.dashboardService.userDATA(this.token, userID).subscribe({
            next: (userData: any) => {
              this.user = userData.data;
              this.loadUsers();
            },
            error: () => {
              this.store.dispatch(logout());
              this.router.navigate(['/authentication/login']);
            },
          });
        } else {
          // NOTE: no dispatch(logout()) here on purpose.
          // If the token is already null/expired, dispatching logout() again
          // would push a brand-new (but value-equal) auth object through the
          // store, re-triggering this very subscription synchronously and
          // causing an infinite dispatch loop that freezes the tab.
          this.router.navigate(['/authentication/login']);
        }
      });
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
  }

  handleLogout(): void {
    this.isSubmitting = true;
    this.userService.logout().subscribe({
      next: () => {
        this.isSubmitting = false;
        // ensure global loader is hidden in case any request remained
        try {
          this.loaderService.reset();
        } catch (e) {}
        this.store.dispatch(logout());
        void this.router.navigate(['/authentication/login']);
      },
      error: () => {
        // Even if backend logout fails, clear local state and redirect
        this.isSubmitting = false;
        try {
          this.loaderService.reset();
        } catch (e) {}
        this.store.dispatch(logout());
        void this.router.navigate(['/authentication/login']);
      },
    });
  }

  public loadUsers() {
    if (this.user.role === Roles.FOUNDER || this.user.role === Roles.ADMIN) {
      this.userService.adminGetAllUsers(this.token).subscribe({
        next: (response: ApiResponse<User[]>) => {
          this.users = response.data;
          this.filteredUsers = response.data;
        },
      });
    }
  }

  openEditUserModal(u: User): void {
    this.selectedUser = u;
    this.updateUserFORM.patchValue({
      user_id: u.user_ID,
      username: u.username,
      email: u.email,
      role: u.role,
    });
    this.openModal('edit_user');
  }

  updateAdminUser(): void {
    this.errorMessage = undefined;
    this.successMessage = undefined;

    const { user_id, username, email, role } = this.updateUserFORM.value;

    if (!username || !email || !role) {
      this.errorMessage = 'لطفا تمام فیلدها را پر کنید';
      return;
    }

    this.isSubmitting = true;

    this.userService
      .adminUpdateUser(this.token, user_id, { username, email, role })
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.successMessage = response.message || 'کاربر با موفقیت ویرایش شد';
          this.loadUsers();
          setTimeout(() => this.closeModal(), 1000);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = err?.error?.message || 'خطا در ویرایش کاربر';
        },
      });
  }

  openAddUserModal(): void {
    this.resetAddUserForm();
    this.openModal('add_user');
  }

  addAdminUser(): void {
    this.errorMessage = undefined;
    this.successMessage = undefined;

    const { username, email, password, role } = this.addUserFORM.value;

    if (!username || !email || !password || !role) {
      this.errorMessage = 'لطفا تمام فیلدها را پر کنید';
      return;
    }

    this.isSubmitting = true;

    const newUser = new User('', username, password, email, role, '[]');

    this.userService
      .adminCreateUser(this.token, newUser)
      .subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.successMessage = response.message || 'کاربر با موفقیت افزوده شد';
          this.loadUsers();
          setTimeout(() => this.closeModal(), 1000);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage = err?.error?.message || 'خطا در افزودن کاربر';
        },
      });
  }

  resetAddUserForm(): void {
    this.addUserFORM.reset();
    this.errorMessage = undefined;
    this.successMessage = undefined;
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  searchUsers(): void {
    const q = this.searchUserKeyword.trim().toLowerCase();
    this.filteredUsers = this.users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }

  loadProducts(category?: string, search?: string): void {
    this.isLoadingProducts = true;

    this.productService.getProducts(category, search).subscribe({
      next: (response: ApiResponse<FoodMODEL[]>) => {
        this.products = response.data || [];
        this.filteredProducts = [...this.products];

        this.isLoadingProducts = false;
      },
      error: () => {
        this.products = [];
        this.filteredProducts = [];
        this.isLoadingProducts = false;
      },
    });
  }

  setPage(page: string) {
    this.nowPage = page;

    if (page === 'products') {
      this.loadProducts(this.categoryService.nowCategory || undefined);
    }

    if (page === 'categories') {
      this.categoryService.refreshCategories();
    }
  }

  openModal(modal: string, item?: FoodMODEL | User | CategoryMODEL): void {
    this.errorMessage = undefined;
    this.successMessage = undefined;
    this.nowModal = modal;

    if (modal === 'add') {
      this.resetAddForm();
    }

    if (modal === 'add_category') {
      this.resetCategoryForm();
    }

    if (modal === 'add_user') {
      this.resetAddUserForm();
    }

    if (
      (modal === 'update' || modal === 'remove') &&
      item &&
      'product_ID' in item
    ) {
      this.selectedProduct = item as FoodMODEL;
    }

    if (modal === 'update' && item && 'product_ID' in item) {
      this.prepareUpdateForm(item as FoodMODEL);
    }

    if (modal === 'delete_user') {
      this.selectedUser = item as User;
    }

    if (
      (modal === 'update_category' || modal === 'delete_category') &&
      item &&
      'category' in item &&
      !('product_ID' in item)
    ) {
      this.selectedCategoryItem = item as CategoryMODEL;
    }

    if (modal === 'update_category' && this.selectedCategoryItem) {
      this.prepareUpdateCategoryForm(this.selectedCategoryItem);
    }
  }

  closeModal(): void {
    this.nowModal = undefined;
    this.errorMessage = undefined;
    this.successMessage = undefined;
    this.selectedProduct = null;
    this.selectedUser = null;
    this.selectedCategoryItem = null;
    this.updateImageFile = undefined;
    this.updateImgSRC = null;
    this.categoryImageFile = undefined;
    this.categoryImgSRC = null;
    this.updateCategoryImageFile = undefined;
    this.updateCategoryImgSRC = null;
    this.addUserFORM.reset();
  }

  input(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (file) {
      this.imageADD = file;

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        this.imgSRC = reader.result;
      });
      reader.readAsDataURL(file);
    }
  }

  updateInput(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (file) {
      this.updateImageFile = file;

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        this.updateImgSRC = reader.result;
      });
      reader.readAsDataURL(file);
    }
  }

  // ==================== CATEGORY IMAGE INPUTS ====================

  categoryInput(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (file) {
      this.categoryImageFile = file;

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        this.categoryImgSRC = reader.result;
      });
      reader.readAsDataURL(file);
    }
  }

  updateCategoryInput(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (file) {
      this.updateCategoryImageFile = file;

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        this.updateCategoryImgSRC = reader.result;
      });
      reader.readAsDataURL(file);
    }
  }

  addFood() {
    this.errorMessage = undefined;
    this.successMessage = undefined;

    const foodName = this.addFoodFORM.get('foodName')?.value;
    const foodCategory = this.addFoodFORM.get('foodCategory')?.value;
    const foodDescription = this.addFoodFORM.get('foodDescription')?.value;
    const foodPrice = this.addFoodFORM.get('foodPrice')?.value;

    if (
      !foodName ||
      !foodCategory ||
      !foodDescription ||
      !foodPrice ||
      !this.imageADD
    ) {
      this.errorMessage =
        'لطفا فرم را کامل پر کنید و تصویر محصول را انتخاب کنید';
      return;
    }

    const formData = new FormData();
    formData.append('title', foodName);
    formData.append('description', foodDescription);
    formData.append('category', foodCategory);
    formData.append('price', foodPrice);
    formData.append('file', this.imageADD);

    this.isSubmitting = true;

    this.productService.addProduct(formData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.successMessage = response.message || 'محصول با موفقیت ثبت شد';
        this.resetAddForm();
        this.loadProducts(this.categoryService.nowCategory || undefined);
        setTimeout(() => {
          this.closeModal();
        }, 1000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.message || 'خطا در ثبت محصول. دوباره تلاش کنید';
      },
    });
  }

  prepareUpdateForm(product: FoodMODEL): void {
    this.selectedProduct = product;

    const productId = product.product_ID;
    const productIdStr = String(productId);

    this.updateFoodFORM.patchValue({
      product_id: productIdStr,
      foodName: (product as any).title,
      foodCategory: (product as any).category ?? '',
      foodDescription: (product as any).description ?? '',
      foodPrice: String((product as any).price ?? ''),
    });

    this.updateImgSRC = (product as any).image;
  }

  updateFood(): void {
    this.errorMessage = undefined;
    this.successMessage = undefined;

    const product_id = this.updateFoodFORM.get('product_id')?.value;
    const foodName = this.updateFoodFORM.get('foodName')?.value;
    const foodCategory = this.updateFoodFORM.get('foodCategory')?.value;
    const foodDescription = this.updateFoodFORM.get('foodDescription')?.value;
    const foodPrice = this.updateFoodFORM.get('foodPrice')?.value;

    if (!foodName || !foodCategory || !foodDescription || !foodPrice) {
      this.errorMessage = 'لطفا اطلاعات فرم ویرایش را کامل وارد کنید';
      return;
    }

    const formData = new FormData();
    formData.append('title', foodName);
    formData.append('description', foodDescription);
    formData.append('category', foodCategory);
    formData.append('price', foodPrice);

    if (this.updateImageFile) {
      formData.append('image', this.updateImageFile);
    }

    this.isSubmitting = true;

    this.productService.updateProduct(Number(product_id), formData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.successMessage = response.message || 'محصول با موفقیت ویرایش شد';
        this.loadProducts(this.categoryService.nowCategory || undefined);
        setTimeout(() => {
          this.closeModal();
        }, 1000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.message || 'خطا در ویرایش محصول. دوباره تلاش کنید';
      },
    });
  }

  deleteSelectedProduct(): void {
    this.errorMessage = undefined;
    this.successMessage = undefined;

    const product_id = this.selectedProduct?.product_ID;

    if (!product_id) {
      this.errorMessage = 'محصولی برای حذف انتخاب نشده است';
      return;
    }

    this.isSubmitting = true;

    this.productService.deleteProduct(Number(product_id)).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.successMessage = response.message || 'محصول با موفقیت حذف شد';
        this.loadProducts(this.categoryService.nowCategory || undefined);
        setTimeout(() => {
          this.closeModal();
        }, 1000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.message || 'خطا در حذف محصول. دوباره تلاش کنید';
      },
    });
  }

  searchProducts(): void {
    const category = this.categoryService.nowCategory || undefined;
    const search = this.searchKeyword?.trim() || undefined;

    this.loadProducts(category, search);
    this.closeModal();
  }

  selectProductForUpdate(product: FoodMODEL): void {
    this.openModal('update', product);
  }

  selectProductForDelete(product: FoodMODEL): void {
    this.openModal('remove', product);
  }

  getProductsByCurrentCategory(): FoodMODEL[] {
    const currentCategory = this.categoryService.nowCategory;

    if (!currentCategory) return this.filteredProducts;

    return this.filteredProducts.filter(
      (item: any) => item.category === currentCategory,
    );
  }

  onCategoryChange(category: string): void {
    this.categoryService.nowCategory = category;
    this.loadProducts(category, this.searchKeyword || undefined);
  }

  deleteAdminUser(user_ID: string | undefined) {
    this.errorMessage = undefined;
    this.successMessage = undefined;
    this.userService.adminDeleteUser(this.token, user_ID).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.successMessage = response.message || 'کاربر با موفقیت حذف شد';
        this.loadUsers();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.message || 'خطا در حذف کاربر. دوباره تلاش کنید';
      },
    });
  }

  resetAddForm(): void {
    this.addFoodFORM.reset();
    this.imageADD = undefined;
    this.imgSRC = null;
    this.errorMessage = undefined;
    this.successMessage = undefined;
  }

  // ==================== CATEGORY CRUD ====================

  resetCategoryForm(): void {
    this.addCategoryFORM.reset();
    this.categoryImageFile = undefined;
    this.categoryImgSRC = null;
    this.errorMessage = undefined;
    this.successMessage = undefined;
  }

  prepareUpdateCategoryForm(category: CategoryMODEL): void {
    this.selectedCategoryItem = category;

    this.updateCategoryFORM.patchValue({
      category_id: category.category_ID,
      title: category.title,
      slug: category.slug ?? category.category,
    });

    this.updateCategoryImgSRC = category.image || null;
    this.updateCategoryImageFile = undefined;
  }

  addCategory(): void {
    this.errorMessage = undefined;
    this.successMessage = undefined;

    const title = this.addCategoryFORM.get('title')?.value;
    const slug = this.addCategoryFORM.get('slug')?.value;

    if (!title || !slug || !this.categoryImageFile) {
      this.errorMessage =
        'لطفا فرم را کامل پر کنید و تصویر دسته‌بندی را انتخاب کنید';
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', slug);
    formData.append('file', this.categoryImageFile);

    this.isSubmitting = true;

    this.categoryService.addCategory(formData).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.successMessage = response.message || 'دسته‌بندی با موفقیت ثبت شد';
        this.resetCategoryForm();
        this.categoryService.refreshCategories();
        setTimeout(() => {
          this.closeModal();
        }, 1000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.message || 'خطا در ثبت دسته‌بندی. دوباره تلاش کنید';
      },
    });
  }

  updateCategory(): void {
    this.errorMessage = undefined;
    this.successMessage = undefined;

    const category_id = this.updateCategoryFORM.get('category_id')?.value;
    const title = this.updateCategoryFORM.get('title')?.value;
    const slug = this.updateCategoryFORM.get('slug')?.value;

    if (!title || !slug) {
      this.errorMessage = 'لطفا اطلاعات فرم ویرایش دسته‌بندی را کامل وارد کنید';
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', slug);

    if (this.updateCategoryImageFile) {
      formData.append('image', this.updateCategoryImageFile);
    }

    this.isSubmitting = true;

    this.categoryService
      .updateCategory(Number(category_id), formData)
      .subscribe({
        next: (response: any) => {
          this.isSubmitting = false;
          this.successMessage =
            response.message || 'دسته‌بندی با موفقیت ویرایش شد';
          this.categoryService.refreshCategories();
          setTimeout(() => {
            this.closeModal();
          }, 1000);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.errorMessage =
            err?.error?.message || 'خطا در ویرایش دسته‌بندی. دوباره تلاش کنید';
        },
      });
  }

  deleteSelectedCategory(): void {
    this.errorMessage = undefined;
    this.successMessage = undefined;

    const category_id = this.selectedCategoryItem?.category_ID;

    if (!category_id) {
      this.errorMessage = 'دسته‌بندی‌ای برای حذف انتخاب نشده است';
      return;
    }

    this.isSubmitting = true;

    this.categoryService.deleteCategory(Number(category_id)).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;
        this.successMessage = response.message || 'دسته‌بندی با موفقیت حذف شد';
        this.categoryService.refreshCategories();
        setTimeout(() => {
          this.closeModal();
        }, 1000);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.message || 'خطا در حذف دسته‌بندی. دوباره تلاش کنید';
      },
    });
  }

  viewCategoryProducts(category: CategoryMODEL): void {
    this.selectedCategoryItem = category;
    this.selectedCategoryProducts = [];

    if (!category.category_ID) {
      return;
    }

    this.isLoadingCategoryProducts = true;

    this.categoryService.getCategoryProducts(category.category_ID).subscribe({
      next: (response) => {
        this.selectedCategoryProducts = response.data.products || [];
        this.isLoadingCategoryProducts = false;
      },
      error: () => {
        this.selectedCategoryProducts = [];
        this.isLoadingCategoryProducts = false;
      },
    });
  }

  clearCategorySelection(): void {
    this.selectedCategoryItem = null;
    this.selectedCategoryProducts = [];
  }
}
