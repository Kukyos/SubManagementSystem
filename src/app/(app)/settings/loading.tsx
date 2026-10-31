import { HeaderSkeleton, Loading as Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <HeaderSkeleton actions={0} />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <TableSkeleton cols={4} rows={5} />
        <TableSkeleton cols={4} rows={5} />
      </div>
    </Skeleton>
  );
}
