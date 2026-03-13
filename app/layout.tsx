import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "제약 데이터 Auto-QA",
  description: "월간 제약 데이터 정합성 AI 자동 검수 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
