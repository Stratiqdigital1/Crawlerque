import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";

const GTM_ID = "GTM-PSM7G7S4"; 

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
  title: "Crawler Que — AI Website Growth Intelligence & SEO Audit Tool",
  description:
    "Run modular SEO, AI visibility, traffic & competitor audits in minutes. White-label PDF reports. Plans from $30/mo with a 7-day free trial. Free audit, no signup.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Crawler Que — AI Website Growth Intelligence & SEO Audit Tool",
    description:
      "Modular SEO, AI visibility, traffic & competitor audits with white-label PDF reports. Free audit, no signup.",
    images: ["/logo-full.png"],
  },
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
      <head>
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${GTM_ID}');
            `,
          }}
        />
        <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Crawler Que",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: "AI-powered SEO and website audit tool with AI search visibility, traffic, competitor, and backlink analysis plus white-label PDF reports.",
      offers: {
        "@type": "AggregateOffer",
        lowPrice: "30",
        highPrice: "299",
        priceCurrency: "USD",
        offerCount: "3",
      },
      publisher: {
        "@type": "Organization",
        name: "Strat IQ Digital",
        url: "https://stratiqdigital.com",
      },
    }),
  }}
/>
      </head>
      <body className="min-h-full bg-[var(--cq-ink)] font-[var(--font-inter)] text-[var(--cq-text)]">
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}