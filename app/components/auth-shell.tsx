import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Compass } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./auth-shell.module.css";
export default function AuthShell({title,description,children}:{title:string;description:string;children:ReactNode}) {
 return <main className={styles.shell}><section className={styles.picture}><Image src="/images/lake-journey.jpg" alt="Vista de um barco de madeira em um lago cercado por montanhas" fill priority sizes="(max-width: 800px) 1px, 50vw"/><div className={styles.shade}/><Link className={styles.brand} href="/"><Compass size={28} aria-hidden="true"/>NaBagagem.</Link><div className={styles.quote}><span>O MUNDO ESPERA POR VOCÊ</span><h2>Cada viagem,<br/>um novo começo.</h2><p>Os planos de hoje. As histórias de amanhã.</p></div></section><section className={styles.content}><Link href="/" className={styles.back}><ArrowLeft size={15} aria-hidden="true"/> Voltar ao início</Link><div className={styles.form}><Compass size={33} strokeWidth={1.5} aria-hidden="true"/><h1>{title}</h1><p>{description}</p>{children}</div><p className={styles.bottom}>NaBagagem · Planeje. Viva. Guarde.</p></section></main>;
}
