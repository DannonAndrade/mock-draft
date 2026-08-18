declare global {
  namespace Express {
    interface User {
      id: string;
      displayName: string;
      email: string | null;
      avatarUrl: string | null;
    }
  }
}

export {};
