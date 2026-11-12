import {
  Box,
  Briefcase,
  Fuel,
  Gift,
  KeyRound,
  MoreHorizontal,
  ParkingCircle,
  Phone,
  PlusCircle,
  Shield,
  Tag,
  Truck,
  Wrench,
  type LucideIcon,
} from '@/ui/icons';

/** Category `icon` names stored in the DB (domain/categories.ts) → lucide icons. Unknown names get a tag. */
const MAP: Record<string, LucideIcon> = {
  truck: Truck,
  gift: Gift,
  'plus-circle': PlusCircle,
  fuel: Fuel,
  wrench: Wrench,
  shield: Shield,
  parking: ParkingCircle,
  key: KeyRound,
  phone: Phone,
  box: Box,
  briefcase: Briefcase,
  dots: MoreHorizontal,
};

export const categoryIcon = (name: string | null | undefined): LucideIcon => (name && MAP[name]) || Tag;
