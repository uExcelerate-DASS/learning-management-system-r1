import React, { useState } from "react";
import { Eye, EyeOff, ArrowLeftCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
// import axios from "axios";
import { Snackbar, Alert, CircularProgress } from "@mui/material";
import { useAuth } from "../context/AuthContext";

// const VITE_API_BASE_URL = "http://localhost:8080";

interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  age: string;
  contactNo: string;
  password: string;
  role: string;
  roleConfirmation?: string; // New field for role confirmation
}

const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SignUpFormData>({
    firstName: "",
    lastName: "",
    email: "",
    age: "",
    contactNo: "",
    password: "",
    role: "Learner", // Default role is Learner
    roleConfirmation: "",
  });

  const roles = ["learner", "coach"];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    
    // Validate role confirmation for non-learner roles
    if (formData.role !== "Learner" && 
        (!formData.roleConfirmation || formData.roleConfirmation.trim() === "")) {
      setError("Confirmation code is required for non-learner roles");
      return;
    }
    
    // Add additional validation if needed for specific confirmation codes
    // For example, you might want to check specific codes for instructor vs admin
    if (formData.role === "coach" && formData.roleConfirmation !== "Coach123") {
      setError("Invalid confirmation code for Instructor role");
      return;
    }
    
    setLoading(true); // Show loading indicator

    try {
      // Use the signup function from context instead of direct axios call
      await signup(formData);
      // If signup succeeds, navigate to the appropriate page
      navigate("/interests");
    } catch (error: any) {
      console.error("Registration failed:", error.message);
      setError(error.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false); // Hide loading indicator
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#F4BEFD] to-[#E9D5FF] font-mono py-6 px-4">
      <button
        onClick={() => navigate("/")}
        className="fixed left-8 top-8 p-2 hover:bg-white/20 rounded-full transition-all duration-300 cursor-pointer"
        aria-label="Go back"
      >
        <ArrowLeftCircle size={40} className="stroke-[#8C5AFF] stroke-[2]" />
      </button>

      <div className="max-w-[500px] mx-auto my-8 bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8 animate-fadeIn">
        <div className="flex flex-col items-center">
          <h1 className="text-3xl font-bold text-[#151313] mb-8">Sign Up</h1>

          <form onSubmit={handleSubmit} className="w-full space-y-5">
            <div className="grid gap-4">
              <div className="form-group">
                <label className="text-sm font-medium text-[#151313] mb-1 block">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full h-12 px-4 border-2 border-[#023047]/20 rounded-lg focus:outline-none focus:border-[#8C5AFF] focus:ring-1 focus:ring-[#8C5AFF] transition-all duration-200"
                  placeholder="Enter your first name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="text-sm font-medium text-[#151313] mb-1 block">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full h-12 px-4 border-2 border-[#023047]/20 rounded-lg focus:outline-none focus:border-[#8C5AFF] focus:ring-1 focus:ring-[#8C5AFF] transition-all duration-200"
                  placeholder="Enter your last name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="text-sm font-medium text-[#151313] mb-1 block">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full h-12 px-4 border-2 border-[#023047]/20 rounded-lg focus:outline-none focus:border-[#8C5AFF] focus:ring-1 focus:ring-[#8C5AFF] transition-all duration-200"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="form-group">
                <label className="text-sm font-medium text-[#151313] mb-1 block">Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full h-12 px-4 border-2 border-[#023047]/20 rounded-lg focus:outline-none focus:border-[#8C5AFF] focus:ring-1 focus:ring-[#8C5AFF] transition-all duration-200"
                  placeholder="Enter your age"
                  required
                />
              </div>

              <div className="form-group">
                <label className="text-sm font-medium text-[#151313] mb-1 block">Contact No.</label>
                <input
                  type="tel"
                  name="contactNo"
                  value={formData.contactNo}
                  onChange={handleChange}
                  className="w-full h-12 px-4 border-2 border-[#023047]/20 rounded-lg focus:outline-none focus:border-[#8C5AFF] focus:ring-1 focus:ring-[#8C5AFF] transition-all duration-200"
                  placeholder="Enter your contact number"
                  required
                />
              </div>
              <div className="form-group">
                <label className="text-sm font-medium text-[#151313] mb-1 block">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full h-12 px-4 border-2 border-[#023047]/20 rounded-lg focus:outline-none focus:border-[#8C5AFF] focus:ring-1 focus:ring-[#8C5AFF] transition-all duration-200"
                  required
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Conditional Role Confirmation Field */}
              {formData.role !== "Learner" && (
                <div className="form-group">
                  <label className="text-sm font-medium text-[#151313] mb-1 block">
                    Role Confirmation Code
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    name="roleConfirmation"
                    value={formData.roleConfirmation}
                    onChange={handleChange}
                    className="w-full h-12 px-4 border-2 border-[#023047]/20 rounded-lg focus:outline-none focus:border-[#8C5AFF] focus:ring-1 focus:ring-[#8C5AFF] transition-all duration-200"
                    placeholder={`Enter confirmation code for ${formData.role} role`}
                    required
                  />
                  <p className="text-xs text-[#151313]/70 mt-1">
                    {formData.role === "coach" 
                      ? "Please enter the coach authorization code" 
                      :""}
                  </p>
                </div>
              )}

              <div className="form-group">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-medium text-[#151313]">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex items-center gap-1.5 text-[#151313]/70 hover:text-[#8C5AFF] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    <span className="text-sm">{showPassword ? "Hide" : "Show"}</span>
                  </button>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full h-12 px-4 border-2 border-[#023047]/20 rounded-lg focus:outline-none focus:border-[#8C5AFF] focus:ring-1 focus:ring-[#8C5AFF] transition-all duration-200"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                className="w-full h-12 bg-[#8C5AFF] rounded-lg text-white font-semibold 
                         hover:bg-[#7B4DF3] active:scale-[0.98] transition-all duration-200
                         shadow-lg shadow-[#8C5AFF]/30 cursor-pointer"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Sign Up"}
              </button>
            </div>
          </form>

          <div className="mt-8 flex items-center gap-2 text-sm text-[#151313]/80">
            <span>Already have an account?</span>
            <button
              onClick={() => navigate("/login")}
              className="text-[#8C5AFF] font-medium hover:underline transition-all cursor-pointer"
            >
              Log In
            </button>
          </div>
        </div>
      </div>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default SignUpPage;