import React from "react";
import { LayoutDashboard, Calendar, FileText, User, ChevronLeft, BookOpen, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Add this import

export type ActivePage = "dashboard" | "courses" | "analysis" | "about" | "students";

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  activePage: ActivePage;
}

const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  activePage
}) => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Get user from auth context
  
  const isCoach = user?.role === "coach"; // Check if user is a coach

  return (
    <nav className={`fixed left-0 top-0 h-full bg-[#F4BEFD] border-r border-gray-200 
      transition-all duration-300 ${isSidebarOpen ? 'w-60' : 'w-0 overflow-hidden'} z-10`}>
      
      {/* Sidebar Content */}
      <div className="p-5 relative">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="absolute -right-3 top-5 bg-white p-1 rounded-full shadow-lg hover:bg-gray-100"
        >
          <ChevronLeft className={`transition-transform ${!isSidebarOpen && 'rotate-180'}`} />
        </button>
        
        <h1 className="text-2xl font-bold">Torchbearer LMS</h1>
        
        <div className="mt-12 space-y-2">
          {/* Dashboard */}
          <div 
            onClick={() => navigate(isCoach ? "/coach/dashboard" : "/dashboard")} 
            className={`p-2 rounded ${activePage === "dashboard" 
              ? "bg-[#8C5AFF] text-white" 
              : "hover:bg-[#EEBFF6]"} cursor-pointer`}
          >
            <div className="flex items-center gap-3">
              <LayoutDashboard size={18} />
              <span className="text-sm">Dashboard</span>
            </div>
          </div>
          
          {/* Courses */}
          <div 
            onClick={() => navigate(isCoach ? "/coach/courses" : "/courses")}
            className={`p-2 rounded ${activePage === "courses" 
              ? "bg-[#8C5AFF] text-white" 
              : "hover:bg-[#EEBFF6]"} cursor-pointer`}
          >
            <div className="flex items-center gap-3">
              <Calendar size={18} />
              <span className="text-sm">{isCoach ? "Manage Courses" : "My Courses"}</span>
            </div>
          </div>
          
          {/* Conditional Navigation */}
          {isCoach ? (
            // Coach-specific: Students
            <div 
              onClick={() => navigate("/coach/students")}
              className={`p-2 rounded ${activePage === "students" 
                ? "bg-[#8C5AFF] text-white" 
                : "hover:bg-[#EEBFF6]"} cursor-pointer`}
            >
              <div className="flex items-center gap-3">
                <Users size={18} />
                <span className="text-sm">Students</span>
              </div>
            </div>
          ) : (
            // Learner-specific: Analysis
            <div 
              onClick={() => navigate("/analysis")}
              className={`p-2 rounded ${activePage === "analysis" 
                ? "bg-[#8C5AFF] text-white" 
                : "hover:bg-[#EEBFF6]"} cursor-pointer`}
            >
              <div className="flex items-center gap-3">
                <FileText size={18} />
                <span className="text-sm">Analysis</span>
              </div>
            </div>
          )}
          
          {/* About Me / Profile */}
          <div 
            onClick={() => navigate(isCoach ? "/coach/about" : "/about")}
            className={`p-2 rounded ${activePage === "about" 
              ? "bg-[#8C5AFF] text-white" 
              : "hover:bg-[#EEBFF6]"} cursor-pointer`}
          >
            <div className="flex items-center gap-3">
              <User size={18} />
              <span className="text-sm">{isCoach ? "Profile" : "About Me"}</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;