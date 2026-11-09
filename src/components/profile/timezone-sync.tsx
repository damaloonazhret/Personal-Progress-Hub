"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { saveBrowserTimeZone } from "@/lib/profile/actions";

export function TimezoneSync() {
  const router = useRouter();

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    void saveBrowserTimeZone(timeZone).then((saved) => {
      if (saved) {
        router.refresh();
      }
    });
  }, [router]);

  return null;
}
