import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Building, Phone, AlertCircle, ArrowRight, MapPin, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CURRENCIES } from '../data/data';

const onboardingSchema = z.object({
  company: z.string().min(1, 'Business Name is required'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
});

type FormValues = z.infer<typeof onboardingSchema>;

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      company: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      currency: 'USD',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await updateProfile(values);
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save details. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-4 font-sans py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-xl p-8 relative overflow-hidden">
        {/* Centered Logo */}
        <div className="flex flex-col items-center justify-center mb-6 text-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              I
            </div>
            <span className="font-bold text-2xl tracking-tight">Invo</span>
          </div>
          <p className="text-sm text-gray-500 font-medium">Manage your invoice</p>
        </div>

        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Welcome, {user?.name?.split(' ')[0] || 'there'}!</h2>
          <p className="text-xs text-gray-500 mt-1">Let's set up your business profile to get started.</p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 p-3.5 rounded-2xl text-xs font-semibold mb-5">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Business Name *
            </label>
            <div className="relative">
              <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-450" />
              <input
                {...register('company')}
                type="text"
                placeholder="Acme Corp."
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-450 transition-all bg-white"
              />
            </div>
            {errors.company && (
              <p className="text-xs text-red-555 mt-1">{errors.company.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-450" />
              <input
                {...register('phone')}
                type="tel"
                placeholder="+1 (555) 000-0000"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-450 transition-all bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Address <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-450" />
              <input
                {...register('address')}
                type="text"
                placeholder="123 Corporate Road"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-450 transition-all bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                City <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                {...register('city')}
                type="text"
                placeholder="San Francisco"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-450 transition-all bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Country <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-450" />
                <input
                  {...register('country')}
                  type="text"
                  placeholder="United States"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-450 transition-all bg-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Default Currency <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <select
              {...register('currency')}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-450 transition-all bg-white"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-2xl bg-black text-white hover:bg-gray-800 disabled:opacity-60 transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                Complete Setup
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
