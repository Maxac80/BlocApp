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
  title: "BlocApp - Software Administrare Bloc | Calculare Întreținere Automată",
  description: "Administrează blocul fără Excel. Calculează întreținerea automat, elimină erorile, economisește 70% timp. Trial gratuit 90 zile. Portal proprietari inclus.",
  keywords: ["software administrare bloc", "program asociatie proprietari", "calcul intretinere", "alternativa excel", "blocapp"],
  authors: [{ name: "BlocApp" }],
  icons: {
    icon: '/blocapp-icon-admin.png',
    apple: '/blocapp-icon-admin.png',
  },
  openGraph: {
    title: "BlocApp - Administrează blocul fără Excel",
    description: "Calculare automată întreținere, zero erori, portal proprietari. Trial 90 zile gratuit.",
    url: "https://blocapp.ro",
    siteName: "BlocApp",
    locale: "ro_RO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BlocApp - Software Administrare Bloc",
    description: "Calculare automată întreținere, zero erori. Trial 90 zile gratuit.",
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
    <html lang="ro" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
