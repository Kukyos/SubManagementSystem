import { buttonClass } from "@/components/ui/button";

// A plain link, not next/link: the export is a file download, not a page to prefetch.
export function ExportLink({ list, params }: { list: string; params: Record<string, string | undefined> }) {
  const qs = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]));
  const query = qs.size ? `?${qs}` : "";
  return (
    <a href={`/export/${list}${query}`} download className={buttonClass({ variant: "secondary" })} title="Every row matching the current filters">
      Export CSV
    </a>
  );
}
