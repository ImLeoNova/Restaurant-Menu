import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';
import { CartItem } from '../../models/cart-item';
import { AuthState } from '../../state/app.state';
import { isTokenExpired } from '../../state/auth';
import { HeaderComponent } from '../../components/header/header.component';
import { FooterComponent } from '../../components/footer/footer.component';
import { environment } from '../../../environments/environment';
import { ThousandTomanPipe } from '../../pipes/persian-number.pipe';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    HeaderComponent,
    FooterComponent,
    ThousandTomanPipe,
  ],
  templateUrl: './checkout.component.html',
})
export class CheckoutComponent implements OnInit, OnDestroy {
  items: CartItem[] = [];
  subtotal = 0;
  paying = false;
  address = '';
  phone = '';
  fullName = '';
  private subs: Subscription[] = [];
  private token: string | null = null;

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private toast: ToastService,
    private userService: UserService,
    private store: Store<{ auth: AuthState }>,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.cartService.items$.subscribe(() => {
        this.items = this.cartService.getItems();
        this.subtotal = this.cartService.getSubtotal();
      }),
    );
    this.subs.push(
      this.store
        .select((s) => s.auth)
        .subscribe((auth) => {
          this.token = auth.token;
          if (!(this.token && !isTokenExpired(this.token))) {
            this.router.navigate(['/authentication/login'], {
              queryParams: { returnUrl: '/checkout' },
            });
            return;
          }
          this.loadProfile();
        }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  private loadProfile(): void {
    this.userService.getMyProfile(this.token).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        if (!data) return;
        this.address = data.address || '';
        this.phone = data.phone_number || '';
        this.fullName =
          `${data.first_name || ''} ${data.last_name || ''}`.trim() ||
          data.username ||
          '';
      },
      error: () => {},
    });
  }

  imageUrl(path?: string): string {
    if (!path) return 'assets/web/logo.png';
    if (path.startsWith('http')) return path;
    return `${environment.websiteAPI || ''}/${path}`.replace(
      /([^:]\/)\/+/g,
      '$1',
    );
  }

  get deliveryInfoValid(): boolean {
    return !!(this.fullName.trim() && this.phone.trim() && this.address.trim());
  }

  lineTotal(item: CartItem): number {
    const price = Number(item.product.price);
    return Number.isFinite(price) ? price * item.quantity : 0;
  }

  increase(item: CartItem): void {
    this.cartService.updateQuantity(item.product.product_ID, item.quantity + 1);
  }
  decrease(item: CartItem): void {
    this.cartService.updateQuantity(item.product.product_ID, item.quantity - 1);
  }
  remove(item: CartItem): void {
    this.cartService.removeFromCart(item.product.product_ID);
  }

  pay(): void {
    if (!this.items.length || this.paying) return;
    if (!this.deliveryInfoValid) {
      this.toast.error(
        'لطفاً نام گیرنده، شماره تماس و آدرس تحویل را کامل کنید.',
      );
      return;
    }
    this.paying = true;
    this.orderService
      .createOrder({
        items: this.items.map((i) => ({
          product_ID: i.product.product_ID,
          quantity: i.quantity,
        })),
        recipient_name: this.fullName.trim(),
        recipient_phone: this.phone.trim(),
        delivery_address: this.address.trim(),
      })
      .subscribe({
        next: (res) => {
          const url = res?.data?.payment_url;
          if (!url) {
            this.paying = false;
            this.toast.error('آدرس درگاه پرداخت دریافت نشد.');
            return;
          }
          window.location.href = url;
        },
        error: (err) => {
          this.paying = false;
          this.toast.error(
            err?.error?.message || 'خطا در ایجاد درخواست پرداخت.',
          );
        },
      });
  }
}
