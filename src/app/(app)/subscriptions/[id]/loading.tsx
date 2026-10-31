import { Card } from "@/components/ui/card";
import { Bone, HeaderSkeleton, Loading as Skeleton, PanelSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <HeaderSkeleton actions={3} />
      <Card className="mb-6 flex flex-wrap gap-8 p-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Bone key={i} className="h-6 w-24" />
        ))}
      </Card>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <TableSkeleton cols={6} rows={4} />
          <TableSkeleton cols={5} rows={4} />
        </div>
        <div className="space-y-6">
          <PanelSkeleton lines={5} />
          <PanelSkeleton lines={6} />
        </div>
      </div>
    </Skeleton>
  );
}
