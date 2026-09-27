import Link from "next/link";

const cards=[
 {k:"01",title:"Planeje sem perder a viagem",text:"Dias, horários, lugares, reservas, mapa, clima, gastos e checklist convivem no mesmo roteiro."},
 {k:"02",title:"Guarde como um caderno",text:"Fotos, notas e lugares ficam organizados pela história da viagem — não por um feed infinito."},
 {k:"03",title:"Encontre quem já esteve lá",text:"Marque destinos que quer conhecer e descubra roteiros públicos de outros viajantes."}
];

export default function Home(){
 return <main className="min-h-screen overflow-hidden bg-[#f4f1ea] text-neutral-950">
  <section className="relative min-h-[92vh] overflow-hidden px-5 pb-16 pt-8 sm:px-8 lg:px-12">
   <div className="nbg-drift pointer-events-none absolute -right-40 -top-48 h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,#cfc5ae,transparent_65%)] opacity-80"/>
   <div className="nbg-float pointer-events-none absolute left-[8%] top-[38%] hidden h-36 w-36 rounded-[2rem] border border-black/10 bg-white/40 backdrop-blur-xl sm:block"/>
   <div className="mx-auto max-w-7xl">
    <nav className="flex items-center justify-between py-3"><Link href="/" className="flex items-center gap-3 font-black tracking-tight"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-950 text-white">N</span>NaBagagem</Link><div className="flex items-center gap-2"><Link href="/login" className="rounded-xl px-4 py-2 text-sm font-bold">Entrar</Link><Link href="/cadastro" className="rounded-xl bg-neutral-950 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-black/10">Criar conta</Link></div></nav>
    <div className="grid min-h-[72vh] items-center gap-12 py-16 lg:grid-cols-[1.05fr_.95fr]">
     <div className="nbg-fade-up max-w-3xl">
      <span className="inline-flex rounded-full border border-black/10 bg-white/55 px-3 py-1.5 text-xs font-black uppercase tracking-[.2em] backdrop-blur">Seu próximo capítulo começa aqui</span>
      <h1 className="mt-6 text-5xl font-black leading-[.94] tracking-[-.055em] sm:text-7xl lg:text-[5.8rem]">Viajar é mais do que chegar.</h1>
      <p className="mt-7 max-w-xl text-lg leading-8 text-neutral-600">O NaBagagem junta o planejamento e a memória da viagem em um só lugar — com mapas, roteiros, fotos, gastos, clima e uma comunidade feita para descobrir caminhos.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/cadastro" className="rounded-2xl bg-neutral-950 px-6 py-4 text-center text-sm font-black text-white shadow-xl transition hover:-translate-y-1">Começar gratuitamente</Link><Link href="/descoberta" className="rounded-2xl border border-black/10 bg-white/65 px-6 py-4 text-center text-sm font-black backdrop-blur transition hover:-translate-y-1">Ver como funciona →</Link></div>
      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-[.12em] text-neutral-400"><span>Roteiros</span><span>Mapas</span><span>Memórias</span><span>Descoberta</span></div>
     </div>
     <div className="relative nbg-float">
      <div className="relative mx-auto max-w-md rotate-2 rounded-[2.5rem] border border-black/10 bg-[#171717] p-3 shadow-2xl">
       <div className="rounded-[2rem] bg-[#f8f7f3] p-5">
        <div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-[.15em] text-neutral-400">Caderno de viagem</span><span className="rounded-full bg-neutral-950 px-2 py-1 text-[10px] font-bold text-white">NaBagagem</span></div>
        <div className="mt-5 h-64 overflow-hidden rounded-[1.5rem] bg-[radial-gradient(circle_at_35%_25%,#ded5c5,transparent_32%),linear-gradient(145deg,#c5bba8,#817b70)]"><div className="h-full w-full bg-[linear-gradient(115deg,transparent_45%,rgba(255,255,255,.22)_46%,transparent_48%)]"/></div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[.15em] text-neutral-400">12 — 18 outubro</p><h2 className="mt-1 text-2xl font-black">Japão, pelo caminho</h2><div className="mt-4 flex gap-2"><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold">Kyoto</span><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold">Nara</span><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold">Tokyo</span></div>
       </div>
      </div>
      <div className="absolute -bottom-5 -left-4 rounded-2xl border border-black/10 bg-white/85 p-4 shadow-xl backdrop-blur"><p className="text-[10px] font-black uppercase tracking-[.15em] text-neutral-400">Descoberta</p><p className="mt-1 text-sm font-bold">“Alguém já fez esse caminho.”</p></div>
     </div>
    </div>
   </div>
  </section>
  <section className="border-y border-black/10 bg-white px-5 py-20 sm:px-8"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[.18em] text-neutral-400">Uma plataforma para viajantes</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Menos rolagem. Mais caminho.</h2><p className="mt-4 text-neutral-500">Não queremos que sua viagem vire mais uma rede social. Queremos que o digital ajude você a viver, organizar e lembrar do que aconteceu.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3">{cards.map((c,i)=><article key={c.k} className="nbg-fade-up rounded-[2rem] border border-black/10 bg-[#f8f7f3] p-6 transition duration-500 hover:-translate-y-1 hover:shadow-xl" style={{animationDelay:(i*120)+"ms"}}><span className="text-xs font-black text-neutral-400">{c.k}</span><h3 className="mt-12 text-2xl font-black">{c.title}</h3><p className="mt-3 text-sm leading-6 text-neutral-600">{c.text}</p></article>)}</div></div></section>
  <section className="px-5 py-24 sm:px-8"><div className="mx-auto max-w-5xl rounded-[2.5rem] bg-neutral-950 p-8 text-white shadow-2xl sm:p-14"><p className="text-xs font-black uppercase tracking-[.18em] text-white/40">Sua bússola digital</p><h2 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">Marque um destino. Encontre uma história.</h2><p className="mt-5 max-w-2xl leading-7 text-white/60">Quando você disser que quer conhecer Kyoto, Lisboa ou qualquer outro lugar, a descoberta pode mostrar roteiros públicos de pessoas que já passaram por lá.</p><Link href="/cadastro" className="mt-8 inline-flex rounded-2xl bg-white px-6 py-4 text-sm font-black text-neutral-950 transition hover:-translate-y-1">Entrar no NaBagagem</Link></div></section>
  <footer className="border-t border-black/10 px-5 py-8 text-center text-xs font-semibold text-neutral-400">NaBagagem · planeje, viva, guarde.</footer>
 </main>
}