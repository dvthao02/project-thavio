import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/admin/login', '/login'];
const LEGACY_ADMIN_PREFIXES = [
  '/dashboard',
  '/alerts',
  '/audit-logs',
  '/business-accounts',
  '/businesses',
  '/subscriptions',
  '/billing',
  '/accounts',
  '/rbac',
  '/sessions',
  '/security',
  '/operations',
  '/support',
  '/settings',
  '/integrations',
];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === '/admin/businesses/accounts' || pathname.startsWith('/admin/businesses/accounts/')) {
    const target = new URL('/admin/business-accounts', request.url);
    target.search = search;
    return NextResponse.redirect(target);
  }

  if (pathname === '/businesses/accounts' || pathname.startsWith('/businesses/accounts/')) {
    const target = new URL('/admin/business-accounts', request.url);
    target.search = search;
    return NextResponse.redirect(target);
  }

  if (pathname === '/login') {
    const loginUrl = new URL('/admin/login', request.url);
    if (search) loginUrl.search = search;
    return NextResponse.redirect(loginUrl);
  }

  const isLegacyAdminPath = LEGACY_ADMIN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isLegacyAdminPath) {
    const target = new URL(`/admin${pathname}${search}`, request.url);
    return NextResponse.redirect(target);
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('admin_token')?.value;
  if (!token) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('from', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/admin') {
    return NextResponse.rewrite(new URL('/dashboard', request.url));
  }

  if (pathname.startsWith('/admin/')) {
    const internalPath = pathname.replace('/admin', '') || '/dashboard';
    return NextResponse.rewrite(new URL(`${internalPath}${search}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/v1|_next|favicon.ico|logo.png|logo-icon.png).*)'],
};
