import { generatePublicMetadata } from "@/lib/seo";

export const generateMetadata = generatePublicMetadata("/terms");

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
