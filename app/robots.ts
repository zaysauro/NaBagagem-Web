import type { MetadataRoute } from "next";
export default function robots():MetadataRoute.Robots{
 const base=process.env.NEXT_PUBLIC_SITE_URL||"https://nasbagagens.sistemakumo.com.br";
 return {rules:{userAgent:"*",allow:["/","/perfil/","/viagem/"],disallow:["/dashboard/","/api/","/favoritos","/feed"]},sitemap:base+"/sitemap.xml"};
}