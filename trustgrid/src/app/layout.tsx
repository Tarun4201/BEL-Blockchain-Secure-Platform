import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "BEL TrustGrid — Blockchain Identity & Access Platform",
  description:
    "BEL TrustGrid is a blockchain-based secure platform for decentralized identity (DID), smart-contract access control, and NFT-based digital asset management. SIH 2026 prototype.",
  keywords: [
    "blockchain",
    "identity",
    "DID",
    "access control",
    "NFT",
    "BEL",
    "SIH 2026",
    "cybersecurity",
  ],
  authors: [{ name: "BEL TrustGrid Team" }],
  robots: { index: false, follow: false }, // Prototype — do not index
  openGraph: {
    title: "BEL TrustGrid",
    description: "Blockchain-based secure identity & access platform",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* Skip to main content — GIGW / WCAG 2.1 AA */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              fontFamily: "var(--font-inter)",
              borderRadius: "12px",
            },
          }}
        />
      </body>
    </html>
  );
}
