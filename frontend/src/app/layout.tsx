import { Inter } from "next/font/google";
import { SessionWrapper } from "@/components/SessionWrapper";
import { Metadata } from "next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MDMEDIA Strategic Proposal Management System",
  description:
    "Fullstack proposal management system with role-based access control",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}
