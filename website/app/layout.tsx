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
  title: "BlocApp - Aplicație software pentru administrarea asociațiilor de proprietari",
  description: "Calcul întreținere, portal locatari, plată întreținere online.",
  keywords: ["software administrare bloc", "program asociatie proprietari", "calcul intretinere", "alternativa excel", "blocapp"],
  authors: [{ name: "BlocApp" }],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/favicon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: "BlocApp - Aplicație software pentru administrarea asociațiilor de proprietari",
    description: "Calcul întreținere, portal locatari, plată întreținere online.",
    url: "https://blocapp.ro",
    siteName: "BlocApp",
    locale: "ro_RO",
    type: "website",
    images: [
      {
        url: "https://blocapp.ro/og-image.png",
        width: 1200,
        height: 630,
        alt: "BlocApp - Aplicație software pentru administrarea asociațiilor de proprietari",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BlocApp - Aplicație software pentru administrarea asociațiilor de proprietari",
    description: "Calcul întreținere, portal locatari, plată întreținere online.",
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
