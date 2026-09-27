import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const base=process.env.NEXT_PUBLIC_SITE_URL||"https://nabagagemweb.vercel.app";
 const supabase=await createClient();
 const [{data:profiles},{data:trips}]=await Promise.all([
  supabase.from("profiles").select("username,updated_at").not("username","is",null),
  supabase.from("trips").select("id,updated_at").eq("is_public",true)
 ]);
 return [
  {url:base,lastModified:new Date(),changeFrequency:"weekly",priority:1},
  {url:base+"/descoberta",lastModified:new Date(),changeFrequency:"daily",priority:.8},
  ...(profiles||[]).map(p=>({url:base+"/perfil/"+p.username,lastModified:p.updated_at?new Date(p.updated_at):new Date(),changeFrequency:"weekly" as const,priority:.7})),
  ...(trips||[]).map(t=>({url:base+"/viagem/"+t.id,lastModified:t.updated_at?new Date(t.updated_at):new Date(),changeFrequency:"weekly" as const,priority:.6}))
 ];
}