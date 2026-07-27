import { ApplicationConfig, APP_INITIALIZER, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { authReducer } from './state/auth.reducer';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ActionReducerMap, MetaReducer, provideStore } from '@ngrx/store';
import { AuthState } from './state/app.state';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { httpInterceptor } from './interceptors/http.interceptor';
import { UserService } from './services/user.service';
import { Store } from '@ngrx/store';
import { loginSuccess, logout } from './state/auth.actions';
import { catchError, map } from 'rxjs/operators';
import { firstValueFrom, of } from 'rxjs';

export const reducers: ActionReducerMap<{ auth: AuthState }, any> = {
  auth: authReducer,
};

export const metaReducers: MetaReducer<{ auth: AuthState }, any>[] = [];

export function initializeAuth(): () => Promise<void> {
  const store = inject(Store<{ auth: AuthState }>);
  const userService = inject(UserService);

  return () =>
    firstValueFrom(
      userService.isTokenValid().pipe(
        map((response: any) => {
          const token = response?.data?.token;
          if (token) {
            store.dispatch(loginSuccess({ token }));
          } else {
            store.dispatch(logout());
          }
        }),
        catchError(() => {
          store.dispatch(logout());
          return of(void 0);
        }),
      ),
    ).then(() => void 0);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([httpInterceptor])),
    provideStore(reducers, { metaReducers: metaReducers }),
    provideAnimationsAsync(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      multi: true,
    },
  ],
};
