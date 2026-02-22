"use client";

import { useAIGeneration } from "./GenerationProvider";

export function AdminTopProgress() {
  const { isGenerating, currentTopic, processed, total, cancelAIGeneration } =
    useAIGeneration();

  if (!isGenerating) return null;

  const totalLabel = total > 0 ? total : "?";
  const progressPercent = total > 0 ? Math.min((processed / total) * 100, 100) : 0;

  return (
    <div className="fixed left-0 right-0 top-0 z-[10000] border-b border-blue-500/30 bg-neutral-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-xs text-blue-100">
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-semibold tracking-wide">
            Generando [{processed}/{totalLabel}]
          </span>
          <span className="text-blue-200/80 truncate">{currentTopic || "Apunte"}</span>
        </div>
        <button
          type="button"
          onClick={cancelAIGeneration}
          className="rounded border border-blue-400/40 px-2 py-1 text-[11px] font-medium text-blue-100 hover:bg-blue-500/10"
        >
          Cancelar
        </button>
      </div>
      <div className="h-0.5 w-full overflow-hidden bg-neutral-900">
        {total > 0 ? (
          <div
            className="h-full bg-blue-500 transition-[width] duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        ) : (
          <div className="h-full w-1/3 animate-[progress_1.2s_ease-in-out_infinite] bg-blue-500" />
        )}
      </div>
    </div>
  );
}
