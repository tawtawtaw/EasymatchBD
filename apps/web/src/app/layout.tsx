import type { Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="light" suppressHydrationWarning>
      <body
        className="bg-white text-zinc-950 antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
