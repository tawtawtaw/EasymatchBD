import { privatePageMetadata } from "@/lib/seo";

export const metadata = privatePageMetadata;

export default function PrivateSeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
