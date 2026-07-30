const convertToArabicNumerals = (str) => {
  const map = { '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩' };
  return String(str).replace(/[0-9]/g, (m) => map[m]);
};
const getCreationTimestamp = () => {
  const date = new Date("2026-07-30T18:01:00Z");
  
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
console.log(getCreationTimestamp());
