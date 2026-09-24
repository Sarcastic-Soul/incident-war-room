import { useQuery } from "@sanity/sdk-react";

type OpsDashboardData = {
  mttrSeconds: number | null;
  openBySeverity: {
    SEV1: number;
    SEV2: number;
    SEV3: number;
    SEV4: number;
  };
  pendingApprovalsCount: number;
};

export function useOpsDashboardData(query: string): OpsDashboardData {
  const { data } = useQuery<OpsDashboardData>({ query });

  return (
    data ?? {
      mttrSeconds: null,
      openBySeverity: { SEV1: 0, SEV2: 0, SEV3: 0, SEV4: 0 },
      pendingApprovalsCount: 0,
    }
  );
}
