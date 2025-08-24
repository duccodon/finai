export const TZ = 'Asia/Ho_Chi_Minh'; // cố định VN time
export const dtFull = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TZ,
});
export const dOnly = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeZone: TZ,
});

export const fmtDT = (iso: string | undefined) =>
  iso ? dtFull.format(new Date(iso)) : '';

export const fmtD = (iso: string | undefined) =>
  iso ? dOnly.format(new Date(iso)) : '';
// helpers format
export const pct = (v?: number, d = 2) => `${v?.toFixed(d)}%`;
export const num = (v?: number, d = 2) => v?.toFixed(d);
