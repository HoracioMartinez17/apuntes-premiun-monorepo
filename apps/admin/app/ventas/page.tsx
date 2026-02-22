'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, isAdmin } from '../../lib/auth';
import { getPurchases, getStats, type Purchase, type Stats } from '../../lib/api';

export default function VentasPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isAuthenticated() || !isAdmin()) {
      router.push('/login');
      return;
    }

    loadData();
  }, [router]);

  async function loadData() {
    try {
      const [purchasesData, statsData] = await Promise.all([
        getPurchases(),
        getStats(),
      ]);
      setPurchases(purchasesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredPurchases = purchases.filter(purchase => {
    const matchesFilter = 
      filter === 'all' ||
      purchase.status === filter;

    const matchesSearch = 
      searchQuery === '' ||
      purchase.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (purchase.customerName && purchase.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      purchase.id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'refunded':
        return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
      default:
        return 'bg-neutral-800 text-neutral-400 border-neutral-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completada';
      case 'pending': return 'Pendiente';
      case 'failed': return 'Fallida';
      case 'refunded': return 'Reembolsada';
      default: return status;
    }
  };

  const getPaymentMethodIcon = (method?: string) => {
    if (!method) return '💳';
    switch (method) {
      case 'card': return '💳';
      case 'paypal': return '🅿️';
      case 'google_pay': return '🔵';
      default: return '💳';
    }
  };

  const getPaymentMethodText = (method?: string) => {
    if (!method) return 'Tarjeta';
    switch (method) {
      case 'card': return 'Tarjeta';
      case 'paypal': return 'PayPal';
      case 'google_pay': return 'Google Pay';
      default: return method;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          <p className="text-neutral-400">Cargando ventas...</p>
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
                onClick={() => router.push('/')}
                className="text-neutral-400 hover:text-white transition-colors flex items-center gap-2 group"
              >
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Volver al inicio
              </button>
              <div className="h-6 w-px bg-neutral-700"></div>
              <h1 className="text-xl font-bold text-white">Ventas y Reportes</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalSales}</p>
                  <p className="text-sm text-neutral-400">Ventas Totales</p>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">${stats.totalRevenue.toFixed(2)}</p>
                  <p className="text-sm text-neutral-400">Ingresos Totales</p>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 rounded-lg">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.pendingPurchases}</p>
                  <p className="text-sm text-neutral-400">Pendientes</p>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stats.failedPurchases}</p>
                  <p className="text-sm text-neutral-400">Fallidas</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Methods Breakdown */}
        {stats && Object.keys(stats.byPaymentMethod).length > 0 && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Ventas por Método de Pago</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats.byPaymentMethod).map(([method, count]) => (
                <div key={method} className="flex items-center justify-between p-4 bg-neutral-950 border border-neutral-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getPaymentMethodIcon(method)}</span>
                    <span className="text-sm font-medium text-neutral-300">
                      {getPaymentMethodText(method)}
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-6">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cliente, email o ID de transacción..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              <svg className="absolute left-3 top-3.5 w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              Todas <span className="ml-1 opacity-70">({purchases.length})</span>
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'completed'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              Completadas <span className="ml-1 opacity-70">({purchases.filter(p => p.status === 'completed').length})</span>
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'pending'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              Pendientes <span className="ml-1 opacity-70">({purchases.filter(p => p.status === 'pending').length})</span>
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'failed'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              Fallidas <span className="ml-1 opacity-70">({purchases.filter(p => p.status === 'failed').length})</span>
            </button>
          </div>
        </div>

        {/* Purchases List */}
        {filteredPurchases.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-12 text-center">
            <svg className="w-16 h-16 text-neutral-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <p className="text-neutral-400 text-lg">No hay ventas para mostrar</p>
            <p className="text-neutral-500 text-sm mt-2">Intenta ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPurchases.map((purchase) => (
              <div
                key={purchase.id}
                className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-neutral-700 transition-all"
              >
                <div className="flex items-start justify-between gap-6">
                  {/* Customer Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {(purchase.customerName || purchase.customerEmail)[0].toUpperCase()}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {purchase.customerName || 'Cliente'}
                        </h3>
                        <span className={`px-2 py-1 rounded-md text-xs font-semibold border flex-shrink-0 ${getStatusColor(purchase.status)}`}>
                          {getStatusText(purchase.status)}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="truncate">{purchase.customerEmail}</span>
                        </div>
                        
                        {purchase.user && (
                          <div className="flex items-center gap-2 text-sm text-neutral-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>Usuario registrado: {purchase.user.email}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-sm text-neutral-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            {new Date(purchase.createdAt).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details */}
                  <div className="flex items-start gap-4">
                    {/* Amount */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white mb-1">
                        ${(purchase.amount / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-neutral-500 uppercase">
                        {purchase.currency}
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-center min-w-[120px]">
                      <div className="text-2xl mb-1">{getPaymentMethodIcon(purchase.paymentMethod)}</div>
                      <div className="text-xs text-neutral-400">{getPaymentMethodText(purchase.paymentMethod)}</div>
                    </div>

                    {/* Transaction ID */}
                    <div className="text-right">
                      <div className="text-xs text-neutral-500 mb-1">ID Transacción</div>
                      <div className="text-xs font-mono text-neutral-400 bg-neutral-950 px-2 py-1 rounded border border-neutral-800">
                        {purchase.id.substring(0, 8)}...
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
