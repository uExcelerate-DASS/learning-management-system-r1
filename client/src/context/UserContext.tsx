import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import Cookies from 'js-cookie';

// Define types for our context data
interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: 'coach' | 'learner' | 'admin';
  preferences?: {
    interests: string[];
  };
}

export interface Course {
  id: number;
  fullname: string;
  shortname: string;
  summary: string;
  categoryid: number;
  progress?: number;
  image?: string; // Add this line
  idnumber?: string; // Add this line
  startdate?: number; // Add this line
  enddate?: number; // Add this line
  // Add recommendation-specific fields
  popularity_score?: number;
  similarity_score?: number;
  collaborative_score?: number;
  hybrid_score?: number;
  recommendation_reason?: string;
  recommendation_type?: 'popular' | 'content-based' | 'collaborative' | 'hybrid';
}

// Add Todo interface
export interface Todo {
  _id: string;
  text: string;
  date: string;
  completed: boolean;
}

// In your UserContext.tsx file, update the CourseContent interface
interface Module {
  id: number;
  name: string;
  description: string;
  visible?: number;
  uservisible?: number;
  modname: string;
  modicon?: string;
  modplural?: string;
  contents?: Array<{
    type: string;
    filename: string;
    filesize: number;
    fileurl?: string;
    content?: string;
    mimetype?: string;
  }>;
}

interface CourseSection {
  id: number;
  name: string;
  summary: string;
  summaryformat: number;
  visible?: number;
  uservisible?: number;
  modules: Module[];
}

// Recommendation cache interface
interface RecommendationCache {
  data: Course[];
  timestamp: number;
  userId: string | number;
  limit: number;
}

// Course cache interface
interface CourseCache {
  data: Course[];
  timestamp: number;
}

// Use this updated interface in your component

interface UserContextProps {
  profile: UserProfile | null;
  courses: Course[];
  allCourses: Course[];
  loading: boolean;
  error: string | null;
  getUserProfile: () => Promise<void>;
  updateUserProfile: (data: { name?: string; email?: string }) => Promise<void>;
  updatePreferences: (interests: string[]) => Promise<void>;
  deleteUserAccount: () => Promise<void>;
  getCourseContents: (courseId: number) => Promise<{ notEnrolled?: boolean; sections: CourseSection[]; tags?: string[] }>;
  getAllCourses: () => Promise<void>;
  getUserCourses: () => Promise<void>;
  enrollUserInCourse: (courseId: number) => Promise<void>;
  getCoachCourses: (userId: string) => Promise<void>;
  getCourseStudents: (courseId: string) => Promise<any>;
  getCourseCategories: () => Promise<void>;
  courseCategories: any[];
  clearError: () => void;
  recommendedCourses: Course[];
  contentBasedCourses: Course[];
  collaborativeCourses: Course[];
  hybridCourses: Course[];
  getPopularRecommendations: (userId: string | number, limit?: number) => Promise<void>;
  getContentBasedRecommendations: (userId: string | number, limit?: number) => Promise<void>;
  getCollaborativeRecommendations: (userId: string | number, limit?: number) => Promise<void>;
  getHybridRecommendations: (userId: string | number, limit?: number) => Promise<void>;
}

// Create the context
const UserContext = createContext<UserContextProps | undefined>(undefined);

// Custom hook for using this context
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Provider component
export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [courseCategories, setCourseCategories] = useState<any[]>([]);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [contentBasedCourses, setContentBasedCourses] = useState<Course[]>([]);
  const [collaborativeCourses, setCollaborativeCourses] = useState<Course[]>([]);
  const [hybridCourses, setHybridCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Add a request cache to prevent redundant API calls and store enrollment status
  const requestCache = React.useRef<Map<string, any>>(new Map());
  
  // Cache expiration times
  const RECOMMENDATION_CACHE_EXPIRATION = 900000; // 15 minutes in milliseconds
  const COURSE_CACHE_EXPIRATION = 1800000; // 30 minutes in milliseconds
  const CATEGORIES_CACHE_EXPIRATION = 3600000; // 1 hour in milliseconds
  
  // Add recommendation caches
  const popularRecommendationsCache = React.useRef<RecommendationCache | null>(null);
  const contentBasedRecommendationsCache = React.useRef<RecommendationCache | null>(null);
  const collaborativeRecommendationsCache = React.useRef<RecommendationCache | null>(null);
  const hybridRecommendationsCache = React.useRef<RecommendationCache | null>(null);
  
  // Add course caches
  const allCoursesCache = React.useRef<CourseCache | null>(null);
  const userCoursesCache = React.useRef<CourseCache | null>(null);
  const categoriesCache = React.useRef<{data: any[], timestamp: number} | null>(null);

  // Configure axios with auth headers
  const api = axios.create({
    baseURL: '/api/users',
  });

  // Add token to requests when available
  api.interceptors.request.use(
    (config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Function to check if recommendation cache is valid
  const isCacheValid = (cache: RecommendationCache | null, userId: string | number, limit: number): boolean => {
    if (!cache) return false;
    
    // Check if cache matches current request parameters
    const isParamMatch = cache.userId === userId && cache.limit === limit;
    
    // Check if cache is still fresh
    const isFresh = Date.now() - cache.timestamp < RECOMMENDATION_CACHE_EXPIRATION;
    
    return isParamMatch && isFresh;
  };

  // Function to check if course cache is valid
  const isCourseCacheValid = (cache: CourseCache | null): boolean => {
    if (!cache) return false;
    
    // Check if cache is still fresh
    const isFresh = Date.now() - cache.timestamp < COURSE_CACHE_EXPIRATION;
    
    return isFresh;
  };

  // Function to check if categories cache is valid
  const isCategoriesCacheValid = (cache: {data: any[], timestamp: number} | null): boolean => {
    if (!cache) return false;
    
    // Check if cache is still fresh
    const isFresh = Date.now() - cache.timestamp < CATEGORIES_CACHE_EXPIRATION;
    
    return isFresh;
  };

  // Clear all recommendation caches
  const clearRecommendationCaches = () => {
    popularRecommendationsCache.current = null;
    contentBasedRecommendationsCache.current = null;
    collaborativeRecommendationsCache.current = null;
    hybridRecommendationsCache.current = null;
  };

  // Clear all course caches
  const clearCourseCaches = () => {
    allCoursesCache.current = null;
    userCoursesCache.current = null;
    requestCache.current.clear(); // Clear course contents cache as well
  };

  // Helper function to format recommendation data
  const formatRecommendationData = (data: any[], type: 'popular' | 'content-based' | 'collaborative' | 'hybrid') => {
    return data.map((rec: any) => ({
      id: rec.id,
      fullname: rec.fullname || rec.name || 'Recommended Course',
      shortname: rec.shortname || '',
      summary: rec.summary || rec.recommendation_reason || '',
      categoryid: rec.categoryid || 0,
      popularity_score: rec.popularity_score,
      similarity_score: rec.similarity_score,
      collaborative_score: rec.collaborative_score,
      hybrid_score: rec.hybrid_score,
      recommendation_reason: rec.recommendation_reason || '',
      recommendation_type: type,
      image: rec.overviewfiles && rec.overviewfiles[0]?.fileurl
    }));
  };

  // Get user profile
  const getUserProfile = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/users/profile`);
      setProfile(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch user profile');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateUserProfile = async (data: { name?: string; email?: string }): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.put(`${import.meta.env.VITE_API_BASE_URL}/api/users/profile`, data);
      setProfile(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
      console.error('Error updating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get all available courses with caching
  const getAllCourses = async (): Promise<void> => {
    try {
      // Check if we have valid cached data
      if (isCourseCacheValid(allCoursesCache.current)) {
        console.log('Using cached all courses');
        setAllCourses(allCoursesCache.current!.data);
        return;
      }

      setLoading(true);
      setError(null);
      
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/users/allcourses`);
      setAllCourses(data);
      
      // Update the cache
      allCoursesCache.current = {
        data,
        timestamp: Date.now()
      };
      
      console.log('All courses loaded and cached');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch courses');
      console.error('Error fetching all courses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get user-specific courses with caching
  const getUserCourses = async (): Promise<void> => {
    try {
      // Check if we have valid cached data
      if (isCourseCacheValid(userCoursesCache.current)) {
        console.log('Using cached user courses');
        setCourses(userCoursesCache.current!.data);
        return;
      }

      setLoading(true);
      setError(null);
      
      const moodleToken = Cookies.get('moodleToken');
      const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/users/courses`, {
        headers: {
          'X-Moodle-Token': moodleToken // Custom header for Moodle token
        }
      });
      
      setCourses(data);
      
      // Update the cache
      userCoursesCache.current = {
        data,
        timestamp: Date.now()
      };
      
      console.log('User courses loaded and cached');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch user courses');
      console.error('Error fetching user courses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Enroll user in a course - clear relevant caches after enrollment
  const enrollUserInCourse = async (courseId: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Existing enrollment code
      const userId = user?.moodleid || user?.id || profile?._id;
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/users/enroll`, {
        params: {
          userId,
          courseId,
          roleId: 5 // Default role: Student
        }
      });
      
      // Clear the cache for this course to force reload
      requestCache.current.delete(`course_${courseId}`);
      
      // Clear user courses cache since enrollment status has changed
      userCoursesCache.current = null;
      
      // Clear recommendation caches since user enrollment affects recommendations
      clearRecommendationCaches();
      
      // Refresh user courses after enrollment
      await getUserCourses();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to enroll in course');
      console.error('Error enrolling in course:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update user preferences - clear relevant caches
  const updatePreferences = async (interests: string[]): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/preferences`, 
        { interests },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update the local profile data with new preferences
      if (profile) {
        setProfile({
          ...profile,
          preferences: {
            ...profile.preferences,
            interests
          }
        });
      }
      
      // Clear recommendation caches since user preferences affect recommendations
      clearRecommendationCaches();
      
      console.log('Preferences updated:', response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update preferences');
      console.error('Error updating preferences:', err);
      throw err; // Rethrow so the calling component can handle it
    } finally {
      setLoading(false);
    }
  };

  // Delete user account
  const deleteUserAccount = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await axios.delete(`${import.meta.env.VITE_API_BASE_URL}/api/users/profile`);
      setProfile(null);
      setCourses([]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete account');
      console.error('Error deleting account:', err);
    } finally {
      setLoading(false);
    }
  };

  // Improved getCourseContents with quick enrollment check
  const getCourseContents = useCallback(async (courseId: number) => {
    try {
      // Check cache first to avoid redundant API calls
      const cacheKey = `course_${courseId}`;
      const cached = requestCache.current.get(cacheKey);
      if (cached) {
        return cached;
      }

      // Fast path: If we already have the courses list, check enrollment immediately
      if (courses.length > 0) {
        const isEnrolled = courses.some(course => course.id === courseId);
        if (!isEnrolled) {
          const result = { notEnrolled: true, sections: [], tags: [] };
          requestCache.current.set(cacheKey, result);
          return result;
        }
      }
      
      // If we get here, we either don't have courses loaded yet or the user might be enrolled
      const token = Cookies.get('token');
      const moodleToken = Cookies.get('moodleToken');
      
      // Use a timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/users/course/${courseId}`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'X-Moodle-Token': moodleToken
          },
          signal: controller.signal
        });

        // Clear the timeout since we got a response
        clearTimeout(timeoutId);
        
        // Handle error response
        if (response.data?.exception || response.data?.errorcode) {
          const result = { notEnrolled: true, sections: [], tags: [] };
          requestCache.current.set(cacheKey, result);
          return result;
        }
        
        // If response is not an array or empty, user might not be enrolled
        if (!Array.isArray(response.data.courseContents) || response.data.courseContents.length === 0) {
          const result = { notEnrolled: true, sections: [], tags: [] };
          requestCache.current.set(cacheKey, result);
          return result;
        }
        console.log('Course contents loaded:', response.data);
        // We have valid course content
        const result = { 
          sections: response.data.courseContents.map((section: any) => ({
            id: section.id,
            name: section.name,
            summary: section.summary || '',
            summaryformat: section.summaryformat || 1,
            visible: section.visible,
            uservisible: section.uservisible,
            modules: section.modules?.map((module: any) => ({
              id: module.id,
              name: module.name,
              description: module.description || '',
              visible: module.visible,
              uservisible: module.uservisible,
              modname: module.modname,
              modicon: module.modicon,
              modplural: module.modplural,
              contents: module.contents || []
            })) || []
          })),
          tags: response.data.tags || [] // Include tags in the result
        };
        
        requestCache.current.set(cacheKey, result);
        return result;
      } catch (axiosError) {
        // Clear the timeout if there was an error
        clearTimeout(timeoutId);
        
        // If we get an error, assume user is not enrolled
        const result = { notEnrolled: true, sections: [], tags: [] };
        requestCache.current.set(cacheKey, result);
        return result;
      }
    } catch (error) {
      console.error("Error in getCourseContents:", error);
      return { notEnrolled: true, sections: [], tags: [] };
    }
  }, [courses]);

  const getCoachCourses = async (userId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const token = Cookies.get('token');
      const moodleToken = Cookies.get('moodleToken');
      
      if (!token || !moodleToken) {
        throw new Error('Authentication tokens are missing');
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/coach/courses/${userId}`, 
        {
          headers: {
            'X-Moodle-Token': moodleToken,
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setCourses(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred while fetching coach courses');
      console.error('Error fetching coach courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCourseStudents = async (courseId: string): Promise<any> => {
    try {
      const token = Cookies.get('token');
      const moodleToken = Cookies.get('moodleToken');
      if (!token || !moodleToken) {
        throw new Error('Authentication tokens are missing');
      }
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/coach/students/${courseId}`,
        {
          headers: {
            'X-Moodle-Token': moodleToken,
            Authorization: `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (err: any) {
      console.error('Error fetching course students:', err);
      throw new Error(err.response?.data?.message || 'Failed to fetch students');
    }
  };

  // Get course categories with caching
  const getCourseCategories = async (): Promise<void> => {
    try {
      // Check if we have valid cached data
      if (isCategoriesCacheValid(categoriesCache.current)) {
        console.log('Using cached categories');
        setCourseCategories(categoriesCache.current!.data);
        return;
      }

      setLoading(true);
      setError(null);
      
      const moodleToken = Cookies.get('moodleToken');
      
      if (!moodleToken) {
        throw new Error('Authentication token is missing');
      }

      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/categories`,
        {
          headers: {
            'X-Moodle-Token': moodleToken,
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setCourseCategories(response.data);
      
      // Update the cache
      categoriesCache.current = {
        data: response.data,
        timestamp: Date.now()
      };
      
      console.log('Course categories loaded and cached');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch course categories');
      console.error('Error fetching course categories:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get popular course recommendations with caching
  const getPopularRecommendations = async (userId: string | number, limit: number = 5): Promise<void> => {
    try {
      // Check if we have valid cached data
      if (isCacheValid(popularRecommendationsCache.current, userId, limit)) {
        console.log('Using cached popular recommendations');
        setRecommendedCourses(popularRecommendationsCache.current!.data);
        return;
      }

      setLoading(true);
      setError(null);
      
      const recEngineUrl = import.meta.env.VITE_RECOMMENDATION_ENGINE_URL || 'http://0.0.0.0:8001';
      
      const response = await axios.get(
        `${recEngineUrl}/users/${userId}/recommendations/popular?limit=${limit}`
      );
      
      if (response.data && Array.isArray(response.data)) {
        const recommendations = formatRecommendationData(response.data, 'popular');
        setRecommendedCourses(recommendations);
        
        // Update the cache
        popularRecommendationsCache.current = {
          data: recommendations,
          timestamp: Date.now(),
          userId,
          limit
        };
        
        console.log('Popular recommendations loaded and cached');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch recommendations');
      console.error('Error fetching popular recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get content-based recommendations with caching
  const getContentBasedRecommendations = async (userId: string | number, limit: number = 5): Promise<void> => {
    try {
      // Check if we have valid cached data
      if (isCacheValid(contentBasedRecommendationsCache.current, userId, limit)) {
        console.log('Using cached content-based recommendations');
        setContentBasedCourses(contentBasedRecommendationsCache.current!.data);
        return;
      }

      setLoading(true);
      setError(null);
      
      const recEngineUrl = import.meta.env.VITE_RECOMMENDATION_ENGINE_URL || 'http://0.0.0.0:8001';
      
      const response = await axios.get(
        `${recEngineUrl}/users/${userId}/recommendations/content-based?limit=${limit}`
      );
      
      if (response.data && Array.isArray(response.data)) {
        const recommendations = formatRecommendationData(response.data, 'content-based');
        setContentBasedCourses(recommendations);
        
        // Update the cache
        contentBasedRecommendationsCache.current = {
          data: recommendations,
          timestamp: Date.now(),
          userId,
          limit
        };
        
        console.log('Content-based recommendations loaded and cached');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch content-based recommendations');
      console.error('Error fetching content-based recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get collaborative recommendations with caching
  const getCollaborativeRecommendations = async (userId: string | number, limit: number = 5): Promise<void> => {
    try {
      // Check if we have valid cached data
      if (isCacheValid(collaborativeRecommendationsCache.current, userId, limit)) {
        console.log('Using cached collaborative recommendations');
        setCollaborativeCourses(collaborativeRecommendationsCache.current!.data);
        return;
      }

      setLoading(true);
      setError(null);
      
      const recEngineUrl = import.meta.env.VITE_RECOMMENDATION_ENGINE_URL || 'http://0.0.0.0:8001';
      
      const response = await axios.get(
        `${recEngineUrl}/users/${userId}/recommendations/collaborative?limit=${limit}`
      );
      
      if (response.data && Array.isArray(response.data)) {
        const recommendations = formatRecommendationData(response.data, 'collaborative');
        setCollaborativeCourses(recommendations);
        
        // Update the cache
        collaborativeRecommendationsCache.current = {
          data: recommendations,
          timestamp: Date.now(),
          userId,
          limit
        };
        
        console.log('Collaborative recommendations loaded and cached');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch collaborative recommendations');
      console.error('Error fetching collaborative recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get hybrid recommendations with caching
  const getHybridRecommendations = async (userId: string | number, limit: number = 5): Promise<void> => {
    try {
      // Check if we have valid cached data
      if (isCacheValid(hybridRecommendationsCache.current, userId, limit)) {
        console.log('Using cached hybrid recommendations');
        setHybridCourses(hybridRecommendationsCache.current!.data);
        return;
      }

      setLoading(true);
      setError(null);
      
      const recEngineUrl = import.meta.env.VITE_RECOMMENDATION_ENGINE_URL || 'http://0.0.0.0:8001';
      
      const response = await axios.get(
        `${recEngineUrl}/users/${userId}/recommendations/hybrid?limit=${limit}`
      );
      
      if (response.data && Array.isArray(response.data)) {
        const recommendations = formatRecommendationData(response.data, 'hybrid');
        setHybridCourses(recommendations);
        
        // Update the cache
        hybridRecommendationsCache.current = {
          data: recommendations,
          timestamp: Date.now(),
          userId,
          limit
        };
        
        console.log('Hybrid recommendations loaded and cached');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch hybrid recommendations');
      console.error('Error fetching hybrid recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Optional: Add a function to force refresh all data
  const refreshAllData = async () => {
    // Clear all caches
    clearRecommendationCaches();
    clearCourseCaches();
    categoriesCache.current = null;
    
    // Reload data
    await Promise.all([
      getUserProfile(),
      getAllCourses(),
      getUserCourses(),
      getCourseCategories()
    ]);
    
    // Reload recommendations if user ID is available
    if (user?.id || user?.moodleid) {
      const userId = user?.moodleid || user?.id;
      await Promise.all([
        getPopularRecommendations(userId, 5),
        getContentBasedRecommendations(userId, 5),
        getCollaborativeRecommendations(userId, 5),
        getHybridRecommendations(userId, 5)
      ]);
    }
  };

  // Load user profile when component mounts and token is available
  useEffect(() => {
    if (token) {
      getUserProfile();
    }
  }, [token]);

  const clearError = () => {
    setError(null);
  };

  const value = {
    profile,
    courses,
    allCourses,
    courseCategories,
    recommendedCourses,
    contentBasedCourses,
    collaborativeCourses,
    hybridCourses,
    loading,
    error,
    getUserProfile,
    updateUserProfile,
    updatePreferences,
    deleteUserAccount,
    getCourseContents,
    getAllCourses,
    getUserCourses,
    enrollUserInCourse,
    getCoachCourses,
    getCourseStudents,
    getCourseCategories,
    getPopularRecommendations,
    getContentBasedRecommendations,
    getCollaborativeRecommendations,
    getHybridRecommendations,
    clearError, // Add the clearError function
    refreshAllData, // You may want to expose this utility function
    // Add todo related values
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export default UserContext;
