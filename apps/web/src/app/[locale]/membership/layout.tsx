import { generatePublicMetadata } from "@/lib/seo";

export const generateMetadata = generatePublicMetadata("/membership");

export default function MembershipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
