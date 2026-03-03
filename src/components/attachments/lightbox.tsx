"use client";

import { useEffect, useRef } from "react";

interface LightboxItem {
  id: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
  sizeBytes: number | null;
  categoryLabel: string;
}

interface AttachmentLightboxProps {
  item: LightboxItem;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}

function formatSize(sizeBytes: number | null): string {
  if (!sizeBytes || sizeBytes <= 0) {
    return "-";
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AttachmentLightbox({
  item,
  index,
  total,
  onClose,
  onPrev,
  onNext,
  onDelete,
  deleting = false,
}: AttachmentLightboxProps) {
  const touchStartXRef = useRef(0);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onNext, onPrev]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8">
      <button
        type="button"
        aria-label="Close image preview"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 flex w-full max-w-6xl flex-col gap-3">
        <div className="flex items-center justify-between rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-xs text-slate-200">
          <div className="min-w-0">
            <p className="truncate text-sm text-slate-100">{item.fileName}</p>
            <p className="mt-0.5 text-slate-400">
              {item.categoryLabel} · {item.createdAt} · {formatSize(item.sizeBytes)}
            </p>
          </div>
          <p className="ml-3 shrink-0 text-slate-300">
            {index + 1}/{total}
          </p>
        </div>

        <div
          className="relative overflow-hidden rounded-xl border border-white/20 bg-black/40"
          onTouchStart={(event) => {
            touchStartXRef.current = event.changedTouches[0]?.clientX ?? 0;
          }}
          onTouchEnd={(event) => {
            const endX = event.changedTouches[0]?.clientX ?? 0;
            const delta = endX - touchStartXRef.current;
            if (Math.abs(delta) < 36) {
              return;
            }
            if (delta > 0) {
              onPrev();
            } else {
              onNext();
            }
          }}
        >
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-md border border-white/25 bg-black/50 px-2 py-2 text-xs text-white hover:bg-black/70"
          >
            Prev
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.fileUrl}
            alt={item.fileName}
            className="max-h-[76vh] w-full object-contain"
          />
          <button
            type="button"
            onClick={onNext}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-md border border-white/25 bg-black/50 px-2 py-2 text-xs text-white hover:bg-black/70"
          >
            Next
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 rounded-lg border border-white/20 bg-black/50 p-2 text-xs sm:hidden">
          <button
            type="button"
            onClick={onPrev}
            className="rounded-md border border-white/25 px-2 py-2 text-white"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-md border border-white/25 px-2 py-2 text-white"
          >
            Next
          </button>
          <button
            type="button"
            disabled={!onDelete || deleting}
            onClick={() => onDelete?.()}
            className="rounded-md border border-rose-300/40 px-2 py-2 text-rose-200 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/25 px-2 py-2 text-white"
          >
            Close
          </button>
        </div>
      </div>

      <button
        type="button"
        className="absolute right-4 top-4 z-10 rounded-md border border-white/30 bg-black/30 px-3 py-1.5 text-xs text-white"
        onClick={onClose}
      >
        Close
      </button>
    </div>
  );
}
