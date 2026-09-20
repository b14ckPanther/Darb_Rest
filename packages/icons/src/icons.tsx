"use client";

import React from "react";
import {
  Utensils,
  Coffee,
  BookOpen,
  QrCode,
  ShoppingBag,
  Receipt,
  Settings,
  User,
  Globe,
  Search,
  SlidersHorizontal,
  Check,
  AlertCircle,
  X,
  Menu as MenuIcon,
  Plus,
  Building2,
  Store,
  MapPin,
  Clock,
  Sparkles,
  Layers,
  ExternalLink,
  Sun,
  Moon,
  ShieldCheck,
  CreditCard,
  BarChart3,
  Palette,
  ChevronDown,
  LogOut,
  Mail,
  Lock,
  Phone,
  type LucideProps,
} from "lucide-react";

export type IconProps = LucideProps & {
  className?: string;
  size?: number | string;
};

export const IconRestaurant = (props: IconProps) => <Utensils aria-hidden="true" {...props} />;
export const IconCafe = (props: IconProps) => <Coffee aria-hidden="true" {...props} />;
export const IconMenu = (props: IconProps) => <BookOpen aria-hidden="true" {...props} />;
export const IconQrCode = (props: IconProps) => <QrCode aria-hidden="true" {...props} />;
export const IconOrders = (props: IconProps) => <ShoppingBag aria-hidden="true" {...props} />;
export const IconReceipt = (props: IconProps) => <Receipt aria-hidden="true" {...props} />;
export const IconSettings = (props: IconProps) => <Settings aria-hidden="true" {...props} />;
export const IconUser = (props: IconProps) => <User aria-hidden="true" {...props} />;
export const IconGlobe = (props: IconProps) => <Globe aria-hidden="true" {...props} />;
export const IconSearch = (props: IconProps) => <Search aria-hidden="true" {...props} />;
export const IconFilter = (props: IconProps) => <SlidersHorizontal aria-hidden="true" {...props} />;
export const IconCheck = (props: IconProps) => <Check aria-hidden="true" {...props} />;
export const IconWarning = (props: IconProps) => <AlertCircle aria-hidden="true" {...props} />;
export const IconClose = (props: IconProps) => <X aria-hidden="true" {...props} />;
export const IconMenuBurger = (props: IconProps) => <MenuIcon aria-hidden="true" {...props} />;
export const IconPlus = (props: IconProps) => <Plus aria-hidden="true" {...props} />;
export const IconBuilding = (props: IconProps) => <Building2 aria-hidden="true" {...props} />;
export const IconStore = (props: IconProps) => <Store aria-hidden="true" {...props} />;
export const IconMapPin = (props: IconProps) => <MapPin aria-hidden="true" {...props} />;
export const IconClock = (props: IconProps) => <Clock aria-hidden="true" {...props} />;
export const IconSparkles = (props: IconProps) => <Sparkles aria-hidden="true" {...props} />;
export const IconLayers = (props: IconProps) => <Layers aria-hidden="true" {...props} />;
export const IconExternalLink = (props: IconProps) => (
  <ExternalLink aria-hidden="true" {...props} />
);
export const IconSun = (props: IconProps) => <Sun aria-hidden="true" {...props} />;
export const IconMoon = (props: IconProps) => <Moon aria-hidden="true" {...props} />;
export const IconShield = (props: IconProps) => <ShieldCheck aria-hidden="true" {...props} />;
export const IconBilling = (props: IconProps) => <CreditCard aria-hidden="true" {...props} />;
export const IconAnalytics = (props: IconProps) => <BarChart3 aria-hidden="true" {...props} />;
export const IconBranding = (props: IconProps) => <Palette aria-hidden="true" {...props} />;
export const IconChevronDown = (props: IconProps) => <ChevronDown aria-hidden="true" {...props} />;
export const IconLogOut = (props: IconProps) => <LogOut aria-hidden="true" {...props} />;
export const IconMail = (props: IconProps) => <Mail aria-hidden="true" {...props} />;
export const IconLock = (props: IconProps) => <Lock aria-hidden="true" {...props} />;
export const IconPhone = (props: IconProps) => <Phone aria-hidden="true" {...props} />;
