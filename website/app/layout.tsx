import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BlocApp - Software modern pentru asociații de proprietari",
  description: "Calcul întreținere automat, portal proprietari, plăți online.",
  keywords: ["software administrare bloc", "program asociatie proprietari", "calcul intretinere", "alternativa excel", "blocapp"],
  authors: [{ name: "BlocApp" }],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/blocapp-icon-admin.png', type: 'image/png' },
    ],
    apple: '/blocapp-icon-admin.png',
  },
  openGraph: {
    title: "BlocApp - Software modern pentru asociații de proprietari",
    description: "Calcul întreținere automat, portal proprietari, plăți online.",
    url: "https://blocapp.ro",
    siteName: "BlocApp",
    locale: "ro_RO",
    type: "website",
    images: [
      {
        url: "https://blocapp.ro/og-image.png",
        width: 1200,
        height: 630,
        alt: "BlocApp - Software modern pentru asociații de proprietari",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BlocApp - Software modern pentru asociații de proprietari",
    description: "Calcul întreținere automat, portal proprietari, plăți online.",
    images: ["https://blocapp.ro/og-image.png"],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  // TEMPORARY: noindex pentru perioada de testare - schimba la lansare!
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" className={`${inter.variable} ${montserrat.variable}`} style={{ colorScheme: 'light only' }}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
