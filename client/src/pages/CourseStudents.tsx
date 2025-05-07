import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, ArrowLeft, Search, Mail, Loader2, GraduationCap, Trophy, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';

interface Student {
  id: number;
  fullname: string;
  email: string;
  lastaccess?: string | number;
  profileimageurl?: string;
  courseCompleted?: boolean;
  completion?: {
    percentage: number;
    completedCount: number;
    totalModules: number;
    isComplete: boolean;
    status: string;
    displayColor: string;
  };
}

export default function CourseStudents() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { getCourseStudents } = useUser();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseName, setCourseName] = useState('');
  
  // Fetch students when component mounts
  useEffect(() => {
    async function fetchStudents() {
      if (!courseId) return;
      
      try {
        setLoading(true);
        const data = await getCourseStudents(courseId);
        setStudents(data);
        
        // Try to find course name from the first student's enrolled courses
        if (data.length > 0 && data[0].enrolledcourses) {
          const course = data[0].enrolledcourses.find((c: any) => c.id.toString() === courseId);
          if (course) {
            setCourseName(course.fullname);
          }
        }
      } catch (err: any) {
        console.error('Error fetching students:', err);
        setError(err.message || 'Failed to fetch students');
      } finally {
        setLoading(false);
      }
    }
    
    fetchStudents();
  }, [courseId, getCourseStudents]);
  
  // Function to handle viewing student details in Moodle
  const handleViewStudentDetails = (studentId: number) => {
    if (!courseId) return;
    
    // Create Moodle URL for the student's page within this course context
    const moodleStudentUrl = `${import.meta.env.VITE_MOODLE_URL || 'http://34.57.113.242/moodle'}/user/view.php?id=${studentId}&course=${courseId}`;
    
    // Open in new tab
    window.open(moodleStudentUrl, '_blank');
  };
  
  // Filter students based on search term
  const filteredStudents = students.filter(student => 
    student.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Handle logout
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  
  // Go back to courses page
  const goBack = () => {
    navigate('/coach/courses');
  };
  
  // Get completion statistics using the enhanced completion data
  const getCompletionStats = () => {
    if (!students || students.length === 0) {
      return {
        completedCount: 0,
        completionPercentage: 0,
        needAttention: 0
      };
    }

    // Count students with completed courses (isComplete flag)
    const completedCount = students.filter(student => 
      student.completion?.isComplete === true
    ).length;

    // Calculate the overall completion percentage across all students
    let totalPercentage = 0;
    students.forEach(student => {
      totalPercentage += student.completion?.percentage || 0;
    });
    const completionPercentage = Math.round(totalPercentage / students.length);
    
    // Count students needing attention (less than 30% completion)
    const needAttention = students.filter(student => 
      (student.completion?.percentage || 0) < 30
    ).length;

    return {
      completedCount,
      completionPercentage,
      needAttention
    };
  };

  const { completedCount, completionPercentage, needAttention } = getCompletionStats();

  // Render the student list with enhanced completion data
  const renderStudentList = () => {
    if (loading) return <div className="text-center py-10">Loading students...</div>;
    
    if (error) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error loading students: {error}</p>
        </div>
      );
    }
    
    if (!students || students.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500">
          <p>No students enrolled in this course.</p>
        </div>
      );
    }

    if (filteredStudents.length === 0) {
      return (
        <div className="text-center py-10 text-gray-500">
          <p>No students match your search criteria.</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-300 text-left">
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Last Access</th>
              <th className="py-3 px-4">Progress</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => {
              // Get completion data from the enhanced student object
              const completionData = student.completion || {
                percentage: 0,
                completedCount: 0,
                totalModules: 0,
                isComplete: false,
                status: "Not started",
                displayColor: "gray"
              };
              
              // Format last access date
              const lastAccessDate = student.lastaccess 
                ? new Date(student.lastaccess * 1000).toLocaleDateString() 
                : 'Never';

              // Determine progress color based on completion data
              const progressColor = completionData.displayColor === "green" ? "#22C55E" : 
                                   completionData.displayColor === "blue" ? "#3B82F6" :
                                   completionData.displayColor === "orange" ? "#F97316" :
                                   completionData.displayColor === "red" ? "#EF4444" : "#6B7280";
                
              return (
                <tr key={student.id} className="border-b border-gray-200">
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <img 
                        src={student.profileimageurl || "https://via.placeholder.com/40"} 
                        alt={`${student.firstname} ${student.lastname}`}
                        className="w-8 h-8 rounded-full mr-3"
                      />
                      <span>{student.fullname}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">{student.email}</td>
                  <td className="py-4 px-4">{lastAccessDate}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <div className="relative w-full h-2 bg-gray-200 rounded-full mr-2">
                        <div 
                          className="absolute left-0 top-0 h-2 rounded-full" 
                          style={{ 
                            width: `${completionData.percentage}%`,
                            backgroundColor: progressColor
                          }}
                        ></div>
                      </div>
                      <span>{completionData.percentage}%</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {completionData.completedCount}/{completionData.totalModules} modules completed
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span 
                      className="px-2 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${progressColor}25`,
                        color: progressColor
                      }}
                    >
                      {completionData.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button 
                      className="px-3 py-1 bg-[#EEBFF6] hover:bg-[#DFA9E5] border border-black rounded flex items-center"
                      onClick={() => handleViewStudentDetails(student.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                      Moodle
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="relative bg-white min-h-screen font-['Kode_Mono']">
      {/* Sidebar */}
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activePage="courses"
        userRole="coach"
      />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'ml-60' : 'ml-0'}`}>
        {/* Header */}
        <Header 
          user={user}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          handleLogout={handleLogout}
          showSearch={false}
        />

        {/* Main Content */}
        <div className="p-8 space-y-6">
          {/* Back Button and Title */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={goBack}
              className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold">
                {courseName || `Course ${courseId}`}
              </h1>
              <p className="text-[#85878D]">Student Management</p>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard 
              title="Total Students" 
              value={students.length.toString()} 
              icon={<Users className="h-6 w-6" />} 
              bgColor="bg-[#EEBFF6]" 
            />
            <StatsCard 
              title="Course Completion" 
              value={`${completionPercentage}%`} 
              icon={<GraduationCap className="h-6 w-6" />} 
              bgColor="bg-[#FFCE6D]" 
            />
            <StatsCard 
              title="Need Attention" 
              value={`${needAttention}`} 
              icon={<AlertCircle className="h-6 w-6" />} 
              bgColor="bg-[#FFD5D5]" 
            />
          </div>
          
          {/* Search and Filters */}
          <div className="flex justify-between items-center">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search students..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <button className="px-4 py-2 border border-black bg-[#EEBFF6] rounded-lg"
                onClick={() => {
                  // Create Moodle URL for the enrollment page
                  console.log(courseId);
                  const moodleEnrollmentUrl = `http://34.57.113.242/moodle/user/index.php?id=${courseId}`;
                  // Open in new tab
                  window.open(moodleEnrollmentUrl, '_blank');
                }}
              >
                Add Students
              </button>
              <button 
                className="px-4 py-2 border border-black bg-white rounded-lg"
                onClick={() => {
                  // Function to export students data as CSV
                  const exportStudentsToCSV = () => {
                    // Define CSV headers
                    const headers = ['ID', 'Full Name', 'Email', 'Last Access', 'Progress'];
                    
                    // Format data rows
                    const rows = filteredStudents.map(student => [
                      student.id,
                      student.fullname,
                      student.email,
                      student.lastaccess 
                        ? new Date(student.lastaccess * 1000).toLocaleDateString()
                        : 'Never',
                      student.courseCompleted ? 'Completed' : 'In Progress'
                    ]);
                    
                    // Combine headers and rows
                    const csvContent = [
                      headers.join(','),
                      ...rows.map(row => row.join(','))
                    ].join('\n');
                    
                    // Create a blob and download link
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    
                    // Set link properties
                    link.setAttribute('href', url);
                    link.setAttribute('download', `${courseName || `Course_${courseId}`}_Students.csv`);
                    link.style.visibility = 'hidden';
                    
                    // Add to document, click and remove
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  };
                  
                  exportStudentsToCSV();
                }}
                >
                Export
              </button>
            </div>
          </div>
          
          {/* Students Table */}
          <div className="bg-white border border-black rounded-lg shadow-sm overflow-hidden">
            {renderStudentList()}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon, bgColor }: { 
  title: string;
  value: string;
  icon: React.ReactNode;
  bgColor: string;
}) {
  return (
    <div className={`${bgColor} border border-black rounded-lg p-4 shadow-sm`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="p-3 bg-white bg-opacity-30 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );
}
