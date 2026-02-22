'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, isAdmin, getUser } from '../lib/auth';
import { getStats, Stats } from '../lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    console.log('Dashboard mounted, checking localStorage...');
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    console.log('localStorage on mount:', {
      token: token ? `${token.substring(0, 20)}...` : null,
      user: user ? JSON.parse(user) : null,
      tokenLength: token?.length
    });

    // Small delay to ensure localStorage is ready
    const timer = setTimeout(() => {
      const authenticated = isAuthenticated();
      const admin = isAdmin();
      
      console.log('Auth check:', { authenticated, admin, user: getUser() });

      if (!authenticated || !admin) {
        router.replace('/login');
        return;
      }

      loadStats();
    }, 100);

    return () => clearTimeout(timer);
  }, [mounted, router]);

  async function loadStats() {
    console.log('[loadStats] Starting to load stats...');
    try {
      const data = await getStats();
      console.log('[loadStats] Stats loaded successfully:', data);
      setStats(data);
    } catch (error) {
      console.error('[loadStats] Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-neutral-800 border-t-white"></div>
          <p className="text-sm text-neutral-400">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Navbar */}
      <nav className="bg-neutral-900 border-b border-neutral-800 sticky top-0 z-10 backdrop-blur-xl bg-neutral-900/80">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-lg font-semibold text-white">Admin - Apuntes Premium</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-400">Admin</span>
              <button className="text-sm text-red-400 hover:text-red-300 transition-colors">
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Panel de Administración
          </h2>
          <p className="text-neutral-400">Gestiona apuntes, usuarios y ventas</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-400 mb-1">Ventas Totales</p>
                  <p className="text-3xl font-bold text-white">{stats.totalSales}</p>
                </div>
                <div className="bg-green-500/10 rounded-lg p-3">
                  <svg
                    className="h-6 w-6 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-400 mb-1">Ingresos</p>
                  <p className="text-3xl font-bold text-white">
                    ${stats.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-blue-500/10 rounded-lg p-3">
                  <svg
                    className="h-6 w-6 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-400 mb-1">Pendientes</p>
                  <p className="text-3xl font-bold text-white">{stats.pendingPurchases}</p>
                </div>
                <div className="bg-yellow-500/10 rounded-lg p-3">
                  <svg
                    className="h-6 w-6 text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-neutral-700 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-neutral-400 mb-1">Fallidas</p>
                  <p className="text-3xl font-bold text-white">{stats.failedPurchases}</p>
                </div>
                <div className="bg-red-500/10 rounded-lg p-3">
                  <svg
                    className="h-6 w-6 text-red-400"
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
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => router.push('/apuntes')}
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-neutral-700 hover:bg-neutral-800 transition-all text-left group"
          >
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
              Gestión de Apuntes
            </h3>
            <p className="text-sm text-neutral-400 mb-4">Crear, editar y eliminar apuntes</p>
            <span className="text-blue-400 font-medium inline-flex items-center gap-2">
              Ir a Apuntes 
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </button>

          <button
            onClick={() => router.push('/usuarios')}
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-neutral-700 hover:bg-neutral-800 transition-all text-left group"
          >
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-green-400 transition-colors">
              Gestión de Usuarios
            </h3>
            <p className="text-sm text-neutral-400 mb-4">Ver y administrar usuarios</p>
            <span className="text-green-400 font-medium inline-flex items-center gap-2">
              Ir a Usuarios
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </button>

          <button
            onClick={() => router.push('/ventas')}
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-neutral-700 hover:bg-neutral-800 transition-all text-left group"
          >
            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
              Reportes de Ventas
            </h3>
            <p className="text-sm text-neutral-400 mb-4">Ver estadísticas y reportes</p>
            <span className="text-purple-400 font-medium inline-flex items-center gap-2">
              Ver Reportes
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}
