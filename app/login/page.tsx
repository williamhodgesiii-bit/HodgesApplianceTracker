"use client";

import { Suspense, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { authenticate, type LoginState } from "./actions";

export const dynamic = "force-dynamic";

function SubmitButton({ redirecting }: { redirecting: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-primary w-full"
      disabled={pending || redirecting}
    >
      {pending || redirecting ? "Signing in…" : "Sign in"}
    </button>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [state, formAction] = useFormState<LoginState, FormData>(
    authenticate,
    {}
  );

  // On a successful sign-in the cookie is already set; do a full-page
  // navigation so the browser sends it and the middleware sees the session.
  useEffect(() => {
    if (state.ok && state.callbackUrl) {
      window.location.assign(state.callbackUrl);
    }
  }, [state.ok, state.callbackUrl]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <SubmitButton redirecting={!!state.ok} />
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Appliance Tracker</h1>
          <p className="mt-1 text-slate-500">Sign in to continue</p>
        </div>
        <Suspense fallback={<p className="text-center text-slate-400">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
