import { redirect, useActionData } from "react-router";

import { AuthShell } from "../components/auth-shell";
import { AuthForm } from "../features/auth/auth-form";
import { apiClient } from "../lib/api";
import { getDefaultAppPath } from "../lib/session";

export const clientAction = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rememberMe = formData.get("rememberMe") === "on";

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    await apiClient.signInEmail({
      email,
      password,
      rememberMe
    });
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to sign in."
    };
  }

  const session = await apiClient.getSession();
  const next = new URL(request.url).searchParams.get("next");

  throw redirect(next || getDefaultAppPath(session));
};

export default function SignInRoute() {
  const actionData = useActionData() as { error?: string } | undefined;

  return (
    <AuthShell
      description="Sign in to review squad readiness, Garmin connections, and club-specific athlete data."
      title="Sign in to your club workspace"
    >
      <AuthForm
        actionLabel="Sign in"
        alternateHref="/auth/register"
        alternateLabel="Need an account? Create one."
        error={actionData?.error ?? null}
        fields={[
          { autoComplete: "email", label: "Work email", name: "email", type: "email" },
          { autoComplete: "current-password", label: "Password", name: "password", type: "password" }
        ]}
      />
    </AuthShell>
  );
}
