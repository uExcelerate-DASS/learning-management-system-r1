import { useState, useEffect, FormEvent, useMemo } from 'react';
import { LayoutDashboard, Calendar, FileText, User, ChevronLeft, Menu, BookOpen, Clock, Check, AlertCircle, Loader2, Plus, X, Calendar as CalendarIcon, LucideArrowDownWideNarrow } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import axios from 'axios';
import EmptyState from '../components/EmptyState';

// Todo item interface
interface Todo {
    id: string;
    text: string;
    date: string;
    completed: boolean;
    source: 'manual' | 'assignment';
    courseId?: number;
    cmid?: number; // Course module ID for assignments
}

// Course metadata interface to store consistent values
interface CourseMetadata {
    id: number;
    duration: string;
    lessons: string;
}

export default function TrackCourses() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const navigate = useNavigate();
    const { user, token, logout } = useAuth();
    const { courses, loading, error, getUserCourses, getAllCourses } = useUser();
    
    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    // Add state to store processed courses
    const [processedCourses, setProcessedCourses] = useState<any[]>([]);
    
    // State for todos
    const [todos, setTodos] = useState<Todo[]>([]);
    
    // State for new todo input
    const [newTodoText, setNewTodoText] = useState('');
    const [newTodoDate, setNewTodoDate] = useState('');
    const [showAddTodo, setShowAddTodo] = useState(false);
    const [loadingTodos, setLoadingTodos] = useState(false);

    // State for course metadata to keep it consistent across renders
    const [courseMetadata, setCourseMetadata] = useState<Map<number, CourseMetadata>>(new Map());

    // API base URL
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

    // Fetch user courses when component mounts
    useEffect(() => {
        getUserCourses();
        getAllCourses();
    }, []);

    // Process courses data when it changes
    useEffect(() => {
        // Check if courses exists and convert to array if needed
        if (courses) {
            let coursesArray: any[] = [];
            
            // If courses is already an array, use it directly
            if (Array.isArray(courses)) {
                coursesArray = courses;
            } 
            // If courses is an object with numeric keys (like an object representation of an array)
            else if (typeof courses === 'object' && courses !== null) {
                // Convert object to array if it looks like an array-like object
                coursesArray = Object.keys(courses).map(key => courses[key]);
            }
            
            // Update processed courses
            setProcessedCourses(coursesArray);
            
            // Generate and store consistent metadata for each course
            const newMetadata = new Map<number, CourseMetadata>();
            coursesArray.forEach((course) => {
                if (course.id && !courseMetadata.has(course.id)) {
                    // Only create new metadata if it doesn't exist yet
                    newMetadata.set(course.id, {
                        id: course.id,
                        duration: `${Math.floor(Math.random() * 10)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}hrs`,
                        lessons: `${Math.floor(Math.random() * 10 + 1)} Lessons`
                    });
                } else if (course.id) {
                    // Keep existing metadata
                    newMetadata.set(course.id, courseMetadata.get(course.id)!);
                }
            });
            
            // Update metadata state with both existing and new values
            setCourseMetadata(prev => {
                const updated = new Map(prev);
                newMetadata.forEach((value, key) => {
                    updated.set(key, value);
                });
                return updated;
            });
            
        } else {
            setProcessedCourses([]);
        }
    }, [courses]);

    // Fetch todos - both manual and from assignments
    useEffect(() => {
        // Load saved todos from localStorage
        const savedTodos = localStorage.getItem('userTodos');
        if (savedTodos) {
            setTodos(JSON.parse(savedTodos));
        }
        
        // Only fetch assignments if we have courses
        if (processedCourses.length > 0 && user?.moodleid) {
            fetchAssignmentsForTodos();
        }
    }, [processedCourses, user?.moodleid]);

    // Fetch pending assignments and convert them to todos
    const fetchAssignmentsForTodos = async () => {
        if (!user?.moodleid || processedCourses.length === 0) return;
        
        setLoadingTodos(true);
        try {
            // For each course, fetch activity completion data
            const moodleUserId = user.moodleid;
            let assignmentTodos: Todo[] = [];
            
            // Get existing assignment todos to avoid duplicates
            const existingAssignmentIds = todos
                .filter(todo => todo.source === 'assignment')
                .map(todo => todo.cmid);
            
            await Promise.all(processedCourses.map(async (course) => {
                try {
                    // Fetch activity completion data for the course
                    const activityResponse = await axios.get(
                        `${API_BASE_URL}/api/completion/activities/${course.id}/${moodleUserId}`, 
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    
                    // Find incomplete assignments
                    if (activityResponse.data && activityResponse.data.statuses) {
                        const assignments = activityResponse.data.statuses.filter(
                            (status: any) => 
                                status.modname === 'assign' && 
                                status.state === 0 && // Not completed
                                !existingAssignmentIds.includes(status.cmid) // Not already in todos
                        );
                        
                        // Convert assignments to todo items
                        assignments.forEach((assignment: any) => {
                            // Generate a due date (would ideally come from Moodle)
                            // For now we'll just use a date a week from now as placeholder
                            const dueDate = new Date();
                            dueDate.setDate(dueDate.getDate() + 7);
                            const formattedDate = dueDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                            });
                            
                            assignmentTodos.push({
                                id: `assign-${assignment.cmid}`,
                                text: `Assignment for ${course.shortname || course.fullname}`,
                                date: formattedDate,
                                completed: false,
                                source: 'assignment',
                                courseId: course.id,
                                cmid: assignment.cmid
                            });
                        });
                    }
                } catch (error) {
                    console.error(`Error fetching assignments for course ${course.id}:`, error);
                }
            }));
            
            // Merge assignment todos with manual todos
            setTodos(prevTodos => {
                const manualTodos = prevTodos.filter(todo => todo.source === 'manual');
                const newTodos = [...manualTodos, ...assignmentTodos];
                // Save to localStorage
                localStorage.setItem('userTodos', JSON.stringify(newTodos));
                return newTodos;
            });
            
        } catch (error) {
            console.error("Error fetching assignments for todos:", error);
        } finally {
            setLoadingTodos(false);
        }
    };

    // Toggle todo completion status
    const toggleTodo = async (id: string) => {
        const todoToToggle = todos.find(todo => todo.id === id);
        
        if (!todoToToggle) return;
        
        // If it's an assignment todo, update it in Moodle
        if (todoToToggle.source === 'assignment' && todoToToggle.cmid) {
            try {
                const completed = !todoToToggle.completed;
                
                // Call the Moodle API to update the activity completion status
                await axios.post(`${API_BASE_URL}/api/completion/activity/update`, 
                    { 
                        cmid: todoToToggle.cmid, 
                        completed 
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                
                // Update local state
                const updatedTodos = todos.map(todo => 
                    todo.id === id ? { ...todo, completed } : todo
                );
                setTodos(updatedTodos);
                localStorage.setItem('userTodos', JSON.stringify(updatedTodos));
                
            } catch (error) {
                console.error("Error updating assignment completion status:", error);
                // If the API call fails, don't update the UI
                return;
            }
        } else {
            // For manual todos, just update the local state
            const updatedTodos = todos.map(todo => 
                todo.id === id ? { ...todo, completed: !todo.completed } : todo
            );
            setTodos(updatedTodos);
            localStorage.setItem('userTodos', JSON.stringify(updatedTodos));
        }
    };
    
    // Add a new todo
    const addTodo = (e: FormEvent) => {
        e.preventDefault();
        
        if (!newTodoText.trim()) return;
        
        const date = newTodoDate ? 
            new Date(newTodoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
            new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const newTodo: Todo = {
            id: `manual-${Date.now()}`,
            text: newTodoText.trim(),
            date,
            completed: false,
            source: 'manual'
        };
        
        // Add new todo to the list
        const updatedTodos = [...todos, newTodo];
        setTodos(updatedTodos);
        
        // Save to localStorage
        localStorage.setItem('userTodos', JSON.stringify(updatedTodos));
        
        // Reset form
        setNewTodoText('');
        setNewTodoDate('');
        setShowAddTodo(false);
    };
    
    // Delete a todo
    const deleteTodo = (id: string) => {
        const updatedTodos = todos.filter(todo => todo.id !== id);
        setTodos(updatedTodos);
        localStorage.setItem('userTodos', JSON.stringify(updatedTodos));
    };

    // Calculate assignment count for each course (memoized)
    const courseAssignmentCount = useMemo(() => {
        const counts = new Map<number, number>();
        
        processedCourses.forEach(course => {
            if (course.id) {
                const assignmentCount = todos.filter(
                    todo => todo.source === 'assignment' && todo.courseId === course.id
                ).length;
                counts.set(course.id, assignmentCount);
            }
        });
        
        return counts;
    }, [processedCourses, todos]);

    // Add navigation function - same as in Learners_dashboard.tsx
    const navigateToCourse = (courseId: number) => {
        console.log("Navigating to course:", courseId);
        navigate(`/course/${courseId}`);
    };

    return (
        <div className="relative bg-white min-h-screen font-['Kode_Mono']">
            {/* Sidebar */}
            <Sidebar 
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                activePage="courses"
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
                                View all the courses you have enrolled in
                            </p>
                        </div>

                        {/* Recent Enrolled Classes */}
                        <div className="bg-white border border-black rounded-lg shadow-sm p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-medium">Recent enrolled classes</h2>
                                <div className="flex items-center gap-4 text-[#1C1D1D] opacity-80">
                                    <span>All</span>
                                    <div className="p-2 bg-gray-100 rounded-full">
                                        <BookOpen size={20} />
                                    </div>
                                </div>
                            </div>

                            {/* Course List with Loading and Error States */}
                            {loading ? (
                                <div className="flex justify-center items-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-[#8C5AFF]" />
                                    <span className="ml-2">Loading courses...</span>
                                </div>
                            ) : error ? (
                                <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
                                    <p>Error loading courses: {error}</p>
                                    <button 
                                        onClick={getAllCourses}
                                        className="mt-2 text-sm px-3 py-1 bg-red-100 hover:bg-red-200 rounded"
                                    >
                                        Try again
                                    </button>
                                </div>
                            ) : processedCourses.length === 0 ? (
                                <EmptyState 
                                    type="courses"
                                    description="You haven't enrolled in any courses yet. Check back later for new courses or contact your administrator."
                                    actionLabel="Refresh"
                                    onAction={() => {
                                        // Add your refresh function here
                                        getAllCourses(); // Assuming you have a fetchCourses function
                                    }}
                                />
                            ) : (
                                <div className="space-y-6">
                                    {/* Use processedCourses instead of courses */}
                                    {processedCourses.map((course, index) => {
                                        const metadata = courseMetadata.get(course.id) || {
                                            duration: "0:00hrs",
                                            lessons: "0 Lessons"
                                        };
                                        
                                        const assignmentCount = courseAssignmentCount.get(course.id) || 0;
                                        const assignmentText = assignmentCount === 1 ? "1 Assignment" : `${assignmentCount} Assignments`;
                                        
                                        return (
                                            <CourseItem 
                                                key={course.id || index}
                                                title={course.fullname || course.name || `Course ${index + 1}`}
                                                // duration={metadata.duration}
                                                // lessons={metadata.lessons}
                                                // assignments={assignmentText}
                                                onClick={() => course.id && navigateToCourse(Number(course.id))} // Add onClick handler
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Upcoming Lessons - Only show if there are courses */}
                        {processedCourses.length > 0 && (
                            <div className="bg-white border border-black rounded-lg shadow-sm p-6">
                                <h2 className="text-xl font-medium mb-6">Upcoming Lesson</h2>
                                <div className="space-y-6">
                                    <UpcomingLessonCard 
                                        icon={<BookOpen size={24} />}
                                        title={processedCourses[0]?.fullname || processedCourses[0]?.name || "Next Lesson"}
                                        time="5:30pm"
                                        courseId={processedCourses[0]?.id} // Pass course ID
                                    />
                                    {processedCourses.length > 1 && (
                                        <UpcomingLessonCard 
                                            icon={<AlertCircle size={24} />}
                                            title={processedCourses[1]?.fullname || processedCourses[1]?.name || "Following Lesson"}
                                            time="9:00pm"
                                            courseId={processedCourses[1]?.id} // Pass course ID
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Todo List */}
                    <div className="bg-white border border-[#484849] rounded-lg shadow-sm p-6 h-fit">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-medium">To Do List</h2>
                            <button 
                                onClick={() => setShowAddTodo(!showAddTodo)}
                                className="p-1 bg-[#EEBFF6] rounded-full border border-black hover:bg-[#DFA9E5] flex items-center justify-center"
                                title="Add new to-do item"
                            >
                                {showAddTodo ? <X size={18} /> : <Plus size={18} />}
                            </button>
                        </div>
                        
                        {/* Add Todo Form */}
                        {showAddTodo && (
                            <form onSubmit={addTodo} className="mb-4 border border-gray-200 rounded-lg p-3 bg-gray-50">
                                <div className="mb-2">
                                    <input 
                                        type="text"
                                        placeholder="What do you need to do?" 
                                        value={newTodoText}
                                        onChange={(e) => setNewTodoText(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                        required
                                    />
                                </div>
                                <div className="mb-3 flex items-center gap-2">
                                    <CalendarIcon size={16} className="text-gray-500" />
                                    <input 
                                        type="date"
                                        value={newTodoDate}
                                        onChange={(e) => setNewTodoDate(e.target.value)}
                                        className="text-sm p-1 border border-gray-300 rounded-lg flex-1"
                                    />
                                </div>
                                <button 
                                    type="submit"
                                    className="w-full py-2 bg-[#EEBFF6] hover:bg-[#DFA9E5] border border-black rounded-lg text-sm"
                                >
                                    Add Task
                                </button>
                            </form>
                        )}

                        {/* Todo List */}
                        {loadingTodos ? (
                            <div className="flex justify-center items-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-[#8C5AFF]" />
                                <span className="ml-2 text-sm">Loading tasks...</span>
                            </div>
                        ) : todos.length > 0 ? (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                {todos.map(todo => (
                                    <div key={todo.id} className="flex items-center gap-4 py-2 group">
                                        <button 
                                            onClick={() => toggleTodo(todo.id)}
                                            className={`w-5 h-5 border border-black rounded-sm flex items-center justify-center 
                                                ${todo.completed ? 'bg-[#EEBFF6]' : 'bg-white'}`}
                                        >
                                            {todo.completed && <Check size={14} />}
                                        </button>
                                        <div className="flex-1">
                                            <div className="flex items-center">
                                                <p className={`text-sm ${todo.completed ? 'line-through opacity-70' : ''}`}>
                                                    {todo.text}
                                                </p>
                                                {todo.source === 'assignment' && (
                                                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                                                        Assignment
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-[#41475E] opacity-50">{todo.date}</p>
                                        </div>
                                        {/* Show delete button only for manual todos */}
                                        {todo.source === 'manual' && (
                                            <button 
                                                onClick={() => deleteTodo(todo.id)}
                                                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>No tasks yet</p>
                                <p className="text-sm mt-1">Add a task or enroll in courses to see assignments</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Update the CourseItem component to accept onClick
function CourseItem({ title, duration, lessons, assignments, onClick }: { 
    title: string;
    duration?: string;
    lessons?: string;
    assignments?: string;
    onClick?: () => void; // Add onClick prop
}) {
    return (
        <div 
            className={`bg-white border border-[#EEBFF6] rounded-lg p-4 shadow-sm 
                ${onClick ? 'cursor-pointer hover:bg-[#FCFAFF] hover:shadow-md transition-all duration-200' : ''}`} 
            onClick={onClick} // Add onClick handler
        >
            <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-100 rounded-lg">
                    <BookOpen size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="font-medium">{title}</h3>
                    <div className="flex gap-4 mt-2 text-sm text-[#1C1D1D]">
                        { duration && <div className="flex items-center gap-2">
                            <Clock size={16} />
                            <span>{duration}</span>
                        </div>}
                        { lessons && <div className="flex items-center gap-2">
                            <FileText size={16} />
                            <span>{lessons}</span>
                        </div>}
                        { assignments && <div className="flex items-center gap-2">
                            <Check size={16} />
                            <span>{assignments}</span>
                        </div>}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Update UpcomingLessonCard to navigate to course details
function UpcomingLessonCard({ icon, title, time, courseId }: { 
    icon: React.ReactNode;
    title: string;
    time: string;
    courseId?: number; // Add courseId prop
}) {
    const navigate = useNavigate(); // Add useNavigate
    
    const handleJoin = () => {
        if (courseId) {
            navigate(`/course/${courseId}`); // Navigate to course details
        }
    };
    
    return (
        <div className="bg-white rounded-lg p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
                <div>
                    <h3 className="font-medium">{title}</h3>
                    <p className="text-sm text-gray-500">{time}</p>
                </div>
            </div>
            <button 
                className="px-4 py-2 bg-[#EEBFF6] rounded-lg border border-black hover:bg-[#DFA9E5] transition-colors"
                onClick={handleJoin} // Add click handler to Join button
            >
                Join
            </button>
        </div>
    );
}