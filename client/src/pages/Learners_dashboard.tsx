import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import axios from "axios";
import { Tag, AlertCircle, TrendingUp, Users, Activity, Lightbulb, BookOpen } from "lucide-react";
import { CircularProgress, Skeleton } from "@mui/material";

// Import images
import img1 from "../images/1.jpeg";
import img2 from "../images/2.jpeg";
import img3 from "../images/3.jpeg";
import img4 from "../images/4.jpeg";
import img5 from "../images/5.jpeg";
import img6 from "../images/6.jpeg";

// Create an array of images for easier selection
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

export default function LearnersDashboard() {
    const navigate = useNavigate();
    const { user, logout, token } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [userInterests, setUserInterests] = useState<string[]>([]);
    const [isLoadingInterests, setIsLoadingInterests] = useState(true);
    const [dataInitialized, setDataInitialized] = useState(false);

    const { 
        getAllCourses,
        enrollUserInCourse,
        getUserCourses,
        getCourseCategories,
        getPopularRecommendations,
        getContentBasedRecommendations,
        getCollaborativeRecommendations,
        getHybridRecommendations,
        allCourses,
        courses: userCourses,
        courseCategories,
        recommendedCourses,
        contentBasedCourses,
        collaborativeCourses,
        hybridCourses,
        loading: coursesLoading,
        error: coursesError
    } = useUser();

    const [coursesByCategory, setCoursesByCategory] = useState<{[key: string]: any[]}>({});
    const [loadingRecommendations, setLoadingRecommendations] = useState(true);

    const fetchUserInterests = async () => {
        if (!user || !token) return [];
        
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/users/profile`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            if (response.data && response.data.preferences && response.data.preferences.interests) {
                return response.data.preferences.interests;
            }
            return [];
        } catch (error) {
            console.error('Error fetching user interests:', error);
            return [];
        }
    };

    const filterBySearch = (items: any[], titleKey: string = 'title') => {
        if (!searchTerm) return items;
        return items.filter(item => 
            (item[titleKey] || "").toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const filteredAvailableCourses = React.useMemo(() => {
        if (!allCourses) return [];
        
        return allCourses.filter(course => 
            !searchTerm || (course.fullname || "").toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allCourses, searchTerm]);

    const isEnrolled = (courseId: number) => {
        return userCourses?.some(uc => uc.id === courseId);
    };

    useEffect(() => {
        if (filteredAvailableCourses && filteredAvailableCourses.length > 0 && courseCategories && courseCategories.length > 0) {
            const groupedCourses: {[key: string]: any[]} = {};
            
            filteredAvailableCourses.forEach(course => {
                const category = courseCategories.find(cat => cat.id === course.categoryid);
                
                if (!category) return;
                
                const categoryName = category.name;
                
                if (!groupedCourses[categoryName]) {
                    groupedCourses[categoryName] = [];
                }
                
                groupedCourses[categoryName].push(course);
            });
            
            setCoursesByCategory(groupedCourses);
        } else {
            setCoursesByCategory({});
        }
    }, [filteredAvailableCourses, courseCategories]);

    const filteredInterests = React.useMemo(() => {
        if (!userInterests) return [];
        if (!searchTerm) return userInterests;
        return userInterests.filter(interest => 
            interest.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [userInterests, searchTerm]);

    const handleSearch = (term: string) => {
        setSearchTerm(term);
    };

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoadingInterests(true);
            try {
                const [coursesResult, userCoursesResult, categoriesResult, interestsResult] = await Promise.all([
                    getAllCourses(),
                    getUserCourses(),
                    getCourseCategories(),
                    fetchUserInterests()
                ]);
                
                setUserInterests(interestsResult);
                setIsLoadingInterests(false);
                
                if (user?.id || user?.moodleid) {
                    setLoadingRecommendations(true);
                    try {
                        const userId = user?.moodleid || user?.id;
                        await Promise.all([
                            getPopularRecommendations(userId, 5),
                            getContentBasedRecommendations(userId, 5),
                            getCollaborativeRecommendations(userId, 5),
                            getHybridRecommendations(userId, 5)
                        ]);
                    } catch (recError) {
                        console.error("Error fetching recommendations:", recError);
                    } finally {
                        setLoadingRecommendations(false);
                    }
                }
                
            } catch (error) {
                console.error("Error fetching data:", error);
                setIsLoadingInterests(false);
                setLoadingRecommendations(false);
            } finally {
                setDataInitialized(true);
            }
        };
        
        fetchAllData();
    }, [token]);

    const filteredRecommendedCourses = React.useMemo(() => {
        if (!recommendedCourses || !searchTerm) return recommendedCourses;
        
        return recommendedCourses.filter(course => 
            course.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (course.summary && course.summary.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [recommendedCourses, searchTerm]);

    const filteredContentBasedCourses = React.useMemo(() => {
        if (!contentBasedCourses || !searchTerm) return contentBasedCourses;
        
        return contentBasedCourses.filter(course => 
            course.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (course.summary && course.summary.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [contentBasedCourses, searchTerm]);

    const filteredCollaborativeCourses = React.useMemo(() => {
        if (!collaborativeCourses || !searchTerm) return collaborativeCourses;
        
        return collaborativeCourses.filter(course => 
            course.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (course.summary && course.summary.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [collaborativeCourses, searchTerm]);

    const filteredHybridCourses = React.useMemo(() => {
        if (!hybridCourses || !searchTerm) return hybridCourses;
        
        return hybridCourses.filter(course => 
            course.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (course.summary && course.summary.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [hybridCourses, searchTerm]);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const navigateToCourse = (courseId: number) => {
        console.log("Navigating to course:", courseId);
        navigate(`/course/${courseId}`);
    };

    const handleEditInterests = () => {
        navigate('/interests');
    };

    const hasNoResults = searchTerm && 
        filteredAvailableCourses?.length === 0 && 
        filteredInterests.length === 0 &&
        filteredRecommendedCourses?.length === 0 &&
        filteredContentBasedCourses?.length === 0 &&
        filteredCollaborativeCourses?.length === 0 &&
        filteredHybridCourses?.length === 0;

    return (
      <div className="relative bg-white min-h-screen font-['Kode_Mono']">
        <Sidebar 
          isSidebarOpen={sidebarOpen} 
          setIsSidebarOpen={setSidebarOpen} 
          activePage="dashboard" 
        />
    
        <div className={`transition-all duration-300 ${sidebarOpen ? "ml-60" : "ml-0"}`}>
          <Header 
            user={user} 
            isSidebarOpen={sidebarOpen} 
            setIsSidebarOpen={setSidebarOpen} 
            handleLogout={handleLogout}
            showSearch={true}
            onSearch={handleSearch}
          />
  
          <div className="p-8">
            {searchTerm && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold">
                  {hasNoResults ? 
                    "No results found for " : 
                    "Search results for "
                  }
                  <span className="text-[#8C5AFF]">"{searchTerm}"</span>
                </h2>
              </div>
            )}
          
            {hasNoResults && (
              <div className="text-center py-8 bg-gray-50 rounded-lg mb-6">
                <AlertCircle className="mx-auto mb-2 text-gray-400" size={24} />
                <p className="text-gray-500">No matching content found. Try a different search term.</p>
              </div>
            )}

            <Section 
              title="Your Interests" 
              actionButton={
                <button 
                  onClick={handleEditInterests} 
                  className="px-4 py-1 bg-[#F4BEFD] text-black text-sm rounded hover:bg-[#DFA9E5] transition-colors font-medium"
                >
                  Edit Interests
                </button>
              }
            >
              {isLoadingInterests ? (
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div 
                      key={`interest-skeleton-${i}`}
                      className="bg-gray-100 px-8 py-2 rounded-full flex items-center gap-2 border border-gray-200"
                    >
                      <Skeleton variant="text" width={80} height={20} animation="wave" />
                    </div>
                  ))}
                </div>
              ) : filteredInterests.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-6 text-center border border-dashed border-gray-300 max-w-2xl mx-auto">
                  <div className="w-12 h-12 mx-auto bg-[#F4BEFD] rounded-full flex items-center justify-center mb-3">
                    <Tag size={20} className="text-[#211C37]" />
                  </div>
                  <p className="text-gray-600 mb-3">
                    {searchTerm ? "No matching interests found." : "You haven't selected any interests yet."}
                  </p>
                  {!searchTerm && (
                    <button 
                      onClick={handleEditInterests} 
                      className="px-4 py-1 bg-[#F4BEFD] text-black text-sm rounded hover:bg-[#DFA9E5] transition-colors"
                    >
                      Add Interests
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredInterests.map((interest, index) => (
                    <div 
                      key={`${interest}-${index}`}
                      className="bg-[#EEBFF6] px-4 py-2 rounded-full flex items-center gap-2 border border-black"
                    >
                      <Tag size={16} />
                      <span>{interest}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {loadingRecommendations ? (
              <Section title="Popular Courses" icon={<TrendingUp size={24} className="text-[#8C5AFF]" />}>
                <div className="flex space-x-4 overflow-x-auto pb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonCard key={`popular-skeleton-${i}`} color="#F0ECFE" />
                  ))}
                </div>
              </Section>
            ) : filteredRecommendedCourses && filteredRecommendedCourses.length > 0 ? (
              <Section 
                title="Popular Courses" 
                icon={<TrendingUp size={24} className="text-[#8C5AFF]" />}
              >
                <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {filteredRecommendedCourses.map((course) => {
                    const enrolled = isEnrolled(course.id);
                    return (
                      <RecommendationCard
                        key={course.id} 
                        course={course}
                        enrolled={enrolled}
                        onEnroll={() => course.id && enrollUserInCourse(Number(course.id))}
                        onClick={() => course.id && navigateToCourse(Number(course.id))}
                        loading={coursesLoading}
                      />
                    );
                  })}
                </div>
              </Section>
            ) : dataInitialized && !searchTerm && (
              <Section title="Popular Courses" icon={<TrendingUp size={24} className="text-[#8C5AFF]" />}>
                <div className="text-gray-500">
                  No popular recommendations available at the moment
                </div>
              </Section>
            )}

            {loadingRecommendations ? (
              <Section title="Based on Your Interests" icon={<BookOpen size={24} className="text-[#4CAF50]" />}>
                <div className="flex space-x-4 overflow-x-auto pb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonCard key={`content-skeleton-${i}`} color="#E8F5E9" />
                  ))}
                </div>
              </Section>
            ) : filteredContentBasedCourses && filteredContentBasedCourses.length > 0 ? (
              <Section 
                title="Based on Your Interests" 
                icon={<BookOpen size={24} className="text-[#4CAF50]" />}
              >
                <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {filteredContentBasedCourses.map((course) => {
                    const enrolled = isEnrolled(course.id);
                    return (
                      <RecommendationCard
                        key={course.id} 
                        course={course}
                        enrolled={enrolled}
                        onEnroll={() => course.id && enrollUserInCourse(Number(course.id))}
                        onClick={() => course.id && navigateToCourse(Number(course.id))}
                        loading={coursesLoading}
                        bgColor="#E8F5E9"
                        scoreColor="#4CAF50"
                        scoreField="similarity_score"
                        scoreLabel="Similarity"
                      />
                    );
                  })}
                </div>
              </Section>
            ) : dataInitialized && !searchTerm && (
              <Section title="Based on Your Interests" icon={<BookOpen size={24} className="text-[#4CAF50]" />}>
                <div className="text-gray-500">
                  No content-based recommendations available at the moment
                </div>
              </Section>
            )}

            {loadingRecommendations ? (
              <Section title="Based on Similar Learners" icon={<Users size={24} className="text-[#2196F3]" />}>
                <div className="flex space-x-4 overflow-x-auto pb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonCard key={`collab-skeleton-${i}`} color="#E3F2FD" />
                  ))}
                </div>
              </Section>
            ) : filteredCollaborativeCourses && filteredCollaborativeCourses.length > 0 ? (
              <Section 
                title="Based on Similar Learners" 
                icon={<Users size={24} className="text-[#2196F3]" />}
              >
                <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {filteredCollaborativeCourses.map((course) => {
                    const enrolled = isEnrolled(course.id);
                    return (
                      <RecommendationCard
                        key={course.id} 
                        course={course}
                        enrolled={enrolled}
                        onEnroll={() => course.id && enrollUserInCourse(Number(course.id))}
                        onClick={() => course.id && navigateToCourse(Number(course.id))}
                        loading={coursesLoading}
                        bgColor="#E3F2FD"
                        scoreColor="#2196F3"
                        scoreField="collaborative_score"
                        scoreLabel="Relevance"
                      />
                    );
                  })}
                </div>
              </Section>
            ) : dataInitialized && !searchTerm && (
              <Section title="Based on Similar Learners" icon={<Users size={24} className="text-[#2196F3]" />}>
                <div className="text-gray-500">
                  No collaborative recommendations available at the moment
                </div>
              </Section>
            )}

            {loadingRecommendations ? (
              <Section title="Smart Recommendations" icon={<Lightbulb size={24} className="text-[#FF9800]" />}>
                <div className="flex space-x-4 overflow-x-auto pb-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <SkeletonCard key={`hybrid-skeleton-${i}`} color="#FFF3E0" />
                  ))}
                </div>
              </Section>
            ) : filteredHybridCourses && filteredHybridCourses.length > 0 ? (
              <Section 
                title="Smart Recommendations" 
                icon={<Lightbulb size={24} className="text-[#FF9800]" />}
              >
                <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {filteredHybridCourses.map((course) => {
                    const enrolled = isEnrolled(course.id);
                    return (
                      <RecommendationCard
                        key={course.id} 
                        course={course}
                        enrolled={enrolled}
                        onEnroll={() => course.id && enrollUserInCourse(Number(course.id))}
                        onClick={() => course.id && navigateToCourse(Number(course.id))}
                        loading={coursesLoading}
                        bgColor="#FFF3E0"
                        scoreColor="#FF9800"
                        scoreField="hybrid_score"
                        scoreLabel="Match"
                      />
                    );
                  })}
                </div>
              </Section>
            ) : dataInitialized && !searchTerm && (
              <Section title="Smart Recommendations" icon={<Lightbulb size={24} className="text-[#FF9800]" />}>
                <div className="text-gray-500">
                  No hybrid recommendations available at the moment
                </div>
              </Section>
            )}

            {Object.keys(coursesByCategory).length === 0 && !coursesError ? (
              <>
                {["Category 1", "Category 2", "Category 3"].map((catName, index) => (
                  <Section key={`skeleton-category-${index}`} title={catName}>
                    <div className="flex space-x-4 overflow-x-auto pb-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <SkeletonCourseCard key={`cat-skeleton-${index}-${i}`} />
                      ))}
                    </div>
                  </Section>
                ))}
              </>
            ) : coursesError ? (
              <div className="bg-red-50 p-6 rounded-lg mb-6">
                <div className="flex items-center">
                  <AlertCircle className="text-red-500 mr-2" size={24} />
                  <h2 className="text-lg font-semibold text-red-700">Error</h2>
                </div>
                <p className="mt-2 text-red-600">{coursesError}</p>
              </div>
            ) : Object.keys(coursesByCategory).length === 0 ? (
              !searchTerm && dataInitialized && (
                <Section title="Available Courses">
                  <div className="text-gray-500">
                    No courses available
                  </div>
                </Section>
              )
            ) : (
              // Sort the categories alphabetically before rendering
              Object.keys(coursesByCategory)
                .sort((a, b) => a.localeCompare(b))
                .map((categoryName) => (
                  <Section key={categoryName} title={categoryName}>
                    <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      {coursesByCategory[categoryName].map((course) => {
                        const enrolled = isEnrolled(course.id);
                        return (
                          <CourseCard 
                            key={course.id} 
                            course={course}
                            enrolled={enrolled}
                            onEnroll={() => course.id && enrollUserInCourse(Number(course.id))}
                            onClick={() => course.id && navigateToCourse(Number(course.id))}
                            loading={coursesLoading}
                          />
                        );
                      })}
                    </div>
                  </Section>
                ))
            )}
          </div>
        </div>
      </div>
    );
  }
  
  function Section({ title, children, actionButton, icon }: { 
    title: string; 
    children: React.ReactNode; 
    actionButton?: React.ReactNode;
    icon?: React.ReactNode;
  }) {
    return (
      <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-[34px] font-bold flex items-center">
            {icon && <span className="mr-2">{icon}</span>}
            {title}
          </h2>
          {actionButton && <div>{actionButton}</div>}
        </div>
        <div>
          {children}
        </div>
      </div>
    );
  }
  
  function CourseCard({ course, enrolled, onEnroll, onClick, loading }: { 
    course: any;
    enrolled: boolean;
    onEnroll: () => void;
    onClick: () => void;
    loading: boolean;
  }) {
    // Generate a consistent image for this course
    const courseImage = course.image || getConsistentImage(course.id);
    
    return (
      <div 
        className={`p-4 border border-black rounded-lg shadow-sm ${enrolled ? 'bg-[#E6FAC4]' : 'bg-[#FFD5D6]'} h-[188px] w-[257px] flex-shrink-0 ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
        onClick={onClick}
      >
        <div className="bg-white h-[88px] rounded-lg mb-2 overflow-hidden">
          <img 
            src={courseImage} 
            alt={course.fullname || "Course"}
            className="h-full w-full object-cover rounded-lg"
          />
        </div>
        <h3 className="font-bold text-sm mb-2 truncate">{course.fullname || `Course ${course.id}`}</h3>
        {enrolled ? (
          <button
            className="w-full py-1 bg-[#4CAF50] text-white text-xs rounded cursor-default"
          >
            Enrolled
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEnroll();
            }}
            className="w-full py-1 bg-[#8C5AFF] text-white text-xs rounded hover:bg-[#7343CC] transition-colors"
            disabled={loading}
          >
            Enroll Now
          </button>
        )}
      </div>
    );
  }

  function RecommendationCard({ 
    course, 
    enrolled, 
    onEnroll, 
    onClick, 
    loading,
    bgColor = "#F0ECFE",
    scoreColor = "#8C5AFF",
    scoreField = "popularity_score",
    scoreLabel = "Popularity"
  }: { 
    course: any;
    enrolled: boolean;
    onEnroll: () => void;
    onClick: () => void;
    loading: boolean;
    bgColor?: string;
    scoreColor?: string;
    scoreField?: string;
    scoreLabel?: string;
  }) {
    const score = course[scoreField];
    const hasScore = score !== undefined && score !== null;
    // Generate a consistent image for this course
    const courseImage = course.image || getConsistentImage(course.id);
    
    return (
      <div 
        className={`p-4 border border-black rounded-lg shadow-sm flex flex-col h-[220px] w-[280px] flex-shrink-0 ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
        style={{ backgroundColor: bgColor }}
        onClick={onClick}
      >
        <div className="bg-white h-[88px] rounded-lg mb-2 overflow-hidden">
          <img 
            src={courseImage} 
            alt={course.fullname || "Course"}
            className="h-full w-full object-cover rounded-lg"
          />
        </div>
        <h3 className="font-bold text-sm mb-1 truncate">{course.fullname || `Course ${course.id}`}</h3>
        
        {hasScore && (
          <div className="text-xs font-semibold flex items-center mb-2">
            <Activity size={14} style={{ color: scoreColor }} className="mr-1" />
            <span>{scoreLabel}: </span>
            <span className="ml-1" style={{ color: scoreColor }}>{typeof score === 'number' ? score.toFixed(1) : score}/5</span>
          </div>
        )}
        
        <div className="flex-grow"></div>
        
        {enrolled ? (
          <button
            className="w-full py-1 bg-[#4CAF50] text-white text-xs rounded cursor-default mt-2"
          >
            Enrolled
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEnroll();
            }}
            className="w-full py-1 text-white text-xs rounded hover:opacity-90 transition-colors mt-2"
            style={{ backgroundColor: scoreColor }}
            disabled={loading}
          >
            Enroll Now
          </button>
        )}
      </div>
    );
  }

  function SkeletonCard({ color = "#F0ECFE" }: { color?: string }) {
    return (
      <div 
        className="p-4 border border-gray-200 rounded-lg shadow-sm flex flex-col h-[220px] w-[280px] flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        <Skeleton 
          variant="rectangular" 
          height={88} 
          width="100%"
          className="rounded-lg mb-2"
          animation="wave"
        />
        <Skeleton variant="text" height={24} width="80%" animation="wave" className="mb-1" />
        <Skeleton variant="text" height={16} width="60%" animation="wave" className="mb-2" />
        <div className="flex-grow"></div>
        <Skeleton variant="rectangular" height={28} width="100%" animation="wave" className="rounded" />
      </div>
    );
  }

  function SkeletonCourseCard() {
    return (
      <div 
        className="p-4 border border-gray-200 rounded-lg shadow-sm bg-gray-50 h-[188px] w-[257px] flex-shrink-0 flex flex-col"
      >
        <Skeleton 
          variant="rectangular" 
          height={88} 
          width="100%"
          className="rounded-lg mb-2"
          animation="wave"
        />
        <Skeleton variant="text" height={20} width="70%" animation="wave" className="mb-2" />
        <div className="flex-grow"></div>
        <Skeleton variant="rectangular" height={24} width="100%" animation="wave" className="rounded" />
      </div>
    );
  }