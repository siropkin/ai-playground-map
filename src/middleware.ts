import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Check if this is an API request
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Allow OG image endpoints to be accessible from outside
    if (request.nextUrl.pathname.startsWith('/api/og/')) {
      // Skip the header check for OG endpoints
    }
    // For all other API routes, check for the custom header
    else {
      const appOrigin = request.headers.get('x-app-origin');
      
      // If the header is missing or incorrect, block the request
      if (!appOrigin || appOrigin !== 'internal') {
        return NextResponse.json(
          { error: 'Unauthorized: API can only be called from the app' },
          { status: 403 }
        );
      }
    }
  }
  
  // Continue with session handling
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
