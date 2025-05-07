import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';

interface AuthContextType {
  user: any | null;
  token: string | null;
  moodleUrl: string | null; // Added field for moodle URL
  moodleToken: string | null; // Added field for moodle token
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: SignUpFormData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  updateProfile: (profileData: ProfileUpdateData) => Promise<void>;
  isLoading: boolean; // Added for better UX with protected routes
}

interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  age: string;
  contactNo: string;
  password: string;
  role: string;
}

interface ProfileUpdateData {
  name?: string;
  email?: string;
  favoritePasstime?: string;
  productivityHabit?: string;
  skillInProgress?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  moodleid?: string;
  firstLogin: boolean; // Ensure firstLogin is included
  preferences?: {
    interests: string[];
  };
  // ...other properties...
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cookie config for consistent settings
const cookieOptions = {
  expires: 7,
  path: '/',
  sameSite: 'lax' as const
};

// Helper function to extract Moodle token from URL
const extractMoodleToken = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('token');
  } catch (error) {
    console.error("Failed to extract Moodle token:", error);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [moodleUrl, setMoodleUrl] = useState<string | null>(null);
  const [moodleToken, setMoodleToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Get stored values
    const storedToken = Cookies.get('token');
    const storedUserJson = Cookies.get('user');
    const storedMoodleUrl = Cookies.get('moodleUrl');
    const storedMoodleToken = Cookies.get('moodleToken'); // Add this line
    
    console.log("Token from cookie:", storedToken);
    console.log("User from cookie:", storedUserJson);
    console.log("Moodle URL from cookie:", storedMoodleUrl);
    console.log("Moodle token from cookie:", storedMoodleToken); // Add this line
    
    if (storedToken) {
      // Set authorization header for all future requests
      axios.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
      setToken(storedToken);
      
      // Set Moodle URL if available
      if (storedMoodleUrl) {
        setMoodleUrl(storedMoodleUrl);
        const extractedToken = extractMoodleToken(storedMoodleUrl);
        if (extractedToken) {
          setMoodleToken(extractedToken);
        }
      }

      if(storedMoodleToken) {
        setMoodleToken(storedMoodleToken);
      }
      
      // If we have stored user data, parse and set it
      if (storedUserJson) {
        try {
          const storedUser = JSON.parse(storedUserJson);
          setUser(storedUser);
          setIsAuthenticated(true);
        } catch (error) {
          console.error("Error parsing user data from cookie:", error);
          // If parsing fails, validate token to get fresh user data
          validateToken(storedToken);
        }
      } else {
        // No stored user data, validate token to get it
        validateToken(storedToken);
      }
    }
    
    setIsLoading(false);
  }, []);
  
  const updateProfile = async (profileData: ProfileUpdateData) => {
    try {
      const response = await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/profile`, 
        profileData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Update the user state with the new data
      setUser({...user, ...response.data});
      return response.data;
    } catch (error: any) {
      console.error("Profile update error:", error.response?.data || error);
      throw new Error(error.response?.data?.message || 'Profile update failed');
    }
  };
  // In the validateToken function, update the code to properly store moodleToken:
const validateToken = async (authToken: string) => {
  try {
    console.log("Validating token...");
    const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/auth/validate`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log("Token validation response:", response.data);
    if (response.data?.user) {
      const userData = response.data.user;
      setUser(userData);
      setIsAuthenticated(true);
      
      // Store user data in cookie
      Cookies.set('user', JSON.stringify(userData), cookieOptions);
      
      // Handle moodleAutoLoginUrl if present
      if (response.data.moodleAutoLoginUrl) {
        setMoodleUrl(response.data.moodleAutoLoginUrl);
        Cookies.set('moodleUrl', response.data.moodleAutoLoginUrl, cookieOptions);
        
        const extractedToken = extractMoodleToken(response.data.moodleAutoLoginUrl);
        if (extractedToken) {
          setMoodleToken(extractedToken);
          // Store moodleToken in cookie with consistent options
          Cookies.set('moodleToken', extractedToken, cookieOptions);
        }
      }
    }
    // Remove this line since it might set null to the cookie
    // Cookies.set("MoodleToken", moodleToken, { expires: 7 });
  } catch (error) {
    console.error("Token validation error:", error);
    Cookies.remove('token');
    Cookies.remove('user');
    Cookies.remove('moodleUrl');
    Cookies.remove('moodleToken'); // Also remove moodleToken cookie
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
    setMoodleUrl(null);
    setMoodleToken(null);
    setIsAuthenticated(false);
  }
};

  const login = async (email: string, password: string) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
        email,
        password
      });
    
      console.log('Login response:', response.data);
      const { token: authToken, user: userData, moodleAutoLoginUrl, moodleLoginUrl } = response.data;
      console.log('User:', userData);
      console.log('Moodle Auto URL:', moodleAutoLoginUrl);
      console.log('Moodle Login URL:', moodleLoginUrl);
      
      // Store token and user in cookie
      Cookies.set('token', authToken, cookieOptions);
      Cookies.set('user', JSON.stringify(userData), cookieOptions);
      
      // Store moodle auto URL if available
      if (moodleAutoLoginUrl) {
        Cookies.set('moodleUrl', moodleAutoLoginUrl, cookieOptions);
        setMoodleUrl(moodleAutoLoginUrl);
        
        // Extract and store Moodle token
        const extractedToken = extractMoodleToken(moodleAutoLoginUrl);
        if (extractedToken) {
          console.log("Extracted Moodle token:", extractedToken);
          setMoodleToken(extractedToken);
          // Also store in cookie with consistent options
          Cookies.set('moodleToken', extractedToken, cookieOptions);
        }
      }

      // Automatically redirect to Moodle using moodleLoginUrl if available
      if (moodleLoginUrl) {
        window.open(moodleLoginUrl, '_blank');
      }

      // Set authorization header for all future requests
      axios.defaults.headers.common["Authorization"] = `Bearer ${authToken}`;

      setToken(authToken);
      setUser(userData);
      setIsAuthenticated(true);
      console.log("User authenticated:", userData);

      return {
        firstLogin: userData.firstLogin,
        role: userData.role,
        moodleRedirected: !!moodleLoginUrl // Indicate if we redirected to Moodle
      }
      
    } catch (error: any) {
      console.error("Login error:", error.response?.data || error);
      throw new Error(error.response?.data?.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (userData: SignUpFormData) => {
    try {
      setIsLoading(true);
      // Transform the data if needed
      const backendData = {
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        password: userData.password,
        role: userData.role,
      };
      
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/auth/register`, backendData);
      
      return response.data;

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || "Signup failed";
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    Cookies.remove("token");
    Cookies.remove('token');
    Cookies.remove('user');
    Cookies.remove('moodleUrl');
    Cookies.remove('moodleToken'); // Add this line
    
    // Also remove the authorization header
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
    setToken(null);
    setMoodleUrl(null);
    setMoodleToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      moodleUrl,
      moodleToken,
      login, 
      signup, 
      logout, 
      isAuthenticated,
      isLoading,
      updateProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};