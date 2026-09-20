import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NaBagagem",
  description: "Suas viagens, memórias e lugares em um só lugar."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
