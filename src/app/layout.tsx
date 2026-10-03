import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";

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
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Josefin+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
