"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getApunte, updateApunte } from "../../../lib/api";
import { useToast } from "../../../components/ToastProvider";

type Lesson = {
  title: string;
  brief?: string;
  content_md?: string;
};

type Module = {
  title: string;
  lessons: Lesson[];
};

type Apunte = {
  id: string;
  title: string;
  category: string;
  modules?: Module[];
  content?: string;
  published: boolean;
};

export default function EditarApuntePage() {
  const router = useRouter();
  const { notify } = useToast();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apunte, setApunte] = useState<Apunte | null>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedCategory, setEditedCategory] = useState("");
  const [initialModulesSnapshot, setInitialModulesSnapshot] = useState("");
  const [initialContentSnapshot, setInitialContentSnapshot] = useState("");
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0]));
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    loadApunte();
  }, [params.id]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isFullscreen]);

  async function loadApunte() {
    try {
      const data = await getApunte(params.id as string);
      setApunte(data);
      setEditedTitle(data.title);
      setEditedCategory(data.category);
      setInitialModulesSnapshot(JSON.stringify(data.modules ?? null));
      setInitialContentSnapshot(data.content ?? "");
    } catch (error) {
      console.error("Error:", error);
      notify("Error al cargar el apunte", "error", 5000);
      router.push("/apuntes");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!apunte) return;

    // Validar que al menos el título tenga contenido
    if (!editedTitle || editedTitle.trim() === "") {
      notify("El título no puede estar vacío", "error");
      return;
    }

    try {
      // Solo enviar los campos que han sido modificados
      const updateData: any = {};
      const currentModulesSnapshot = JSON.stringify(apunte.modules ?? null);
      const currentContentSnapshot = apunte.content ?? "";

      if (editedTitle !== apunte.title) {
        updateData.title = editedTitle;
      }

      if (editedCategory !== apunte.category) {
        updateData.category = editedCategory;
      }

      if (currentModulesSnapshot !== initialModulesSnapshot) {
        updateData.modules = apunte.modules;
      }

      if (currentContentSnapshot !== initialContentSnapshot) {
        updateData.content = apunte.content;
      }

      if (Object.keys(updateData).length === 0) {
        notify("No hay cambios para guardar", "info");
        return;
      }

      setSaving(true);

      await updateApunte(apunte.id, updateData);

      notify("Apunte guardado correctamente", "success");
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      const errorMsg = error instanceof Error ? error.message : "Error desconocido";
      notify(`Error al guardar el apunte: ${errorMsg}`, "error", 6000);
    } finally {
      setSaving(false);
    }
  }

  const toggleModule = (idx: number) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedModules(newExpanded);
  };

  const toggleLesson = (key: string) => {
    const newExpanded = new Set(expandedLessons);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedLessons(newExpanded);
  };

  const updateLessonContent = (moduleIdx: number, lessonIdx: number, content: string) => {
    if (!apunte?.modules) return;

    const newModules = [...apunte.modules];
    newModules[moduleIdx].lessons[lessonIdx].content_md = content;
    setApunte({ ...apunte, modules: newModules });
  };

  const updateModuleTitle = (moduleIdx: number, title: string) => {
    if (!apunte?.modules) return;

    const newModules = [...apunte.modules];
    newModules[moduleIdx].title = title;
    setApunte({ ...apunte, modules: newModules });
  };

  const updateLessonTitle = (moduleIdx: number, lessonIdx: number, title: string) => {
    if (!apunte?.modules) return;

    const newModules = [...apunte.modules];
    newModules[moduleIdx].lessons[lessonIdx].title = title;
    setApunte({ ...apunte, modules: newModules });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-neutral-400">Cargando apunte...</p>
        </div>
      </div>
    );
  }

  if (!apunte) return null;

  const hasModules =
    apunte.modules && Array.isArray(apunte.modules) && apunte.modules.length > 0;
  const totalLessons = hasModules
    ? apunte.modules.reduce((acc, m) => acc + m.lessons.length, 0)
    : 0;

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-neutral-950 overflow-hidden flex flex-col"
          : "min-h-screen bg-neutral-950"
      }
    >
      {/* Header */}
      <nav
        className={
          isFullscreen
            ? "bg-neutral-900 border-b border-neutral-800 flex-shrink-0"
            : "bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10"
        }
      >
        <div
          className={isFullscreen ? "w-full px-6 py-4" : "max-w-7xl mx-auto px-6 py-4"}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <button
                onClick={() => router.push("/apuntes")}
                className="text-neutral-400 hover:text-white transition-colors mb-3 flex items-center gap-2 group"
              >
                <svg
                  className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Volver a Apuntes
              </button>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-2xl font-bold bg-transparent border-b-2 border-transparent hover:border-neutral-700 focus:border-blue-500 outline-none text-white pb-1 transition-colors"
                  placeholder="Título del apunte"
                />
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${apunte.published ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}
                >
                  {apunte.published ? "Publicado" : "Borrador"}
                </span>
              </div>
              {hasModules && (
                <p className="text-sm text-neutral-400 mt-2">
                  {apunte.modules.length} módulos • {totalLessons} lecciones
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors flex items-center gap-2"
                title={
                  isFullscreen ? "Salir de pantalla completa (Esc)" : "Pantalla completa"
                }
              >
                {isFullscreen ? (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Salir
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                      />
                    </svg>
                    Pantalla completa
                  </>
                )}
              </button>
              <button
                onClick={() => router.push("/apuntes")}
                className="px-4 py-2 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Guardar cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main
        className={
          isFullscreen
            ? "flex-1 overflow-y-auto px-6 py-8 w-full"
            : "max-w-7xl mx-auto px-6 py-8"
        }
      >
        <div className={isFullscreen ? "w-full" : ""}>
          {/* Metadata Section */}
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Metadata</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Categoría
                </label>
                <select
                  value={editedCategory}
                  onChange={(e) => setEditedCategory(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="React">React</option>
                  <option value="Node.js">Node.js</option>
                  <option value="TypeScript">TypeScript</option>
                  <option value="JavaScript">JavaScript</option>
                  <option value="CSS">CSS</option>
                  <option value="HTML">HTML</option>
                  <option value="Base de Datos">Base de Datos</option>
                  <option value="DevOps">DevOps</option>
                  <option value="Testing">Testing</option>
                  <option value="Arquitectura">Arquitectura</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">
                  Estado
                </label>
                <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2">
                  <span
                    className={`w-2 h-2 rounded-full ${apunte.published ? "bg-green-500" : "bg-amber-500"}`}
                  ></span>
                  <span className="text-white">
                    {apunte.published ? "Publicado" : "Borrador"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content Editor */}
          {hasModules ? (
            <div className="space-y-4">
              {apunte.modules.map((module, modIdx) => {
                const isModuleExpanded = expandedModules.has(modIdx);

                return (
                  <div
                    key={modIdx}
                    className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden"
                  >
                    {/* Module Header */}
                    <div className="p-4 border-b border-neutral-800 bg-neutral-900/50">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleModule(modIdx)}
                          className="text-neutral-400 hover:text-white transition-colors"
                        >
                          <svg
                            className={`w-5 h-5 transition-transform ${isModuleExpanded ? "rotate-90" : ""}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                        <span className="text-neutral-500 font-mono text-sm">
                          {modIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={module.title}
                          onChange={(e) => updateModuleTitle(modIdx, e.target.value)}
                          className="flex-1 bg-transparent text-white font-semibold text-lg border-b-2 border-transparent hover:border-neutral-700 focus:border-blue-500 outline-none pb-1 transition-colors"
                          placeholder="Título del módulo"
                        />
                        <span className="text-xs text-neutral-500">
                          {module.lessons.length} lecciones
                        </span>
                      </div>
                    </div>

                    {/* Lessons */}
                    {isModuleExpanded && (
                      <div className="divide-y divide-neutral-800">
                        {module.lessons.map((lesson, lesIdx) => {
                          const lessonKey = `${modIdx}-${lesIdx}`;
                          const isLessonExpanded = expandedLessons.has(lessonKey);

                          return (
                            <div key={lesIdx} className="bg-neutral-950/50">
                              {/* Lesson Header */}
                              <div className="p-4 flex items-center gap-3">
                                <button
                                  onClick={() => toggleLesson(lessonKey)}
                                  className="text-neutral-400 hover:text-white transition-colors"
                                >
                                  <svg
                                    className={`w-4 h-4 transition-transform ${isLessonExpanded ? "rotate-90" : ""}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 5l7 7-7 7"
                                    />
                                  </svg>
                                </button>
                                <span className="text-neutral-600 font-mono text-sm">
                                  {modIdx + 1}.{lesIdx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={lesson.title}
                                  onChange={(e) =>
                                    updateLessonTitle(modIdx, lesIdx, e.target.value)
                                  }
                                  className="flex-1 bg-transparent text-neutral-300 font-medium border-b border-transparent hover:border-neutral-700 focus:border-blue-500 outline-none pb-1 transition-colors"
                                  placeholder="Título de la lección"
                                />
                              </div>

                              {/* Lesson Content Editor */}
                              {isLessonExpanded && (
                                <div className="p-4 pt-0">
                                  <textarea
                                    value={lesson.content_md || ""}
                                    onChange={(e) =>
                                      updateLessonContent(modIdx, lesIdx, e.target.value)
                                    }
                                    className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-4 text-neutral-300 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                                    rows={20}
                                    placeholder="Contenido en Markdown..."
                                  />
                                  <p className="text-xs text-neutral-500 mt-2">
                                    Usa Markdown para formatear el contenido. Los ejemplos
                                    de código deben usar \`\`\`html para CSS con preview.
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6">
              <label className="block text-sm font-medium text-neutral-400 mb-2">
                Contenido
              </label>
              <textarea
                value={apunte.content || ""}
                onChange={(e) => setApunte({ ...apunte, content: e.target.value })}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-neutral-300 font-mono text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
                rows={30}
                placeholder="Contenido del apunte..."
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
