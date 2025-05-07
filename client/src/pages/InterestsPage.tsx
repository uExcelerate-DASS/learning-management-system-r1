import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { Tag, X, ChevronRight, Check } from 'lucide-react';
import axios from 'axios';
import Header from '../components/Header';

// Define the categories and tags structure
const interestCategories = [
  {
    id: 'leadership-development',
    name: 'Leadership Development',
    description: 'Programs aimed at nurturing leadership skills across various levels.',
    tags: [
      'Emerging Leaders',
      'First-Time Managers',
      'Executive Coaching',
      'Leader as a Coach',
      'Cross-Functional Leadership',
      'Change Management',
      'Digital Leadership',
      'Global Leadership',
      'Leadership Competency Development',
      'Succession Planning'
    ]
  },
  {
    id: 'coaching-culture',
    name: 'Coaching Culture',
    description: 'Building a coaching culture within organizations to enhance performance and engagement.',
    tags: [
      'Internal Coaching',
      'Manager as a Mentor',
      'Coaching Mindset',
      'Peer Learning',
      'Coaching Skills Development',
      'Coaching Culture Assessment',
      'Employee Engagement',
      'Feedback Mechanisms',
      'Continuous Learning',
      'Organizational Coaching Strategies'
    ]
  },
  {
    id: 'employee-wellbeing',
    name: 'Employee Well-being',
    description: 'Programs designed to support mental health and overall well-being of employees.',
    tags: [
      'Mental Health Awareness',
      'Stress Management',
      'Work-Life Balance',
      'Burnout Prevention',
      'Resilience Building',
      'Emotional Intelligence',
      'Wellness Initiatives',
      'Mindfulness Practices',
      'Employee Assistance Programs',
      'Healthy Workplace Culture'
    ]
  },
  {
    id: 'dei',
    name: 'Diversity, Equity & Inclusion (DEI)',
    description: 'Initiatives to foster an inclusive and equitable workplace environment.',
    tags: [
      'Inclusive Leadership',
      'Unconscious Bias Training',
      'Cultural Competency',
      'Gender Diversity',
      'Equity in the Workplace',
      'Belonging and Engagement',
      'DEI Strategy',
      'Women in Leadership',
      'Cross-Cultural Teams',
      'DEI Sensitization Programs'
    ]
  },
  {
    id: 'capability-building',
    name: 'Capability Building',
    description: 'Programs aimed at enhancing the skills and competencies of employees.',
    tags: [
      'Skill Development',
      'Learning Agility',
      'Competency Frameworks',
      'Talent Development',
      'Succession Planning',
      'Personalized Learning Paths',
      'E-Learning Strategies',
      'Continuous Learning Culture',
      'Training Needs Analysis',
      'Leadership Competency Development'
    ]
  },
  {
    id: 'performance-acceleration',
    name: 'Performance Acceleration',
    description: 'Focused on improving individual and organizational performance.',
    tags: [
      'Productivity Improvement',
      'Goal Setting',
      'Time Management',
      'Performance Metrics',
      'Continuous Improvement',
      'Behavioral Change',
      'SMART Goals',
      'Performance Analytics',
      'Feedback Mechanisms',
      'High-Potential Talent Development'
    ]
  }
];


const InterestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, isAuthenticated, logout } = useAuth();
  const { updatePreferences, loading, error } = useUser();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) {
      navigate('/login');
    }
  }, [isAuthenticated, token, navigate]);
  
  // State to track selected interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Toggle selection of an interest tag
  const toggleInterest = (tag: string) => {
    setSelectedInterests(prevSelected => 
      prevSelected.includes(tag)
        ? prevSelected.filter(t => t !== tag)
        : [...prevSelected, tag]
    );
  };
  
  // Handle moving to next category
  const handleNext = () => {
    if (currentCategoryIndex < interestCategories.length - 1) {
      setCurrentCategoryIndex(prev => prev + 1);
    } else {
      setShowSummary(true);
    }
  };
  
  // Handle moving to previous category
  const handlePrevious = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(prev => prev - 1);
    }
  };
  
  // Handle final submission of preferences and update firstLogin status
  const handleSubmit = async () => {
    try {
      setSavingStatus('saving');
      setErrorMessage(null);
      
      // Check if token exists before making API calls
      if (!token) {
        setErrorMessage('Authentication required. Please log in again.');
        setSavingStatus('error');
        return;
      }
      
      // 1. Update user preferences (interests)
      await updatePreferences(selectedInterests, user?._id);
      
      // 2. Mark first login as complete
      await axios.put(
        `${import.meta.env.VITE_API_BASE_URL}/api/users/first-login-complete`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      setSavingStatus('success');
      
      // Short delay before redirecting
      setTimeout(() => {
        navigate(user?.role === 'coach' ? '/coach/dashboard' : '/dashboard');
      }, 1000);
    } catch (err) {
      console.error('Error saving interests:', err);
      setSavingStatus('error');
      if (axios.isAxiosError(err) && err.response) {
        setErrorMessage(err.response.data.message || 'Failed to save your preferences. Please try again.');
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    }
  };
  
  // Display loading state while checking authentication
  if (!isAuthenticated && !error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="text-xl">Checking authentication...</div>
      </div>
    );
  }
  
  const currentCategory = interestCategories[currentCategoryIndex];
  
  // Show summary view
  if (showSummary) {
    return (
      <div className="min-h-screen bg-white flex flex-col font-['Kode_Mono']">
        <Header 
          user={user}
          showSearch={false}
          handleLogout={handleLogout} 
        />
        <div className="flex-1 p-4 flex flex-col items-center justify-center">
          <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg border border-black p-8">
            <h1 className="text-3xl font-bold mb-6 text-center">Your Interests</h1>
            <p className="text-gray-600 mb-8 text-center">
              Here's a summary of your selected interests. You can update these anytime from your profile.
            </p>
            
            {selectedInterests.length === 0 ? (
              <div className="text-center p-4 bg-gray-100 rounded-lg mb-6">
                <p>You haven't selected any interests yet.</p>
              </div>
            ) : (
              <div className="mb-8">
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedInterests.map(interest => (
                    <div key={interest} className="bg-[#EEBFF6] text-black px-4 py-2 rounded-full flex items-center gap-2 border border-black">
                      <Tag size={16} />
                      <span>{interest}</span>
                      <button 
                        onClick={() => toggleInterest(interest)}
                        className="hover:bg-[#DFA9E5] p-1 rounded-full">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-between mt-8">
              <button 
                onClick={() => setShowSummary(false)} 
                className="px-6 py-2 bg-gray-200 text-black rounded-lg border border-black hover:bg-gray-300 transition-colors">
                Back
              </button>
              <button 
                onClick={handleSubmit} 
                disabled={savingStatus === 'saving'}
                className="px-6 py-2 bg-[#EEBFF6] text-black rounded-lg border border-black hover:bg-[#DFA9E5] transition-colors flex items-center gap-2">
                {savingStatus === 'saving' ? 'Saving...' : 
                 savingStatus === 'success' ? 'Saved!' : 
                 'Continue to Dashboard'}
                {savingStatus === 'idle' && <ChevronRight size={18} />}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
                {error}
              </div>
            )}
            
            {errorMessage && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
                {errorMessage}
              </div>
            )}
            
            {savingStatus === 'error' && !errorMessage && (
              <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
                Failed to save your preferences. Please try again.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Show category selection view
  return (
    <div className="min-h-screen bg-white flex flex-col font-['Kode_Mono']">
      <Header 
        user={user}
        showSearch={false}
        handleLogout={handleLogout}
      />
      <div className="flex-1 p-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg border border-black p-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-500">
              Step {currentCategoryIndex + 1} of {interestCategories.length}
            </span>
            <span className="text-sm text-gray-500">
              {selectedInterests.length} interests selected
            </span>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">{currentCategory.name}</h1>
          <p className="text-gray-600 mb-6">{currentCategory.description}</p>
          
          <div className="flex flex-wrap gap-3 mb-8">
            {currentCategory.tags.map(tag => {
              const isSelected = selectedInterests.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleInterest(tag)}
                  className={`px-4 py-2 rounded-full flex items-center gap-2 transition-colors border ${
                    isSelected 
                      ? 'bg-[#EEBFF6] border-black' 
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {isSelected && <Check size={16} className="text-black" />}
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
          
          <div className="flex justify-between mt-8">
            <button 
              onClick={handlePrevious} 
              disabled={currentCategoryIndex === 0}
              className={`px-6 py-2 rounded-lg border ${
                currentCategoryIndex === 0
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-gray-200 text-black border-black hover:bg-gray-300 transition-colors'
              }`}>
              Previous
            </button>
            <button 
              onClick={handleNext} 
              className="px-6 py-2 bg-[#EEBFF6] text-black rounded-lg border border-black hover:bg-[#DFA9E5] transition-colors flex items-center gap-2">
              {currentCategoryIndex < interestCategories.length - 1 ? 'Next Category' : 'Review Selections'}
              <ChevronRight size={18} />
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterestsPage;
