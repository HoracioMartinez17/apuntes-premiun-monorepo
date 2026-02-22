"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, isAdmin } from "../../lib/auth";
import { getApuntes, deleteApunte, type Apunte } from "../../lib/api";
import { useToast } from "../../components/ToastProvider";

export default function ApuntesPage() {
  const router = useRouter();
  const { notify } = useToast();
  const [apuntes, setApuntes] = useState<Apunte[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(
    null,
  );

  useEffect(() => {
    if (!isAuthenticated() || !isAdmin()) {
      router.push("/login");
      return;
    }

    loadApuntes();
  }, [router]);

  async function loadApuntes() {
    try {
      const data = await getApuntes();
      setApuntes(data);
    } catch (error) {
      console.error("Error loading apuntes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteApunte(id);
      setApuntes(apuntes.filter((a) => a.id !== id));
      setDeleteTarget(null);
    } catch (error) {
      console.error("Error deleting apunte:", error);
      notify("Error al eliminar el apunte", "error");
    }
  }

  async function togglePublished(id: string, currentStatus: boolean) {
    try {
      const { updateApunte } = await import("../../lib/api");
      await updateApunte(id, { published: !currentStatus });
      setApuntes(
        apuntes.map((a) => (a.id === id ? { ...a, published: !currentStatus } : a)),
      );
    } catch (error) {
      console.error("Error updating apunte:", error);
      notify("Error al actualizar el apunte", "error");
    }
  }

  const filteredApuntes = apuntes.filter((apunte) => {
    if (filter === "published") return apunte.published;
    if (filter === "draft") return !apunte.published;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-neutral-800 border-t-white"></div>
          <p className="text-sm text-neutral-400">Cargando apuntes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Navbar - Estilo Vercel */}
      <nav className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10 backdrop-blur-xl bg-neutral-900/80">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
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
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Volver
              </button>
              <h1 className="text-lg font-semibold text-white">Gestión de Apuntes</h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Header con estadísticas */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Apuntes</h2>
              <p className="text-neutral-400 text-sm">
                Administra y organiza tu contenido educativo
              </p>
            </div>
            <button
              onClick={() => router.push("/apuntes/nuevo")}
              className="inline-flex items-center gap-2 bg-white text-black px-4 py-2.5 rounded-lg hover:bg-neutral-200 transition-all shadow-sm hover:shadow font-medium text-sm"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Crear Apunte
            </button>
          </div>

          {/* Sugerencias de temas para generar con IA */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20 p-5 mb-6">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white mb-1">
                  Generar con IA - Temas Sugeridos
                </h3>
                <p className="text-xs text-neutral-400 mb-3">
                  Click en cualquier tema para crear un curso completo automáticamente
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "React Hooks Avanzado",
                    "TypeScript y Patrones de Diseño",
                    "Node.js y Express API RESTful",
                    "Next.js 14 y App Router",
                    "Docker y Kubernetes para Desarrolladores",
                    "PostgreSQL Avanzado",
                    "Testing con Jest y React Testing Library",
                    "GraphQL con Apollo Server",
                    "Microservicios con NestJS",
                    "Vue 3 Composition API",
                    "Python FastAPI",
                    "MongoDB y Mongoose",
                    "CI/CD con GitHub Actions",
                    "AWS Lambda y Serverless",
                    "Redux Toolkit",
                    "Tailwind CSS Avanzado",
                    "WebSockets y Socket.io",
                    "Authentication con JWT",
                    "React Native",
                    "Prisma ORM",
                  ].map((tema) => (
                    <button
                      key={tema}
                      onClick={() =>
                        router.push(
                          `/apuntes/nuevo?ai=true&topic=${encodeURIComponent(tema)}`,
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-neutral-300 text-xs font-medium rounded-md border border-neutral-800 hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-400 transition-all"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      {tema}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-5 hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-400 mb-1">Total</p>
                  <p className="text-3xl font-bold text-white">{apuntes.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-neutral-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-5 hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-400 mb-1">Publicados</p>
                  <p className="text-3xl font-bold text-green-400">
                    {apuntes.filter((a) => a.published).length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-400"
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
                </div>
              </div>
            </div>
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-5 hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-400 mb-1">Borradores</p>
                  <p className="text-3xl font-bold text-amber-400">
                    {apuntes.filter((a) => !a.published).length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters - Estilo Vercel Tabs */}
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 mb-6 overflow-hidden">
          <div className="flex border-b border-neutral-800">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 px-6 py-3.5 text-sm font-medium transition-all relative ${
                filter === "all"
                  ? "text-white bg-neutral-800"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
              }`}
            >
              Todos
              {filter === "all" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
              )}
            </button>
            <button
              onClick={() => setFilter("published")}
              className={`flex-1 px-6 py-3.5 text-sm font-medium transition-all relative ${
                filter === "published"
                  ? "text-white bg-neutral-800"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
              }`}
            >
              Publicados
              {filter === "published" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
              )}
            </button>
            <button
              onClick={() => setFilter("draft")}
              className={`flex-1 px-6 py-3.5 text-sm font-medium transition-all relative ${
                filter === "draft"
                  ? "text-white bg-neutral-800"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800/50"
              }`}
            >
              Borradores
              {filter === "draft" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"></div>
              )}
            </button>
          </div>
        </div>

        {/* Apuntes Cards Grid */}
        <div className="space-y-3">
          {filteredApuntes.length === 0 ? (
            <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-neutral-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="text-white font-medium mb-1">No hay apuntes</p>
              <p className="text-neutral-400 text-sm">
                Crea tu primer apunte para comenzar
              </p>
            </div>
          ) : (
            filteredApuntes.map((apunte) => (
              <div
                key={apunte.id}
                className="bg-neutral-900 rounded-lg border border-neutral-800 p-5 hover:border-neutral-700 hover:bg-neutral-800/50 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-white truncate">
                        {apunte.title}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          apunte.published
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${apunte.published ? "bg-green-400" : "bg-amber-400"}`}
                        ></span>
                        {apunte.published ? "Publicado" : "Borrador"}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-neutral-400">
                      <span className="flex items-center gap-1.5">
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
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                        {apunte.category || "Sin categoría"}
                      </span>
                      <span className="flex items-center gap-1.5">
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
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {new Date(apunte.createdAt).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => togglePublished(apunte.id, apunte.published)}
                      className={`p-2 rounded-lg border transition-all hover:shadow-sm ${
                        apunte.published
                          ? "border-neutral-800 hover:border-amber-500/50 hover:bg-amber-500/10 text-neutral-400 hover:text-amber-400"
                          : "border-neutral-800 hover:border-green-500/50 hover:bg-green-500/10 text-neutral-400 hover:text-green-400"
                      }`}
                      title={apunte.published ? "Despublicar" : "Publicar"}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        {apunte.published ? (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                          />
                        ) : (
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        )}
                      </svg>
                    </button>
                    <button
                      onClick={() => router.push(`/apuntes/${apunte.id}`)}
                      className="p-2 rounded-lg border border-neutral-800 hover:border-blue-500/50 hover:bg-blue-500/10 text-neutral-400 hover:text-blue-400 transition-all hover:shadow-sm"
                      title="Editar"
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() =>
                        setDeleteTarget({ id: apunte.id, title: apunte.title })
                      }
                      className="p-2 rounded-lg border border-neutral-800 hover:border-red-500/50 hover:bg-red-500/10 text-neutral-400 hover:text-red-400 transition-all hover:shadow-sm"
                      title="Eliminar"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-3">Eliminar apunte</h3>
            <p className="text-neutral-400 mb-6">
              ¿Seguro que deseas eliminar{" "}
              <span className="text-white font-semibold">{deleteTarget.title}</span>? Esta
              acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteTarget.id)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
