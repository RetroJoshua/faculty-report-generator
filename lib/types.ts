export type SessionType = 'flipped_class' | 'video_session';

export type FlippedClassSubtype =
  | 'Standard Inverted Flipped Classroom (FP)'
  | 'Discussion Oriented FP'
  | 'Demonstration Focused FP'
  | 'Group Based FP'
  | 'Flipping the Teacher';

export const FLIPPED_CLASS_SUBTYPES: FlippedClassSubtype[] = [
  'Standard Inverted Flipped Classroom (FP)',
  'Discussion Oriented FP',
  'Demonstration Focused FP',
  'Group Based FP',
  'Flipping the Teacher',
];

export interface SessionEntry {
  id: string;
  slNo: number;
  topic: string;
  date: string;
  subtype: FlippedClassSubtype | string; // for flipped class
  duration: string; // for video session
  totalStudents: string;
}

export interface DetailedEntry {
  id: string;
  slNo: number;
  topic: string;
  date: string;
  subtype: FlippedClassSubtype | string;
  duration: string;
  totalStudents: string;
  // Flipped class specific
  materialsShared: string;
  conductionWriteup: string;
  evaluationDetails: string;
  evaluationQuestions: string;
  performanceStats: string;
  outcome: string;
  posAndPsos: string;
  // Video session specific
  videoLink: string;
  learningOutcomes: string;
  curriculumGap: string;
  // Shared
  photoUrls: string[]; // cloud storage paths
}

export interface ReportFormData {
  sessionType: SessionType;
  academicYear: string;
  department: string;
  subjectCode: string;
  courseName: string;
  semesterSection: string;
  preparedBy: string;
  curriculumGapIdentified: string;
  sessions: SessionEntry[];
  detailedEntries: DetailedEntry[];
}

export interface AnalyticsData {
  totalViews: number;
  totalReports: number;
  reportsByFormat: { docx: number; pdf: number };
  reportsBySession: { flipped_class: number; video_session: number };
  recentActivity: { date: string; views: number; reports: number }[];
}
