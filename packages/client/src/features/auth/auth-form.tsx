import { Form, Link, useNavigation } from "react-router";

export const AuthForm = ({
  actionLabel,
  alternateHref,
  alternateLabel,
  error,
  fields
}: {
  actionLabel: string;
  alternateHref: string;
  alternateLabel: string;
  error?: string | null;
  fields: Array<{
    autoComplete: string;
    label: string;
    name: string;
    type?: "email" | "password" | "text";
  }>;
}) => {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <Form className="space-y-5" method="post">
      <div className="space-y-4">
        {fields.map((field) => (
          <label className="grid gap-2" key={field.name}>
            <span className="text-sm font-medium text-obsidian-300">{field.label}</span>
            <input
              autoComplete={field.autoComplete}
              className="input-field"
              name={field.name}
              required
              type={field.type ?? "text"}
            />
          </label>
        ))}
      </div>

      {error ? (
        <p className="rounded-[var(--radius-soft)] border border-risk-500/25 bg-risk-500/10 px-4 py-3 text-sm text-risk-500">
          {error}
        </p>
      ) : null}

      <label className="flex items-center gap-3 text-sm text-obsidian-400">
        <input className="size-4 rounded border border-white/10 bg-obsidian-900" name="rememberMe" type="checkbox" />
        <span>Keep me signed in on this device</span>
      </label>

      <button className="btn-primary w-full justify-center" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Working..." : actionLabel}
      </button>

      <p className="text-sm text-obsidian-500">
        <Link className="text-accent-300 hover:text-accent-200" to={alternateHref}>
          {alternateLabel}
        </Link>
      </p>
    </Form>
  );
};
