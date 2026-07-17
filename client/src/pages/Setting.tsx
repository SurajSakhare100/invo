import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bell, Save, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { CURRENCIES } from '../data/data';
import { useAuth } from '../context/AuthContext';

const settingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  companyEmail: z.string().email('Valid billing email required'),
  companyPhone: z.string().min(1, 'Phone is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  taxId: z.string(),
  currency: z.string(),
  sandboxMode: z.boolean(),
});

type FormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const [successMsg, setSuccessMsg] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, updateProfile } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      companyName: user?.company || '',
      companyEmail: user?.companyEmail || user?.email || '',
      companyPhone: user?.phone || '',
      address: user?.address || '',
      city: user?.city || '',
      country: user?.country || '',
      taxId: user?.taxId || '',
      currency: user?.currency || 'USD',
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        companyName: user.company || '',
        companyEmail: user.companyEmail || user.email || '',
        companyPhone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        country: user.country || '',
        taxId: user.taxId || '',
        currency: user.currency || 'USD',
      });
    }
  }, [user, reset]);

  const handleSave = async (values: FormValues) => {
    setLoading(true);
    try {
      await updateProfile({
        company: values.companyName,
        companyEmail: values.companyEmail,
        phone: values.companyPhone,
        address: values.address,
        city: values.city,
        country: values.country,
        taxId: values.taxId,
        currency: values.currency,
      });
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-gray-900 font-sans flex">

      <Sidebar activePage="Settings" />


      <main className="flex-1 px-8 py-6 overflow-y-auto h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
            <p className="text-sm text-gray-400">Configure corporate identity, locale, and API modes</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors bg-white shadow-sm">
              <Bell size={17} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Form panel */}
        <form onSubmit={handleSubmit(handleSave)} className="max-w-3xl space-y-6">
          {successMsg && (
            <div className="flex items-center gap-2.5 bg-emerald-50 text-emerald-700 border border-emerald-250 p-4 rounded-xl text-sm font-semibold transition-all">
              <CheckCircle2 size={18} />
              Settings saved and updated successfully!
            </div>
          )}

          {/* Section 1: Identity */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-700 pb-2 border-b border-gray-100">
              Corporate Identity
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Legal Entity Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('companyName')}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
                />
                {errors.companyName && (
                  <p className="text-xs text-red-500 mt-1">{errors.companyName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Billing Address Email <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('companyEmail')}
                  type="email"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
                />
                {errors.companyEmail && (
                  <p className="text-xs text-red-500 mt-1">{errors.companyEmail.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Billing Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('companyPhone')}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
                />
                {errors.companyPhone && (
                  <p className="text-xs text-red-500 mt-1">{errors.companyPhone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Employer Identification Number (EIN/Tax ID)
                </label>
                <input
                  {...register('taxId')}
                  placeholder="e.g. US-12-345678"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Localization */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-700 pb-2 border-b border-gray-100">
              Localization & Preferences
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Default Billing Currency
                </label>
                <select
                  {...register('currency')}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Default Address Location <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('address')}
                  placeholder="123 Corporate Road"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">City</label>
                <input
                  {...register('city')}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Country</label>
                <input
                  {...register('country')}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-400 transition-all"
                />
              </div>
            </div>
          </div>

        

          {/* Save trigger */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-black text-white hover:bg-gray-800 transition-all text-sm font-bold shadow-sm disabled:opacity-70"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {loading ? 'Saving...' : 'Save Configurations'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
