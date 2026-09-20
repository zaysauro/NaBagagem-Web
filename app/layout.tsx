import "./globals.css";
import type { Metadata } from "next";

export const metadata:Metadata={title:"NaBagagem",description:"Sua plataforma para organizar e compartilhar viagens."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}