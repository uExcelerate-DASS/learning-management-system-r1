import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, Search, Users, ArrowLeft, User, BookOpen, Mail, Calendar, ExternalLink } from 'lucide-react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

interface Student {
  id: number;
  fullname: string;
  email: string;
  profileimageurl: string;
  lastaccess: number;
  courses: { id: number; name: string }[];
}

export default function AllStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();

  // Get user info from local storage
  const userJson = localStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;
  const moodleToken = localStorage.getItem('moodleToken');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:8080/api/users/coach/students`, {
          headers: {
            'Content-Type': 'application/json',
            'x-moodle-token': moodleToken
          }
        });
        setStudents(response.data);
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching students:', err);
        setError(err.response?.data?.message || 'Error fetching students data');
        setLoading(false);
      }
    };

    fetchStudents();
  }, [moodleToken]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('moodleToken');
    navigate('/login');
  };

  const goBack = () => {
    navigate(-1);
  };

  const filteredStudents = students.filter(student => 
    student.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.courses.some(course => course.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="relative bg-white min-h-screen font-['Kode_Mono']">
      <Sidebar 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        activePage="students"
        userRole="coach"
      />

      <div className={`transition-all duration-300 ${isSidebarOpen ? 'ml-60' : 'ml-0'}`}>
        <Header 
          user={user}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          handleLogout={handleLogout}
          showSearch={false}
        />
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
              <h1 className="text-2xl font-bold">All Students</h1>
              <p className="text-[#85878D]">Overview of all students and their courses</p>
            </div>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-black shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Students</p>
                  <p className="text-2xl font-bold">{students.length}</p>
                </div>
                <div className="p-3 rounded-full bg-[#EEBFF6]">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-black shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Enrollments</p>
                  <p className="text-2xl font-bold">
                    {students.reduce((acc, student) => acc + student.courses.length, 0)}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-[#FFCE6D]">
                  <BookOpen className="h-6 w-6" />
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-black shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active in Last Week</p>
                  <p className="text-2xl font-bold">
                    {students.filter(student => {
                      const oneWeekAgo = Date.now() / 1000 - 7 * 24 * 60 * 60;
                      return student.lastaccess > oneWeekAgo;
                    }).length}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-[#C1EFFF]">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Search */}
          <div className="flex justify-between items-center">
            <div className="relative w-full md:w-1/3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search students or courses..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <button 
                className="px-4 py-2 border border-black bg-white rounded-lg"
                onClick={() => {
                  // Function to export students data as CSV
                  const exportStudentsToCSV = () => {
                    // Define CSV headers
                    const headers = ['ID', 'Full Name', 'Email', 'Last Access', 'Courses'];
                    
                    // Format data rows
                    const rows = filteredStudents.map(student => [
                      student.id,
                      student.fullname,
                      student.email,
                      student.lastaccess 
                        ? new Date(student.lastaccess * 1000).toLocaleDateString()
                        : 'Never',
                      student.courses.map(c => c.name).join(', ')
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
                    link.setAttribute('download', 'All_Students.csv');
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
            {loading ? (
              <div className="flex justify-center items-center p-10">
                <Loader2 className="h-8 w-8 animate-spin text-[#8C5AFF] mr-2" />
                <span>Loading students...</span>
              </div>
            ) : error ? (
              <div className="p-6 text-center text-red-500">
                <p>{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-2 text-sm px-3 py-1 bg-red-100 hover:bg-red-200 rounded"
                >
                  Try again
                </button>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-10 text-center text-gray-500">
                <Users className="mx-auto h-10 w-10 mb-2" />
                <p className="text-lg font-medium">No students found</p>
                <p>No students match your search criteria.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Access</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courses</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <img 
                              className="h-10 w-10 rounded-full" 
                              src={student.profileimageurl} 
                              alt={student.fullname}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://via.placeholder.com/40?text=User';
                              }} 
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{student.fullname}</div>
                            <div className="text-sm text-gray-500">ID: {student.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{student.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {student.lastaccess 
                            ? new Date(student.lastaccess * 1000).toLocaleDateString()
                            : 'Never'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {student.courses.map(course => (
                            <span key={course.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {course.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => window.open(`http://34.57.113.242/moodle/user/profile.php?id=${student.id}`, '_blank')}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <ExternalLink size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}