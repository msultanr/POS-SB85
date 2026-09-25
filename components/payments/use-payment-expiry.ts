"use client";
import { useEffect, useState } from "react";

export function usePaymentExpiry(deadline: string | null, status: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!deadline || !["UNPAID", "REJECTED"].includes(status)) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline, status]);
  return (
    status === "EXPIRED" ||
    (["UNPAID", "REJECTED"].includes(status) &&
      deadline !== null &&
      now !== null &&
      now >= new Date(deadline).getTime())
  );
}
