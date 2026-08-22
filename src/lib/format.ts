export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export const pct = (mrp: number, price: number) => (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);
