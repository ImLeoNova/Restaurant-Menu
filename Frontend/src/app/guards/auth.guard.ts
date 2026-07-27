import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AuthState } from '../state/app.state';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { loginSuccess, logout } from '../state/auth.actions';
import { UserService } from '../services/user.service';

// Route guard to check if the user is authenticated
export const authGuard: CanActivateFn = (route, state): Observable<boolean> => {
  const store = inject(Store<{ auth: AuthState }>);
  const router = inject(Router);
  let userAuth: UserService = inject(UserService);
  return userAuth.isTokenValid().pipe(
    map((response: any) => {
      const token = response?.data?.token;
      if (token) {
        store.dispatch(loginSuccess({ token }));
        return true;
      }

      store.dispatch(logout());
      router.navigate(['/authentication/login']);
      return false;
    }),
    catchError(() => {
      store.dispatch(logout());
      router.navigate(['/authentication/login']);
      return of(false);
    }),
  );
};
