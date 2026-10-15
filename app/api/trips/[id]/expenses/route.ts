import { expenseInput } from "@/lib/expense-validation";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function context(id:string){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return{supabase,user:null,trip:null,canEdit:false};
 const {data:trip}=await supabase.from("trips").select("id,user_id").eq("id",id).maybeSingle();
 if(!trip)return{supabase,user,trip:null,canEdit:false};
 const {data:member}=await supabase.from("trip_members").select("role").eq("trip_id",id).eq("user_id",user.id).maybeSingle();
 return{supabase,user,trip,canEdit:trip.user_id===user.id||member?.role==="editor"};
}
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params;const{supabase,user,trip}=await context(id);if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});if(!trip)return NextResponse.json({error:"Viagem não encontrada."},{status:404});const{data,error}=await supabase.from("trip_expenses").select("*").eq("trip_id",id).order("expense_date",{ascending:false}).order("created_at",{ascending:false});if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({expenses:data||[]});}
async function saveExpense(request: Request, params: Promise<{id:string}>, editing: boolean) {
 const {id}=await params;
 const {supabase,user,trip,canEdit}=await context(id);
 if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
 if(!trip)return NextResponse.json({error:"Viagem não encontrada."},{status:404});
 if(!canEdit)return NextResponse.json({error:"Você não tem permissão para editar esta viagem."},{status:403});
 let body, values;
 try { body=await request.json(); values=expenseInput(body); }
 catch(error) { return NextResponse.json({error:error instanceof Error ? error.message : "Despesa inválida."},{status:400}); }
 if(editing && (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id))) return NextResponse.json({error:"Despesa inválida."},{status:400});
 const statement=editing
  ? supabase.from("trip_expenses").update(values).eq("id",body.id).eq("trip_id",id)
  : supabase.from("trip_expenses").insert({...values,trip_id:id});
 const {data,error}=await statement.select().maybeSingle();
 if(error)return NextResponse.json({error:"Não foi possível salvar a despesa."},{status:400});
 if(!data)return NextResponse.json({error:"Despesa não encontrada."},{status:404});
 return NextResponse.json({expense:data},{status:editing?200:201});
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {return saveExpense(request,params,false);}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}) {return saveExpense(request,params,true);}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){const{id}=await params;const{supabase,user,trip,canEdit}=await context(id);if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});if(!trip)return NextResponse.json({error:"Viagem não encontrada."},{status:404});if(!canEdit)return NextResponse.json({error:"Você não tem permissão para editar esta viagem."},{status:403});const expenseId=new URL(request.url).searchParams.get("expenseId");if(!expenseId)return NextResponse.json({error:"Despesa inválida."},{status:400});const{error}=await supabase.from("trip_expenses").delete().eq("id",expenseId).eq("trip_id",id);if(error)return NextResponse.json({error:error.message},{status:400});return NextResponse.json({ok:true});}
