import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/neon/auth";
import { query, transaction } from "@/lib/neon/db";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
 if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
 try {
  const { id } = await params;
  const [lists, items, templates] = await Promise.all([query("select * from packing_lists where trip_id=$1 order by created_at", [id]), query("select i.* from packing_items i join packing_lists l on l.id=i.list_id where l.trip_id=$1 order by i.created_at", [id]), query("select id,name from trip_templates order by created_at desc")]);
  return NextResponse.json({ templates: templates.rows, lists: lists.rows.map(list => ({ ...list, items: items.rows.filter(item => item.list_id === list.id) })) });
 } catch { return NextResponse.json({ error: "Não foi possível carregar a bagagem." }, { status: 500 }); }
}
export async function POST(request: Request, { params }: Context) {
 const user = await getCurrentUser();
 if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
 try {
  const { id } = await params; const body = await request.json(); const name = String(body.name || "").trim();
  if (!name || name.length > 120) return NextResponse.json({ error: "Informe um nome de até 120 caracteres." }, { status: 400 });
  const result = await transaction(async client => {
   if (body.save_template) {
    const source = await client.query("select id from packing_lists where id=$1 and trip_id=$2", [body.save_template,id]);
    if (!source.rows.length) throw new Error("List unavailable");
    const items = await client.query("select name,quantity,category,notes from packing_items where list_id=$1 order by created_at limit 201", [body.save_template]);
    if (items.rows.length > 200) throw new Error("Template too large");
    return client.query("insert into trip_templates(user_id,name,items) values($1,$2,$3::jsonb) returning id", [user.id,name,JSON.stringify(items.rows)]);
   }
   if (body.list_id) {
    const lists = await client.query("select id from packing_lists where id=$1 and trip_id=$2", [body.list_id,id]);
    if (!lists.rows[0]) throw new Error("List unavailable");
    const quantity = Number(body.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw new Error("Invalid quantity");
    return client.query("insert into packing_items(list_id,name,quantity,category,notes) values($1,$2,$3,$4,$5) returning *", [body.list_id,name,quantity,String(body.category || "").slice(0,80),String(body.notes || "").slice(0,1000)]);
   }
   const created = await client.query("insert into packing_lists(trip_id,name) values($1,$2) returning *", [id,name]);
   if (body.duplicate_id) await client.query("insert into packing_items(list_id,name,quantity,category,notes) select $1,i.name,i.quantity,i.category,i.notes from packing_items i join packing_lists l on l.id=i.list_id where l.id=$2 and l.trip_id=$3", [created.rows[0].id,body.duplicate_id,id]);
   if (body.template_id) {
    const template = await client.query("select items from trip_templates where id=$1", [body.template_id]);
    if (!template.rows.length || !Array.isArray(template.rows[0].items) || template.rows[0].items.length > 200) throw new Error("Template unavailable");
    for (const item of template.rows[0].items) {
     if (typeof item.name !== "string" || !item.name.trim() || item.name.length > 120 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) throw new Error("Invalid template");
     await client.query("insert into packing_items(list_id,name,quantity,category,notes) values($1,$2,$3,$4,$5)", [created.rows[0].id,item.name,item.quantity,String(item.category || "").slice(0,80),String(item.notes || "").slice(0,1000)]);
    }
   }
   return created;
  });
  return NextResponse.json({ item: result.rows[0] }, { status: 201 });
 } catch { return NextResponse.json({ error: "Não foi possível salvar a bagagem. Verifique os dados e suas permissões." }, { status: 400 }); }
}
export async function PATCH(request: Request, { params }: Context) {
 if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
 try {
  const { id } = await params; const body = await request.json();
  const changes: string[] = []; const values: unknown[] = [];
  const field = (column: string, value: unknown) => { values.push(value); changes.push(`${column}=$${values.length}`); };
  if (body.status !== undefined) {
   if (!["pending","prepared","packed"].includes(body.status)) throw new Error("Invalid status");
   field("status",body.status);
  }
  if (body.name !== undefined) {
   if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 120) throw new Error("Invalid name");
   field("name",body.name.trim());
  }
  if (body.quantity !== undefined) {
   const quantity = Number(body.quantity);
   if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw new Error("Invalid quantity");
   field("quantity",quantity);
  }
  for (const [key,max] of [["category",80],["notes",1000]] as const) {
   if (body[key] !== undefined) {
    if (typeof body[key] !== "string" || body[key].length > max) throw new Error("Invalid text");
    field(key,body[key].trim());
   }
  }
  if (!changes.length) throw new Error("No updates");
  values.push(body.id,id);
  const result = await query(`update packing_items set ${changes.join(",")} where id=$${values.length-1} and list_id in (select id from packing_lists where trip_id=$${values.length}) returning id`, values);
  return NextResponse.json({ updated: !!result.rows[0] }, { status: result.rows[0] ? 200 : 404 });
 } catch { return NextResponse.json({ error: "Não foi possível atualizar o item." }, { status: 400 }); }
}
export async function DELETE(request: Request, { params }: Context) {
 if (!await getCurrentUser()) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
 try {
  const { id } = await params; const url = new URL(request.url); const list = url.searchParams.get("kind") === "list";
  if (url.searchParams.get("kind") === "template") {
   const result = await query("delete from trip_templates where id=$1 returning id",[url.searchParams.get("itemId")]);
   return NextResponse.json({deleted:!!result.rows.length},{status:result.rows.length?200:404});
  }
  const result = await query(list ? "delete from packing_lists where id=$1 and trip_id=$2 returning id" : "delete from packing_items where id=$1 and list_id in (select id from packing_lists where trip_id=$2) returning id", [url.searchParams.get("itemId"),id]);
  return NextResponse.json({ deleted: !!result.rows[0] }, { status: result.rows[0] ? 200 : 404 });
 } catch { return NextResponse.json({ error: "Não foi possível excluir o item." }, { status: 400 }); }
}
