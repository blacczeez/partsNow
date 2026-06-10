import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  getPathArea,
  getRoleHomePath,
  isPathAllowedForUserType,
} from '@/lib/auth/role-routes';
import type { UserType } from '@/lib/types/database';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect routes that require authentication
  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/verify');

  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isPublicRoute = isAuthRoute || request.nextUrl.pathname === '/';

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
    const pathname = request.nextUrl.pathname;

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
  }

  return supabaseResponse;
}
