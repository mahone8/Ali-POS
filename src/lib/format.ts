// Format a number as Pakistani Rupee (the store currency).
// Using PKR since the user timezone is Asia/Karachi.
export function formatPKR(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

// Short version for compact UI
export function formatShort(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function formatDateTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
