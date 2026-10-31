import type { UserRole } from "@/types/models";

export type NavItem = { href: string; label: string; roles?: UserRole[] };
export type NavGroup = { label: string; items: NavItem[] };

export const consoleNav: NavGroup[] = [
  { label: "Overview", items: [{ href: "/dashboard", label: "Dashboard" }] },
  {
    label: "Sales",
    items: [
      { href: "/subscriptions", label: "Subscriptions" },
      { href: "/customers", label: "Customers" },
      { href: "/templates", label: "Quotation templates" },
    ],
  },
  {
    label: "Billing",
    items: [
      { href: "/invoices", label: "Invoices" },
      { href: "/payments", label: "Payments" },
      { href: "/billing", label: "Billing run" },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/products", label: "Products" },
      { href: "/plans", label: "Plans" },
      { href: "/discounts", label: "Discounts" },
    ],
  },
  { label: "Admin", items: [{ href: "/settings", label: "Settings" }] },
];

export const portalNav: NavItem[] = [
  { href: "/portal", label: "Overview" },
  { href: "/portal/invoices", label: "Invoices" },
  { href: "/portal/plans", label: "Plans" },
  { href: "/portal/profile", label: "Profile" },
];
