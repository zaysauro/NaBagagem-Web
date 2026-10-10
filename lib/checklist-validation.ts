export function checklistChanges(body: Record<string, unknown>, creating = false) {
 const updates: Record<string, string | boolean | null> = {};
 for (const [key,max] of [["title",160],["category",80],["description",2000]] as const) {
  if (body[key] !== undefined || (creating && key === "title")) {
   if (typeof body[key] !== "string" || body[key].length > max) throw new Error("Texto inválido.");
   const value = body[key].trim();
   if (key === "title" && !value) throw new Error("Informe o item.");
   updates[key] = key === "category" ? value || "general" : value;
  }
 }
 if (body.completed !== undefined) {
  if (typeof body.completed !== "boolean") throw new Error("Conclusão inválida.");
  updates.completed = body.completed;
 }
 if (body.priority !== undefined) {
  if (typeof body.priority !== "string" || !["low","normal","high"].includes(body.priority)) throw new Error("Prioridade inválida.");
  updates.priority = body.priority;
 }
 if (body.due_date !== undefined) {
  const date = body.due_date;
  if (date === "" || date === null) updates.due_date = null;
  else {
   if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new Error("Prazo inválido.");
   updates.due_date = date;
  }
 }
 if (!Object.keys(updates).length) throw new Error("Nenhuma alteração informada.");
 return updates;
}
