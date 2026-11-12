import {
  Banknote,
  Box,
  Briefcase,
  Calculator,
  Car,
  CirclePlus,
  Coffee,
  Ellipsis,
  Fuel,
  Gift,
  Hammer,
  Key,
  Laptop,
  MapPin,
  Package,
  Receipt,
  Shield,
  Shirt,
  Smartphone,
  SquareParking,
  Star,
  Truck,
  Utensils,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';

/**
 * Category icon names stored in the DB (`categories.icon`) → lucide icon. The first names are the ones the default
 * sets in domain/categories.ts use. 24 choices for the S-11 editor (mockup shows 11 + "More icons").
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  fuel: Fuel,
  wrench: Wrench,
  shield: Shield,
  parking: SquareParking,
  phone: Smartphone,
  shirt: Shirt,
  package: Package,
  star: Star,
  receipt: Receipt,
  key: Key,
  calculator: Calculator,
  truck: Truck,
  gift: Gift,
  'plus-circle': CirclePlus,
  box: Box,
  briefcase: Briefcase,
  car: Car,
  coffee: Coffee,
  utensils: Utensils,
  'map-pin': MapPin,
  hammer: Hammer,
  laptop: Laptop,
  banknote: Banknote,
  dots: Ellipsis,
};

export const ICON_NAMES = Object.keys(CATEGORY_ICONS);
/** How many icons the editor shows before "More icons". */
export const ICONS_COLLAPSED = 11;

export const iconFor = (name: string): LucideIcon => CATEGORY_ICONS[name] ?? Ellipsis;

/** The 10 colours from the S-11 mockup (also fine on dark surfaces). */
export const CATEGORY_COLORS = ['#C8553D', '#E08A2E', '#C9A227', '#1E8E5A', '#178A8A', '#2E6FD8', '#4E4BB8', '#7A6F9B', '#B5487A', '#5F6877'];

/** "SA103: Car, van and travel expenses" → "Car, van and travel expenses". */
export const shortTaxLine = (line: string) => line.replace(/^(SA103|Schedule C):\s*/, '');
