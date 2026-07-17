import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle, ArrowRight } from 'lucide-react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  const paymentLinkId = searchParams.get('razorpay_payment_link_id');
  const paymentLinkRefId = searchParams.get('razorpay_payment_link_reference_id');
  const paymentLinkStatus = searchParams.get('razorpay_payment_link_status');

  useEffect(() => {
    // Simulate verification (in a real app, you might want to ping your backend)
    const timer = setTimeout(() => {
      if (paymentLinkStatus === 'paid') {
        setStatus('success');
      } else {
        setStatus('error');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [paymentLinkStatus]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-indigo-50 flex items-center justify-center">
            <Loader2 size={40} className="text-indigo-600 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment</h1>
          <p className="text-gray-500">Please wait while we confirm your transaction…</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={40} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Not Completed</h1>
          <p className="text-gray-500 mb-8">
            Your payment could not be verified. Please contact support if you believe this is an error.
          </p>
          {paymentLinkRefId && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Reference ID</p>
              <p className="text-sm font-mono text-gray-700">{paymentLinkRefId}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center animate-bounce">
          <CheckCircle2 size={40} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-500 mb-8">
          Thank you for your payment. A confirmation email has been sent to you.
        </p>

        {paymentLinkRefId && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Transaction ID</p>
            <p className="text-sm font-mono text-gray-700">{paymentLinkRefId}</p>
          </div>
        )}

        {paymentLinkId && (
          <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Payment Link ID</p>
            <p className="text-sm font-mono text-gray-700 break-all">{paymentLinkId}</p>
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl bg-[#7ED957] text-black font-bold hover:bg-[#6fcf4a] transition-colors shadow-sm"
        >
          Return to Home
          <ArrowRight size={16} />
        </button>

        <p className="text-xs text-gray-400 mt-6">
          You can safely close this window.
        </p>
      </div>
    </div>
  );
}
