import { Suspense } from "react";
import { BarChartIcon } from "@sanity/icons/BarChart";
import { Card, Container, Flex, Grid, Spinner, Stack, Text } from "@sanity/ui";
import { SanityApp } from "@sanity/sdk-react";
import type { Tool } from "sanity";

import { opsDashboardQuery } from "../lib/queries";
import { useOpsDashboardData } from "./useOpsDashboardData";

const SEVERITIES = ["SEV1", "SEV2", "SEV3", "SEV4"] as const;

function formatMttr(seconds: number | null): string {
  if (seconds === null) return "No resolved incidents yet";
  const hours = seconds / 3600;
  if (hours < 1) return `${Math.round(seconds / 60)} min`;
  return `${hours.toFixed(1)} hr`;
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card padding={4} radius={2} shadow={1}>
      <Stack gap={3}>
        <Text size={1} muted>
          {label}
        </Text>
        <Text size={4} weight="bold">
          {value}
        </Text>
      </Stack>
    </Card>
  );
}

function OpsDashboardContent() {
  const data = useOpsDashboardData(opsDashboardQuery);

  return (
    <Container width={2} padding={4}>
      <Stack gap={4}>
        <Text size={2} weight="semibold">
          Ops Dashboard
        </Text>
        <Text size={1} muted>
          Live cross-incident analytics, computed from every incident and
          escalationApproval document in this dataset — powered by the
          Sanity App SDK (@sanity/sdk-react).
        </Text>
        <Grid gridTemplateColumns={[1, 2, 3]} gap={3}>
          <StatTile
            label="Mean time to resolution"
            value={formatMttr(data.mttrSeconds)}
          />
          <StatTile
            label="Pending escalation approvals"
            value={data.pendingApprovalsCount}
          />
          {SEVERITIES.map((sev) => (
            <StatTile
              key={sev}
              label={`Open ${sev} incidents`}
              value={data.openBySeverity[sev] ?? 0}
            />
          ))}
        </Grid>
      </Stack>
    </Container>
  );
}

function LoadingFallback() {
  return (
    <Flex align="center" justify="center" padding={5}>
      <Spinner muted />
    </Flex>
  );
}

export function OpsDashboardTool() {
  return (
    <SanityApp fallback={<LoadingFallback />}>
      <Suspense fallback={<LoadingFallback />}>
        <OpsDashboardContent />
      </Suspense>
    </SanityApp>
  );
}

export const opsDashboardTool: Tool = {
  name: "ops-dashboard",
  title: "Ops Dashboard",
  icon: BarChartIcon,
  component: OpsDashboardTool,
};
