"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

export interface LoginState {
  error?: string;
}

export async function authenticate(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";
  try {
    await signIn("credentials", {
      username: String(formData.get("username") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      redirectTo: callbackUrl,
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid username or password." };
    }
    // signIn throws a redirect on success — re-throw so Next can handle it.
    throw error;
  }
}
