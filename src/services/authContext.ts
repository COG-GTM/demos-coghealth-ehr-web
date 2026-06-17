export interface CurrentUser {
  userId: string;
  userName: string;
  userRole: string;
  ipAddress: string;
}

let currentUser: CurrentUser | null = null;

export function setCurrentUser(user: CurrentUser): void {
  currentUser = user;
}

export function clearCurrentUser(): void {
  currentUser = null;
}

export function getCurrentUser(): CurrentUser {
  if (currentUser) {
    return currentUser;
  }

  return {
    userId: 'UNKNOWN',
    userName: 'Unknown User',
    userRole: 'Unknown',
    ipAddress: 'unknown',
  };
}
