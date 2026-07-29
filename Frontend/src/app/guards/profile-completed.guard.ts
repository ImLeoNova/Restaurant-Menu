import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, map, of } from 'rxjs';
import { UserService } from '../services/user.service';
import { AuthState } from '../state/app.state';
import { setProfileCompleted } from '../state/auth.actions';

export const profileCompletedGuard: CanActivateFn = () => {
  const router = inject(Router);
  const store = inject(Store<{ auth: AuthState }>);
  const userService = inject(UserService);

  return userService.getMyProfile(null).pipe(
    map((response: any) => {
      const completed = response?.data?.profile_completed === true;
      store.dispatch(setProfileCompleted({ completed }));

      if (!completed) {
        router.navigate(['/authentication/complete-profile']);
        return false;
      }

      return true;
    }),
    catchError(() => {
      store.dispatch(setProfileCompleted({ completed: false }));
      router.navigate(['/authentication/complete-profile']);
      return of(false);
    }),
  );
};
