import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJWT } from './lib/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect dashboard and secure API routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/admin') || pathname.startsWith('/api/owner')) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'غير مصرح للوصول – الرجاء تسجيل الدخول' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'الجلسة منتهية الصلاحية – الرجاء تسجيل الدخول' }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_token');
      return response;
    }

    // Role-based Access Control (RBAC) validation
    if (pathname.startsWith('/api/admin')) {
      if (payload.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'صلاحيات غير كافية للأدمن العام' }, { status: 403 });
      }
    }

    if (pathname.startsWith('/api/owner')) {
      if (payload.role !== 'OWNER' && payload.role !== 'EMPLOYEE') {
        return NextResponse.json({ error: 'صلاحيات غير كافية لمالك أو موظف' }, { status: 403 });
      }
    }
  }

  // Redirect root '/' to '/dashboard'
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/admin/:path*', '/api/owner/:path*', '/'],
};
