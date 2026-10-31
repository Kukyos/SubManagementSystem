import "server-only";
import { invoicePdf, pdfName } from "@/lib/invoice-pdf";
import { getCurrentUser } from "@/services/auth";
import { uuid } from "@/services/catalogue";
import { getInvoice } from "@/services/invoices";

// The invoice as a PDF download. RLS limits customers to their own invoices;
// drafts stay hidden from them, as on the portal page.
export async function invoicePdfResponse(id: string, as: "staff" | "customer") {
  const user = await getCurrentUser();
  const allowed = user && (as === "customer" ? user.role === "customer" : user.role !== "customer");
  if (!allowed) return new Response("Not allowed", { status: 403 });
  if (!uuid.test(id)) return new Response("Not found", { status: 404 });
  const inv = await getInvoice(id);
  if (!inv || (as === "customer" && inv.status === "draft")) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(await invoicePdf(inv)), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdfName(inv.number)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
