const ALLOWED_SORT_FIELDS: Record<string, string[]> = {
  invoices: ['createdAt', 'dueDate', 'amount'],
  customers: ['createdAt', 'name'],
  transactions: ['paymentDate', 'amount', 'createdAt'],
};

export function buildSort(
  entity: keyof typeof ALLOWED_SORT_FIELDS,
  sortBy?: string,
  sortOrder?: string
): Record<string, 1 | -1> {
  const allowed = ALLOWED_SORT_FIELDS[entity];
  const field = sortBy && allowed.includes(sortBy) ? sortBy : allowed[0];
  const dir: 1 | -1 = sortOrder === 'asc' ? 1 : -1;
  return { [field]: dir };
}

export function applyDateRange(
  query: Record<string, unknown>,
  field: string,
  dateFrom?: string,
  dateTo?: string
): void {
  if (!dateFrom && !dateTo) return;

  const range: Record<string, Date> = {};
  if (dateFrom) range.$gte = new Date(dateFrom);
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  query[field] = range;
}
