import React, { useState, useEffect, useMemo } from 'react';
import { Partner, PartnersApiResponse } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SupplierModal } from './SupplierModal';
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  FileText,
  CheckCircle2,
  AlertCircle,
  Truck,
  DollarSign
} from 'lucide-react';
import { Button } from '../ui/Button';

export const SuppliersView: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'inventory_manager';

  const [suppliers, setSuppliers] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partner | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    setError(null);

    try {
      const res = await api.get<PartnersApiResponse>('/partners?type=supplier');
      setSuppliers(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load suppliers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const showToast = (title: string, desc: string, type: 'success' | 'error') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  const handleSupplierSaved = (saved: Partner, isEdit: boolean) => {
    showToast(
      isEdit ? 'Supplier Updated' : 'Supplier Added',
      `Supply partner "${saved.name}" has been ${isEdit ? 'updated' : 'registered in procurement registry'}.`,
      'success'
    );
    fetchSuppliers(true);
  };

  const handleDeleteSupplier = async (supplier: Partner) => {
    if (supplier.operations_count > 0) {
      showToast(
        'Cannot Delete Supplier',
        `Supplier "${supplier.name}" has ${supplier.operations_count} associated receipts. Remove receipts first or edit the partner details.`,
        'error'
      );
      return;
    }

    if (!window.confirm(`Are you sure you want to remove supplier "${supplier.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/partners/${supplier.id}`);
      showToast('Supplier Removed', `Supplier "${supplier.name}" has been removed.`, 'success');
      fetchSuppliers(true);
    } catch (err: any) {
      showToast('Action Failed', err.message || 'Unable to delete supplier.', 'error');
    }
  };

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm.trim()) return suppliers;
    const term = searchTerm.toLowerCase();

    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.contact_name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.phone.toLowerCase().includes(term) ||
        s.tax_id.toLowerCase().includes(term) ||
        s.address.toLowerCase().includes(term)
    );
  }, [suppliers, searchTerm]);

  const totalReceiptsCount = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + s.operations_count, 0);
  }, [suppliers]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl shadow-lg border flex items-start justify-between animate-in fade-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-start space-x-3">
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="text-sm font-semibold">{toastMessage.title}</h4>
              <p className="text-xs mt-0.5 opacity-90">{toastMessage.desc}</p>
            </div>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Suppliers & Vendors
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {suppliers.length} vendors
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registered procurement vendors, supply terms, contact profiles, and past inbound receipts.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchSuppliers()}
            disabled={refreshing}
            className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition"
            title="Refresh Suppliers"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {isAdminOrManager && (
            <button
              onClick={() => {
                setEditingSupplier(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center space-x-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Supplier</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Active Suppliers
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{suppliers.length}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Inbound Receipt Orders
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalReceiptsCount} POs</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Standard Terms
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">Net 30 Avg</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search suppliers by company name, contact person, email, phone, or tax ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>
      </div>

      {/* Suppliers Table & Cards */}
      {loading ? (
        <div className="py-20 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center space-y-3 text-slate-500 dark:text-slate-400">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading suppliers registry...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center p-6 space-y-3">
          <Building2 className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No suppliers found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {searchTerm ? 'Try adjusting your search criteria.' : 'Register your first procurement supplier using the button above.'}
          </p>
          {isAdminOrManager && (
            <Button onClick={() => setIsModalOpen(true)} className="mt-2">
              <Plus className="w-4 h-4 mr-1" /> Add Supplier Now
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Contact Details</th>
                  <th className="py-3 px-4">Address & Tax ID</th>
                  <th className="py-3 px-3 text-center">Payment Terms</th>
                  <th className="py-3 px-3 text-center">Inbound POs</th>
                  {isAdminOrManager && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {supplier.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block">
                            {supplier.name}
                          </span>
                          {supplier.notes && (
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1">
                              {supplier.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {supplier.contact_name ? (
                        <span>{supplier.contact_name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Not specified</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <div className="space-y-0.5">
                        {supplier.email && (
                          <div className="flex items-center space-x-1.5">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <a
                              href={`mailto:${supplier.email}`}
                              className="text-brand-600 dark:text-brand-400 hover:underline"
                            >
                              {supplier.email}
                            </a>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center space-x-1.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {!supplier.email && !supplier.phone && (
                          <span className="text-slate-400 italic">No contact details</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      <div className="space-y-0.5">
                        {supplier.address && (
                          <div className="flex items-center space-x-1.5">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[200px]" title={supplier.address}>
                              {supplier.address}
                            </span>
                          </div>
                        )}
                        {supplier.tax_id && (
                          <div className="flex items-center space-x-1.5">
                            <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {supplier.tax_id}
                            </span>
                          </div>
                        )}
                        {!supplier.address && !supplier.tax_id && (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {supplier.payment_terms}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {supplier.operations_count}
                      </span>
                    </td>

                    {isAdminOrManager && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setEditingSupplier(supplier);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                            title="Edit Supplier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(supplier)}
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                            title="Delete Supplier"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      <SupplierModal
        isOpen={isModalOpen}
        supplier={editingSupplier}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSupplier(null);
        }}
        onSuccess={handleSupplierSaved}
      />
    </div>
  );
};
