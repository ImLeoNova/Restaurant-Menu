import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { jwtDecode } from 'jwt-decode';
import { Subscription } from 'rxjs';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { ProductService } from '../../services/product.service';
import { CommentService } from '../../services/comment.service';
import { CategoryService } from '../../services/category.service';
import { CartService } from '../../services/cart.service';
import { FoodMODEL } from '../../models/food-model';
import {
  CommentsSummary,
  CommentStats,
  ProductComment,
} from '../../models/comment-model';
import { AuthState } from '../../state/app.state';
import { isTokenExpired } from '../../state/auth';
import { JwtDecoded } from '../../interfaces/interfaces';
import { environment } from '../../../environments/environment';
import { ThousandTomanPipe } from '../../pipes/persian-number.pipe';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    HeaderComponent,
    FooterComponent,
    ThousandTomanPipe,
  ],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css',
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  product: FoodMODEL | null = null;
  relatedProducts: FoodMODEL[] = [];
  comments: ProductComment[] = [];
  stats: CommentStats = {
    total: 0,
    average_rating: 0,
    five_star: 0,
    four_star: 0,
    three_star: 0,
    two_star: 0,
    one_star: 0,
  };

  isLoading = true;
  commentsLoading = false;
  submitLoading = false;
  notFound = false;
  errorMessage = '';
  successMessage = '';

  reviewSummary: CommentsSummary | null = null;
  summaryLoading = false;

  isLoggedIn = false;
  currentUserId: string | null = null;
  userRole = '';

  newComment = '';
  newRating = 5;
  editingCommentId: number | null = null;
  editContent = '';
  editRating = 5;

  private routeSub?: Subscription;
  private authSub?: Subscription;
  private productId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private title: Title,
    private productService: ProductService,
    private commentService: CommentService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private store: Store<{ auth: AuthState }>,
  ) {}

  ngOnInit(): void {
    this.authSub = this.store
      .select((state) => state.auth)
      .subscribe((auth) => {
        const token = auth.token;
        if (token && !isTokenExpired(token)) {
          this.isLoggedIn = true;
          try {
            const decoded = jwtDecode<JwtDecoded>(token);
            this.currentUserId = decoded.user_id;
            this.userRole = String(decoded.role || '').toLowerCase();
          } catch {
            this.currentUserId = null;
          }
        } else {
          this.isLoggedIn = false;
          this.currentUserId = null;
          this.userRole = '';
        }
      });

    this.routeSub = this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('productId'));
      if (!id || Number.isNaN(id)) {
        this.notFound = true;
        this.isLoading = false;
        return;
      }
      this.productId = id;
      this.loadProduct(id);
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.authSub?.unsubscribe();
  }

  get categoryTitle(): string {
    if (!this.product) return '';
    const found = this.categoryService
      .getCategories()
      .find((item) => item.category === this.product?.category);
    return found?.title?.trim() || this.product.category;
  }

  get ratingPercentages(): { label: number; count: number; percent: number }[] {
    const total = this.stats.total || 1;
    return [
      {
        label: 5,
        count: this.stats.five_star,
        percent: (this.stats.five_star / total) * 100,
      },
      {
        label: 4,
        count: this.stats.four_star,
        percent: (this.stats.four_star / total) * 100,
      },
      {
        label: 3,
        count: this.stats.three_star,
        percent: (this.stats.three_star / total) * 100,
      },
      {
        label: 2,
        count: this.stats.two_star,
        percent: (this.stats.two_star / total) * 100,
      },
      {
        label: 1,
        count: this.stats.one_star,
        percent: (this.stats.one_star / total) * 100,
      },
    ];
  }

  get highlights(): { title: string; value: string }[] {
    const category = this.product?.category || '';
    const map: Record<string, { title: string; value: string }[]> = {
      burger: [
        { title: 'زمان آماده‌سازی', value: '۱۵ تا ۲۰ دقیقه' },
        { title: 'سطح سیری', value: 'کامل و سیرکننده' },
        { title: 'پیشنهاد سرو', value: 'با سیب‌زمینی و نوشیدنی' },
      ],
      pizza: [
        { title: 'زمان آماده‌سازی', value: '۲۰ تا ۲۵ دقیقه' },
        { title: 'پخت', value: 'فر سنگی داغ' },
        { title: 'پیشنهاد سرو', value: 'گرم و تازه از فر' },
      ],
      steak: [
        { title: 'زمان آماده‌سازی', value: '۲۵ تا ۳۵ دقیقه' },
        { title: 'درجه پخت', value: 'به سلیقه شما' },
        { title: 'پیشنهاد سرو', value: 'با سس مخصوص خانه' },
      ],
      pasta: [
        { title: 'زمان آماده‌سازی', value: '۱۵ تا ۲۰ دقیقه' },
        { title: 'نوع پاستا', value: 'تازه و خوش‌عطر' },
        { title: 'پیشنهاد سرو', value: 'با پنیر پارمزان' },
      ],
    };

    return (
      map[category] || [
        { title: 'زمان آماده‌سازی', value: '۱۰ تا ۲۰ دقیقه' },
        { title: 'کیفیت مواد', value: 'تازه و منتخب' },
        { title: 'پیشنهاد سرو', value: 'گرم و فوری' },
      ]
    );
  }

  stars(count: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1).map((star) =>
      star <= Math.round(count) ? 1 : 0,
    );
  }

  quantity = 1;

  addToCart(): void {
    if (this.product) {
      this.cartService.addToCart(this.product, this.quantity);
      this.successMessage = `محصول به سبد خرید اضافه شد.`;
    }
  }

  increaseQuantity(): void {
    this.quantity += 1;
  }

  decreaseQuantity(): void {
    this.quantity = Math.max(1, this.quantity - 1);
  }

  avatarUrl(comment: ProductComment): string | null {
    return comment.avatar
      ? `${environment.websiteAPI}/api/user/avatar/${comment.user_ID}`
      : null;
  }

  commentInitial(comment: ProductComment): string {
    return (comment.display_name || 'ک').trim().charAt(0).toUpperCase() || 'ک';
  }

  setRating(value: number): void {
    this.newRating = value;
  }

  setEditRating(value: number): void {
    this.editRating = value;
  }

  loadProduct(productId: number): void {
    this.isLoading = true;
    this.notFound = false;
    this.errorMessage = '';
    this.successMessage = '';

    this.productService.getSingleProduct(productId).subscribe({
      next: (response) => {
        this.product = response.data;
        this.title.setTitle(`${this.product.title} | فست فود آرین`);
        this.isLoading = false;
        this.loadComments(productId);
        this.loadRelated(this.product.category, productId);
        this.loadSummary(productId);
      },
      error: () => {
        this.isLoading = false;
        this.notFound = true;
        this.title.setTitle('محصول پیدا نشد | فست فود آرین');
      },
    });
  }

  loadComments(productId: number): void {
    this.commentsLoading = true;
    this.commentService.getComments(productId).subscribe({
      next: (response) => {
        this.comments = response.data.comments || [];
        this.stats = response.data.stats || this.stats;
        this.commentsLoading = false;
      },
      error: () => {
        this.comments = [];
        this.commentsLoading = false;
      },
    });
  }

  loadSummary(productId: number): void {
    this.summaryLoading = true;
    this.commentService.getSummary(productId).subscribe({
      next: (response) => {
        this.reviewSummary = response.data || null;
        this.summaryLoading = false;
      },
      error: () => {
        this.reviewSummary = null;
        this.summaryLoading = false;
      },
    });
  }

  loadRelated(category: string, currentId: number): void {
    this.productService.getProducts(category).subscribe({
      next: (response) => {
        this.relatedProducts = (response.data || [])
          .filter((item) => String(item.product_ID) !== String(currentId))
          .slice(0, 3);
      },
      error: () => {
        this.relatedProducts = [];
      },
    });
  }

  submitComment(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/authentication/login']);
      return;
    }

    const content = this.newComment.trim();
    if (content.length < 3) {
      this.errorMessage = 'کامنت باید حداقل ۳ کاراکتر باشد.';
      return;
    }

    this.submitLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.commentService
      .addComment(this.productId, { content, rating: this.newRating })
      .subscribe({
        next: (response) => {
          this.comments = [response.data, ...this.comments];
          this.newComment = '';
          this.newRating = 5;
          this.successMessage = 'کامنت شما با موفقیت ثبت شد.';
          this.submitLoading = false;
          this.loadComments(this.productId);
        },
        error: (error) => {
          this.submitLoading = false;
          this.errorMessage =
            error?.error?.message || 'ثبت کامنت با خطا مواجه شد.';
        },
      });
  }

  startEdit(comment: ProductComment): void {
    this.editingCommentId = comment.comment_ID;
    this.editContent = comment.content;
    this.editRating = comment.rating;
  }

  cancelEdit(): void {
    this.editingCommentId = null;
    this.editContent = '';
    this.editRating = 5;
  }

  saveEdit(commentId: number): void {
    const content = this.editContent.trim();
    if (content.length < 3) {
      this.errorMessage = 'کامنت باید حداقل ۳ کاراکتر باشد.';
      return;
    }

    this.commentService
      .updateComment(commentId, { content, rating: this.editRating })
      .subscribe({
        next: (response) => {
          this.comments = this.comments.map((item) =>
            item.comment_ID === commentId ? response.data : item,
          );
          this.cancelEdit();
          this.successMessage = 'کامنت ویرایش شد.';
          this.loadComments(this.productId);
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message || 'ویرایش کامنت با خطا مواجه شد.';
        },
      });
  }

  deleteComment(commentId: number): void {
    if (!confirm('این کامنت حذف شود؟')) return;

    this.commentService.deleteComment(commentId).subscribe({
      next: () => {
        this.comments = this.comments.filter(
          (item) => item.comment_ID !== commentId,
        );
        this.successMessage = 'کامنت حذف شد.';
        this.loadComments(this.productId);
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message || 'حذف کامنت با خطا مواجه شد.';
      },
    });
  }

  canManage(comment: ProductComment): boolean {
    if (!this.currentUserId) return false;
    return (
      comment.user_ID === this.currentUserId ||
      this.userRole === 'admin' ||
      this.userRole === 'founder'
    );
  }

  formatDate(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'همین الان';
    if (minutes < 60) return `${minutes} دقیقه پیش`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ساعت پیش`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} روز پیش`;

    return date.toLocaleDateString('fa-IR');
  }

  goBack(): void {
    this.router.navigate(['/restaurant-menu']);
  }

  scrollToComments(): void {
    document
      .getElementById('comments')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
