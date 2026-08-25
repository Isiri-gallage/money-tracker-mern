import {
  ShoppingCart,
  ShoppingBag,
  Utensils,
  Coffee,
  Home,
  Car,
  Briefcase,
  HeartPulse,
  Zap,
  Clapperboard,
  GraduationCap,
  Plane,
  Gift,
  Smartphone,
  Dumbbell,
  PawPrint,
  PiggyBank,
  Tag,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_PALETTE = [
  "#8b5cf6",
  "#34d399",
  "#fb7185",
  "#fbbf24",
  "#22d3ee",
  "#f472b6",
  "#60a5fa",
  "#a3e635",
];

const ICON_RULES: [RegExp, LucideIcon][] = [
  [/grocer|supermarket|market|store|mart/i, ShoppingCart],
  [/food|meal|eat|restaurant|dining|lunch|dinner/i, Utensils],
  [/coffee|cafe|tea/i, Coffee],
  [/rent|home|house|mortgage|accommodation/i, Home],
  [/car|fuel|petrol|transport|taxi|bus|train|uber/i, Car],
  [/salary|wage|payroll|income|freelance|bonus/i, Briefcase],
  [/health|medic|doctor|pharmac|clinic|hospital/i, HeartPulse],
  [/cloth|shopping|apparel|shoe/i, ShoppingBag],
  [/bill|utilit|electric|water|internet|wifi/i, Zap],
  [/movie|netflix|entertain|game|music|subscription/i, Clapperboard],
  [/school|educat|book|course|tuition|study/i, GraduationCap],
  [/travel|flight|hotel|holiday|trip/i, Plane],
  [/gift|donat|charity/i, Gift],
  [/phone|mobile|telecom/i, Smartphone],
  [/gym|fitness|sport|workout/i, Dumbbell],
  [/pet|dog|cat|vet/i, PawPrint],
  [/saving|invest|deposit/i, PiggyBank],
];

export function categoryIcon(name: string): LucideIcon {
  for (const [pattern, icon] of ICON_RULES) {
    if (pattern.test(name)) return icon;
  }
  return Tag;
}

export function categoryColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_PALETTE[hash % CATEGORY_PALETTE.length];
}