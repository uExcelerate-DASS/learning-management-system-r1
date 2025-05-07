import React, { useState } from "react";
import { Eye, EyeOff, ArrowLeftCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, Snackbar, CircularProgress } from "@mui/material";
// Remove axios and Cookies imports since we'll use AuthContext
import { useAuth } from "../context/AuthContext";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // Get login function from AuthContext
  
  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // UI feedback states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [openSuccessSnackbar, setOpenSuccessSnackbar] = useState(false);
  const [openErrorSnackbar, setOpenErrorSnackbar] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Define the expected type for userData
      type UserData = {
        firstLogin?: boolean;
        role?: string;
      };

      // Use the login function from context instead of direct API call
      const userData: UserData = await login(email, password);
      
      // Show success message
      setSuccess("Login successful! Redirecting...");
      setOpenSuccessSnackbar(true);

      console.log("User authenticated:", userData);
      // Short delay before redirecting
      setTimeout(() => {
        // Check if this is the user's first login
        if (userData?.firstLogin) {
          navigate("/interests"); // Redirect to interests page
        } else 
        if (userData?.role === "coach") {
          navigate("/coach/dashboard"); // Redirect to coach dashboard
        } else {
          navigate("/dashboard"); // Redirect to learner dashboard
        }
      }, 1500);
      
    } catch (error: any) {
      console.error("Login failed:", error.message);
      setError(error.message || "Login failed. Please check your credentials.");
      setOpenErrorSnackbar(true);
    } finally {
      setLoading(false);
    }
  }; 

  const handleCloseErrorSnackbar = () => {
    setOpenErrorSnackbar(false);
  };

  const handleCloseSuccessSnackbar = () => {
    setOpenSuccessSnackbar(false);
  };

  return (
    <div className="relative w-screen h-screen bg-[#F4BEFD] font-mono">
      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        className="fixed left-8 top-8 p-2 hover:bg-white/20 rounded-full transition-all duration-300 cursor-pointer"
        aria-label="Go back"
      >
        <ArrowLeftCircle size={40} className="stroke-[#8C5AFF] stroke-[2]" />
      </button>

      {/* Login form container */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[466px] h-[544px] bg-white rounded-lg shadow-lg">
        <div className="flex flex-col items-center px-8 pt-16">
          <h1 className="text-[32px] font-semibold text-[#151313] mb-10">
            Log In
          </h1>

          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div className="flex flex-col gap-1">
              <label className="text-base text-[#151313]">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 border border-[#023047] rounded-xl px-6 focus:outline-none focus:ring-2 focus:ring-[#8C5AFF]"
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <label className="text-base text-[#151313]">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex items-center gap-2 text-[#151313] cursor-pointer"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                  <span className="text-lg font-mono">
                    {showPassword ? "Hide" : "Show"}
                  </span>
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 border border-[#023047] rounded-xl px-6 focus:outline-none focus:ring-2 focus:ring-[#8C5AFF]"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            <div className="mt-12 flex justify-center">
              <button
                type="submit"
                className="w-[210px] h-[53px] bg-[#8C5AFF] rounded-lg text-white font-semibold text-lg hover:bg-[#7B4DF3] transition-colors cursor-pointer flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Log in"
                )}
              </button>
            </div>
          </form>

          {/* Sign-up section */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-1 text-base text-[#111111]">
            <span>Do not have an account?</span>
            <button
              onClick={() => navigate("/register")}
              className="text-[#8C5AFF] hover:underline cursor-pointer"
              disabled={loading}
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>

      {/* Success Snackbar */}
      <Snackbar
        open={openSuccessSnackbar}
        autoHideDuration={2000}
        onClose={handleCloseSuccessSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSuccessSnackbar}
          severity="success"
          sx={{
            width: "100%",
            fontFamily: "monospace",
            fontWeight: "500",
            backgroundColor: "#4caf50",
            color: "white",
          }}
        >
          {success}
        </Alert>
      </Snackbar>

      {/* Error Snackbar */}
      <Snackbar
        open={openErrorSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseErrorSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseErrorSnackbar}
          severity="error"
          sx={{
            width: "100%",
            fontFamily: "monospace",
            whiteSpace: "pre-line",
            fontWeight: "500",
            backgroundColor: "#f44336",
            color: "white",
            "& .MuiAlert-message": {
              maxHeight: "200px",
              overflowY: "auto",
            },
          }}
        >
          {error}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default LoginPage;