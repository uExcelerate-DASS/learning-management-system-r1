import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { UserProvider } from "./context/UserContext";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignPage";
import LandingPage from "./pages/LandingPage";
import LearnersAboutMe from "./pages/LearnersAboutMe";
import LearnersDashboard from "./pages/Learners_dashboard";
import TrackCourses from "./pages/Learner_courses";
import LearnersAnalysis from "./pages/LearnersAnalysis";
import CoachCourses from "./pages/CoachCourses";
import CoachDashboard from "./pages/CoachDashboard";
import CourseStudents from './pages/CourseStudents';
import CourseDetails from './pages/CourseDetails';
import AllStudents from "./pages/AllStudents";
import InterestsPage from './pages/InterestsPage';

// This component will handle the authentication redirect logic with role-based routing
const ProtectedLanding: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isAuthenticated && user) {
      // If it's user's first login, redirect to interests page
      if (user.firstLogin) {
        navigate("/interests");
        return;
      }
      
      // Otherwise, redirect based on user role
      if (user.role === "coach") {
        navigate("/coach/dashboard");
      } else {
        // Default to learner dashboard
        navigate("/dashboard");
      }
    }
  }, [isAuthenticated, user, navigate]);
  
  // If not authenticated, show the landing page
  return <LandingPage />;
};

// Create a component to protect routes that require authentication
const ProtectedRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>; // Show loading indicator
  }

  // Redirect to login if not authenticated
  return isAuthenticated ? element : <Navigate to="/login" replace />;
};

// Create a component to protect routes that are specific to learners
const LearnerRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Redirect to login if not authenticated or to coach dashboard if authenticated as coach
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user is a learner
  return user?.role === "coach" ? <Navigate to="/coach/dashboard" replace /> : element;
};

// Create a component to protect routes that are specific to coaches
const CoachRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Redirect to login if not authenticated or to learner dashboard if authenticated as learner
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user is a coach
  return user?.role === "coach" ? element : <Navigate to="/dashboard" replace />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <UserProvider>
        <Router>
          <Routes>
            {/* Landing page with auth check */}
            <Route path="/" element={<ProtectedLanding />} />
            
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<SignUpPage />} />
            
            {/* Learner-specific routes */}
            <Route path="/interests" element={<ProtectedRoute element={<InterestsPage />} />} />
            <Route path="/about" element={<LearnerRoute element={<LearnersAboutMe />} />} />
            <Route path="/dashboard" element={<LearnerRoute element={<LearnersDashboard />} />} />
            <Route path="/courses" element={<LearnerRoute element={<TrackCourses />} />} />
            <Route path="/analysis" element={<LearnerRoute element={<LearnersAnalysis />} />} />
            <Route path="/course/:courseId" element={<ProtectedRoute element={<CourseDetails />} />} />
            
            {/* Coach-specific routes */}
            <Route path="/coach/dashboard" element={<CoachRoute element={<CoachDashboard />} />} />
            <Route path="/coach/courses" element={<CoachRoute element={<CoachCourses />} />} />
            <Route path="/coach/course/:courseId/students" element={<CoachRoute element={<CourseStudents />} />} />
            <Route path="/coach/course/:courseId" element={<CoachRoute element={<CourseDetails />} />} />
            <Route path="/coach/students" element={<CoachRoute element={<AllStudents />} />} />
            <Route path="/coach/about" element={<CoachRoute element={<LearnersAboutMe />} />} />
            
          </Routes>
        </Router>
      </UserProvider>
    </AuthProvider>
  );
};

export default App;