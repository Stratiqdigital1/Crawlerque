import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-data",
});

export const metadata: Metadata = {
  title: "Crawler Que — AI Website Growth Intelligence",
  description:
    "Run modular SEO, AI visibility, traffic, and competitor audits. Export white-label PDF growth plans your clients actually read.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--cq-ink)] font-[var(--font-inter)] text-[var(--cq-text)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}