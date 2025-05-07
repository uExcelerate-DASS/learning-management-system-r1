export interface PerformanceData {
    grade: number;
    submissions: {
      month: string;
      completed: number;
      total: number;
    }[];
  }
  
  export interface CourseProgress {
    id: string;
    title: string;
    progress: number;
  }
  
  export interface AssignmentStatus {
    completed: number;
    pending: number;
    late: number;
  }
  
  export interface ActivityItem {
    id: string;
    description: string;
    timestamp: string;
    type: 'module_completion' | 'assignment_submission' | 'course_started' | 'other';
  }