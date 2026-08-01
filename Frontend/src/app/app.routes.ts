import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { authenticationGuard } from './guards/authentication.guard';
import { profileCompletedGuard } from './guards/profile-completed.guard';
import { completeProfileGuard } from './guards/complete-profile.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'restaurant-menu',
    pathMatch: 'full',
  },
  {
    path: 'products',
    redirectTo: 'restaurant-menu/products',
    pathMatch: 'full',
  },
  {
    path: 'restaurant-menu',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/home/home.component').then(
            (m) => m.HomeComponent,
          ),
        data: { animation: 'home' },
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/products/products.component').then(
            (m) => m.ProductsComponent,
          ),
        data: { animation: 'products' },
      },
      {
        path: 'product/:productId',
        loadComponent: () =>
          import('./pages/product-detail/product-detail.component').then(
            (m) => m.ProductDetailComponent,
          ),
        data: { animation: 'product-detail' },
      },
    ],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    canActivate: [authGuard, profileCompletedGuard],
    data: { animation: 'dashboard' },
  },
  {
    path: 'authentication',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./Authentication/login-auth/login-auth.component').then(
            (m) => m.LoginAuthComponent,
          ),
        canActivate: [authenticationGuard],
        data: { animation: 'login' },
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./Authentication/phone-auth/phone-auth.component').then(
            (m) => m.PhoneAuthComponent,
          ),
        canActivate: [authenticationGuard],
        data: { animation: 'register' },
      },
      {
        path: 'register/otp',
        loadComponent: () =>
          import('./Authentication/otp-auth/otp-auth.component').then(
            (m) => m.OtpAuthComponent,
          ),
        canActivate: [authenticationGuard],
        data: { animation: 'otp' },
      },
      {
        path: 'register/account',
        loadComponent: () =>
          import(
            './Authentication/create-account/create-account.component'
          ).then((m) => m.CreateAccountComponent),
        canActivate: [authenticationGuard],
        data: { animation: 'create-account' },
      },
      {
        path: 'complete-profile',
        loadComponent: () =>
          import(
            './Authentication/complete-profile/complete-profile.component'
          ).then((m) => m.CompleteProfileComponent),
        canActivate: [authGuard, completeProfileGuard],
        data: { animation: 'complete-profile' },
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./components/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
    data: { animation: 'not-found' },
  },
];
