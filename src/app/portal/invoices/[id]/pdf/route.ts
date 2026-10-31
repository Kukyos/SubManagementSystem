import { invoicePdfResponse } from "@/services/invoice-files";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return invoicePdfResponse((await params).id, "customer");
}
