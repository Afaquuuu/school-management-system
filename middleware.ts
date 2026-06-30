import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getRoleFromClaims, type UserRole } from "@/lib/auth";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/students(.*)",
  "/staff(.*)",
  "/attendance(.*)",
  "/academics(.*)",
  "/analytics(.*)",
  "/finance(.*)",
  "/communication(.*)",
  "/admin(.*)",
  "/api(.*)",
]);

const accessRules: Array<{ matcher: ReturnType<typeof createRouteMatcher>; allowedRoles: UserRole[] }> = [
  { matcher: createRouteMatcher(["/admin(.*)"]), allowedRoles: ["admin", "teacher", "student", "parent"] },
  { matcher: createRouteMatcher(["/staff(.*)"]), allowedRoles: ["admin"] },
  { matcher: createRouteMatcher(["/attendance(.*)", "/academics(.*)"]), allowedRoles: ["admin", "teacher", "student", "parent"] },
  { matcher: createRouteMatcher(["/analytics(.*)"]), allowedRoles: ["admin", "teacher", "student", "parent"] },
  { matcher: createRouteMatcher(["/finance(.*)"]), allowedRoles: ["admin", "teacher", "student", "parent"] },
  { matcher: createRouteMatcher(["/students(.*)", "/communication(.*)", "/dashboard(.*)"]), allowedRoles: ["admin", "teacher", "student", "parent"] },
];

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  if (isProtectedRoute(request)) {
    await auth.protect();
  }

  const { sessionClaims } = await auth();
  const role = getRoleFromClaims(sessionClaims);

  const blockedRule = accessRules.find((rule) => rule.matcher(request) && !rule.allowedRoles.includes(role));
  if (blockedRule) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};