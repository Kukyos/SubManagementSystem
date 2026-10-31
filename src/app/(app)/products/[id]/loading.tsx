import { HeaderSkeleton, Loading as Skeleton, PanelSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <HeaderSkeleton actions={0} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <PanelSkeleton fields={5} />
        <PanelSkeleton lines={6} />
      </div>
    </Skeleton>
  );
}
