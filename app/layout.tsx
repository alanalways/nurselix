import type { Metadata, Viewport } from "next";
import { ToastContainer } from "@/components/ui/Toast";
import { Providers } from "@/components/providers/Providers";
import JournalFX from "@/components/providers/JournalFX";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nurslix Journal — NCLEX 備考讀本",
  description: "為台灣護理師而造。每一題,經過編輯審校、雙語註記、臨床差異對照。慢而確切的 NCLEX-RN 練習。",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Nurslix Journal" },
};

export const viewport: Viewport = {
  themeColor: "#f3efe4",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW" data-journal-theme="spring" data-fontsize="medium">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Journal typography stack:
            · Instrument Serif — editorial display
            · Noto Serif TC    — Chinese body
            · JetBrains Mono   — labels & running heads
            · Caveat           — handwritten margin notes                         */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Noto+Serif+TC:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Caveat:wght@400;500;600&display=swap"
        />
        {/* Restore persisted theme + font size BEFORE first paint to prevent a
            flash of the default palette when users have chosen another preset. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{
              var p=localStorage.getItem('nj.theme.preset');
              if(p && p!=='custom') document.documentElement.setAttribute('data-journal-theme', p);
              var fs=localStorage.getItem('nj.fontsize');
              if(fs) document.documentElement.setAttribute('data-fontsize', fs);
              var raw=localStorage.getItem('nj.theme');
              if(raw){
                var t=JSON.parse(raw);
                var r=document.documentElement;
                Object.keys(t||{}).forEach(function(k){ r.style.setProperty('--j-'+k.replace(/([A-Z])/g,'-$1').toLowerCase(), t[k]); });
              }
              // legacy migration: old "nurslix-theme" store stored dark|light — map dark→night
              var legacy=localStorage.getItem('nurslix-theme');
              if(legacy && !p){
                try{ var ls=JSON.parse(legacy).state||{}; if(ls.theme==='dark') document.documentElement.setAttribute('data-journal-theme','night'); if(ls.fontSize) document.documentElement.setAttribute('data-fontsize', ls.fontSize); }catch(e){}
              }
            }catch(e){}`,
          }}
        />
      </head>
      <body className="antialiased">
        <Providers>
          <JournalFX />
          {children}
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
