import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Cormorant } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const cormorant = Cormorant({
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Deepfake Detector | Professional AI Content Analysis",
  description: "Advanced deepfake detection technology for images and videos. Built with precision and trust for a safer digital world.",
  keywords: ["deepfake", "AI detection", "image analysis", "video analysis", "misinformation", "trust"],
  authors: [{ name: "Fahada Alathel" }],
  verification: {
    google: "TiyqpN9lQoZ07dm8cWQEwCsRQ8a2k10L-DCct9HPIHg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.variable} ${playfair.variable} ${cormorant.variable} font-sans antialiased bg-cream-50 text-luxury-900`}
      >
        {children}
      </body>
    </html>
  );
}
