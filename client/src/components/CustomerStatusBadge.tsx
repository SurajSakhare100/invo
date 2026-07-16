import { CUSTOMER_STATUS_STYLES } from '../data/data';

interface CustomerStatusBadgeProps {
  status: string;
}

export function CustomerStatusBadge({ status }: CustomerStatusBadgeProps) {
  const style = CUSTOMER_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-500';
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${style}`}>
      {status}
    </span>
  );
}
