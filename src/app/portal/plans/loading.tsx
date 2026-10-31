import { Card } from "@/components/ui/card";
import { Bone, HeaderSkeleton, Loading as Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <HeaderSkeleton actions={0} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="space-y-4 p-5">
            <Bone className="w-1/2" />
            <Bone className="h-8 w-32" />
            <Bone className="w-3/4 opacity-60" />
            <Bone className="w-2/3 opacity-60" />
            <Bone className="mt-6 h-9 w-full rounded-lg" />
          </Card>
        ))}
      </div>
    </Skeleton>
  );
}
