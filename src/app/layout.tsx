import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Quản lý nhà trọ | Tổng quan",
  description: "Tổng quan nhà trọ và tình trạng phòng.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
