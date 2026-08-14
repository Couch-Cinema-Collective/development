import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/** Next 16 renamed middleware.ts → proxy.ts; same contract otherwise. */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static assets so auth logic never blocks CSS/JS/images.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
