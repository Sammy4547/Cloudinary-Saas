import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
    "/sign-in",
    "/sign-up",
    "/",
    "/home"
])
const isPublicApiRoute = createRouteMatcher([
    "/api/videos"
])


export default clerkMiddleware((auth, req) => {
    const {userId} = auth();
    const currentUrl = new URL(req.url)
     const isAccessingDashboard = currentUrl.pathname === "/home"
     const isApiRequest = currentUrl.pathname.startsWith("/api")

     // If user is logged in and accessing a public route but not the dashboard
    if(userId && isPublicRoute(req) && !isAccessingDashboard) {
        return NextResponse.redirect(new URL("/home", req.url))
    }
    //not logged in
    if(!userId){
        // If user is not logged in and trying to access a protected route
        if(!isPublicRoute(req) && !isPublicApiRoute(req) ){
            return NextResponse.redirect(new URL("/sign-in", req.url))
        }

        // If the request is for a protected API and the user is not logged in
        if(isApiRequest && !isPublicApiRoute(req)){
            return NextResponse.redirect(new URL("/sign-in", req.url))
        }
    }
    return NextResponse.next()

})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

/*

Summary:
The middleware checks if the user is logged in or not.
If logged in, it redirects the user away from public routes (e.g., sign-in) to the dashboard (/home).

If not logged in, it redirects the user to sign in when they try to access protected routes or APIs.

This ensures proper access control and user flow, preventing non-logged-in users from accessing restricted areas and avoiding unnecessary access to sign-in routes when already authenticated.
*/