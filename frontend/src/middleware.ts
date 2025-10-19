import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const pathname = req.nextUrl.pathname

    // Allow access to auth routes
    if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
      return NextResponse.next()
    }

    // Redirect to login if no token
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Role-based route protection
    const protectedRoutes = {
      '/dashboard/admin': ['ADMIN'],
      '/dashboard/settings': ['ADMIN'],
      '/dashboard/analytics': ['ADMIN', 'SALES_MANAGER', 'BS_MANAGER'],
      '/dashboard/team': ['ADMIN', 'SALES_MANAGER', 'BS_MANAGER', 'PROJECT_MANAGER'],
    }

    // Check if current path requires specific role
    for (const [route, allowedRoles] of Object.entries(protectedRoutes)) {
      if (pathname.startsWith(route)) {
        if (!allowedRoles.includes(token.role as string)) {
          // Redirect to dashboard with access denied message
          const url = new URL('/dashboard', req.url)
          url.searchParams.set('error', 'access_denied')
          return NextResponse.redirect(url)
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // If accessing auth routes, allow
        if (req.nextUrl.pathname.startsWith('/login') ||
            req.nextUrl.pathname.startsWith('/api/auth')) {
          return true
        }

        // Otherwise, require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
