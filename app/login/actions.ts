"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export interface LoginState {
  error?: string;
  ok?: boolean;
  callbackUrl?: string;
}

/** Only allow internal redirect targets to avoid open-redirect issues. */
function safeCallbackUrl(raw: string): string {
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

export async function authenticate(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const callbackUrl = safeCallbackUrl(
    (formData.get("callbackUrl") as string) || "/"
  );
  try {
    // redirect:false sets the session cookie but does NOT issue a server-side
    // redirect. Redirecting here would pass straight through the auth
    // middleware before the freshly-set cookie is readable, which bounces the
    // user back to /login on their first attempt. We let the client navigate
    // instead (see login/page.tsx) so the cookie is always sent.
    await signIn("credentials", {
      username: String(formData.get("username") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      redirect: false,
    });
    return { ok: true, callbackUrl };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid username or password." };
    }
    throw error;
  }
}
