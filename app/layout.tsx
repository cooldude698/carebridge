import type { Metadata } from "next";
import { fontDisplay, fontBody, fontData } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareBridge — Clinical Telemetry & Closed-Loop Care Platform",
  description:
    "CareBridge turns wearable health data into explainable, risk-ranked clinical decisions for doctors, patients, and guardians across India.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontData.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
