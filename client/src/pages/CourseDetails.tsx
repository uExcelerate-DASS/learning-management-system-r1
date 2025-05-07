import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { 
  Loader2, 
  FileText, 
  Video, 
  Link, 
  Download, 
  Book, 
  ArrowLeft, 
  AlertCircle, 
  Maximize2, 
  Minimize2, 
  ExternalLink, 
  ArrowLeftCircle, 
  ArrowRightCircle,
  CheckCircle,
  CheckCircle2,
  Clock
} from "lucide-react";
import axios from "axios";

// Import course images
import img1 from "../images/1.jpeg";
import img2 from "../images/2.jpeg";
import img3 from "../images/3.jpeg";
import img4 from "../images/4.jpeg";
import img5 from "../images/5.jpeg";
import img6 from "../images/6.jpeg";

// Create an array of images for consistent selection
const courseImages = [img1, img2, img3, img4, img5, img6];

// Function to get a consistent image based on course ID
const getConsistentImage = (courseId: number | string) => {
  // Convert string IDs to numbers if needed
  const numericId = typeof courseId === 'string' ? parseInt(courseId, 10) : courseId;
  
  // If conversion failed or ID is invalid, return the first image as default
  if (isNaN(numericId) || numericId <= 0) {
    return courseImages[0];
  }
  
  // Use modulo to get a consistent index based on the course ID
  const imageIndex = (numericId % courseImages.length);
  return courseImages[imageIndex];
};

interface ContentItem {
  type: string;
  filename: string;
  filepath?: string;
  filesize: number;
  fileurl?: string;
  content?: string;
  mimetype?: string;
  timecreated?: number;
  timemodified?: number;
  completed?: boolean;
}

interface Module {
  id: number;
  name: string;
  description: string;
  visible?: number;
  uservisible?: number;
  modname: string;
  modicon?: string;
  modplural?: string;
  contents?: ContentItem[];
  completed?: boolean;
}

interface CourseSection {
  id: number;
  name: string;
  summary: string;
  summaryformat: number;
  visible?: number;
  uservisible?: number;
  modules: Module[];
  completed?: boolean;
}

interface CourseDetails {
  id: number;
  fullname: string;
  shortname: string;
  summary: string;
  progress?: number;
  image?: string;
  sections: CourseSection[];
  tags?: string[];
}

export default function CourseDetails() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { getCourseContents, courses: userCourses, loading: coursesLoading, getUserCourses, getAllCourses, enrollUserInCourse } = useUser();
  
  const [courseDetails, setCourseDetails] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
  const [notEnrolled, setNotEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedContent, setExpandedContent] = useState<Set<number>>(new Set());
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [loadAttempted, setLoadAttempted] = useState(false);
  
  // Add ref to track if component is mounted
  const isMounted = useRef(true);
  
  // Calculate course progress based on completed modules
  const calculateProgress = () => {
    if (!courseDetails) return 0;
    
    const totalModules = courseDetails.sections.reduce(
      (total, section) => total + section.modules.length, 
      0
    );
    
    return totalModules > 0 ? (completedModules.size / totalModules) * 100 : 0;
  };
  
// Update the useEffect hook that fetches course details

useEffect(() => {
  // Set up the mounted ref
  isMounted.current = true;
  
  const fetchCourseDetails = async () => {
    if (!courseId || loadAttempted) return; // Prevent multiple load attempts
    
    try {
      setLoading(true);
      setNotEnrolled(false); // Reset enrollment check
      setLoadAttempted(true); // Mark that we've attempted loading

      // Ensure we have user courses data
      if (!userCourses || userCourses.length === 0) {
        await getUserCourses();
      }

      // Try to find basic info about the course from all available courses
      const courseInfo = userCourses.find(c => c.id === Number(courseId)) || {
        id: Number(courseId),
        fullname: "Course Details",
        shortname: "",
        summary: "",
      };
      
      // First set basic course info
      if (courseInfo) {
        setCourseDetails({
          id: courseInfo.id ?? Number(courseId),
          fullname: courseInfo.fullname || "Course Details",
          shortname: courseInfo.shortname || "",
          summary: courseInfo.summary || "",
          // Only include progress if it exists in courseInfo
          ...(('progress' in courseInfo) && { progress: courseInfo.progress }),
          image: getConsistentImage(courseInfo.id ?? Number(courseId)), // Use consistent image function
          sections: [], // Start with empty sections
          tags: [] // Initialize tags
        });
      }
      
      // Now try to get course contents
      const response = await getCourseContents(Number(courseId));
      
      if (!isMounted.current) return;
      
      // Check if we got the non-enrolled indicator
      if (response.notEnrolled) {
        setNotEnrolled(true);
      } else {
        // Update course details with sections and tags
        setCourseDetails(prev => ({
          ...prev!,
          sections: response.sections || [],
          tags: response.tags || []
        }));
        
        // Set active module/section if available
        if (response.sections && response.sections.length > 0) {
          setActiveSectionId(response.sections[0].id);
          if (response.sections[0].modules?.length > 0) {
            setActiveModuleId(response.sections[0].modules[0].id);
          }
        }

        // Fetch completed modules using the simplified approach
        if (user && user.id) {
          fetchCompletedModules(Number(courseId));
        } else {
          console.warn('User not available, cannot fetch completion data');
          // For testing during development, you could set some mock data:
          // setCompletedModules(new Set([123, 456, 789]));
        }
      }
    } catch (err) {
      if (isMounted.current) {
        setError("Failed to load course details. Please try again.");
        console.error("Error loading course details:", err);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };
  
  fetchCourseDetails();
  
  return () => {
    isMounted.current = false;
  };
}, [courseId, getCourseContents, getUserCourses, getAllCourses, user]);

  // This would be replaced with actual API calls in production
  // Replace the placeholder functions in CourseDetails.tsx with these implementations

// Fetch completed modules for the current course
// Replace the API calls in CourseDetails.tsx with these simplified versions

// Fetch completed modules for the current course
const fetchCompletedModules = async (courseId: number) => {
  try {
    setLoading(true);
    
    // Get the user ID from the user context
    const userId = user?.id || user?._id;
    
    if (!userId) {
      console.warn('User ID not available');
      setCompletedModules(new Set());
      return;
    }
    
    // Send the userId as a query parameter
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL}/api/completion/module-progress/${courseId}?userId=${userId}`
    );
    
    if (response.data && response.data.completedModuleIds) {
      setCompletedModules(new Set(response.data.completedModuleIds));
    }
  } catch (err) {
    console.error("Error fetching module completion status:", err);
    // Initialize with empty set if the API fails
    setCompletedModules(new Set());
  } finally {
    setLoading(false);
  }
};

// Mark a module as complete
const markModuleComplete = async (moduleId: number) => {
  try {
    setIsMarkingComplete(true);
    
    // Get the user ID from the user context
    const userId = user?.id || user?._id;
    console.log('User ID:', userId);
    if (!userId) {
      console.warn('User ID not available');
      // Still update UI optimistically
      setCompletedModules(prev => {
        const newSet = new Set(prev);
        newSet.add(moduleId);
        return newSet;
      });
      return;
    }
    
    // Send the userId in the request body
    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/api/completion/complete-module`,
      { 
        courseId: Number(courseId), 
        moduleId,
        userId
      }
    );
    
    // Update local state with new completed modules
    if (response.data && response.data.completedModuleIds) {
      setCompletedModules(new Set(response.data.completedModuleIds));
    } else {
      // Fallback if API doesn't return updated list
      setCompletedModules(prev => {
        const newSet = new Set(prev);
        newSet.add(moduleId);
        return newSet;
      });
    }
  } catch (err) {
    console.error("Error marking module as complete:", err);
    // Still update UI optimistically
    setCompletedModules(prev => {
      const newSet = new Set(prev);
      newSet.add(moduleId);
      return newSet;
    });
  } finally {
    setIsMarkingComplete(false);
  }
};

  // Handle enrollment
  const handleEnroll = async () => {
    try {
      setEnrolling(true);
      await enrollUserInCourse(Number(courseId));
      await getUserCourses();
      
      // After enrollment, refresh course contents
      const response = await getCourseContents(Number(courseId));
      
      if (isMounted.current) {
        setNotEnrolled(false);
        setCourseDetails(prev => ({
          ...prev!,
          sections: response.sections || [],
          tags: response.tags || []
        }));
      }
    } catch (err) {
      console.error("Enrollment failed:", err);
    } finally {
      if (isMounted.current) {
        setEnrolling(false);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  
  const getContentIcon = (contentItem: ContentItem) => {
    // Check mimetype first if available
    if (contentItem.mimetype) {
      if (contentItem.mimetype.includes('pdf')) return <FileText className="text-red-500" size={20} />;
      if (contentItem.mimetype.includes('video')) return <Video className="text-blue-500" size={20} />;
      if (contentItem.mimetype.includes('audio')) return <Book className="text-orange-500" size={20} />;
      if (contentItem.mimetype.includes('image')) return <FileText className="text-green-500" size={20} />;
    }
    
    // Fall back to filename extension
    const extension = contentItem.filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FileText className="text-red-500" size={20} />;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'webm':
        return <Video className="text-blue-500" size={20} />;
      case 'mp3':
      case 'wav':
      case 'ogg':
        return <Book className="text-orange-500" size={20} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileText className="text-green-500" size={20} />;
      default:
        if (contentItem.type === 'url') return <Link className="text-green-500" size={20} />;
        if (contentItem.type === 'file') return <Download className="text-purple-500" size={20} />;
        return <Book className="text-gray-500" size={20} />;
    }
  };

  const isPreviewable = (contentItem: ContentItem): boolean => {
    // Check mimetype
    if (contentItem.mimetype) {
      return contentItem.mimetype.includes('video') || 
             contentItem.mimetype.includes('image') ||
             contentItem.mimetype.includes('audio');
    }
    
    // Fallback to extension check
    const extension = contentItem.filename.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm', 'ogg', 'mp3', 'wav'].includes(extension || '');
  };

  const toggleContentExpand = (index: number) => {
    setExpandedContent(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };
  
  // Find the active section and module
  const activeSection = courseDetails?.sections.find(section => section.id === activeSectionId);
  const activeModule = activeSection?.modules.find(module => module.id === activeModuleId);
  
  // Flatten all modules from all sections for easier navigation
  const allModules = useMemo(() => 
    courseDetails?.sections.flatMap(section => 
      section.modules.map(module => ({
        ...module,
        sectionId: section.id,
      }))
    ) || [], 
    [courseDetails]
  );
  
  // Find current module index in the flattened array for navigation
  const currentModuleIndex = useMemo(() => 
    allModules.findIndex(m => m.id === activeModuleId),
    [allModules, activeModuleId]
  );
  
  // Navigation functions
  const goToNextModule = () => {
    if (currentModuleIndex < allModules.length - 1) {
      const nextModule = allModules[currentModuleIndex + 1];
      setActiveModuleId(nextModule.id);
      setActiveSectionId(nextModule.sectionId);
    }
  };
  
  const goToPreviousModule = () => {
    if (currentModuleIndex > 0) {
      const prevModule = allModules[currentModuleIndex - 1];
      setActiveModuleId(prevModule.id);
      setActiveSectionId(prevModule.sectionId);
    }
  };
  
  // Current progress calculation based on completed modules
  const currentProgress = calculateProgress();
  
  return (
    <div className="relative bg-gray-50 min-h-screen font-['Kode_Mono']">
      {/* Sidebar */}
      <Sidebar 
        isSidebarOpen={sidebarOpen}
        setIsSidebarOpen={setSidebarOpen}
        activePage="courses"
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
        
        {/* Back Navigation */}
        <div className="px-8 pt-6">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-gray-600 hover:text-black transition-colors"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to courses
          </button>
        </div>
        
        {/* Course Details Content */}
        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-[#8C5AFF]" />
              <span className="mt-4 text-gray-600">Loading course details...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
              <p>{error}</p>
              <button 
                onClick={() => navigate(-1)}
                className="mt-4 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                Go back
              </button>
            </div>
          ) : courseDetails ? (
            <div className="space-y-8">
              {/* Course Header with improved styling */}
              <div className="bg-white border border-[#8C5AFF] shadow-md rounded-xl p-6 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gray-200">
                  <div 
                    className="h-2 bg-[#8C5AFF]" 
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>
                
                <div className="pt-2 flex items-start gap-6 flex-col md:flex-row">
                  {courseDetails.image ? (
                    <div className="w-full md:w-48 h-48 bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                      <img 
                        src={courseDetails.image} 
                        alt={courseDetails.fullname} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full md:w-48 h-48 bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                      <img 
                        src={getConsistentImage(courseDetails.id)} 
                        alt={courseDetails.fullname} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h1 className="text-2xl font-bold mb-2">{courseDetails.fullname}</h1>
                      
                      <span className="text-sm bg-[#8C5AFF] text-white py-1 px-3 rounded-full shadow-sm">
                        {courseDetails.shortname}
                      </span>
                    </div>
                    
                    {/* Custom Progress Bar */}
                    <div className="mt-3 mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-gray-600 font-medium">Course Progress</span>
                        <span className="text-sm font-medium text-[#8C5AFF]">{Math.round(currentProgress)}%</span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                        <div 
                          className="bg-[#8C5AFF] h-full rounded-full transition-all duration-500 ease-out" 
                          style={{ width: `${currentProgress}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="mt-4 prose max-w-none" dangerouslySetInnerHTML={{ __html: courseDetails.summary }} />
                    
                    {/* Tags Section */}
                    {courseDetails.tags && courseDetails.tags.length > 0 && (
                      <div className="mt-4">
                        <h3 className="text-lg font-semibold mb-2">Tags</h3>
                        <div className="flex gap-2 flex-wrap">
                          {courseDetails.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Edit in Moodle button - only visible for coach/admin users */}
                    {user?.role === "coach" && (
                      <div className="mt-4 flex">
                        <button
                          onClick={() => {
                            // Construct Moodle course edit URL
                            const moodleEditUrl = `${import.meta.env.VITE_MOODLE_URL || 'http://34.57.113.242/moodle'}/course/edit.php?id=${courseId}`;
                            // Open in new tab
                            window.open(moodleEditUrl, '_blank');
                          }}
                          className="px-4 py-2 bg-[#EEBFF6] hover:bg-[#DFA9E5] text-black rounded-lg border border-black flex items-center transition-colors"
                        >
                          <ExternalLink size={18} className="mr-2" />
                          Edit in Moodle
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Not Enrolled Message with improved styling */}
              {notEnrolled && (
                <div className="bg-white border border-yellow-200 rounded-xl p-8 text-center shadow-md">
                  <div className="mb-6">
                    <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                      <AlertCircle size={32} className="text-yellow-600" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold mb-2">Course Access Restricted</h2>
                  <p className="text-gray-600 mb-6">
                    You need to be enrolled in this course to view its content. 
                    Enroll now to access all lessons, assessments, and materials.
                  </p>
                  <button
                    onClick={handleEnroll}
                    className="px-6 py-3 bg-[#8C5AFF] text-white rounded-lg hover:bg-[#7343CC] transition-colors shadow-sm"
                    disabled={enrolling}
                  >
                    {enrolling ? (
                      <div className="flex items-center justify-center">
                        <Loader2 size={20} className="animate-spin mr-2" />
                        Enrolling...
                      </div>
                    ) : (
                      "Enroll Now"
                    )}
                  </button>
                </div>
              )}
              
              {/* Course Content with improved layout */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Section and Module Navigation with improved styling */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 lg:col-span-1 shadow-sm">
                  <h2 className="font-bold mb-4 text-gray-800">Course Content</h2>
                  
                  <div className="space-y-4">
                    {courseDetails.sections.map((section) => (
                      <div key={section.id} className="space-y-2">
                        <button
                          onClick={() => setActiveSectionId(section.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                            activeSectionId === section.id 
                              ? 'bg-[#F4EAFF] border-l-4 border-[#8C5AFF] pl-2' 
                              : 'hover:bg-gray-50 border-l-4 border-transparent pl-2'
                          }`}
                        >
                          <div className="font-medium flex items-center justify-between">
                            <span>{section.name}</span>
                            {section.modules.every(module => completedModules.has(module.id)) && 
                              section.modules.length > 0 && (
                                <CheckCircle2 size={16} className="text-green-500" />
                              )
                            }
                          </div>
                        </button>
                        
                        {/* Show modules under the active section */}
                        {activeSectionId === section.id && section.modules.map((module) => (
                          <button
                            key={module.id}
                            onClick={() => setActiveModuleId(module.id)}
                            className={`w-full text-left pl-7 pr-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                              activeModuleId === module.id 
                                ? 'bg-[#F4EAFF] text-[#8C5AFF] font-medium' 
                                : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <span className="text-sm truncate">{module.name}</span>
                            {completedModules.has(module.id) ? (
                              <CheckCircle size={16} className="text-green-500 flex-shrink-0 ml-2" />
                            ) : (
                              <Clock size={16} className="text-gray-400 flex-shrink-0 ml-2" />
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Module Content with improved styling */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 lg:col-span-3 shadow-sm">
                  {activeModule ? (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="font-bold text-xl text-gray-800">{activeModule.name}</h2>
                        
                        {/* Module completion status */}
                        <div className="flex items-center">
                          {completedModules.has(activeModule.id) ? (
                            <span className="text-sm bg-green-100 text-green-800 py-1 px-3 rounded-full flex items-center">
                              <CheckCircle2 size={16} className="mr-1" /> Completed
                            </span>
                          ) : (
                            <button
                              onClick={() => markModuleComplete(activeModule.id)}
                              disabled={isMarkingComplete}
                              className="text-sm bg-[#F4EAFF] text-[#8C5AFF] py-1 px-3 rounded-full hover:bg-[#E4D5F3] transition-colors flex items-center"
                            >
                              {isMarkingComplete ? (
                                <>
                                  <Loader2 size={16} className="animate-spin mr-1" /> 
                                  Marking...
                                </>
                              ) : (
                                <>
                                  <CheckCircle size={16} className="mr-1" /> 
                                  Mark as Complete
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {activeModule.description && (
                        <div 
                          className="mb-6 prose max-w-none bg-gray-50 p-4 rounded-lg border border-gray-100" 
                          dangerouslySetInnerHTML={{ __html: activeModule.description }} 
                        />
                      )}
                      
                      <div className="space-y-4">
                        {activeModule.contents && activeModule.contents.length > 0 ? (
                          activeModule.contents.map((contentItem, index) => (
                            <div 
                              key={index}
                              className="border border-gray-200 rounded-lg hover:shadow-sm transition-all duration-200 overflow-hidden"
                            >
                              <div className="flex items-center gap-3 p-4 bg-white">
                                {getContentIcon(contentItem)}
                                
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{contentItem.filename}</div>
                                  
                                  {/* For content that has HTML content */}
                                  {contentItem.content && (
                                    <div 
                                      className="text-sm text-gray-600 mt-1 line-clamp-2" 
                                      dangerouslySetInnerHTML={{ __html: contentItem.content }} 
                                    />
                                  )}
                                </div>
                                
                                {/* For previewable content with URL */}
                                <div className="flex-shrink-0 flex items-center gap-2">
                                  {contentItem.fileurl && isPreviewable(contentItem) ? (
                                    <button
                                      onClick={() => toggleContentExpand(index)}
                                      className="px-3 py-1.5 text-sm bg-[#8C5AFF] text-white rounded-lg hover:bg-[#7343CC] transition-colors flex items-center"
                                    >
                                      {expandedContent.has(index) ? (
                                        <>
                                          <Minimize2 size={16} className="mr-1.5" /> Hide
                                        </>
                                      ) : (
                                        <>
                                          <Maximize2 size={16} className="mr-1.5" /> Preview
                                        </>
                                      )}
                                    </button>
                                  ) : contentItem.fileurl && (
                                    <a 
                                      href={`${contentItem.fileurl}&token=${user.moodleToken}`}
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="px-3 py-1.5 text-sm bg-[#8C5AFF] text-white rounded-lg hover:bg-[#7343CC] transition-colors flex items-center"
                                    >
                                      <ExternalLink size={16} className="mr-1.5" /> Open
                                    </a>
                                  )}
                                  
                                  {contentItem.filesize && (
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                      {(contentItem.filesize / 1024).toFixed(1)} KB
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Preview section - only shown when expanded */}
                              {expandedContent.has(index) && contentItem.fileurl && (
                                <div className="p-4 bg-gray-50 border-t border-gray-200">
                                  {contentItem.mimetype?.includes('video') || 
                                   ['mp4', 'webm', 'ogg'].includes(contentItem.filename.split('.').pop()?.toLowerCase() || '') ? (
                                    <div className="aspect-video max-w-full rounded-lg overflow-hidden">
                                      <video 
                                        controls 
                                        className="w-full h-full" 
                                        src={`${contentItem.fileurl}&token=${user.moodleToken}`}
                                      >
                                        Your browser does not support the video tag.
                                      </video>
                                    </div>
                                  ) : contentItem.mimetype?.includes('image') || 
                                     ['jpg', 'jpeg', 'png', 'gif'].includes(contentItem.filename.split('.').pop()?.toLowerCase() || '') ? (
                                    <div className="flex justify-center">
                                      <img 
                                        src={`${contentItem.fileurl}&token=${user.moodleToken}`} 
                                        alt={contentItem.filename}
                                        className="max-w-full max-h-[500px] object-contain rounded-lg"
                                      />
                                    </div>
                                  ) : contentItem.mimetype?.includes('audio') || 
                                     ['mp3', 'wav'].includes(contentItem.filename.split('.').pop()?.toLowerCase() || '') ? (
                                    <audio 
                                      controls 
                                      className="w-full" 
                                      src={`${contentItem.fileurl}&token=${user.moodleToken}`}
                                    >
                                      Your browser does not support the audio tag.
                                    </audio>
                                  ) : (
                                    <div className="text-center py-4">
                                      <p className="text-gray-500">Preview not available</p>
                                      <a 
                                        href={`${contentItem.fileurl}&token=${user.moodleToken}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-[#8C5AFF] hover:underline mt-2 inline-block"
                                      >
                                        Open in new tab
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                            No content available for this module
                          </div>
                        )}
                      </div>
                      
                      {/* Navigation buttons for next/previous content */}
                      <div className="mt-8 flex items-center justify-between pt-4 border-t border-gray-200">
                        <button
                          onClick={goToPreviousModule}
                          disabled={currentModuleIndex <= 0}
                          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                            currentModuleIndex > 0
                              ? 'text-gray-700 hover:bg-gray-100'
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <ArrowLeftCircle size={20} className="mr-2" />
                          Previous
                        </button>
                        
                        {!completedModules.has(activeModule.id) && (
                          <button
                            onClick={() => markModuleComplete(activeModule.id)}
                            disabled={isMarkingComplete}
                            className="flex items-center px-4 py-2 bg-[#8C5AFF] text-white rounded-lg hover:bg-[#7343CC] transition-colors disabled:opacity-70"
                          >
                            {isMarkingComplete ? (
                              <>
                                <Loader2 size={18} className="animate-spin mr-2" />
                                Marking as Complete...
                              </>
                            ) : (
                              <>
                                <CheckCircle size={18} className="mr-2" />
                                Mark as Complete
                              </>
                            )}
                          </button>
                        )}
                        
                        <button
                          onClick={goToNextModule}
                          disabled={currentModuleIndex >= allModules.length - 1}
                          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                            currentModuleIndex < allModules.length - 1
                              ? 'text-gray-700 hover:bg-gray-100'
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          Next
                          <ArrowRightCircle size={20} className="ml-2" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      Select a module to view its contents
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">Course not found</div>
          )}
        </div>
      </div>
    </div>
  );
}