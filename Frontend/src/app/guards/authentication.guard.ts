import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { AuthState } from '../state/app.state';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { logout } from '../state/auth.actions';
import { UserService } from '../services/user.service';

// Route guard to check if the user is NOT authenticated (for login/register pages)
export const authenticationGuard: CanActivateFn = (
  route,
  state,
): Observable<boolean> => {
  const store = inject(Store<{ auth: AuthState }>);
  const router = inject(Router);
  const userService = inject(UserService);

  return userService.isTokenValid().pipe(
    map((response: any) => {
      const token = response?.data?.token;
      if (token) {
        router.navigate(['/dashboard']);
        return false;
      }

      store.dispatch(logout());
      return true;
    }),
    catchError(() => {
      store.dispatch(logout());
      return of(true);
    }),
  );
};
