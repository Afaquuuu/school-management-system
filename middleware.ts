import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth is handled client-side via AuthGuard + localStorage session.
// Avoid Clerk middleware here — it was blocking pages without a Clerk login.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
