import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { cycle } from "@/lib/format";
import { requireRole } from "@/services/auth";
import { listTemplates } from "@/services/catalogue";

export const metadata = { title: "Quotation templates" };

const termLabel = { immediate: "On receipt", net_7: "7 days", net_15: "15 days", net_30: "30 days", net_45: "45 days", net_60: "60 days" };

export default async function Page() {
  const user = await requireRole("admin", "staff");
  const templates = await listTemplates();
  const isAdmin = user.role === "admin";

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Quotation templates"
        description="Ready-made offers with a plan, product lines and a validity period."
        actions={isAdmin && <ButtonLink href="/templates/new">New template</ButtonLink>}
      />

      {templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          body={isAdmin ? "A template turns your usual offer into a one-click quotation." : "An admin adds templates here."}
          action={isAdmin && <ButtonLink href="/templates/new" size="sm">New template</ButtonLink>}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs text-muted">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Contract</th>
                <th className="px-5 py-3 font-medium">Terms</th>
                <th className="px-5 py-3 text-right font-medium">Lines</th>
                <th className="px-5 py-3 text-right font-medium">Used</th>
                <th className="px-5 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {templates.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3">
                    <Link href={`/templates/${t.id}`} className="font-medium hover:text-accent-hover">
                      {t.name}
                    </Link>
                    <span className="block text-xs text-faint">Quote valid {t.validity_days} days</span>
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {t.plan?.name ?? "—"}
                    {t.plan && <span className="block text-xs text-faint">{cycle(t.plan.billing_period, t.plan.billing_interval)}</span>}
                  </td>
                  <td className="px-5 py-3 text-muted">{t.duration_periods ? `${t.duration_periods} cycles` : "Open-ended"}</td>
                  <td className="px-5 py-3 text-muted">{termLabel[t.payment_terms]}</td>
                  <td className="tabular px-5 py-3 text-right text-muted">{t.lineCount}</td>
                  <td className="tabular px-5 py-3 text-right text-muted">{t.usedCount}</td>
                  <td className="px-5 py-3 text-right">
                    <ButtonLink href={`/subscriptions/new?template=${t.id}`} size="sm" variant="secondary">
                      Use
                    </ButtonLink>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
