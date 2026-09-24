import { useQuery } from "@sanity/sdk-react";

export type PendingApprovalRow = {
  _id: string;
  requestedSeverity: string;
  requiredApprovals: number;
  approvedCount: number;
  incident: { _id: string; title: string } | null;
};

export type OnCallLead = {
  _id: string;
  name: string;
};

type OpsDashboardData = {
  mttrSeconds: number | null;
  openBySeverity: {
    SEV1: number;
    SEV2: number;
    SEV3: number;
    SEV4: number;
  };
  pendingApprovalsCount: number;
  pendingApprovals: PendingApprovalRow[];
  onCallLeads: OnCallLead[];
};

export function useOpsDashboardData(query: string): OpsDashboardData {
  const { data } = useQuery<OpsDashboardData>({ query });

  return (
    data ?? {
      mttrSeconds: null,
      openBySeverity: { SEV1: 0, SEV2: 0, SEV3: 0, SEV4: 0 },
      pendingApprovalsCount: 0,
      pendingApprovals: [],
      onCallLeads: [],
    }
  );
}
