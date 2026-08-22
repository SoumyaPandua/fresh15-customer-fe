import type { Product } from "../types";

type G = Product["gradient"];
type T = NonNullable<Product["tags"]>[number];

const mk = (
  id: string,
  name: string,
  categoryId: string,
  emoji: string,
  gradient: G,
  price: number,
  mrp: number,
  unit: string,
  stock: number,
  rating: number,
  reviews: number,
  eta: number,
  brand: string,
  description: string,
  tags: T[] = [],
): Product => ({
  id,
  name,
  categoryId,
  emoji,
  gradient,
  price,
  mrp,
  unit,
  stock,
  rating,
  reviews,
  etaMinutes: eta,
  brand,
  description,
  tags,
  variants: [
    { label: unit, price, mrp, unit },
    { label: `2 × ${unit}`, price: Math.round(price * 1.9), mrp: mrp * 2, unit: `2 × ${unit}` },
  ],
});

export const products: Product[] = [
  // Vegetables
  mk("p1", "Fresh Tomatoes", "c1", "🍅", "warm", 32, 45, "500 g", 42, 4.4, 218, 12, "Farmly", "Vine-ripened, hand-picked tomatoes sourced daily from Nashik farms.", ["bestseller", "recommended"]),
  mk("p2", "Green Broccoli", "c1", "🥦", "fresh", 68, 90, "250 g", 18, 4.6, 134, 14, "Farmly", "Crisp, tender broccoli florets — great for stir-fries and soups.", ["seasonal"]),
  mk("p3", "Baby Spinach", "c1", "🥬", "fresh", 39, 55, "200 g", 26, 4.3, 91, 12, "GreenLeaf", "Baby spinach leaves, triple-washed and ready to cook.", ["recommended"]),
  mk("p4", "Onions", "c1", "🧅", "warm", 45, 60, "1 kg", 120, 4.2, 512, 15, "Farmly", "Everyday onions, medium size — kitchen essential.", ["bestseller"]),
  mk("p5", "Potatoes", "c1", "🥔", "warm", 40, 55, "1 kg", 200, 4.3, 780, 15, "Farmly", "Smooth-skinned potatoes ideal for curries and fries.", ["bestseller"]),
  mk("p6", "Green Capsicum", "c1", "🫑", "fresh", 42, 55, "250 g", 34, 4.1, 76, 14, "Farmly", "Crunchy green bell peppers with a mild sweet finish."),

  // Fruits
  mk("p7", "Alphonso Mangoes", "c2", "🥭", "warm", 499, 650, "6 pcs", 12, 4.8, 342, 20, "Ratnagiri Gold", "Premium Ratnagiri Alphonsos — the king of mangoes.", ["seasonal", "flash"]),
  mk("p8", "Kashmiri Apples", "c2", "🍎", "warm", 199, 249, "1 kg", 38, 4.5, 267, 15, "Himalayan", "Sweet, crunchy apples straight from Kashmir orchards.", ["bestseller"]),
  mk("p9", "Bananas Robusta", "c2", "🍌", "warm", 55, 72, "6 pcs", 88, 4.3, 431, 12, "Farmly", "Naturally ripened Robusta bananas — daily breakfast staple.", ["recommended"]),
  mk("p10", "Sweet Watermelon", "c2", "🍉", "fresh", 89, 120, "1 pc (~2 kg)", 22, 4.4, 158, 18, "Farmly", "Juicy, seedless watermelons — summer's coolest treat.", ["seasonal"]),
  mk("p11", "Green Grapes", "c2", "🍇", "fresh", 129, 160, "500 g", 30, 4.2, 112, 15, "VineFresh", "Seedless green grapes with a crisp bite."),
  mk("p12", "Fresh Strawberries", "c2", "🍓", "warm", 179, 220, "250 g", 14, 4.6, 89, 18, "BerryLane", "Handpicked Mahabaleshwar strawberries.", ["seasonal", "flash"]),

  // Dairy
  mk("p13", "Amul Toned Milk", "c3", "🥛", "cool", 34, 34, "500 ml", 150, 4.6, 1024, 10, "Amul", "Fresh toned milk with 3% fat — perfect for tea and coffee.", ["bestseller", "recommended"]),
  mk("p14", "Farm Eggs", "c3", "🥚", "warm", 89, 110, "12 pcs", 60, 4.5, 512, 12, "HappyHen", "Cage-free brown eggs from happy hens.", ["bestseller"]),
  mk("p15", "Amul Butter", "c3", "🧈", "warm", 62, 62, "100 g", 78, 4.7, 890, 12, "Amul", "The classic taste of India's favourite butter."),
  mk("p16", "Greek Yogurt", "c3", "🍦", "cool", 89, 110, "400 g", 34, 4.4, 231, 12, "Epigamia", "Thick, protein-rich Greek yogurt.", ["recommended"]),
  mk("p17", "Paneer Fresh", "c3", "🧀", "cool", 99, 120, "200 g", 24, 4.5, 187, 12, "Milky Mist", "Soft, fresh paneer — great for curries and grilling."),

  // Bakery
  mk("p18", "Whole Wheat Bread", "c4", "🍞", "warm", 45, 55, "400 g", 40, 4.4, 342, 12, "Britannia", "100% whole wheat sandwich bread, freshly baked.", ["bestseller"]),
  mk("p19", "Butter Croissant", "c4", "🥐", "warm", 79, 99, "2 pcs", 18, 4.6, 128, 15, "Boulangerie", "Flaky, buttery croissants baked this morning.", ["recommended"]),
  mk("p20", "Chocolate Muffins", "c4", "🧁", "warm", 129, 160, "4 pcs", 22, 4.5, 96, 15, "SweetSpot", "Rich double-chocolate muffins with a soft centre."),
  mk("p21", "Sourdough Loaf", "c4", "🥖", "warm", 189, 220, "500 g", 12, 4.7, 74, 18, "Artisan Co.", "Slow-fermented sourdough with a crisp crust.", ["seasonal"]),

  // Snacks
  mk("p22", "Lay's Classic", "c5", "🥔", "warm", 20, 20, "52 g", 200, 4.3, 1520, 10, "Lay's", "The classic salted potato chips.", ["bestseller"]),
  mk("p23", "Haldiram Bhujia", "c5", "🍜", "warm", 55, 65, "200 g", 90, 4.5, 812, 12, "Haldiram's", "Crispy besan bhujia — a timeless namkeen.", ["bestseller"]),
  mk("p24", "Dark Chocolate 70%", "c5", "🍫", "warm", 199, 249, "100 g", 45, 4.6, 231, 12, "Amul Dark", "Rich 70% cocoa dark chocolate.", ["recommended"]),
  mk("p25", "Roasted Almonds", "c5", "🥜", "warm", 349, 449, "250 g", 30, 4.7, 189, 12, "NutHouse", "Lightly salted, dry-roasted California almonds.", ["recommended"]),
  mk("p26", "Popcorn Butter", "c5", "🍿", "warm", 89, 110, "80 g", 60, 4.2, 142, 12, "Act II", "Movie-style butter popcorn — ready in 3 minutes.", ["flash"]),

  // Beverages
  mk("p27", "Coca-Cola", "c6", "🥤", "cool", 40, 45, "750 ml", 150, 4.5, 2103, 10, "Coca-Cola", "The original cola — chilled and ready.", ["bestseller"]),
  mk("p28", "Fresh Orange Juice", "c6", "🍊", "warm", 149, 180, "1 L", 24, 4.6, 89, 15, "Raw Pressery", "Cold-pressed orange juice with no added sugar.", ["recommended"]),
  mk("p29", "Green Tea", "c6", "🍵", "fresh", 249, 299, "25 bags", 55, 4.4, 342, 12, "Tetley", "Refreshing green tea with a smooth finish."),
  mk("p30", "Sparkling Water", "c6", "💧", "cool", 89, 110, "750 ml", 40, 4.3, 76, 12, "Perrier", "Naturally sparkling mineral water."),
  mk("p31", "Cold Brew Coffee", "c6", "☕", "warm", 199, 240, "250 ml", 20, 4.7, 128, 12, "BlueTokai", "Smooth cold-brew coffee — 12-hour steeped.", ["flash", "recommended"]),

  // Essentials
  mk("p32", "Basmati Rice", "c7", "🍚", "warm", 249, 299, "1 kg", 80, 4.6, 542, 15, "India Gate", "Aged long-grain basmati — perfect for biryani.", ["bestseller"]),
  mk("p33", "Toor Dal", "c7", "🌾", "warm", 179, 210, "1 kg", 65, 4.5, 289, 15, "Tata Sampann", "Unpolished, protein-rich toor dal."),
  mk("p34", "Sunflower Oil", "c7", "🫒", "warm", 189, 220, "1 L", 90, 4.4, 431, 15, "Fortune", "Refined sunflower oil for daily cooking.", ["bestseller"]),
  mk("p35", "Rock Salt", "c7", "🧂", "cool", 45, 55, "500 g", 120, 4.5, 187, 12, "Tata Salt", "Pure pink rock salt, iodine-enriched."),
  mk("p36", "Dish Soap", "c7", "🧼", "cool", 129, 155, "750 ml", 70, 4.3, 231, 12, "Vim", "Lemon-fresh dishwashing liquid — cuts grease fast."),
];

export const flashOffers = products.filter((p) => p.tags?.includes("flash"));
export const bestSellers = products.filter((p) => p.tags?.includes("bestseller"));
export const recommended = products.filter((p) => p.tags?.includes("recommended"));
export const seasonal = products.filter((p) => p.tags?.includes("seasonal"));
