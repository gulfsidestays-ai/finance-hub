import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance Hub",
  description: "Personal finance CRM — accounts, budgets, bills, and credit card recommendations in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
