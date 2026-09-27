import "./globals.css";
import type { Metadata } from "next";
import PwaInstall from "@/app/components/pwa-install";

export const metadata:Metadata={metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||"https://nabagagemweb.vercel.app"),title:{default:"NaBagagem — planeje, viva, guarde",template:"%s | NaBagagem"},description:"Planeje roteiros, organize destinos, guarde memórias e descubra viagens de outros viajantes.",manifest:"/manifest.webmanifest",themeColor:"#171717",icons:{icon:"/icon.svg",apple:"/icon.svg"},openGraph:{type:"website",siteName:"NaBagagem",title:"NaBagagem — planeje, viva, guarde",description:"Uma plataforma para planejar e guardar suas viagens."},twitter:{card:"summary_large_image",title:"NaBagagem",description:"Planeje, viva e guarde suas viagens."}};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="pt-BR"><body>{children}<PwaInstall /><script dangerouslySetInnerHTML={{__html:`try{if(localStorage.getItem("nabagagem:theme")==="dark"){document.documentElement.classList.add("dark")}}catch{};if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}))}`}} /></body></html>
}