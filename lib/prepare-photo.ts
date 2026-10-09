"use client";
// Compress on the device before sending; private originals never leave the browser.
export async function preparePhoto(file: File): Promise<File> {
 if (!["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error("Use uma foto JPG, PNG ou WebP de até 20 MB.");
 const bitmap = await createImageBitmap(file);
 try {
  const scale = Math.min(1,1600 / Math.max(bitmap.width,bitmap.height));
  const canvas = document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext("2d");if(!context)throw new Error("Não foi possível preparar a foto.");
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error("Não foi possível comprimir a foto.")),"image/webp",0.85));
  if(blob.size>4*1024*1024)throw new Error("A foto ainda excede 4 MB. Escolha uma imagem menor.");
  return new File([blob],file.name.replace(/\.[^.]+$/,"")+".webp",{type:blob.type});
 } finally {bitmap.close();}
}
