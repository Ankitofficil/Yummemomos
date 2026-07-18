// =============================================================================
// Yumme Momos — single source of truth for all editable content.
// Editable content lives in ./content.json and is managed through the local
// admin panel: run `npm run admin` (or `npm run dev` and open /admin).
// This module re-exports it with types so component imports stay unchanged.
// =============================================================================

import content from './content.json';

export type Product = {
  slug: string;
  name: string;
  veg: boolean;
  jain?: boolean;
  desc: string;
  featured?: boolean;
  /** Site-root path, e.g. /images/uploads/veg-momo.jpg (set via the admin panel) */
  image?: string;
};

export const site = content.site;
export const pillars = content.pillars;
export const products: Product[] = content.products;
export const awards = content.awards;
export const videos = content.videos;
export const faqs = content.faqs;

// --- Navigation (structural — edit here, not in the admin panel) ---
export const nav = [
  { label: 'Home', href: '/' },
  { label: 'Menu', href: '/menu' },
  { label: 'About', href: '/about' },
  { label: 'Franchise', href: '/franchise' },
  { label: 'Achievements', href: '/achievements' },
  { label: 'Contact', href: '/contact' },
];
