import { ActionReducer } from '@ngrx/store';
import { AuthState } from './app.state';

export function localStorageMetaReducer(
  reducer: ActionReducer<{ auth: AuthState }, any>,
): ActionReducer<{ auth: AuthState }, any> {
  return function (
    state: { auth: AuthState } | undefined,
    action: any,
  ): { auth: AuthState } {
    return reducer(state, action);
  };
}
