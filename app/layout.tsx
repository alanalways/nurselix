import type { Metadata, Viewport } from "next";
import { ToastContainer } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nurslix — NCLEX 英語練習平台",
  description: "台灣護理師備考 NCLEX-RN 英語練習平台，智能自適應測驗，精準找出你的弱點",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Nurslix" },
};

export const viewport: Viewport = {
  themeColor: "#C9A84C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" data-theme="dark" data-fontsize="medium">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased">
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
