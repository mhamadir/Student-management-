const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const newAppContent = `function AppContent() {
  const { data, activeTeacherId, exportData, importData, importStudentCSV } = useStore();
  const [activeTab, setActiveTab] = useState<'students' | 'classes' | 'attendance' | 'reports' | 'settings'>('students');

  const activeTeacher = data.teachers.find(t => t.id === activeTeacherId);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const isCsv = file.name.toLowerCase().endsWith('.csv');
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          if (isCsv) {
            const result = importStudentCSV(event.target.result);
            if (result.success) {
              alert(result.message);
              setActiveTab('students');
            } else {
              alert(result.message);
            }
          } else {
            const success = importData(event.target.result);
            if (success) {
              alert('زانیارییەکان بە سەرکەوتویی هاوردە کران');
            } else {
              alert('هەڵە لە هاوردەکردنی زانیارییەکان');
            }
          }
        }
      };
      reader.readAsText(file);`;

const oldAppContent = `function AppContent() {
  const { data, activeTeacherId, exportData, importData } = useStore();
  const [activeTab, setActiveTab] = useState<'students' | 'classes' | 'attendance' | 'reports' | 'settings'>('students');

  const activeTeacher = data.teachers.find(t => t.id === activeTeacherId);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          const success = importData(event.target.result);
          if (success) {
            alert('زانیارییەکان بە سەرکەوتویی هاوردە کران');
          } else {
            alert('هەڵە لە هاوردەکردنی زانیارییەکان');
          }
        }
      };
      reader.readAsText(file);`;

code = code.replace(oldAppContent, newAppContent);
fs.writeFileSync('src/App.tsx', code);
