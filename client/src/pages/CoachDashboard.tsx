import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend,
  Filler
);

export default function CoachDashboard() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    
    // Add User Context
    const { 
        getCoachCourses,
        getCourseStudents,
        courses,
        loading: coursesLoading,
        error: coursesError
    } = useUser();

    // States for dashboard data
    const [recentActivities, setRecentActivities] = useState([]);
    const [courseStats, setCourseStats] = useState([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [totalCourses, setTotalCourses] = useState(0);
    const [averageCompletion, setAverageCompletion] = useState(0);
    const [activeStudents, setActiveStudents] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [dashboardError, setDashboardError] = useState(null);

    // Fetch coach courses and student data
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
                setDashboardError(null);
                
                // Get coach's courses
                if (user && user.moodleid) {
                    await getCoachCourses(user.moodleid);
                }
                
                // Process courses once they're loaded
                if (courses.length > 0) {
                    // Create course stats with empty student counts initially
                    const courseStatData = courses.map(course => ({
                        id: course.id,
                        name: course.fullname || course.shortname,
                        students: 0, 
                        completion: 0,
                    }));
                    
                    // Fetch students for each course and calculate stats
                    const updatedStats = await Promise.all(courseStatData.map(async (course) => {
                        try {
                            let students = [];
                            try {
                                // Get students for the course and validate response format
                                const studentsResponse = await getCourseStudents(course.id.toString());
                                
                                // Validate that the response is an array before using array methods
                                if (Array.isArray(studentsResponse)) {
                                    students = studentsResponse;
                                } else if (studentsResponse && typeof studentsResponse === 'object') {
                                    // If response is an object but not an array, try to extract students array
                                    // This handles API responses that might nest the array in a property
                                    const possibleArrays = Object.values(studentsResponse).filter(val => Array.isArray(val));
                                    if (possibleArrays.length > 0) {
                                        students = possibleArrays[0];
                                    } else {
                                        console.warn(`Response for course ${course.id} is not an array. Using empty array instead.`, studentsResponse);
                                        students = [];
                                    }
                                } else {
                                    console.warn(`Invalid response format for course ${course.id}. Using empty array instead.`);
                                    students = [];
                                }
                            } catch (studentError) {
                                console.error(`Error fetching students for course ${course.id}:`, studentError);
                                students = []; // Use empty array on error
                            }
                            
                            // Calculate overall course completion using the completion data we now have
                            let totalPercentage = 0;
                            let completedCount = 0;
                            
                            // Only process if students array exists and is valid
                            if (Array.isArray(students)) {
                                students.forEach(student => {
                                    // Use the completion data from the API
                                    if (student.completion) {
                                        totalPercentage += student.completion.percentage || 0;
                                        if (student.completion.isComplete) {
                                            completedCount++;
                                        }
                                    }
                                });
                            }
                            
                            // Calculate average completion percentage across all students
                            const completionRate = students.length > 0 
                                ? Math.round(totalPercentage / students.length)
                                : 0;
                            
                            // Generate recent activities from student data with completion info
                            if (Array.isArray(students) && students.length > 0) {
                                // If this is the first course being processed, reset the activities array
                                if (course.id === courseStatData[0].id) {
                                    setRecentActivities([]);
                                }
                                
                                // Sort students by completion percentage (highest first) to show most active students
                                const sortedStudents = [...students].sort((a, b) => {
                                    const aPercent = a.completion?.percentage || 0;
                                    const bPercent = b.completion?.percentage || 0;
                                    return bPercent - aPercent;
                                });
                                
                                const recentStudentActivities = sortedStudents.slice(0, Math.min(4, students.length)).map((student) => {
                                    // Create a more detailed activity message based on completion data
                                    let activity = "Enrolled in course";
                                    let time = "Recently enrolled";
                                    
                                    if (student.completion) {
                                        if (student.completion.isComplete) {
                                            activity = "Completed course";
                                            time = "Recently completed";
                                        } else if (student.completion.percentage > 75) {
                                            activity = "Almost completed course";
                                            time = `${student.completion.percentage}% complete`;
                                        } else if (student.completion.percentage > 50) {
                                            activity = "Making good progress";
                                            time = `${student.completion.percentage}% complete`;
                                        } else if (student.completion.percentage > 25) {
                                            activity = "Started course";
                                            time = `${student.completion.percentage}% complete`;
                                        } else if (student.completion.percentage > 0) {
                                            activity = "Beginning course";
                                            time = `${student.completion.percentage}% complete`;
                                        }
                                    }
                                    
                                    return {
                                        id: `${course.id}-${student.id}`,
                                        student: `${student.firstname} ${student.lastname}`,
                                        activity: activity,
                                        course: course.name,
                                        time: time,
                                        completionColor: student.completion?.displayColor || "gray"
                                    };
                                });
                                
                                setRecentActivities(prev => {
                                    const combined = [...prev, ...recentStudentActivities];
                                    const uniqueActivities = Array.from(
                                        new Map(combined.map(item => [item.id, item])).values()
                                    );
                                    return uniqueActivities.slice(0, 4);
                                });
                            }
                            
                            return {
                                ...course,
                                students: Array.isArray(students) ? students.length : 0,
                                completion: completionRate,
                                completedCount: completedCount,
                            };
                        } catch (error) {
                            console.error(`Error processing data for course ${course.id}:`, error);
                            return {
                                ...course,
                                students: 0,
                                completion: 0,
                                completedCount: 0,
                                error: true
                            };
                        }
                    }));
                    
                    // Filter out courses with errors if needed
                    const validStats = updatedStats.filter(stat => !stat.error);
                    setCourseStats(validStats);
                    
                    // Calculate dashboard summary metrics
                    const totalStudentsCount = validStats.reduce((total, course) => total + course.students, 0);
                    const avgCompletion = validStats.length > 0
                        ? Math.round(validStats.reduce((total, course) => total + course.completion, 0) / validStats.length)
                        : 0;

                    // Count active students (students with >0% completion)
                    let activeStudentsCount = 0;
                    const allStudentIds = new Set();
                    
                    validStats.forEach(course => {
                        if (course.students > 0) {
                            activeStudentsCount += Math.round((course.completion / 100) * course.students);
                        }
                    });
                        
                    setTotalStudents(totalStudentsCount);
                    setTotalCourses(validStats.length);
                    setAverageCompletion(avgCompletion);
                    setActiveStudents(activeStudentsCount);
                }
            } catch (error) {
                console.error("Dashboard data fetch error:", error);
                setDashboardError(error.message || "Failed to load dashboard data");
                
                // Fallback to empty arrays if data fetch fails
                setCourseStats([]);
                setRecentActivities([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [user, courses.length]);

    // Prepare chart data
    const prepareChartData = () => {
        // Only prepare data if courseStats exists and has items
        if (!courseStats || courseStats.length === 0) return null;
        
        // Course completion chart data (bar chart)
        const courseCompletionData = {
            labels: courseStats.map(course => course.name.length > 20 ? course.name.substring(0, 20) + '...' : course.name),
            datasets: [
                {
                    label: 'Completion Rate',
                    data: courseStats.map(course => course.completion),
                    backgroundColor: '#8C5AFF',
                    borderRadius: 6,
                }
            ]
        };
        
        // Student distribution chart data (doughnut)
        const studentDistributionData = {
            labels: ['Active Students', 'Inactive Students'],
            datasets: [
                {
                    data: [activeStudents, totalStudents - activeStudents],
                    backgroundColor: ['#8C5AFF', '#EEBFF6'],
                    borderWidth: 0,
                }
            ]
        };
        
        return {
            courseCompletionData,
            studentDistributionData,
        };
    };
    
    // Get chart data
    const chartData = prepareChartData();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };
      
    return (
      <div className="relative bg-white min-h-screen font-['Kode_Mono']">
        {/* Sidebar */}
        <Sidebar 
          isSidebarOpen={sidebarOpen} 
          setIsSidebarOpen={setSidebarOpen} 
          activePage="dashboard" 
          userRole="coach"
        />
    
        {/* Main Content */}
        <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-60' : 'ml-0'}`}>
          {/* Header */}
          <Header 
            user={user} 
            isSidebarOpen={sidebarOpen} 
            setIsSidebarOpen={setSidebarOpen} 
            handleLogout={handleLogout}
            showSearch={false}
          />
  
          {/* Content Sections */}
          <div className="p-8 space-y-8">
            {/* Dashboard Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Welcome back, {user?.name?.split(' ')[0] || 'Coach'}</h1>
                <p className="text-[#85878D] text-lg">
                    Here's what's happening with your courses today
                </p>
            </div>

            {isLoading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#8C5AFF] border-t-transparent"></div>
                <p className="mt-2">Loading dashboard data...</p>
              </div>
            ) : dashboardError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p>Error loading dashboard: {dashboardError}</p>
                <button 
                  className="underline mt-2"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    title="Total Students" 
                    value={totalStudents.toString()} 
                    change={totalStudents > 0 ? "+New" : "No students"} 
                    trend="up" 
                    bgColor="bg-[#FFD5D6]"
                  />
                  <StatCard 
                    title="Total Courses" 
                    value={totalCourses.toString()} 
                    change={totalCourses > 0 ? "Active" : "No courses"} 
                    trend="up" 
                    bgColor="bg-[#EEBFF6]"
                  />
                  <StatCard 
                    title="Active Students" 
                    value={activeStudents.toString()} 
                    change={activeStudents > 0 ? "Engaged" : "No activity"} 
                    trend="up" 
                    bgColor="bg-[#C2E8FF]"
                  />
                  <StatCard 
                    title="Avg. Completion" 
                    value={`${averageCompletion}%`} 
                    change={averageCompletion > 0 ? "Progress" : "No data"} 
                    trend="up" 
                    bgColor="bg-[#FFF7AC]"
                  />
                </div>

                {/* Course Statistics */}
                <div className="bg-white border border-black rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-medium">Course Statistics</h2>
                    <button 
                      className="px-4 py-2 bg-[#EEBFF6] hover:bg-[#DFA9E5] border border-black rounded-lg"
                      onClick={() => navigate('/coach/courses')}
                    >
                      View All Courses
                    </button>
                  </div>

                  {courseStats.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No courses found. Create a course to get started.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-300">
                            <th className="pb-2">Course Name</th>
                            <th className="pb-2">Students</th>
                            <th className="pb-2">Completed</th>
                            <th className="pb-2">Completion Rate</th>
                            <th className="pb-2">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courseStats.map((course, index) => (
                            <tr key={course.id} className="border-b border-gray-200">
                              <td className="py-4">{course.name}</td>
                              <td className="py-4">{course.students}</td>
                              <td className="py-4">{course.completedCount || 0}/{course.students}</td>
                              <td className="py-4">
                                <div className="flex items-center">
                                  <div className="w-full h-2 bg-gray-200 rounded-full mr-2">
                                    <div 
                                      className="h-2 rounded-full" 
                                      style={{ 
                                        width: `${course.completion}%`,
                                        backgroundColor: course.completion >= 75 ? "#22C55E" : 
                                                        course.completion >= 50 ? "#3B82F6" : 
                                                        course.completion >= 25 ? "#F97316" : "#EF4444"
                                      }}
                                    ></div>
                                  </div>
                                  <span>{course.completion}%</span>
                                </div>
                              </td>
                              <td className="py-4">
                                <button 
                                  className="px-3 py-1 bg-[#EEBFF6] hover:bg-[#DFA9E5] border border-black rounded"
                                  onClick={() => navigate(`/coach/course/${course.id}/students`)}
                                >
                                  Students
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Recent Activities */}
                <div className="bg-white border border-black rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-medium">Recent Student Activities</h2>
                    <button 
                      className="px-4 py-2 bg-[#EEBFF6] hover:bg-[#DFA9E5] border border-black rounded-lg"
                      onClick={() => navigate('/coach/students')}
                    >
                      View All Students
                    </button>
                  </div>

                  {recentActivities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>No recent student activities found.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentActivities.map(activity => (
                        <div 
                          key={activity.id}
                          className="border-b border-gray-200 pb-4 last:border-0 last:pb-0"
                        >
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium">{activity.student}</p>
                              <p className="text-sm text-gray-600">
                                {activity.activity} in <span className="text-[#8C5AFF]">{activity.course}</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs" style={{ color: activity.completionColor === "green" ? "#22C55E" : 
                                                               activity.completionColor === "blue" ? "#3B82F6" :
                                                               activity.completionColor === "orange" ? "#F97316" :
                                                               activity.completionColor === "red" ? "#EF4444" : "#6B7280" }}>
                                {activity.time}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Charts Section */}
                {chartData && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-medium">Performance Analytics</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Course Completion Chart */}
                      <div className="bg-white border border-black rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-medium mb-4">Course Completion Rates</h3>
                        <div className="h-64">
                          <Bar 
                            data={chartData.courseCompletionData} 
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  display: false,
                                },
                                tooltip: {
                                  callbacks: {
                                    label: function(context) {
                                      return `${context.raw}% completion`;
                                    }
                                  }
                                }
                              },
                              scales: {
                                y: {
                                  beginAtZero: true,
                                  max: 100,
                                  title: {
                                    display: true,
                                    text: 'Completion %'
                                  }
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Student Distribution Chart */}
                      <div className="bg-white border border-black rounded-lg shadow-sm p-6">
                        <h3 className="text-lg font-medium mb-4">Student Engagement</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                          <div>
                            <div className="h-64 flex items-center justify-center">
                              <Doughnut 
                                data={chartData.studentDistributionData} 
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: {
                                    legend: {
                                      position: 'bottom'
                                    }
                                  },
                                  cutout: '65%'
                                }}
                              />
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-500">Active Students</p>
                              <p className="text-xl font-bold text-[#8C5AFF]">{activeStudents}</p>
                              <div className="w-full h-1 bg-gray-200 mt-2">
                                <div 
                                  className="h-1 bg-[#8C5AFF]" 
                                  style={{ 
                                    width: totalStudents > 0 
                                      ? `${(activeStudents / totalStudents) * 100}%` 
                                      : '0%' 
                                  }}
                                ></div>
                              </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-500">Inactive Students</p>
                              <p className="text-xl font-bold text-[#EEBFF6]">{totalStudents - activeStudents}</p>
                              <div className="w-full h-1 bg-gray-200 mt-2">
                                <div 
                                  className="h-1 bg-[#EEBFF6]" 
                                  style={{ 
                                    width: totalStudents > 0 
                                      ? `${((totalStudents - activeStudents) / totalStudents) * 100}%` 
                                      : '0%' 
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
}

function StatCard({ title, value, change, trend, bgColor }: { 
  title: string; 
  value: string; 
  change: string; 
  trend: 'up' | 'down'; 
  bgColor: string; 
}) {
  return (
    <div className={`${bgColor} border border-black rounded-lg p-5 shadow-sm`}>
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold">{value}</p>
        <div className={`flex items-center ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-4 w-4" 
            viewBox="0 0 20 20" 
            fill="currentColor"
            style={{ transform: trend === 'down' ? 'rotate(180deg)' : 'none' }}
          >
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <span className="ml-1 text-sm">{change}</span>
        </div>
      </div>
    </div>
  );
}
