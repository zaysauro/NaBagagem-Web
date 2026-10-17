import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/neon/auth";
import { transaction } from "@/lib/neon/db";
import { MAX_IMPORT_BYTES, parseTripImport, persistTripImport } from "@/lib/trip-import";

export async function POST(request:Request) {
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
 let input;
 try {
  const form=await request.formData();
  const file=form.get("file");
  if(!(file instanceof File))throw new Error("Envie um arquivo GPX, KML, CSV ou JSON.");
  if(file.size>MAX_IMPORT_BYTES)throw new Error("Arquivo muito grande.");
  input=parseTripImport(await file.text(),file.name,String(form.get("title")||""));
 } catch(error) {return NextResponse.json({error:error instanceof Error?error.message:"Arquivo inválido."},{status:400});}
 try {
  const trip=await transaction(client=>persistTripImport(client,user.id,input));
  return NextResponse.json({trip,imported:{locations:input.locations.length,events:input.events.length,expenses:input.expenses.length,checklist:input.checklist.length}},{status:201});
 } catch {return NextResponse.json({error:"Não foi possível importar a viagem. Nenhum registro foi salvo."},{status:400});}
}
