export interface AuthState {
  token: string | null;
  profileCompleted: boolean | null;
}

export const initialAuthState: AuthState = {
  token: null,
  profileCompleted: null,
};
