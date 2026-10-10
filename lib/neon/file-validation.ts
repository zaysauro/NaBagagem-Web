export async function validateFile(file: File, document = false) {
  if (file.size < 1 || file.size > 4 * 1024 * 1024) throw new Error("O arquivo deve ter entre 1 byte e 4 MB.");
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  const mime = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? "image/jpeg"
    : bytes[0] === 0x89 && ascii(1, 4) === "PNG" && bytes[4] === 13 && bytes[5] === 10 ? "image/png"
    : ascii(0,4) === "RIFF" && ascii(8,12) === "WEBP" ? "image/webp"
    : document && ascii(0,5) === "%PDF-" ? "application/pdf" : null;
  if (!mime || mime !== file.type) throw new Error("Use um arquivo JPG, PNG, WebP" + (document ? " ou PDF" : "") + " válido.");
  return mime;
}
