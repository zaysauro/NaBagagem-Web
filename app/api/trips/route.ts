import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/neon/auth";
import { query } from "@/lib/neon/db";

export const runtime = "nodejs";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const result = await query(
      `select id, user_id, title, description, start_date, end_date, created_at
         from trips where user_id = $1 or exists(select 1 from trip_members m where m.trip_id=trips.id and m.user_id=$1)
         order by start_date desc nulls last, created_at desc`,
      [user.id],
    );
    return NextResponse.json({ trips: result.rows });
  } catch (error) {
    console.error("trips GET failed", error);
    return NextResponse.json({ error: "Não foi possível carregar suas viagens." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() || null : null;
    const startDate = body.start_date || null;
    const endDate = body.end_date || null;

    if (title.length < 2 || title.length > 80 || (description && description.length > 240)) {
      return NextResponse.json({ error: "Confira o nome e a descrição da viagem." }, { status: 400 });
    }
    if ([startDate, endDate].some((date) => date !== null && (typeof date !== "string" || !datePattern.test(date) || Number.isNaN(Date.parse(date))))) {
      return NextResponse.json({ error: "Informe datas válidas." }, { status: 400 });
    }
    if (startDate && endDate && endDate < startDate) {
      return NextResponse.json({ error: "O término deve ser igual ou posterior ao início." }, { status: 400 });
    }

    const result = await query(
      `insert into trips (user_id, title, description, start_date, end_date)
       values ($1, $2, $3, $4, $5)
       returning id, user_id, title, description, start_date, end_date, created_at`,
      [user.id, title, description, startDate, endDate],
    );
    return NextResponse.json({ trip: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("trips POST failed", error);
    return NextResponse.json({ error: "Não foi possível salvar sua viagem." }, { status: 500 });
  }
}
