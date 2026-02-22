"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  cancelApunteGeneration,
  getApunteGenerationStatus,
  startApunteGeneration,
  type AIGenerationStatus,
} from "../lib/api";
import { useToast } from "./ToastProvider";

type GenerationContextValue = {
  startAIGeneration: (topic: string) => Promise<void>;
  cancelAIGeneration: () => Promise<void>;
  isGenerating: boolean;
  currentTopic: string | null;
  processed: number;
  total: number;
};

const GenerationContext = createContext<GenerationContextValue | null>(null);

export function useAIGeneration(): GenerationContextValue {
  const ctx = useContext(GenerationContext);
  if (!ctx) {
    throw new Error("useAIGeneration must be used within GenerationProvider");
  }
  return ctx;
}

export function GenerationProvider({ children }: { children: ReactNode }) {
  const { notify } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTopic, setCurrentTopic] = useState<string | null>(null);
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const handleStatusUpdate = useCallback(
    (status: AIGenerationStatus) => {
      setProcessed(status.processed || 0);
      setTotal(status.total || 0);

      if (status.status === "completed") {
        clearPoll();
        setIsGenerating(false);
        setCurrentTopic(null);
        setJobId(null);
        notify("Apunte generado correctamente", "success");
      }

      if (status.status === "failed") {
        clearPoll();
        setIsGenerating(false);
        setCurrentTopic(null);
        setJobId(null);
        notify(
          `Error al generar apunte: ${status.error || "Error desconocido"}`,
          "error",
          6000,
        );
      }

      if (status.status === "cancelled") {
        clearPoll();
        setIsGenerating(false);
        setCurrentTopic(null);
        setJobId(null);
        notify("Generación cancelada", "info", 4000);
      }
    },
    [clearPoll, notify],
  );

  const startAIGeneration = useCallback(
    async (topic: string) => {
      const trimmedTopic = topic.trim();
      if (!trimmedTopic) return;

      setIsGenerating(true);
      setCurrentTopic(trimmedTopic);
      setProcessed(0);
      setTotal(0);
      notify(`Generando apunte: ${trimmedTopic}`, "info", 3000);

      try {
        const { jobId: newJobId } = await startApunteGeneration(trimmedTopic);
        setJobId(newJobId);

        try {
          const status = await getApunteGenerationStatus(newJobId);
          handleStatusUpdate(status);
        } catch (error) {
          // ignore: el polling se encargara del estado
        }

        clearPoll();
        pollRef.current = window.setInterval(async () => {
          try {
            const status = await getApunteGenerationStatus(newJobId);
            handleStatusUpdate(status);
          } catch (error) {
            clearPoll();
            setIsGenerating(false);
            setCurrentTopic(null);
            setJobId(null);
            notify("Error consultando estado de generación", "error", 6000);
          }
        }, 2500);
      } catch (error: any) {
        const message = error?.message || "Error desconocido";
        notify(`Error al iniciar generación: ${message}`, "error", 6000);
        setIsGenerating(false);
        setCurrentTopic(null);
        setJobId(null);
        throw error;
      }
    },
    [clearPoll, handleStatusUpdate, notify],
  );

  const cancelAIGenerationAction = useCallback(async () => {
    if (!jobId) return;
    try {
      await cancelApunteGeneration(jobId);
      setIsGenerating(false);
      setCurrentTopic(null);
      setJobId(null);
      setProcessed(0);
      setTotal(0);
      clearPoll();
      notify("Generación cancelada", "info", 4000);
    } catch (error: any) {
      notify("No se pudo cancelar la generación", "error", 6000);
    }
  }, [jobId, clearPoll, notify]);

  useEffect(() => {
    return () => clearPoll();
  }, [clearPoll]);

  return (
    <GenerationContext.Provider
      value={{
        startAIGeneration,
        cancelAIGeneration: cancelAIGenerationAction,
        isGenerating,
        currentTopic,
        processed,
        total,
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
}
