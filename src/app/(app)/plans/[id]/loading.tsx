import { HeaderSkeleton, Loading as Skeleton, PanelSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <HeaderSkeleton actions={0} />
      <PanelSkeleton fields={6} className="max-w-3xl" />
    </Skeleton>
  );
}
