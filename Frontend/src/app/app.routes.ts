import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { LoginAuthComponent } from './Authentication/login-auth/login-auth.component';
import { RegisterAuthComponent } from './Authentication/register-auth/register-auth.component';
import { PhoneAuthComponent } from './Authentication/phone-auth/phone-auth.component';
import { OtpAuthComponent } from './Authentication/otp-auth/otp-auth.component';
import { CreateAccountComponent } from './Authentication/create-account/create-account.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProductDetailComponent } from './pages/product-detail/product-detail.component';
import { ProductsComponent } from './pages/products/products.component';
import { authGuard } from './guards/auth.guard';
import { authenticationGuard } from './guards/authentication.guard';
import { profileCompletedGuard } from './guards/profile-completed.guard';
import { CompleteProfileComponent } from './Authentication/complete-profile/complete-profile.component';
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
        component: HomeComponent,
        data: { animation: 'home' },
      },
      {
        path: 'products',
        component: ProductsComponent,
        data: { animation: 'products' },
      },
      {
        path: 'product/:productId',
        component: ProductDetailComponent,
        data: { animation: 'product-detail' },
      },
    ],
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard, profileCompletedGuard],
    data: { animation: 'dashboard' },
  },
  {
    path: 'authentication',
    children: [
      {
        path: 'login',
        component: LoginAuthComponent,
        canActivate: [authenticationGuard],
        data: { animation: 'login' },
      },
      {
        path: 'register',
        component: PhoneAuthComponent,
        canActivate: [authenticationGuard],
        data: { animation: 'register' },
      },
      {
        path: 'register/otp',
        component: OtpAuthComponent,
        canActivate: [authenticationGuard],
        data: { animation: 'otp' },
      },
      {
        path: 'register/account',
        component: CreateAccountComponent,
        canActivate: [authenticationGuard],
        data: { animation: 'create-account' },
      },
      {
        path: 'register/legacy',
        component: RegisterAuthComponent,
        canActivate: [authenticationGuard],
        data: { animation: 'register-legacy' },
      },
      {
        path: 'complete-profile',
        component: CompleteProfileComponent,
        canActivate: [authGuard, completeProfileGuard],
        data: { animation: 'complete-profile' },
      },
    ],
  },
  {
    path: '**',
    component: NotFoundComponent,
    data: { animation: 'not-found' },
  },
];
