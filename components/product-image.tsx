"use client";
import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
export function ProductImage({
  src,
  name,
  className,
}: {
  src: string | null;
  name: string;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden bg-[#eeeee5]",
        className,
      )}
    >
      {src && failedUrl !== src ? (
        // Arbitrary admin-provided HTTPS URLs; native img avoids an unrestricted server image proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailedUrl(src)}
        />
      ) : (
        <UtensilsCrossed
          aria-hidden="true"
          className="size-9 text-primary/30"
        />
      )}
    </div>
  );
}
