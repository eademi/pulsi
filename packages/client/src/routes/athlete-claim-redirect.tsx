import { redirect } from "react-router";

import { getAthleteSetupPath } from "../lib/session";

export const clientLoader = async ({ params }: { params: Record<string, string | undefined> }) => {
  const token = params.token;

  if (!token) {
    throw new Error("Athlete invite token is required.");
  }

  throw redirect(getAthleteSetupPath(token));
};

export default function AthleteClaimRedirectRoute() {
  return null;
}
