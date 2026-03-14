import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "SHOT",
  description: "사람과 AI가 함께 플레이하는 보드게임 플랫폼",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#ef4444",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          backgroundColor: "#0a0a0a",
          color: "#ededed",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
