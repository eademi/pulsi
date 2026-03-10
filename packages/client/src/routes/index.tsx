import { redirect } from "react-router";

import { apiClient } from "../lib/api";
import { getDefaultAppPath } from "../lib/session";

export const clientLoader = async () => {
  const session = await apiClient.getSessionOptional();

  throw redirect(session ? getDefaultAppPath(session) : "/auth/sign-in");
};

export default function IndexRoute() {
  return null;
}
