import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import { ThemeProvider } from "../lib/theme-context";
import { AiFloatingChat } from "../components/ai-assistant/ai-floating-chat";

export const metadata = {
  title: "Nhà Trọ Thông Minh — Hệ thống Quản lý",
  description: "Quản lý nhà trọ, phòng, khách thuê, điện nước và hóa đơn tự động",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <AiFloatingChat />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

