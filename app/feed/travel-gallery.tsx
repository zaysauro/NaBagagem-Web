"use client";

type Media={id:string;public_url:string};

export default function TravelGallery({media}:{media:Media[]}){
 if(!media.length)return null;
 return <div className={"travel-gallery mt-5 "+(media.length===1?"one":media.length===2?"two":media.length===3?"three":"many")}>
  {media.map((m,i)=><button key={m.id} type="button" onClick={()=>window.open(m.public_url,"_blank","noopener,noreferrer")} className={"travel-gallery-item item-"+i} aria-label={"Abrir foto "+(i+1)}>
   <img src={m.public_url} alt="" loading="lazy" decoding="async"/>
   {i===0&&media.length>1?<span className="travel-gallery-count">{media.length} fragmentos</span>:null}
  </button>)}
 </div>;
}
