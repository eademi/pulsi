import { redirect } from "react-router";

import { apiClient } from "../lib/api";
import { getDefaultAppPath } from "../lib/session";

export const clientLoader = async () => {
  const session = await apiClient.getSessionOptional();

  if (!session) {
    throw redirect("/auth/sign-in");
  }

  throw redirect(getDefaultAppPath(session));
};

export default function IndexRoute() {
  return null;
}
