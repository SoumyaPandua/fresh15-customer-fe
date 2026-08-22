import type { Banner } from "../types";

export const banners: Banner[] = [
  {
    id: "b1",
    title: "Fresh in 15",
    subtitle: "Farm-picked veggies delivered to your door",
    cta: "Shop fresh",
    href: "/category/vegetables",
    gradient: "fresh",
    emoji: "🥬",
  },
  {
    id: "b2",
    title: "Monsoon Munchies",
    subtitle: "Up to 40% off on snacks & beverages",
    cta: "Grab offers",
    href: "/category/snacks",
    gradient: "warm",
    emoji: "🍿",
  },
  {
    id: "b3",
    title: "Morning Essentials",
    subtitle: "Milk, bread & eggs before you wake up",
    cta: "Order now",
    href: "/category/dairy",
    gradient: "cool",
    emoji: "🥛",
  },
];
