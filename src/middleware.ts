import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/app/:path*",
    "/account/:path*",
    "/login",
    "/demo/:path*",
    "/downloads/:path*",
  ],
};
