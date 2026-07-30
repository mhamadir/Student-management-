export const getKurdishWeekday = (dateString: string): string => {
  const days = ['١ شەممە', '٢ شەممە', '٣ شەممە', '٤ شەممە', '٥ شەممە', 'هەینی', 'شەممە'];
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(year, month - 1, day);
  return days[date.getDay()] || '';
};

export const convertToArabicNumerals = (str: string): string => {
  const map: Record<string, string> = { '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩' };
  return str.replace(/[0-9]/g, (m) => map[m]);
};

export const getCreationTimestamp = (): string => {
  const date = new Date();
  
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  const days = ['١ شەممە', '٢ شەممە', '٣ شەممە', '٤ شەممە', '٥ شەممە', 'هەینی', 'شەممە'];
  const dayName = days[date.getDay()];
  
  const formatted = `${y}/${m}/${d} - ${dayName} - ${hours}:${minutes}`;
  return convertToArabicNumerals(formatted);
};
