"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, isAdmin } from "../../lib/auth";
import {
  getUsers,
  updateUserAccess,
  deleteUser,
  createUser,
  generateUserAccessToken,
  type User,
} from "../../lib/api";
import { useToast } from "../../components/ToastProvider";

export default function UsuariosPage() {
  const router = useRouter();
  const { notify } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "admin" | "user" | "access" | "no-access">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"user" | "admin">("user");
  const [newUserAccess, setNewUserAccess] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [generatedToken, setGeneratedToken] = useState("");
  const [tokenUserLabel, setTokenUserLabel] = useState("");
  const [deleteUserTarget, setDeleteUserTarget] = useState<User | null>(null);

  useEffect(() => {
    if (!isAuthenticated() || !isAdmin()) {
      router.push("/login");
      return;
    }

    loadUsers();
  }, [router]);

  async function loadUsers() {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAccess(userId: string, currentAccess: boolean) {
    try {
      const updated = await updateUserAccess(userId, !currentAccess);
      setUsers(users.map((u) => (u.id === userId ? updated : u)));
    } catch (error) {
      console.error("Error updating user access:", error);
      notify("Error al actualizar el acceso", "error");
    }
  }

  async function handleChangeRole(userId: string, newRole: "user" | "admin") {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:3001/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) throw new Error("Error al cambiar rol");

      const updated = await response.json();
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error("Error changing role:", error);
      notify("Error al cambiar el rol", "error");
    }
  }

  async function handleDelete(userId: string) {
    try {
      await deleteUser(userId);
      setUsers(users.filter((u) => u.id !== userId));
      setDeleteUserTarget(null);
    } catch (error) {
      console.error("Error deleting user:", error);
      notify("Error al eliminar el usuario", "error");
    }
  }

  async function handleCreateUser() {
    if (!newUserEmail || !newUserEmail.includes("@")) {
      notify("Ingresa un email válido", "info");
      return;
    }

    if (!newUserPassword || newUserPassword.length < 6) {
      notify("La contraseña debe tener al menos 6 caracteres", "info");
      return;
    }

    setCreating(true);
    try {
      const created = await createUser({
        email: newUserEmail.trim(),
        password: newUserPassword,
        name: newUserName.trim() || undefined,
        role: newUserRole,
        hasAccess: newUserAccess,
      });

      setUsers([created, ...users]);
      setShowCreateModal(false);
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      setNewUserRole("user");
      setNewUserAccess(false);
    } catch (error) {
      console.error("Error creating user:", error);
      notify("Error al crear el usuario", "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleGenerateToken(userId: string, label: string) {
    try {
      const result = await generateUserAccessToken(userId);
      setGeneratedToken(result.token);
      setTokenUserLabel(label);
      setShowTokenModal(true);
      if (!result.emailSent) {
        notify("Token generado, pero no se pudo enviar el email", "info", 6000);
      }
    } catch (error) {
      console.error("Error generating token:", error);
      notify("Error al generar el token", "error");
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "admin" && user.role === "admin") ||
      (filter === "user" && user.role === "user") ||
      (filter === "access" && user.hasAccess) ||
      (filter === "no-access" && !user.hasAccess);

    const matchesSearch =
      searchQuery === "" ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: users.length,
    withAccess: users.filter((u) => u.hasAccess).length,
    withoutAccess: users.filter((u) => !u.hasAccess).length,
    admins: users.filter((u) => u.role === "admin").length,
    regularUsers: users.filter((u) => u.role === "user").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="text-neutral-400">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Header */}
      <nav className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="text-neutral-400 hover:text-white transition-colors flex items-center gap-2 group"
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
                Volver al inicio
              </button>
              <div className="h-6 w-px bg-neutral-700"></div>
              <h1 className="text-xl font-bold text-white">Gestión de Usuarios</h1>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              Crear usuario
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-neutral-400">Total</p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg">
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.withAccess}</p>
                <p className="text-sm text-neutral-400">Con Acceso</p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <svg
                  className="w-6 h-6 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.withoutAccess}</p>
                <p className="text-sm text-neutral-400">Sin Acceso</p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <svg
                  className="w-6 h-6 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.admins}</p>
                <p className="text-sm text-neutral-400">Admins</p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 rounded-lg">
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.regularUsers}</p>
                <p className="text-sm text-neutral-400">Usuarios</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-6">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <svg
                className="absolute left-3 top-3.5 w-5 h-5 text-neutral-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === "all"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              }`}
            >
              Todos <span className="ml-1 opacity-70">({stats.total})</span>
            </button>
            <button
              onClick={() => setFilter("access")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === "access"
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              }`}
            >
              Con Acceso <span className="ml-1 opacity-70">({stats.withAccess})</span>
            </button>
            <button
              onClick={() => setFilter("no-access")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === "no-access"
                  ? "bg-red-600 text-white shadow-md"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              }`}
            >
              Sin Acceso <span className="ml-1 opacity-70">({stats.withoutAccess})</span>
            </button>
            <button
              onClick={() => setFilter("admin")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === "admin"
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              }`}
            >
              Admins <span className="ml-1 opacity-70">({stats.admins})</span>
            </button>
            <button
              onClick={() => setFilter("user")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === "user"
                  ? "bg-amber-600 text-white shadow-md"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              }`}
            >
              Usuarios <span className="ml-1 opacity-70">({stats.regularUsers})</span>
            </button>
          </div>
        </div>

        {/* Users Grid */}
        {filteredUsers.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-12 text-center">
            <svg
              className="w-16 h-16 text-neutral-700 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-neutral-400 text-lg">No hay usuarios para mostrar</p>
            <p className="text-neutral-500 text-sm mt-2">
              Intenta ajustar los filtros de búsqueda
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-neutral-700 transition-all group"
              >
                <div className="flex items-center justify-between">
                  {/* User Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-white">
                          {user.name || "Sin nombre"}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-semibold ${
                            user.role === "admin"
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                              : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                          }`}
                        >
                          {user.role === "admin" ? "👑 Admin" : "👤 Usuario"}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-400 mt-1">{user.email}</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Registrado el{" "}
                        {new Date(user.createdAt).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    {/* Access Toggle */}
                    <button
                      onClick={() => handleToggleAccess(user.id, user.hasAccess)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        user.hasAccess
                          ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${user.hasAccess ? "bg-green-500" : "bg-red-500"}`}
                      ></div>
                      {user.hasAccess ? "Activo" : "Sin acceso"}
                    </button>

                    {/* Change Role */}
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowRoleModal(true);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700 hover:text-white transition-all"
                    >
                      Cambiar Rol
                    </button>

                    <button
                      onClick={() => handleGenerateToken(user.id, user.email)}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700 hover:text-white transition-all"
                    >
                      Generar token
                    </button>

                    {/* Delete */}
                    {user.role !== "admin" && (
                      <button
                        onClick={() => setDeleteUserTarget(user)}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {deleteUserTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-3">Eliminar usuario</h3>
            <p className="text-neutral-400 mb-6">
              ¿Seguro que deseas eliminar{" "}
              <span className="text-white font-semibold">
                {deleteUserTarget.name || deleteUserTarget.email}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteUserTarget(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteUserTarget.id)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Cambiar Rol de Usuario</h3>
            <p className="text-neutral-400 mb-6">
              ¿Qué rol deseas asignar a{" "}
              <span className="text-white font-semibold">
                {selectedUser.name || selectedUser.email}
              </span>
              ?
            </p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleChangeRole(selectedUser.id, "user")}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  selectedUser.role === "user"
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-semibold">👤 Usuario Regular</p>
                    <p className="text-sm text-neutral-400">
                      Acceso solo a contenido publicado
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleChangeRole(selectedUser.id, "admin")}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  selectedUser.role === "admin"
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <svg
                      className="w-6 h-6 text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-semibold">👑 Administrador</p>
                    <p className="text-sm text-neutral-400">Control total del sistema</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Crear usuario</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-neutral-400 mb-2">Email</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="usuario@correo.com"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">Nombre</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Nombre del usuario"
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-400 mb-2">Contraseña</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Minimo 6 caracteres"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Rol</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as "user" | "admin")}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="user">Usuario</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">Acceso</label>
                  <button
                    type="button"
                    onClick={() => setNewUserAccess(!newUserAccess)}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      newUserAccess
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                    }`}
                  >
                    {newUserAccess ? "Activo" : "Sin acceso"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateUser}
                disabled={creating}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
              >
                {creating ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTokenModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-2">Token generado</h3>
            <p className="text-sm text-neutral-400 mb-4">
              Token para{" "}
              <span className="text-white font-semibold">{tokenUserLabel}</span>
            </p>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-300 break-all mb-4">
              {generatedToken}
            </div>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(generatedToken);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Copiar
              </button>
              <button
                onClick={() => {
                  setShowTokenModal(false);
                  setGeneratedToken("");
                  setTokenUserLabel("");
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
