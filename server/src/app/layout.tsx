import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Certificate Authority - CA Management System",
  description: "X.509 Certificate Authority Management System for issuing, managing, and revoking digital certificates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-theme="light">
      <body className="min-h-screen bg-base-200">
        {children}
      </body>
    </html>
  );
}
