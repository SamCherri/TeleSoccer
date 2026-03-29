export interface AuthUserView {
  id: string;
  email: string;
  displayName: string;
}

export interface AuthSessionView {
  accessToken: string;
  expiresAt: string;
  user: AuthUserView;
}
