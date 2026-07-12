import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // Only enforce Basic Auth in production to keep local development frictionless
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  // If no password is set in the environment, fallback to allowing access
  // (You must add BASIC_AUTH_PASSWORD to your Vercel/production environment variables)
  const requiredPassword = process.env.BASIC_AUTH_PASSWORD;
  if (!requiredPassword) {
    return NextResponse.next();
  }

  const basicAuth = req.headers.get('authorization');
  
  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    // We only care about the password matching, username can be anything
    if (pwd === requiredPassword) {
      return NextResponse.next();
    }
  }

  // Trigger the browser's native password prompt
  return new NextResponse('Auth required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Pulse Secure Dashboard"'
    }
  });
}

// Protect all routes (both frontend pages and backend /api routes)
export const config = {
  matcher: '/:path*',
};
