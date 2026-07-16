import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Provide a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await login(values);
      navigate('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-4 font-sans">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-100/40 via-transparent to-transparent pointer-events-none" />

      {/* Card container */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-3xl shadow-xl p-8 relative overflow-hidden">
        {/* Decorative top logo bar */}
        <div className="flex flex-col items-center justify-center mb-6 text-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              I
            </div>
            <span className="font-bold text-2xl tracking-tight">Invo</span>
          </div>
          <p className="text-sm text-gray-500 font-medium">Manage your invoice</p>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome Back</h2>
          <p className="text-xs text-gray-400 mt-1">Sign in to manage client invoices & payments</p>
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
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-450" />
              <input
                {...register('email')}
                type="email"
                placeholder="you@company.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-450 transition-all bg-white"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-555 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-gray-600">
                Password
              </label>
              <a href="#" className="text-[11px] font-semibold text-gray-400 hover:text-black">
                Forgot?
              </a>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-450" />
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-450 transition-all bg-white"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-555 mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-2xl bg-black text-white hover:bg-gray-800 disabled:opacity-60 transition-all font-bold text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign In
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <span className="w-1/5 border-b border-gray-200"></span>
          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Or continue with</span>
          <span className="w-1/5 border-b border-gray-200"></span>
        </div>

        <div className="mt-6 w-full flex justify-center [&>div]:w-full">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              if (credentialResponse.credential) {
                setLoading(true);
                setErrorMsg(null);
                try {
                  await loginWithGoogle(credentialResponse.credential);
                  navigate('/');
                } catch (err: any) {
                  setErrorMsg(err.message || 'Google Login failed');
                } finally {
                  setLoading(false);
                }
              }
            }}
            onError={() => {
              setErrorMsg('Google Login failed');
            }}
            theme="outline"
            size="large"
            width="100%"
          />
        </div>

        <div className="mt-6 text-center text-xs text-gray-400 font-medium">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-black hover:underline">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
