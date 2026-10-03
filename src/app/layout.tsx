import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";

export const metadata = {
  title: "Hệ thống Quản lý Nhà trọ Thông minh",
  description: "Quản lý nhà trọ, phòng, khách thuê, điện nước và hóa đơn",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
