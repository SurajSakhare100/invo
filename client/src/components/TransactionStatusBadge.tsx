import { TRANSACTION_STATUS_STYLES } from '../data/data';

interface TransactionStatusBadgeProps {
  status: string;
}

export function TransactionStatusBadge({ status }: TransactionStatusBadgeProps) {
  const style = TRANSACTION_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500';
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
      {status}
    </span>
  );
}
