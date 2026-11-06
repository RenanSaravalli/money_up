import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Banknote,
  Landmark,
  Wallet,
  PiggyBank,
  ShoppingBag,
  Utensils,
  Car,
  House,
  Sparkles,
  BriefcaseBusiness,
  Heart,
  BookOpen,
  Tag,
  type LucideProps,
} from "lucide-react";
const icons = {
  wallet: Wallet,
  bank: Landmark,
  piggy: PiggyBank,
  banknote: Banknote,
  shopping: ShoppingBag,
  food: Utensils,
  car: Car,
  home: House,
  sparkles: Sparkles,
  briefcase: BriefcaseBusiness,
  heart: Heart,
  book: BookOpen,
  tag: Tag,
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  transfer: ArrowLeftRight,
};
export function Icon({ name, ...props }: LucideProps & { name: string }) {
  const Component = icons[name as keyof typeof icons] ?? Wallet;
  return <Component strokeWidth={1.6} {...props} />;
}
