import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "赤道ETR - DeFi Platform",
  description: "下一代DeFi质押与复利平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased bg-black text-white">
        {children}
      </body>
    </html>
  );
}
