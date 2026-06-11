import type { UserType } from '@/lib/types/database';

export type AppArea = 'customer' | 'admin' | 'runner' | 'rider' | 'auth';

const ROLE_HOME_PATHS: Record<UserType, string> = {
  car_owner: '/',
  mechanic: '/',
  admin: '/admin/dashboard',
  runner: '/runner/dashboard',
  rider: '/rider/dashboard',
};

const CUSTOMER_PREFIXES = [
  '/search',
  '/orders',
  '/order',
  '/cart',
  '/checkout',
  '/wallet',
  '/account',
  '/how-delivery-works',
];

/** Default landing path after login (or when leaving auth routes). */
export function getRoleHomePath(
  userType: UserType | null | undefined,
  needsSetup = false
): string {
  if (needsSetup || !userType) {
    return '/account';
  }
  return ROLE_HOME_PATHS[userType];
}

export function userTypeToArea(userType: UserType): AppArea {
  switch (userType) {
    case 'admin':
      return 'admin';
    case 'runner':
      return 'runner';
    case 'rider':
      return 'rider';
    case 'car_owner':
    case 'mechanic':
      return 'customer';
  }
}

/** Which app shell a URL belongs to; null = shared/unknown (e.g. API). */
export function getPathArea(pathname: string): AppArea | null {
  if (pathname.startsWith('/admin')) {
    return 'admin';
  }
  if (pathname.startsWith('/runner')) {
    return 'runner';
  }
  if (pathname.startsWith('/rider')) {
    return 'rider';
  }
  if (pathname.startsWith('/login') || pathname.startsWith('/verify')) {
    return 'auth';
  }
  if (pathname === '/') {
    return 'customer';
  }
  if (
    CUSTOMER_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return 'customer';
  }
  return null;
}

export function isPathAllowedForUserType(
  pathname: string,
  userType: UserType
): boolean {
  const pathArea = getPathArea(pathname);
  if (pathArea === null || pathArea === 'auth') {
    return true;
  }
  return pathArea === userTypeToArea(userType);
}
