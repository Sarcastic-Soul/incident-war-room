import type { Metadata, Viewport } from "next";

import StudioClient from "./StudioClient";

// Defined inline (rather than `export {metadata, viewport} from "next-sanity/studio"`)
// so this Server Component's module graph never imports "sanity" itself —
// that import chain has to stay behind the "use client" boundary in
// StudioClient.tsx, see the comment there.
export const metadata: Metadata = {
  referrer: "same-origin",
  robots: "noindex",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function StudioPage() {
  return <StudioClient />;
}
