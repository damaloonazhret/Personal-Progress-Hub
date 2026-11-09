"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = () => {
    setIsPending(true);
  };

  return (
    <form action="/auth/logout" method="post" onSubmit={handleSubmit}>
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        {isPending ? "Выход…" : "Выйти"}
      </Button>
    </form>
  );
}
