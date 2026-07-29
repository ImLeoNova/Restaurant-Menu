import { Component, HostListener, OnDestroy } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import { AuthState } from '../../state/app.state';
import { isTokenExpired } from '../../state/auth';
import { UserService } from '../../services/user.service';
import { CartService } from '../../services/cart.service';
import { CartDrawerComponent } from '../cart-drawer/cart-drawer.component';
import { environment } from '../../../environments/environment';

export interface HeaderNavItem {
  title: string;
  route: string;
  exact?: boolean;
  fragment?: string;
  icon: 'home' | 'products' | 'about';
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, NgClass, CartDrawerComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnDestroy {
  isLoggedIn = false;
  token: string | null = null;
  menuOpen = false;
  userName = '';
  avatarUrl: string | null = null;
  cartOpen = false;
  cartItemsCount = 0;
  cartSubtotal = 0;
  private avatarSub?: Subscription;
  private cartSub?: Subscription;

  readonly navItems: HeaderNavItem[] = [
    {
      title: 'خانه',
      route: '/restaurant-menu',
      exact: true,
      icon: 'home',
    },
    {
      title: 'محصولات',
      route: '/restaurant-menu/products',
      icon: 'products',
    },
    {
      title: 'درباره ما',
      route: '/restaurant-menu',
      fragment: 'about-us',
      icon: 'about',
    },
  ];

  constructor(
    private store: Store<{ auth: AuthState }>,
    private router: Router,
    private userService: UserService,
    public readonly cartService: CartService,
  ) {
    this.avatarSub = this.userService.avatarUrl$.subscribe((url) => {
      this.avatarUrl = url;
    });

    this.cartSub = this.cartService.items$.subscribe((items) => {
      this.cartItemsCount = this.cartService.getItemCount();
      this.cartSubtotal = this.cartService.getSubtotal();
    });

    store
      .select((state) => state.auth)
      .subscribe((auth: AuthState) => {
        this.token = auth.token;
        this.isLoggedIn = !!(this.token && !isTokenExpired(this.token));
        if (this.isLoggedIn) {
          this.loadProfile();
        }
      });
  }

  private loadProfile(): void {
    this.userService.getMyProfile(this.token).subscribe((response: any) => {
      const profile = response?.data;
      this.userName = profile?.first_name || profile?.username || 'کاربر';
      this.userService.setCurrentAvatarUrl(
        profile?.avatar
          ? `${environment.websiteAPI}/api/user/avatar/${profile.user_ID}`
          : null,
      );
    });
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    this.syncBodyScroll();
  }

  closeMenu(): void {
    if (!this.menuOpen) return;
    this.menuOpen = false;
    this.syncBodyScroll();
  }

  onNavClick(item: HeaderNavItem, event?: Event): void {
    this.closeMenu();

    if (!item.fragment) return;

    event?.preventDefault();
    void this.router
      .navigate([item.route], { fragment: item.fragment })
      .then(() => {
        setTimeout(() => {
          document
            .getElementById(item.fragment!)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      });
  }

  isNavActive(item: HeaderNavItem): boolean {
    const url = this.router.url.split('?')[0];
    const [path, fragment] = url.split('#');

    if (item.fragment) {
      const onHome =
        path === '/restaurant-menu' ||
        path === '/restaurant-menu/' ||
        path === '/';
      return onHome && fragment === item.fragment;
    }

    if (item.exact) {
      return (
        path === item.route ||
        path === `${item.route}/` ||
        (item.route === '/restaurant-menu' && path === '/')
      );
    }

    return path === item.route || path.startsWith(`${item.route}/`);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth >= 768 && this.menuOpen) {
      this.closeMenu();
    }
  }

  ngOnDestroy(): void {
    this.avatarSub?.unsubscribe();
    this.cartSub?.unsubscribe();
    document.body.style.overflow = '';
  }

  toggleCart(): void {
    this.cartOpen = !this.cartOpen;
    this.syncBodyScroll();
  }

  closeCart(): void {
    this.cartOpen = false;
    this.syncBodyScroll();
  }

  onIncrease(item: {
    product: { product_ID: number | string };
    quantity: number;
  }): void {
    this.cartService.updateQuantity(item.product.product_ID, item.quantity + 1);
  }

  onDecrease(item: {
    product: { product_ID: number | string };
    quantity: number;
  }): void {
    this.cartService.updateQuantity(item.product.product_ID, item.quantity - 1);
  }

  onRemove(item: { product: { product_ID: number | string } }): void {
    this.cartService.removeFromCart(item.product.product_ID);
  }

  onClearCart(): void {
    this.cartService.clearCart();
  }

  private syncBodyScroll(): void {
    document.body.style.overflow =
      this.menuOpen || this.cartOpen ? 'hidden' : '';
  }
}
