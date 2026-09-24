// The root layout (src/app/layout.tsx) already renders the <html>/<body>
// shell for every route, so this layout just passes children through —
// next-sanity's <NextStudio> (rendered in page.tsx) is a fixed-position,
// full-viewport component and doesn't need its own document shell.
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
