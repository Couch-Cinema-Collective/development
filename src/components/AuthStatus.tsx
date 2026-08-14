import Link from "next/link";

import { signOut } from "@/app/(auth)/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/** Header slot: "Sign In" when logged out, name + sign-out when logged in. */
export async function AuthStatus() {
  // Until .env.local has Supabase credentials, hide auth from the header
  // entirely rather than crash every page.
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="label-eyebrow border border-ink px-3 py-1.5 text-ink transition-colors hover:bg-ink hover:text-paper"
      >
        Sign In
      </Link>
    );
  }

  const name =
    (user.user_metadata.full_name as string | undefined) ??
    (user.user_metadata.name as string | undefined) ??
    user.email;

  return (
    <div className="flex items-center gap-4">
      <span className="label-eyebrow text-ink">{name}</span>
      <form action={signOut}>
        <button
          type="submit"
          className="label-eyebrow transition-colors hover:text-signal"
        >
          Sign Out
        </button>
      </form>
    </div>
  );
}
