import { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { BookOpen, Award, Clock, AlertCircle, ChevronRight, Book } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function LearnersAnalysis() {
  const [courses, setCourses] = useState([]);
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    averageCompletion: 0
  });

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const moodleToken = Cookies.get('moodleToken');
        const userid = user?.id;

        if (!userid || !moodleToken) {
          throw new Error("Missing required authentication data");
        }

        console.log("User ID:", userid);

        const { data } = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL}/api/users/coursesprogress`,
          {
            headers: {
              'X-Moodle-Token': moodleToken,
            },
            params: {
              userid: userid
            }
          }
        );

        console.log("Fetched courses:", data);
        setCourses(data);

        const completed = data.filter(course =>
          course.completion && course.completion.isComplete
        ).length;

        const avgCompletion = data.length > 0
          ? data.reduce((sum, course) =>
            sum + (course.completion ? course.completion.percentage : 0), 0) / data.length
          : 0;

        setStats({
          totalCourses: data.length,
          completedCourses: completed,
          inProgressCourses: data.length - completed,
          averageCompletion: Math.round(avgCompletion)
        });
      } catch (err) {
        console.error("Error fetching courses:", err);
        setError("Failed to load your courses. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchCourses();
    }
  }, [user]);

  const progressDistribution = [
    { name: '0-25%', value: courses.filter(c => c.completion && c.completion.percentage <= 25).length },
    { name: '26-50%', value: courses.filter(c => c.completion && c.completion.percentage > 25 && c.completion.percentage <= 50).length },
    { name: '51-75%', value: courses.filter(c => c.completion && c.completion.percentage > 50 && c.completion.percentage <= 75).length },
    { name: '76-99%', value: courses.filter(c => c.completion && c.completion.percentage > 75 && c.completion.percentage < 100).length },
    { name: '100%', value: courses.filter(c => c.completion && c.completion.percentage === 100).length }
  ];

  const filteredProgressDistribution = progressDistribution.filter(item => item.value > 0);

  const COLORS = ['#FF8042', '#FFBB28', '#00C49F', '#0088FE', '#8884d8'];

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
    if (percent < 0.05) return null;

    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.1;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill={COLORS[index % COLORS.length]}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${name}: ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (loading) {
    return (
      <div className="relative bg-white min-h-screen font-['Kode_Mono']">
        {/* Sidebar */}
        <Sidebar 
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          activePage="analysis"
        />

        {/* Main Content */}
        <div className={`transition-all duration-300 ${isSidebarOpen ? "ml-60" : "ml-0"}`}>
          {/* Header */}
          <Header
            user={user}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            handleLogout={logout}
            showSearch={false}
          />

          {/* Dashboard Content */}
          <div className="p-6 max-w-7xl mx-auto">
            {/* Title skeleton */}
            <div className="h-9 w-64 bg-gray-200 rounded-md mb-6 animate-pulse"></div>
            
            {/* Stats overview skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="bg-white rounded-lg shadow p-6 animate-pulse">
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-[#EEBFF6] mr-3"></div>
                    <div className="h-5 w-32 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-8 w-16 bg-gray-200 rounded-md mt-2"></div>
                  {item === 4 && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2"></div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Charts section skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Pie Chart skeleton */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="h-6 w-48 bg-gray-200 rounded mb-4 animate-pulse"></div>
                <div className="flex items-center justify-center h-64 animate-pulse">
                  <div className="w-40 h-40 rounded-full bg-[#EEBFF6] opacity-50 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-white"></div>
                  </div>
                </div>
              </div>
              
              {/* Bar Chart skeleton */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="h-6 w-48 bg-gray-200 rounded mb-4 animate-pulse"></div>
                <div className="h-64 flex items-end justify-between px-6 animate-pulse">
                  {[1, 2, 3, 4, 5].map((bar) => (
                    <div 
                      key={bar} 
                      className="w-12 bg-[#EEBFF6] opacity-50 rounded-t"
                      style={{ height: `${Math.random() * 60 + 20}%` }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Course list skeleton */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Course Name', 'Progress', 'Status', 'Modules', 'Last Updated'].map((header) => (
                        <th key={header} className="px-6 py-3 text-left">
                          <div className="h-3 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[1, 2, 3, 4, 5].map((row) => (
                      <tr key={row} className="animate-pulse">
                        <td className="px-6 py-4">
                          <div className="flex items-start">
                            <div className="h-10 w-10 rounded bg-[#EEBFF6] opacity-50"></div>
                            <div className="ml-4">
                              <div className="h-4 w-40 bg-gray-200 rounded"></div>
                              <div className="h-3 w-20 bg-gray-200 rounded mt-1"></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-full bg-gray-200 rounded-full h-2.5"></div>
                          <div className="h-3 w-16 bg-gray-200 rounded mt-1"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-3 w-10 bg-gray-200 rounded"></div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="h-3 w-20 bg-gray-200 rounded"></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg">
        <div className="flex items-center">
          <AlertCircle className="text-red-500 mr-2" size={24} />
          <h2 className="text-lg font-semibold text-red-700">Error</h2>
        </div>
        <p className="mt-2 text-red-600">{error}</p>
        <button
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  const getProgressColor = (completion) => {
    if (!completion) return "bg-gray-300";

    if (completion.percentage >= 100) return "bg-green-500";
    if (completion.percentage >= 75) return "bg-blue-500";
    if (completion.percentage >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return "Invalid date";
    }
  };

  return (
    <div className="relative bg-white min-h-screen font-['Kode_Mono']">
      {/* Sidebar */}
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activePage="analysis"
      />

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          isSidebarOpen ? "ml-60" : "ml-0"
        }`}
      >
        {/* Header */}
        <Header
          user={user}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          handleLogout={logout}
          showSearch={false}
        />

        {/* Dashboard Content */}
        <div className="p-6 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">My Learning Dashboard</h1>
          
          {/* Stats overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <BookOpen className="text-blue-500 mr-3" size={24} />
                <h2 className="text-lg font-semibold">Total Courses</h2>
              </div>
              <p className="text-3xl font-bold mt-2">{stats.totalCourses}</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Award className="text-green-500 mr-3" size={24} />
                <h2 className="text-lg font-semibold">Completed</h2>
              </div>
              <p className="text-3xl font-bold mt-2">{stats.completedCourses}</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Clock className="text-orange-500 mr-3" size={24} />
                <h2 className="text-lg font-semibold">In Progress</h2>
              </div>
              <p className="text-3xl font-bold mt-2">{stats.inProgressCourses}</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white mr-3">%</div>
                <h2 className="text-lg font-semibold">Avg. Completion</h2>
              </div>
              <p className="text-3xl font-bold mt-2">{stats.averageCompletion}%</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className="h-2 rounded-full bg-blue-500"
                  style={{ width: `${stats.averageCompletion}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Charts section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Course progress distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Course Progress Distribution</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={filteredProgressDistribution.length > 0 ? filteredProgressDistribution : [{name: 'No Data', value: 1}]}
                      cx="50%"
                      cy="50%"
                      labelLine={filteredProgressDistribution.length > 0}
                      outerRadius={80}
                      innerRadius={40}
                      fill="#8884d8"
                      dataKey="value"
                      label={renderCustomizedLabel}
                    >
                      {filteredProgressDistribution.length > 0 ? (
                        filteredProgressDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))
                      ) : (
                        <Cell fill="#d3d3d3" />
                      )}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} courses`, 'Count']} 
                      contentStyle={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                        border: 'none'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Course completion stats - BarChart for better visibility */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Your Learning Progress</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={courses.map((course, index) => ({
                      name: course.shortname || `Course ${index + 1}`,
                      progress: course.completion ? course.completion.percentage : 0
                    }))}
                    margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60}
                      interval={0}
                      tick={{fontSize: 12}}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      label={{ value: 'Completion %', angle: -90, position: 'insideLeft' }} 
                    />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Progress']}
                      contentStyle={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                        border: 'none'
                      }}
                    />
                    <Bar 
                      dataKey="progress" 
                      fill="#8884d8" 
                      radius={[4, 4, 0, 0]}
                      barSize={30}
                    >
                      {courses.map((entry, index) => {
                        const completion = entry.completion;
                        let color = '#d3d3d3';
                        
                        if (completion) {
                          if (completion.percentage >= 100) color = '#4CAF50';
                          else if (completion.percentage >= 75) color = '#2196F3';
                          else if (completion.percentage >= 25) color = '#FF9800';
                          else color = '#F44336';
                        }
                        
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* Course list */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold">My Courses ({courses.length})</h2>
              <button className="text-blue-600 hover:text-blue-800 text-sm flex items-center">
                View All <ChevronRight size={16} className="ml-1" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modules</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                        <Book className="mx-auto mb-2 text-gray-400" size={24} />
                        <p>No courses found</p>
                      </td>
                    </tr>
                  ) : (
                    courses.map((course) => (
                      <tr key={course.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 h-10 w-10 rounded bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                              {course.shortname ? course.shortname.charAt(0) : "C"}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{course.fullname}</div>
                              <div className="text-sm text-gray-500">{course.shortname}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`${getProgressColor(course.completion)} h-full rounded-full`}
                              style={{ width: `${course.completion ? course.completion.percentage : 0}%` }}
                            ></div>
                          </div>
                          <div className="text-xs font-medium text-gray-900 mt-1">
                            {course.completion?.percentage || 0}% complete
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            course.completion?.isComplete ? 
                              "bg-green-100 text-green-800" : 
                              "bg-yellow-100 text-yellow-800"
                          }`}>
                            {course.completion?.status || "Not started"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {course.completion?.completedCount || 0}/{course.completion?.totalModules || 0}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(course.completion?.lastUpdated)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}