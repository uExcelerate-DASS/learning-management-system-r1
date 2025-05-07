import { useState, useEffect } from 'react';
import { BookOpen, Clock, FileText, Check, AlertCircle, Loader2, Users, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function CoachCourses() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { courses, loading, error, getCoachCourses,  } = useUser();
    
    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    // Add state to store processed courses
    const [processedCourses, setProcessedCourses] = useState<any[]>([]);
    
    const [announcements, setAnnouncements] = useState([
        { id: 1, text: "New assignment added to Leadership Basics", date: "Aug 10" },
        { id: 2, text: "Q&A session scheduled for Team Management", date: "Aug 11" },
        { id: 3, text: "Course materials updated for Decision Making", date: "Aug 12" },
    ]);

    // Fetch coach courses when component mounts
    useEffect(() => {
        getCoachCourses();
    }, []);

    // Process courses data when it changes
    useEffect(() => {
        console.log("Courses data:", courses); // Debug log to see what we're getting
        
        // Check if courses exists and convert to array if needed
        if (courses) {
            // If courses is already an array, use it directly
            if (Array.isArray(courses)) {
                setProcessedCourses(courses);
            } 
            // If courses is an object with numeric keys
            else if (typeof courses === 'object' && courses !== null) {
                // Convert object to array if it looks like an array-like object
                const coursesArray = Object.keys(courses).map(key => courses[key]);
                setProcessedCourses(coursesArray);
            } else {
                // Reset to empty array if no valid data
                setProcessedCourses([]);
            }
        } else {
            setProcessedCourses([]);
        }
    }, [courses]);

    const addAnnouncement = (text: string) => {
        const newAnnouncement = {
            id: announcements.length + 1,
            text,
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
        setAnnouncements([newAnnouncement, ...announcements]);
    };

    // Function to view course students
    const viewCourseStudents = (courseId: string) => {
        navigate(`/coach/course/${courseId}/students`);
    };

    const redirectToMoodleCourseCreation = () => {
        // Option 1: Open in new tab (recommended for external URLs)
        window.open("http://34.57.113.242/moodle/course/edit.php", "_blank");
        
        // Option 2: Redirect in same tab (use this if you prefer)
        // window.location.href = "http://34.57.113.242/moodle/course/edit.php";
    };

    const navigateToCourse = (courseId: number) => {
        console.log("Navigating to course:", courseId);
        // Add leading slash to make this an absolute path
        navigate(`/coach/course/${courseId}`);
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
                <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Header Section */}
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold">Hello {user?.name}</h1>
                            <p className="text-[#85878D] text-lg">
                                Manage your courses and track student progress
                            </p>
                        </div>

                        {/* Your Courses */}
                        <div className="bg-white border border-black rounded-lg shadow-sm p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-medium">Your Courses</h2>
                                <button
                                onClick={redirectToMoodleCourseCreation}
                                 className="flex items-center gap-2 px-4 py-2 bg-[#EEBFF6] hover:bg-[#DFA9E5] border border-black rounded-lg">
                                    <PlusCircle size={18} />
                                    <span>Create Course</span>
                                </button>
                            </div>

                            {/* Course List with Loading and Error States */}
                            {loading ? (
                                <div className="flex justify-center items-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-[#8C5AFF]" />
                                    <span className="ml-2">Loading courses...</span>
                                </div>
                            ) : processedCourses.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-gray-500">You haven't created any courses yet.</p>
                                    <button 
                                        className="mt-3 px-4 py-2 bg-[#EEBFF6] hover:bg-[#DFA9E5] border border-black rounded-lg"
                                    >
                                        Create Your First Course
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {processedCourses.map((course, index) => (
                                        <CourseItem 
                                            key={course.id || index}
                                            id={course.id}
                                            title={course.fullname || course.name || `Course ${index + 1}`}
                                            // students={`${Math.floor(Math.random() * 20) + 5} Students`}
                                            // lessons={`${Math.floor(Math.random() * 10) + 5} Lessons`}
                                            // assignments={`${Math.floor(Math.random() * 5) + 1} Assignments`}
                                            onManage={() => viewCourseStudents(course.id)}
                                            onClick={() => course.id && navigateToCourse(Number(course.id))} // Add onClick handler
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Announcements */}
                    <div className="bg-white border border-[#484849] rounded-lg shadow-sm p-6 h-fit">
                        <h2 className="text-xl font-medium mb-6">Course Announcements</h2>  
                        <div className="space-y-4">
                            {announcements.map(announcement => (
                                <div key={announcement.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                                    <div className="flex flex-col">
                                        <p className="text-sm">{announcement.text}</p>
                                        <p className="text-xs text-[#41475E] opacity-50 mt-1">{announcement.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CourseItem({ id, title, students, lessons, assignments, onManage, onClick }: { 
    id?: number;
    title: string;
    students?: string;
    lessons?: string;
    assignments?: string;
    onManage?: () => void;
    onClick?: () => void; // Add this prop to type definition
}) {
    return (
        // Add onClick handler to the container div
        <div 
            className="bg-white border border-[#EEBFF6] rounded-lg p-4 shadow-sm cursor-pointer"
            onClick={onClick} // Add this onClick handler
        >
            <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                    <BookOpen size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="font-medium">{title}</h3>
                    <div className="flex gap-4 mt-2 text-sm text-[#1C1D1D]">
                        {students && <div className="flex items-center gap-2">
                            <Users size={16} />
                            <span>{students}</span>
                        </div>}
                        {lessons && <div className="flex items-center gap-2">
                            <FileText size={16} />
                            <span>{lessons}</span>
                        </div>}
                        { assignments && <div className="flex items-center gap-2">
                            <Check size={16} />
                            <span>{assignments}</span>
                        </div>}
                    </div>
                </div>
                <div className="flex space-x-2">
                    <button 
                        className="px-4 py-2 bg-[#EEBFF6] border border-black rounded-lg"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering the parent onClick
                            if (onManage) onManage();
                        }}
                    >
                        Manage
                    </button>
                    <button 
                        className="px-4 py-2 bg-[#EEBFF6] border border-black rounded-lg flex items-center"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering the parent onClick
                            // Open Moodle course edit page in new tab
                            if (id) {
                                const moodleEditUrl = `${import.meta.env.VITE_MOODLE_URL || 'http://34.57.113.242/moodle'}/course/edit.php?id=${id}`;
                                window.open(moodleEditUrl, '_blank');
                            }
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        Edit
                    </button>
                </div>
            </div>
        </div>
    );
}
