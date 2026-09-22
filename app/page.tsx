import Link from "next/link";

export default function Home(){
  return <main className="min-h-screen overflow-hidden bg-neutral-50">
    <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-5 py-16 sm:px-8 lg:px-12">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[.18em] text-neutral-600 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-neutral-950"/> NaBagagem
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-neutral-950 sm:text-6xl lg:text-7xl">
          Suas viagens, lugares e histórias em um só lugar.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg">
          Planeje roteiros, organize destinos, acompanhe gastos, salve reservas e compartilhe suas experiências com quem também ama viajar.
        </p>
        <div className="mt-8 grid gap-3 sm:flex">
          <Link href="/cadastro" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-neutral-950 px-6 py-3 text-sm font-bold text-white shadow-sm">Começar agora</Link>
          <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-neutral-300 bg-white px-6 py-3 text-sm font-bold text-neutral-900">Entrar</Link>
        </div>
      </div>

      <div className="mt-14 grid gap-3 sm:grid-cols-3 lg:mt-20">
        {[
          ["Planeje","Monte seu roteiro por dia, com horários, destinos e reservas."],
          ["Explore","Use mapas, clima, busca e informações dos seus destinos."],
          ["Guarde","Registre gastos, checklist, favoritos e memórias das viagens."]
        ].map(([title,text])=>
          <div key={title} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-bold text-neutral-950">{title}</p>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{text}</p>
          </div>
        )}
      </div>
    </section>
  </main>
}