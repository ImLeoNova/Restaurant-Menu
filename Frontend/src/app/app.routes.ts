import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { LoginAuthComponent } from './Authentication/login-auth/login-auth.component';
import { RegisterAuthComponent } from './Authentication/register-auth/register-auth.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProductDetailComponent } from './pages/product-detail/product-detail.component';
import { ProductsComponent } from './pages/products/products.component';
import { authGuard } from './guards/auth.guard';
import { authenticationGuard } from './guards/authentication.guard';

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
    canActivate: [authGuard],
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
        component: RegisterAuthComponent,
        canActivate: [authenticationGuard],
        data: { animation: 'register' },
      },
    ],
  },
  {
    path: '**',
    component: NotFoundComponent,
    data: { animation: 'not-found' },
  },
];
