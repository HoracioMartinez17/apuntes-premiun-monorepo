import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodePlayground from "./CodePlayground";

interface Lesson {
  title: string;
  brief?: string;
  content?: string;
  content_md?: string;
}

interface Module {
  title: string;
  lessons: Lesson[];
}

interface CourseViewerProps {
  course: {
    title: string;
    modules: Module[];
  };
  "client:load"?: boolean;
  "client:idle"?: boolean;
  "client:visible"?: boolean;
  "client:media"?: string;
  "client:only"?: string;
}

export default function CourseViewer({ course }: CourseViewerProps) {
  const [selectedModule, setSelectedModule] = useState(0);
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set([0]));

  // Cargar progreso desde localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`course-progress-${course.title}`);
      if (saved) {
        setCompletedLessons(new Set(JSON.parse(saved)));
      }
    }
  }, [course.title]);

  // Guardar progreso en localStorage
  const saveProgress = (newCompleted: Set<string>) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        `course-progress-${course.title}`,
        JSON.stringify([...newCompleted]),
      );
    }
  };

  const toggleLessonComplete = (moduleIdx: number, lessonIdx: number) => {
    const lessonKey = `${moduleIdx}-${lessonIdx}`;
    const newCompleted = new Set(completedLessons);

    if (newCompleted.has(lessonKey)) {
      newCompleted.delete(lessonKey);
    } else {
      newCompleted.add(lessonKey);
    }

    setCompletedLessons(newCompleted);
    saveProgress(newCompleted);
  };

  const isLessonCompleted = (moduleIdx: number, lessonIdx: number) => {
    return completedLessons.has(`${moduleIdx}-${lessonIdx}`);
  };

  const toggleModuleExpanded = (modIdx: number) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(modIdx)) {
      newExpanded.delete(modIdx);
    } else {
      newExpanded.add(modIdx);
    }
    setExpandedModules(newExpanded);
  };

  const currentLessonKey = `${selectedModule}-${selectedLesson}`;
  const isCurrentLessonCompleted = completedLessons.has(currentLessonKey);

  // Calcular índice global de la lección actual
  let currentLessonGlobalIndex = 1;
  for (let i = 0; i < selectedModule; i++) {
    currentLessonGlobalIndex += course.modules[i].lessons.length;
  }
  currentLessonGlobalIndex += selectedLesson + 1;

  // Validación inicial
  if (!course || !course.modules || course.modules.length === 0) {
    return <div className="p-8 text-center">No hay contenido disponible</div>;
  }

  const currentModule = course.modules[selectedModule];
  const currentLesson = currentModule?.lessons[selectedLesson];
  const totalLessons = course.modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const completedCount = completedLessons.size;
  const progressPercentage = Math.round((completedCount / totalLessons) * 100);

  if (!currentLesson) {
    return <div className="p-8 text-center">Lección no encontrada</div>;
  }

  // Obtener el contenido
  const lessonContent = currentLesson.content || currentLesson.content_md;

  if (!lessonContent || typeof lessonContent !== "string") {
    console.error("Content no válido:", currentLesson);
    return (
      <div className="p-8 text-center text-red-600">
        Error: El contenido de la lección no está disponible
      </div>
    );
  }

  // Calcular número global de lección
  const getLessonGlobalNumber = (modIdx: number, lesIdx: number) => {
    let num = 1;
    for (let i = 0; i < modIdx; i++) {
      num += course.modules[i].lessons.length;
    }
    return num + lesIdx;
  };

  // Navegación entre lecciones
  const goToPreviousLesson = () => {
    if (selectedLesson > 0) {
      // Hay lección anterior en el mismo módulo
      setSelectedLesson(selectedLesson - 1);
    } else if (selectedModule > 0) {
      // Ir al módulo anterior, última lección
      const prevModule = selectedModule - 1;
      setSelectedModule(prevModule);
      setSelectedLesson(course.modules[prevModule].lessons.length - 1);
      // Expandir el módulo anterior
      setExpandedModules(new Set([...expandedModules, prevModule]));
    }
  };

  const goToNextLesson = () => {
    if (selectedLesson < currentModule.lessons.length - 1) {
      // Hay lección siguiente en el mismo módulo
      setSelectedLesson(selectedLesson + 1);
    } else if (selectedModule < course.modules.length - 1) {
      // Ir al siguiente módulo, primera lección
      const nextModule = selectedModule + 1;
      setSelectedModule(nextModule);
      setSelectedLesson(0);
      // Expandir el siguiente módulo
      setExpandedModules(new Set([...expandedModules, nextModule]));
    }
  };

  const hasPreviousLesson = selectedModule > 0 || selectedLesson > 0;
  const hasNextLesson = 
    selectedModule < course.modules.length - 1 || 
    selectedLesson < currentModule.lessons.length - 1;

  return (
    <div className="flex min-h-screen bg-neutral-950">
      <aside className="w-96 bg-neutral-900 border-r border-neutral-800 overflow-y-auto sticky top-0 h-screen">
        <div className="p-6 border-b border-neutral-800 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700">
          <a 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-blue-100 hover:text-white transition-colors mb-4 group"
          >
            <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="text-sm font-medium">Volver al inicio</span>
          </a>
          <h2 className="text-white font-bold text-xl mb-3">{course.title}</h2>
          <p className="text-blue-100 text-sm flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm2 0v8h12V6H4z" />
              </svg>
              {course.modules.length} módulos
            </span>
            <span className="text-blue-200">•</span>
            <span className="inline-flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path
                  fillRule="evenodd"
                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clipRule="evenodd"
                />
              </svg>
              {totalLessons} lecciones
            </span>
          </p>
          {/* Barra de progreso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-blue-100">
              <span>Progreso del curso</span>
              <span className="font-semibold">
                {completedCount}/{totalLessons}
              </span>
            </div>
            <div className="w-full bg-blue-900/30 rounded-full h-2 overflow-hidden">
              <div
                className="bg-white h-full transition-all duration-500 rounded-full shadow-lg"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="text-xs text-blue-100 text-right font-semibold">
              {progressPercentage}%
            </div>
          </div>
        </div>
        <div className="p-4">
          {course.modules.map((module, modIdx) => {
            const isExpanded = expandedModules.has(modIdx);
            const moduleCompletedCount = module.lessons.filter((_, lesIdx) =>
              isLessonCompleted(modIdx, lesIdx),
            ).length;

            return (
              <div key={modIdx} className="mb-4">
                <button
                  onClick={() => toggleModuleExpanded(modIdx)}
                  className="w-full font-bold text-white mb-2 px-3 py-3 text-sm uppercase tracking-wide bg-neutral-800 rounded-lg border-l-4 border-neutral-700 hover:bg-neutral-700 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-5 h-5 text-neutral-300 group-hover:text-white transition-all duration-200 ${isExpanded ? "rotate-90" : ""}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>
                      {modIdx + 1}. {module.title}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400 font-normal">
                    {moduleCompletedCount}/{module.lessons.length}
                  </span>
                </button>
                {isExpanded && (
                  <ul className="space-y-1.5 ml-2">
                    {module.lessons.map((lesson, lesIdx) => {
                      const isActive =
                        selectedModule === modIdx && selectedLesson === lesIdx;
                      const isCompleted = isLessonCompleted(modIdx, lesIdx);
                      const globalNumber = getLessonGlobalNumber(modIdx, lesIdx);

                      return (
                        <li key={lesIdx}>
                          <button
                            onClick={() => {
                              setSelectedModule(modIdx);
                              setSelectedLesson(lesIdx);
                              // Expandir automáticamente el módulo seleccionado
                              if (!expandedModules.has(modIdx)) {
                                setExpandedModules(new Set(expandedModules).add(modIdx));
                              }
                            }}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                              isActive
                                ? "bg-gradient-to-r from-blue-900/50 to-blue-800/50 text-blue-300 font-semibold shadow-sm border-l-4 border-blue-500"
                                : isCompleted
                                  ? "text-neutral-300 hover:bg-neutral-800 border-l-4 border-green-500"
                                  : "text-neutral-400 hover:bg-neutral-800 hover:text-white border-l-4 border-transparent hover:border-neutral-600"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Círculo numerado */}
                              <div
                                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                                  isCompleted
                                    ? "bg-green-500 text-white"
                                    : isActive
                                      ? "bg-blue-600 text-white"
                                      : "bg-neutral-800 text-neutral-400 group-hover:bg-neutral-700"
                                }`}
                              >
                                {isCompleted ? (
                                  <svg
                                    className="w-4 h-4"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                ) : (
                                  globalNumber
                                )}
                              </div>
                              <span className="flex-1 leading-relaxed">
                                {lesson.title}
                              </span>
                              {/* Checkbox para completadas */}
                              {isCompleted && !isActive && (
                                <svg
                                  className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto bg-neutral-950">
        <div className="max-w-4xl mx-auto px-8 py-12">
          {/* Indicador de progreso y botón marcar como completada */}
          <div className="mb-8 pb-6 border-b border-neutral-800">
            <div className="flex items-start justify-between gap-6 mb-4">
              <div className="flex-1">
                <div className="text-sm font-semibold text-neutral-400 mb-2">
                  Lección {currentLessonGlobalIndex} de {totalLessons}
                </div>
                <h1 className="text-3xl font-bold text-white leading-tight">
                  {currentLesson.title}
                </h1>
              </div>
              <button
                onClick={() => toggleLessonComplete(selectedModule, selectedLesson)}
                className={`flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg ${
                  isCurrentLessonCompleted
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isCurrentLessonCompleted ? (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="whitespace-nowrap">Completada</span>
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
                    <span className="whitespace-nowrap">Marcar como completada</span>
                  </>
                )}
              </button>
            </div>
            {currentLesson.brief && (
              <p className="text-lg text-neutral-300 italic border-l-4 border-blue-500 pl-4 py-3 bg-blue-500/10 rounded-r-lg">
                {currentLesson.brief}
              </p>
            )}
          </div>

          <article className="prose prose-lg prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold text-white mb-4 mt-8">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold text-white mb-3 mt-6">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-bold text-white mb-2 mt-4">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-neutral-300 mb-4 leading-relaxed">{children}</p>
                ),
                code: ({ node, inline, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || "");
                  const language = match ? match[1] : null;

                  // Si tiene className (lenguaje) o inline es explícitamente false, es un bloque
                  const isCodeBlock = className || inline === false;

                  if (!isCodeBlock) {
                    // Código inline (backticks simples)
                    return (
                      <code className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded text-sm font-mono border border-blue-500/20">
                        {children}
                      </code>
                    );
                  }

                  // Lenguajes interactivos - usar CodePlayground
                  const interactiveLanguages = ['javascript', 'js', 'jsx', 'typescript', 'ts', 'tsx', 'html', 'css'];
                  if (language && interactiveLanguages.includes(language.toLowerCase())) {
                    return (
                      <CodePlayground 
                        code={String(children).replace(/\n$/, '')} 
                        language={language.toLowerCase()} 
                      />
                    );
                  }

                  // Para bloques de código estáticos (otros lenguajes)
                  return (
                    <div className="my-6 rounded-lg overflow-hidden shadow-lg border border-neutral-800">
                      {language && (
                        <div className="bg-neutral-900 px-4 py-2 text-xs text-neutral-400 font-mono border-b border-neutral-800 flex items-center justify-between">
                          <span>{language}</span>
                          <button
                            onClick={() =>
                              navigator.clipboard.writeText(String(children))
                            }
                            className="text-neutral-500 hover:text-neutral-300 transition-colors"
                            title="Copiar código"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                      <code className="block bg-[#1e1e1e] text-[#d4d4d4] p-6 overflow-x-auto font-mono text-sm leading-7 whitespace-pre">
                        {children}
                      </code>
                    </div>
                  );
                },
                pre: ({ children }) => <>{children}</>,
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-4 text-neutral-300 space-y-1">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-4 text-neutral-300 space-y-1">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="ml-4">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-bold text-white">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-neutral-400">{children}</em>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-500/10 italic my-4 text-neutral-300">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <table className="min-w-full divide-y divide-neutral-800 my-4">
                    {children}
                  </table>
                ),
                thead: ({ children }) => (
                  <thead className="bg-neutral-900">{children}</thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="bg-neutral-950 divide-y divide-neutral-800">
                    {children}
                  </tbody>
                ),
                tr: ({ children }) => <tr>{children}</tr>,
                th: ({ children }) => (
                  <th className="px-4 py-2 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-2 text-sm text-neutral-300">{children}</td>
                ),
              }}
            >
              {lessonContent}
            </ReactMarkdown>

            {/* Navegación entre lecciones */}
            <div className="mt-12 pt-8 border-t border-neutral-800 flex items-center justify-between gap-4">
              {hasPreviousLesson ? (
                <button
                  onClick={goToPreviousLesson}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700 transition-all duration-200 group"
                >
                  <svg 
                    className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="font-medium">Lección anterior</span>
                </button>
              ) : (
                <div></div>
              )}

              {hasNextLesson ? (
                <button
                  onClick={goToNextLesson}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 group shadow-md hover:shadow-lg"
                >
                  <span className="font-medium">Siguiente lección</span>
                  <svg 
                    className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <div className="flex items-center gap-2 px-6 py-3 text-green-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">¡Curso completado!</span>
                </div>
              )}
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
