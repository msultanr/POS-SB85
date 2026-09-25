"use client";
import { useState } from "react";
import { Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
export function StoreLogo({
  version,
  className,
}: {
  version: string | null;
  className?: string;
}) {
  const src = version ? `/api/logo?v=${encodeURIComponent(version)}` : null;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <span
      className={cn(
        "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white",
        className,
      )}
    >
      {src && failedUrl !== src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Logo Teras SB85"
          className="size-full object-contain"
          onError={() => setFailedUrl(src)}
        />
      ) : (
        <Coffee aria-label="Teras SB85" className="size-6 text-primary" />
      )}
    </span>
  );
}
