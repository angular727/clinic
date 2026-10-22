/** Local calendar day as YYYY-MM-DD (the clinic's day). */
export const today = (offsetDays = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Add (or subtract) days to a YYYY-MM-DD string. */
export const addDays = (day: string, n: number): string => {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
};

export const ageText = (p: { age?: number | null; dob?: string | null } | null | undefined): string => {
  if (!p) return '';
  if (p.dob) {
    const b = new Date(p.dob);
    const now = new Date();
    let y = now.getFullYear() - b.getFullYear();
    if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) y--;
    return y >= 0 ? `${y} y` : '';
  }
  return p.age || p.age === 0 ? `${p.age} y` : '';
};

export const STATUS_CLASS: Record<string, string> = {
  scheduled: 'bg-secondary',
  waiting: 'bg-warning text-dark',
  'in-consultation': 'bg-info text-dark',
  completed: 'bg-success',
  cancelled: 'bg-danger',
  'no-show': 'bg-dark',
  open: 'bg-info text-dark',
  unpaid: 'bg-danger',
  partial: 'bg-warning text-dark',
  paid: 'bg-success',
};

export const PAY_METHODS = ['cash', 'card', 'online', 'insurance', 'other'];

export const FREQUENCIES = ['1+0+0', '0+1+0', '0+0+1', '1+0+1', '1+1+1', '1+1+1+1', 'SOS', 'Stat'];
export const DURATIONS = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month', 'Continue'];
