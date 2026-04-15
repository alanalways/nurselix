import type { Metadata, Viewport } from "next";
import { ToastContainer } from "@/components/ui/Toast";
import { Providers } from "@/components/providers/Providers";
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
        {/* Restore persisted theme/fontSize before first paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=JSON.parse(localStorage.getItem('nurslix-theme')||'{}');var s=t.state||{};if(s.theme)document.documentElement.setAttribute('data-theme',s.theme);if(s.fontSize)document.documentElement.setAttribute('data-fontsize',s.fontSize);}catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
