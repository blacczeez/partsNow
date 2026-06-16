import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  getPathArea,
  getRoleHomePath,
  isPathAllowedForUserType,
} from '@/lib/auth/role-routes';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env';
import { fetchRuntimeConfig } from '@/lib/services/runtime-config';
import type { UserType } from '@/lib/types/database';

const PUBLIC_API_PREFIXES = [
  '/api/inventory/categories',
  '/api/inventory/search',
  '/api/delivery/config',
  '/api/webhooks/',
  '/api/cron/',
];

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public catalog + webhooks do not need session refresh in middleware.
  if (isPublicApiRoute(pathname)) {
    return NextResponse.next({ request });
  }

  let runtime: Awaited<ReturnType<typeof fetchRuntimeConfig>> | null = null;
  try {
    runtime = await fetchRuntimeConfig();
    if (runtime.features.maintenanceMode) {
      const isAdminArea =
        pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
      const isWebhook = pathname.startsWith('/api/webhooks');
      const isAuth = pathname.startsWith('/login') || pathname.startsWith('/verify');
      if (!isAdminArea && !isWebhook && !isAuth) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('maintenance', '1');
        return NextResponse.redirect(url);
      }
    }
  } catch (error) {
    console.error('Runtime config check failed:', error);
  }

  const isCustomerFeatureRoute = (() => {
    const area = getPathArea(pathname);
    if (area === 'customer') {
      return (
        pathname !== '/how-delivery-works' && pathname !== '/how-loyalty-works'
      );
    }
    return (
      pathname.startsWith('/api/orders') ||
      pathname.startsWith('/api/wallet') ||
      pathname.startsWith('/api/users/me')
    );
  })();

  if (runtime && !runtime.features.carOwnerWebApp && isCustomerFeatureRoute) {
    const isAuth = pathname.startsWith('/login') || pathname.startsWith('/verify');
    if (!isAuth) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('unavailable', '1');
      return NextResponse.redirect(url);
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session to keep it alive
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.error('Supabase auth unreachable in middleware:', error);
    return supabaseResponse;
  }

  // Protect routes that require authentication
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/verify');

  const isApiRoute = pathname.startsWith('/api');
  const isPublicRoute =
    isAuthRoute || pathname === '/' || pathname === '/how-delivery-works' || pathname === '/how-loyalty-works';

  if (!user && !isPublicRoute && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('user_type')
      .eq('id', user.id)
      .maybeSingle();

    const needsSetup = !profile;
    const userType = profile?.user_type as UserType | undefined;
    const homePath = getRoleHomePath(userType, needsSetup);
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = homePath;
      return NextResponse.redirect(url);
    }

    if (needsSetup) {
      if (
        !pathname.startsWith('/account') &&
        !isApiRoute
      ) {
        const url = request.nextUrl.clone();
        url.pathname = '/account';
        return NextResponse.redirect(url);
      }
      return supabaseResponse;
    }

    const pathArea = getPathArea(pathname);
    if (
      pathArea &&
      userType &&
      !isPathAllowedForUserType(pathname, userType)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = homePath;
      return NextResponse.redirect(url);
    }

    if (
      runtime &&
      userType === 'mechanic' &&
      !runtime.features.mechanicWebApp &&
      getPathArea(pathname) === 'customer'
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('unavailable', '1');
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
