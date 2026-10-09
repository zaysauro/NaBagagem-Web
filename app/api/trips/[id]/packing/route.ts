import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/neon/auth";
import { query, transaction } from "@/lib/neon/db";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
 if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
 try {
  const { id } = await params;
  const [lists, items] = await Promise.all([query("select * from packing_lists where trip_id=$1 order by created_at", [id]), query("select i.* from packing_items i join packing_lists l on l.id=i.list_id where l.trip_id=$1 order by i.created_at", [id])]);
  return NextResponse.json({ lists: lists.rows.map(list => ({ ...list, items: items.rows.filter(item => item.list_id === list.id) })) });
 } catch { return NextResponse.json({ error: "Não foi possível carregar a bagagem." }, { status: 500 }); }
}
export async function POST(request: Request, { params }: Context) {
 if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
 try {
  const { id } = await params; const body = await request.json(); const name = String(body.name || "").trim();
  if (!name || name.length > 120) return NextResponse.json({ error: "Informe um nome de até 120 caracteres." }, { status: 400 });
  const result = await transaction(async client => {
   if (body.list_id) {
    const lists = await client.query("select id from packing_lists where id=$1 and trip_id=$2", [body.list_id,id]);
    if (!lists.rows[0]) throw new Error("List unavailable");
    const quantity = Number(body.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw new Error("Invalid quantity");
    return client.query("insert into packing_items(list_id,name,quantity,category,notes) values($1,$2,$3,$4,$5) returning *", [body.list_id,name,quantity,String(body.category || "").slice(0,80),String(body.notes || "").slice(0,1000)]);
   }
   const created = await client.query("insert into packing_lists(trip_id,name) values($1,$2) returning *", [id,name]);
   if (body.duplicate_id) await client.query("insert into packing_items(list_id,name,quantity,category,notes) select $1,i.name,i.quantity,i.category,i.notes from packing_items i join packing_lists l on l.id=i.list_id where l.id=$2 and l.trip_id=$3", [created.rows[0].id,body.duplicate_id,id]);
   return created;
  });
  return NextResponse.json({ item: result.rows[0] }, { status: 201 });
 } catch { return NextResponse.json({ error: "Não foi possível salvar a bagagem. Verifique os dados e suas permissões." }, { status: 400 }); }
}
export async function PATCH(request: Request, { params }: Context) {
 if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
 try {
  const { id } = await params; const body = await request.json();
  if (!["pending","prepared","packed"].includes(body.status)) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  const result = await query("update packing_items set status=$1 where id=$2 and list_id in (select id from packing_lists where trip_id=$3) returning id", [body.status,body.id,id]);
  return NextResponse.json({ updated: !!result.rows[0] }, { status: result.rows[0] ? 200 : 404 });
 } catch { return NextResponse.json({ error: "Não foi possível atualizar o item." }, { status: 400 }); }
}
export async function DELETE(request: Request, { params }: Context) {
 if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
 try {
  const { id } = await params; const url = new URL(request.url); const list = url.searchParams.get("kind") === "list";
  const result = await query(list ? "delete from packing_lists where id=$1 and trip_id=$2 returning id" : "delete from packing_items where id=$1 and list_id in (select id from packing_lists where trip_id=$2) returning id", [url.searchParams.get("itemId"),id]);
  return NextResponse.json({ deleted: !!result.rows[0] }, { status: result.rows[0] ? 200 : 404 });
 } catch { return NextResponse.json({ error: "Não foi possível excluir o item." }, { status: 400 }); }
}
