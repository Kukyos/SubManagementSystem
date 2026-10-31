import { getCurrentUser } from "@/services/auth";
import { exportCsv, exportLists, type ExportList } from "@/services/exports";

export async function GET(request: Request, { params }: { params: Promise<{ list: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role === "customer") return new Response("Not allowed", { status: 403 });
  const { list } = await params;
  if (!exportLists.includes(list as ExportList)) return new Response("Not found", { status: 404 });

  const { filename, csv } = await exportCsv(list as ExportList, new URL(request.url).searchParams);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
