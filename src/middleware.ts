import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host =
    request.headers.get('x-forwarded-host') ||
    request.headers.get('host') ||
    request.nextUrl.hostname ||
    '';
  const { pathname } = request.nextUrl;

  // Check if incoming request is routed through the dedicated HOD Admin domain
  const isAdminDomain =
    host.includes('aimlhodadmin') ||
    host.includes('hodadmin') ||
    host.startsWith('admin.');

  if (isAdminDomain) {
    // When visiting the root domain on aimlhodadmin, serve the Faculty & HOD login directly
    if (pathname === '/') {
      return NextResponse.rewrite(new URL('/faculty', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - static assets (.png, .ico, .svg, .jpg)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp)$).*)',
  ],
};
