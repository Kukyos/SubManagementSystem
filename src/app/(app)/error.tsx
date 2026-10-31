"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/page-header";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState
      title="This page didn't load"
      body="Something went wrong reaching the database. Try again, and if it keeps happening, sign out and back in."
      action={
        <Button size="sm" variant="secondary" onClick={reset}>
          Try again
        </Button>
      }
    />
  );
}
