import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            NaBagagem Web
          </p>
          <h1 className="text-5xl font-bold tracking-tight text-gray-950 sm:text-7xl">
            Suas viagens.
            <br />
            Suas memórias.
            <br />
            Sua bagagem.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-gray-600">
            A nova versão web do NaBagagem está sendo construída para transformar viagens,
            lugares, fotos e histórias em uma experiência social completa.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/login" className="rounded-xl bg-gray-950 px-5 py-3 font-semibold text-white hover:bg-gray-800">
              Entrar
            </Link>
            <Link href="/cadastro" className="rounded-xl border border-gray-300 px-5 py-3 font-semibold text-gray-900 hover:bg-gray-50">
              Criar conta
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
