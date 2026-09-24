"use client";

// This file must stay a Client Component and must be the ONLY place that
// imports "@/sanity.config" (and therefore "sanity"/"sanity/structure").
// Sanity's Studio UI has code paths (e.g. the scheduled-publish action)
// that import swr's default `useSWR` export, which doesn't exist under
// swr's "react-server" export condition. If sanity.config.ts is imported
// from a Server Component (e.g. directly in page.tsx), the bundler traces
// that whole import graph under the react-server condition and the build
// fails. Importing it only from here, behind "use client", keeps it out
// of the RSC graph entirely.
import { NextStudio } from "next-sanity/studio";

import config from "@/sanity.config";

export default function StudioClient() {
  return <NextStudio config={config} />;
}
