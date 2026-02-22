"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createApunte } from "../../../lib/api";
import { useAIGeneration } from "../../../components/GenerationProvider";
import { useToast } from "../../../components/ToastProvider";

export default function NuevoApuntePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startAIGeneration } = useAIGeneration();
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [aiTopic, setAiTopic] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "",
    published: false,
  });

  // Auto-seleccionar modo IA y tema si viene de URL
  useEffect(() => {
    const isAI = searchParams.get("ai") === "true";
    const topic = searchParams.get("topic");

    if (isAI && topic) {
      setMode("ai");
      setAiTopic(decodeURIComponent(topic));
    }
  }, [searchParams]);

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await createApunte(formData);
      router.push("/apuntes");
    } catch (error) {
      console.error("Error creating apunte:", error);
      notify("Error al crear el apunte", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAIGenerate(e: React.FormEvent) {
    e.preventDefault();

    if (!aiTopic.trim()) {
      notify("Por favor ingresa un tema", "info");
      return;
    }

    setLoading(true);

    startAIGeneration(aiTopic).catch((error) => {
      console.error("Error generating apunte:", error);
      notify("Error al generar el apunte con IA", "error", 6000);
    });

    setLoading(false);
    router.push("/apuntes");
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Navbar */}
      <nav className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10 backdrop-blur-xl bg-neutral-900/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/apuntes")}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                ← Volver
              </button>
              <h1 className="text-xl font-bold text-white">Crear Apunte</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Toggle */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setMode("manual")}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                mode === "manual"
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              ✍️ Manual
            </button>
            <button
              onClick={() => setMode("ai")}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                mode === "ai"
                  ? "bg-purple-600 text-white"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              🤖 Generar con IA
            </button>
          </div>
        </div>

        {/* Manual Mode */}
        {mode === "manual" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-neutral-300 mb-2"
                >
                  Título *
                </label>
                <input
                  type="text"
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-neutral-300 mb-2"
                >
                  Categoría
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  required
                >
                  <option value="">Selecciona una categoría</option>
                  <option value="Frontend">Frontend</option>
                  <option value="Backend">Backend</option>
                  <option value="Full Stack">Full Stack</option>
                  <option value="DevOps">DevOps</option>
                  <option value="Bases de Datos">Bases de Datos</option>
                  <option value="Testing">Testing</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Seguridad">Seguridad</option>
                  <option value="Arquitectura">Arquitectura</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="content"
                  className="block text-sm font-medium text-neutral-300 mb-2"
                >
                  Contenido *
                </label>
                <textarea
                  id="content"
                  required
                  rows={15}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono text-sm"
                  placeholder="Escribe el contenido del apunte aquí..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="published"
                  checked={formData.published}
                  onChange={(e) =>
                    setFormData({ ...formData, published: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-neutral-700 rounded bg-neutral-950"
                />
                <label
                  htmlFor="published"
                  className="ml-2 block text-sm text-neutral-300"
                >
                  Publicar apunte
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-neutral-950 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {loading ? "Creando..." : "Crear Apunte"}
              </button>
            </form>
          </div>
        )}

        {/* AI Mode */}
        {mode === "ai" && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <form onSubmit={handleAIGenerate} className="space-y-6">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <h3 className="font-semibold text-purple-300 mb-2">
                  🤖 Generación con IA
                </h3>
                <p className="text-sm text-purple-200">
                  La IA creará automáticamente un apunte completo con:
                </p>
                <ul className="text-sm text-purple-200 mt-2 space-y-1 list-disc list-inside">
                  <li>6-10 módulos organizados</li>
                  <li>3-7 lecciones por módulo</li>
                  <li>Contenido en Markdown profesional</li>
                  <li>Ejemplos prácticos y ejercicios</li>
                </ul>
              </div>

              <div>
                <label
                  htmlFor="topic"
                  className="block text-sm font-medium text-neutral-300 mb-2"
                >
                  Tema del apunte *
                </label>
                <input
                  type="text"
                  id="topic"
                  required
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  placeholder="Ej: React Hooks, Node.js Avanzado, TypeScript..."
                />
                <p className="mt-2 text-sm text-neutral-400">
                  Describe el tema sobre el que quieres generar el apunte. Sé específico
                  para mejores resultados.
                </p>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-sm text-yellow-200">
                  ⏱️ La generación puede tomar entre 30 segundos y 2 minutos dependiendo
                  de la complejidad del tema.
                </p>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/apuntes")}
                  className="px-4 py-2 border border-neutral-800 rounded-lg text-sm font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? "🤖 Generando con IA..." : "✨ Generar Apunte"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
