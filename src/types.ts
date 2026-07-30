export type Teacher = {
  id: string;
  name: string;
};

export type Student = {
  id: string;
  teacherId: string;
  teacherName?: string;
  fullName: string;
  rollNumber?: string;
  age?: number | '';
  birthdate?: string;
  createdAt?: string;
  phone: string;
  job: string;
  notes: string;
};

export type Subject = {
  id: string;
  teacherId: string;
  name: string;
  enrolledStudentIds: string[];
};

export type Mark = {
  id: string;
  studentId: string;
  subjectId: string;
  score: number | '';
};

export type AttendanceRecord = {
  studentId: string;
  present: boolean;
};

export type Attendance = {
  id: string; // usually date + teacherId + subjectId
  date: string; // YYYY-MM-DD
  teacherId: string;
  subjectId?: string;
  records: AttendanceRecord[];
};

export type AppData = {
  teachers: Teacher[];
  students: Student[];
  subjects: Subject[];
  marks: Mark[];
  attendance: Attendance[];
};
