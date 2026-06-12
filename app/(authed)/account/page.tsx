"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  changePassword,
  type ChangePasswordState,
} from "@/lib/account-actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Saving…" : "Change Password"}
    </button>
  );
}

export default function AccountPage() {
  const [state, formAction] = useFormState<ChangePasswordState, FormData>(
    changePassword,
    {}
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Account</h1>
      <div className="card max-w-md p-6">
        <h2 className="text-lg font-semibold">Change Password</h2>
        <form action={formAction} className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="currentPassword">
              Current password
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="newPassword">
              New password
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="confirmPassword">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              className="input"
            />
          </div>
          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
          {state.ok && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              ✓ Password updated.
            </p>
          )}
          <SubmitButton />
        </form>
      </div>
    </div>
  );
}
