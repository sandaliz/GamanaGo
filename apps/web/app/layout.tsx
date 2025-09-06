import React from "react";
import "./globals.css";


export const metadata = {
  title: "SLAIC Transit",
  description: "AI-driven multi-modal companion for Sri Lanka",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
