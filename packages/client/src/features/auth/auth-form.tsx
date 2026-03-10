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
    <Form className="auth-form" method="post">
      <div className="auth-form-grid">
        {fields.map((field) => (
          <label key={field.name} className="auth-field">
            <span>{field.label}</span>
            <input
              autoComplete={field.autoComplete}
              className="auth-input"
              name={field.name}
              required
              type={field.type ?? "text"}
            />
          </label>
        ))}
      </div>

      {error ? <p className="auth-error">{error}</p> : null}

      <label className="remember-choice">
        <input className="remember-checkbox" name="rememberMe" type="checkbox" />
        <span>Keep me signed in on this device</span>
      </label>

      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Working..." : actionLabel}
      </button>

      <p className="auth-footnote">
        <Link to={alternateHref}>{alternateLabel}</Link>
      </p>
    </Form>
  );
};
