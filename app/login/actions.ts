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
      email: String(formData.get("email") ?? "").toLowerCase().trim(),
      password: String(formData.get("password") ?? ""),
      redirectTo: callbackUrl,
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    // signIn throws a redirect on success — re-throw so Next can handle it.
    throw error;
  }
}
