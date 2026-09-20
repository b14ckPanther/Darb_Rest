import type { SupportedLocale } from "@darb-rest/config";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  preferredLocale: SupportedLocale;
  isPlatformAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}
