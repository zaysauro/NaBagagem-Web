import Link from "next/link";
import {query} from "@/lib/neon/db";
export default async function DashboardOverview({userId}:{userId:string}){
 try{
  const [summary,tasks,next,spending]=await Promise.all([
   query("select count(*) filter(where status<>'archived' and (status='planned' and (start_date is null or start_date>current_date)))::int as upcoming,count(*) filter(where status='ongoing' or (status='planned' and start_date<=current_date and end_date>=current_date))::int as ongoing,count(*) filter(where status='completed' or (status='planned' and end_date<current_date))::int as completed from trips where user_id=$1",[userId]),
   query("select count(*)::int as pending from trip_checklist_items where not completed"),
   query("select id,title,start_date from trips where user_id=$1 and start_date>=current_date and status<>'archived' order by start_date limit 1",[userId]),
   query("select currency,sum(amount)::text as amount from trip_expenses where trip_id in(select id from trips where user_id=$1) group by currency order by currency",[userId])
  ]);
  const numbers=summary.rows[0];return <section className="mt-5" aria-label="Resumo das viagens"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Futuras",numbers.upcoming],["Em andamento",numbers.ongoing],["Concluídas",numbers.completed],["Tarefas pendentes",tasks.rows[0].pending]].map(([label,n])=><div key={label} className="rounded-2xl border bg-white p-4"><p className="text-sm text-neutral-500">{label}</p><b className="text-2xl">{n}</b></div>)}</div><div className="mt-3 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border bg-white p-4"><h2 className="font-semibold">Próxima viagem</h2>{next.rows[0]?<Link href={`/dashboard/trips/${next.rows[0].id}`} className="mt-2 block underline">{next.rows[0].title} · {new Intl.DateTimeFormat("pt-BR",{timeZone:"UTC"}).format(new Date(next.rows[0].start_date))}</Link>:<p className="mt-2 text-sm text-neutral-500">Nenhuma viagem futura com data definida.</p>}</div><div className="rounded-2xl border bg-white p-4"><h2 className="font-semibold">Despesas registradas</h2>{spending.rows.length?spending.rows.map(row=><p key={row.currency} className="mt-2">{new Intl.NumberFormat("pt-BR",{style:"currency",currency:row.currency}).format(Number(row.amount))}</p>):<p className="mt-2 text-sm text-neutral-500">Nenhuma despesa registrada.</p>}</div></div></section>;
 }catch{return <p role="status" className="mt-4 text-sm text-neutral-500">O resumo estará disponível quando seus dados puderem ser carregados.</p>;}
}
