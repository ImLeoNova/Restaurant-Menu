import { Component, HostListener, OnDestroy } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthState } from '../../state/app.state';
import { isTokenExpired } from '../../state/auth';
import { logout as logoutAction } from '../../state/auth.actions';

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
  imports: [RouterLink, NgClass],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css',
})
export class HeaderComponent implements OnDestroy {
  isLoggedIn = false;
  token: string | null = null;
  menuOpen = false;

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
  ) {
    store
      .select((state) => state.auth)
      .subscribe((auth: AuthState) => {
        this.token = auth.token;
        this.isLoggedIn = !!(this.token && !isTokenExpired(this.token));
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
    document.body.style.overflow = '';
  }

  logout(): void {
    this.store.dispatch(logoutAction());
    this.closeMenu();
    void this.router.navigate(['/authentication/login']);
  }

  private syncBodyScroll(): void {
    document.body.style.overflow = this.menuOpen ? 'hidden' : '';
  }
}
