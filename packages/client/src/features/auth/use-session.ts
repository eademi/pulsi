import { useQuery } from "@tanstack/react-query";

import { apiClient } from "../../lib/api";

export const useSessionQuery = () =>
  useQuery({
    queryKey: ["session"],
    queryFn: () => apiClient.getSession()
  });
