import { redirect } from "react-router";

import { apiClient } from "../lib/api";

export const clientLoader = async () => {
  const viewer = await apiClient.getAdminBootstrapOptional();

  throw redirect(viewer ? "/garmin" : "/sign-in");
};

export default function IndexRoute() {
  return null;
}
