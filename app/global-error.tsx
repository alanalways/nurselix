"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-TW" data-theme="dark">
      <body style={{ margin: 0, background: "#0D1525", color: "#EDF0F7", fontFamily: "sans-serif" }}>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: 24,
          textAlign: "center",
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "linear-gradient(135deg,#C9A84C,#E8C66A)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 700, color: "#080E1A",
          }}>N</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>哎呀，出了點狀況</h2>
          <p style={{ margin: 0, color: "#8A9BB5", fontSize: 14, maxWidth: 400 }}>
            我們已自動收到錯誤報告，正在處理中。你可以嘗試重新整理頁面，或稍後再回來。
          </p>
          {error.digest && (
            <p style={{ margin: 0, color: "#4A5A70", fontSize: 11, fontFamily: "monospace" }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: "10px 24px", borderRadius: 8,
              background: "#C9A84C", color: "#080E1A",
              border: "none", cursor: "pointer",
              fontWeight: 600, fontSize: 14,
            }}
          >
            重試
          </button>
        </div>
      </body>
    </html>
  );
}
