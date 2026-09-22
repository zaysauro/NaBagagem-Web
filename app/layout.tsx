import "./globals.css";
import type { Metadata } from "next";

export const metadata:Metadata={title:"NaBagagem",description:"Sua plataforma para organizar e compartilhar viagens.",manifest:"/manifest.webmanifest",themeColor:"#111827",icons:{icon:"/icon.svg",apple:"/icon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="pt-BR"><body>{children}<script dangerouslySetInnerHTML={{__html:`try{if(localStorage.getItem("nabagagem:theme")==="dark"){document.documentElement.classList.add("dark")}}catch{};if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}))}`}} /></body></html>
}