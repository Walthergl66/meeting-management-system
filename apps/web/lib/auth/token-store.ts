const ACCESS_TOKEN_KEY = 'meetflow.access_token';

let accessToken: string | null = null;

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },
  set(token: string | null): void {
    accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
      } else {
        window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      }
    }
  },
  hydrate(): string | null {
    if (accessToken) {
      return accessToken;
    }
    if (typeof window !== 'undefined') {
      accessToken = window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return accessToken;
  },
};
