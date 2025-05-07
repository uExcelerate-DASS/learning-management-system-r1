import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import {
  CircularProgress,
  Button,
  TextField,
  Typography,
  Avatar,
  Box,
  Chip,
  Divider,
  Tooltip,
  Fade,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import BadgeIcon from '@mui/icons-material/Badge';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import WorkIcon from '@mui/icons-material/Work';
import RefreshIcon from '@mui/icons-material/Refresh';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Toaster, toast } from "react-hot-toast"; 
import axios from "axios";
import { Tag } from "lucide-react";
import { motion } from "framer-motion";

// Create a custom avatar component for a more polished look
const ProfileAvatar = ({ name }: { name: string }) => {
  const getInitials = () => {
    if (!name) return "U";
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Generate a consistent color based on the user's name
  const stringToColor = (string: string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      color += ('00' + value.toString(16)).slice(-2);
    }
    return color;
  };

  // Use a soft pastel color instead of the generated one
  const avatarColor = "#F4BEFD";
  const initials = getInitials();

  return (
    <motion.div 
      className="relative"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg flex items-center justify-center bg-gradient-to-br from-[#F4BEFD] to-[#DFA9E5]">
        <span className="text-2xl font-bold text-[#211C37]">{initials}</span>
      </div>
      <motion.div 
        className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#211C37] rounded-full flex items-center justify-center border-2 border-white"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
      >
        <BadgeIcon className="text-white" fontSize="small" />
      </motion.div>
    </motion.div>
  );
};

// Custom interest tag component
const InterestTag = ({ interest, index }: { interest: string, index: number }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="bg-[#EEBFF6] text-black px-4 py-2 rounded-full flex items-center gap-2 border border-black hover:shadow-md transition-all hover:bg-[#DFA9E5]"
    >
      <Tag size={16} />
      <span>{interest}</span>
    </motion.div>
  );
};

interface EditProfileData {
  name: string;
  email: string;
}

const AboutMe = () => {
  const navigate = useNavigate();
  const { user, logout, updateProfile, token } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [isLoadingInterests, setIsLoadingInterests] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Form state
  const [profileData, setProfileData] = useState<EditProfileData>({
    name: user?.name || "",
    email: user?.email || "",
  });

  // Fetch user interests from the database
  const fetchUserInterests = async () => {
    if (!user || !token) return;
    
    setIsLoadingInterests(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/users/profile`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Extract interests from user preferences
      if (response.data && response.data.preferences && response.data.preferences.interests) {
        setUserInterests(response.data.preferences.interests);
      } else {
        setUserInterests([]);
      }
    } catch (error) {
      console.error('Error fetching user interests:', error);
      toast.error('Failed to load your interests');
    } finally {
      setIsLoadingInterests(false);
    }
  };

  // Initialize profile data and fetch interests when user data is available
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
      });
      
      // Fetch user interests
      fetchUserInterests();
    }
  }, [user, token]);

  // Add protection for unauthenticated access
  useEffect(() => {
    if (user === null) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Show loading state while auth is being determined
  if (user === undefined) {
    return (
      <div className="flex justify-center items-center h-screen">
        <CircularProgress size={60} style={{ color: "#F4BEFD" }} />
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    // If canceling edit, reset form data to user data
    if (isEditing) {
      setProfileData({
        name: user.name || "",
        email: user.email || "",
      });
    }
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await updateProfile(profileData);
      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error("Failed to update profile. Please try again.");
      console.error("Update profile error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to interests page to edit interests
  const handleEditInterests = () => {
    navigate('/interests');
  };

  // Refresh user interests
  const refreshInterests = () => {
    fetchUserInterests();
    toast.success("Interests refreshed");
  };

  return (
    <div className="relative bg-gradient-to-br from-white to-[#F9F5FF] min-h-screen font-['Kode_Mono']">
      {/* React Hot Toast Component */}
      <Toaster position="top-right" />

      {/* Sidebar */}
      <Sidebar
        isSidebarOpen={sidebarOpen}
        setIsSidebarOpen={setSidebarOpen}
        activePage="about"
      />

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? "ml-60" : "ml-0"
        }`}
      >
        {/* Header */}
        <Header
          user={user}
          isSidebarOpen={sidebarOpen}
          setIsSidebarOpen={setSidebarOpen}
          handleLogout={handleLogout}
          showSearch={false}
        />

        {/* Page Content */}
        <motion.div 
          className="p-8 max-w-5xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8">
            <motion.h1 
              className="text-[42px] font-bold font-mono text-[#211C37] leading-[48px] mb-2"
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.4 }}
            >
              My Profile
            </motion.h1>
            <motion.div 
              className="w-20 h-2 bg-[#F4BEFD] rounded-full mb-4"
              initial={{ width: 0 }}
              animate={{ width: "80px" }}
              transition={{ duration: 0.4, delay: 0.2 }}
            ></motion.div>
            <p className="text-[20px] font-mono text-[#85878D] leading-[26px]">
              Manage your personal details and preferences
            </p>
          </div>

          {/* Profile Banner */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="mb-8 border-none shadow-lg overflow-hidden bg-gradient-to-r from-[#F4BEFD] to-[#DFA9E5] rounded-xl relative">
              {/* Decorative corner accents */}
              <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-white opacity-60 rounded-tl-xl"></div>
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-white opacity-60 rounded-br-xl"></div>

              <div className="p-8 relative">
                {/* Pattern overlay */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
                }}></div>
                
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative">
                  <ProfileAvatar name={user?.name || "User"} />
                  
                  <div className="text-center md:text-left">
                    <h2 className="text-3xl font-bold text-[#211C37] mb-2">{user?.name || "User"}</h2>
                    <div className="flex flex-col md:flex-row items-center gap-3">
                      <Chip 
                        label={user?.role?.toUpperCase() || "USER"} 
                        size="small"
                        className="bg-white text-[#211C37] border border-[#211C37]"
                      />
                      <span className="text-[#211C37] opacity-80">{user?.email}</span>
                    </div>
                  </div>
                  
                  {!isEditing ? (
                    <Button
                      startIcon={<EditIcon />}
                      variant="contained"
                      onClick={toggleEditMode}
                      className="ml-auto self-start hover:bg-opacity-90"
                      style={{ 
                        backgroundColor: "#211C37", 
                        color: "white",
                        textTransform: "none",
                        fontFamily: "'Kode Mono', monospace"
                      }}
                    >
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2 ml-auto self-start">
                      <Button
                        onClick={toggleEditMode}
                        variant="outlined"
                        style={{ 
                          borderColor: "#211C37", 
                          color: "#211C37",
                          textTransform: "none",
                          fontFamily: "'Kode Mono', monospace" 
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        startIcon={<SaveIcon />}
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={isLoading}
                        className="hover:bg-opacity-90"
                        style={{ 
                          backgroundColor: "#211C37", 
                          color: "white",
                          textTransform: "none",
                          fontFamily: "'Kode Mono', monospace"
                        }}
                      >
                        {isLoading ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Main Content Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Details Card */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Card className="border border-black shadow-md lg:col-span-1 rounded-xl hover:shadow-lg transition-shadow">
                <CardHeader 
                  title={
                    <h3 className="text-xl font-mono font-bold tracking-[0.15px] text-[#211C37]">Account Details</h3>
                  }
                  className="pb-2 border-b bg-[#F9F5FF]"
                />
                <CardContent className="pt-6">
                  {isEditing ? (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center mb-2">
                          <BadgeIcon fontSize="small" className="mr-2 text-[#85878D]" />
                          <p className="text-base tracking-[0.15px] text-[#85878D]">
                            Name
                          </p>
                        </div>
                        <TextField
                          name="name"
                          fullWidth
                          variant="outlined"
                          value={profileData.name}
                          onChange={handleInputChange}
                          size="small"
                          inputProps={{
                            style: { fontFamily: "'Kode Mono', monospace" }
                          }}
                          placeholder="Enter your name"
                        />
                      </div>
                      
                      <div>
                        <div className="flex items-center mb-2">
                          <AlternateEmailIcon fontSize="small" className="mr-2 text-[#85878D]" />
                          <p className="text-base tracking-[0.15px] text-[#85878D]">
                            Email
                          </p>
                        </div>
                        <TextField
                          name="email"
                          type="email"
                          fullWidth
                          variant="outlined"
                          value={profileData.email}
                          onChange={handleInputChange}
                          size="small"
                          inputProps={{
                            style: { fontFamily: "'Kode Mono', monospace" }
                          }}
                          placeholder="Enter your email"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center mb-2">
                          <BadgeIcon fontSize="small" className="mr-2 text-[#85878D]" />
                          <p className="text-base tracking-[0.15px] text-[#85878D]">
                            Name
                          </p>
                        </div>
                        <p className="font-semibold text-base tracking-[0.15px] pl-7">
                          {user?.name || "Not provided"}
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex items-center mb-2">
                          <AlternateEmailIcon fontSize="small" className="mr-2 text-[#85878D]" />
                          <p className="text-base tracking-[0.15px] text-[#85878D]">
                            Email
                          </p>
                        </div>
                        <p className="font-semibold text-base tracking-[0.15px] pl-7">
                          {user?.email || "Not provided"}
                        </p>
                      </div>
                      
                      <div>
                        <div className="flex items-center mb-2">
                          <WorkIcon fontSize="small" className="mr-2 text-[#85878D]" />
                          <p className="text-base tracking-[0.15px] text-[#85878D]">
                            Role
                          </p>
                        </div>
                        <p className="font-semibold text-base tracking-[0.15px] pl-7 capitalize">
                          {user?.role || "Not specified"}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Interests Card */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="lg:col-span-2"
            >
              <Card className="border border-black shadow-md rounded-xl hover:shadow-lg transition-shadow">
                <CardHeader 
                  title={
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <h3 className="text-xl font-mono font-bold tracking-[0.15px] text-[#211C37]">My Interests</h3>
                        <Tooltip title="Refresh interests" arrow>
                          <IconButton onClick={refreshInterests} size="small" className="ml-2 text-[#85878D]">
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                      <Button
                        startIcon={<EditIcon />}
                        variant="contained"
                        onClick={handleEditInterests}
                        size="small"
                        className="hover:bg-[#DFA9E5]"
                        style={{ 
                          backgroundColor: "#F4BEFD", 
                          color: "black",
                          textTransform: "none",
                          fontFamily: "'Kode Mono', monospace"
                        }}
                      >
                        Edit Interests
                      </Button>
                    </div>
                  }
                  className="pb-2 border-b bg-[#F9F5FF]"
                />
                <CardContent className="pt-5">
                  {isLoadingInterests ? (
                    <div className="flex justify-center items-center py-16">
                      <CircularProgress size={30} style={{ color: "#F4BEFD" }} />
                      <Typography variant="body2" className="ml-3 font-mono text-[#85878D]">
                        Loading your interests...
                      </Typography>
                    </div>
                  ) : userInterests.length > 0 ? (
                    <div>
                      <div className="bg-[#F9F5FF] border-l-4 border-[#F4BEFD] p-4 mb-5 rounded-r flex items-start">
                        <InfoOutlinedIcon className="text-[#85878D] mr-2 mt-0.5" fontSize="small" />
                        <Typography variant="body2" className="text-[#85878D] font-mono">
                          These interests are used to personalize your learning experience and recommend courses that align with your career goals.
                        </Typography>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {userInterests.map((interest, index) => (
                          <InterestTag key={index} interest={interest} index={index} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-[#F9F5FF] rounded-lg border border-dashed border-[#DFA9E5]">
                      <motion.div 
                        className="w-16 h-16 mx-auto bg-[#F4BEFD] rounded-full flex items-center justify-center mb-4"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Tag size={28} className="text-[#211C37]" />
                      </motion.div>
                      <Typography variant="h6" style={{ fontFamily: "'Kode Mono', monospace" }} className="mb-2">
                        No interests selected yet
                      </Typography>
                      <Typography variant="body2" style={{ fontFamily: "'Kode Mono', monospace" }} className="text-[#85878D] mb-5 max-w-md mx-auto">
                        Adding interests helps us personalize your learning journey and recommend relevant courses for your career growth.
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={handleEditInterests}
                        className="hover:bg-[#DFA9E5]"
                        style={{ 
                          backgroundColor: "#F4BEFD", 
                          color: "black",
                          textTransform: "none",
                          fontFamily: "'Kode Mono', monospace"
                        }}
                      >
                        Add Your Interests
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AboutMe;