import { redirect, useActionData } from "react-router";

import { AuthShell } from "../components/auth-shell";
import { AuthForm } from "../features/auth/auth-form";
import { apiClient } from "../lib/api";
import { getDefaultAppPath } from "../lib/session";

export const clientAction = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const rememberMe = formData.get("rememberMe") === "on";

  if (!name || !email || !password) {
    return { error: "Name, email, and password are required." };
  }

  try {
    await apiClient.signUpEmail({
      name,
      email,
      password,
      rememberMe
    });

    const session = await apiClient.getSession();
    const next = new URL(request.url).searchParams.get("next");

    throw redirect(next || getDefaultAppPath(session));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create your account."
    };
  }
};

export default function RegisterRoute() {
  const actionData = useActionData() as { error?: string } | undefined;

  return (
    <AuthShell
      description="Create a local Pulsi account for internal staff access. Tenant access is still controlled by memberships."
      title="Create your Pulsi account"
    >
      <AuthForm
        actionLabel="Create account"
        alternateHref="/auth/sign-in"
        alternateLabel="Already have an account? Sign in."
        error={actionData?.error ?? null}
        fields={[
          { autoComplete: "name", label: "Full name", name: "name", type: "text" },
          { autoComplete: "email", label: "Work email", name: "email", type: "email" },
          { autoComplete: "new-password", label: "Password", name: "password", type: "password" }
        ]}
      />
    </AuthShell>
  );
}
