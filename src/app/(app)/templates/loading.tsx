import { ListSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return <ListSkeleton cols={7} actions={1} filter={false} />;
}
