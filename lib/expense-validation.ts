const categories = new Set(['transport','food','lodging','tickets','shopping','other']);
export function expenseInput(body: Record<string, unknown>) {
 const title = typeof body.title === 'string' ? body.title.trim() : '';
 const amount = String(body.amount ?? '');
 const currency = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : 'BRL';
 const category = typeof body.category === 'string' ? body.category : 'other';
 const date = body.expense_date || null;
 if (!title || title.length > 200 || !/^\d{1,10}(\.\d{1,2})?$/.test(amount)) throw new Error('Informe descrição e valor válidos.');
 if (!/^[A-Z]{3}$/.test(currency) || !categories.has(category)) throw new Error('Moeda ou categoria inválida.');
 if (date !== null && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date)) throw new Error('Data inválida.');
 const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
 if (notes.length > 5000) throw new Error('As notas devem ter até 5.000 caracteres.');
 return { title, amount, currency, category, expense_date: date, notes: notes || null };
}
export const addMoney = (left: number, right: number|string) => (Math.round(left*100)+Math.round(Number(right)*100))/100;
export function sumMoney(values: (number|string)[]) {
 return values.reduce<number>((total,value)=>addMoney(total,value),0);
}
