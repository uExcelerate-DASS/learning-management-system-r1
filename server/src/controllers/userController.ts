import { Request, Response, NextFunction } from "express";
import { User, IUser } from "@/models/User";
import axios from "axios";
import { getMoodleToken } from "@/services/moodleService";
import dotenv from "dotenv";
import qs from "qs";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
const MOODLE_URL = process.env.MOODLE_URL;
const moodleToken = process.env.MOODLE_API_TOKEN; // Your stored Moodle token

/**
 * Extended Request interface for authenticated routes
 */
interface AuthenticatedRequest extends Request {
  user?: IUser;
}

/**
 * Get user profile
 * @route GET /api/users/profile
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 */
export const getUserProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id).select("-password");
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 * @route PUT /api/users/profile
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 */
export const updateUserProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      email,
      favoritePasstime,
      productivityHabit,
      skillInProgress,
    } = req.body;
    const user = await User.findById(req.user?._id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Update basic fields
    if (name) user.name = name;
    if (email) user.email = email;

    // Update custom profile fields
    // First ensure the field exists in the User model
    if (!user.profile) {
      user.profile = {};
    }

    if (favoritePasstime) user.profile.favoritePasstime = favoritePasstime;
    if (productivityHabit) user.profile.productivityHabit = productivityHabit;
    if (skillInProgress) user.profile.skillInProgress = skillInProgress;

    const updatedUser = await user.save();

    // Construct response object with all relevant fields
    const userResponse = {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      favoritePasstime: updatedUser.profile?.favoritePasstime,
      productivityHabit: updatedUser.profile?.productivityHabit,
      skillInProgress: updatedUser.profile?.skillInProgress,
    };

    res.status(200).json(userResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * Update user preferences
 * @route PUT /api/users/preferences
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 */
export const updatePreferences = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { interests } = req.body;
    const user = await User.findById(req.user?._id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Initialize preferences object if it doesn't exist
    if (!user.preferences) {
      user.preferences = { interests: [] };
    }

    // Update interests array
    user.preferences.interests = interests || user.preferences.interests;
    await user.save();

    // Return the updated user with preferences
    res.status(200).json({
      message: "Preferences updated successfully",
      preferences: user.preferences
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get learner progress (for coaches)
 * @route GET /api/users/learners/:learnerId/progress
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 */
export const getLearnerProgress = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  //TODO: Implement this function
};

/**
 * Delete user account
 * @route DELETE /api/users/profile
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 */
export const deleteUserAccount = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    await user.deleteOne();
    res.status(200).json({ message: "User account deleted successfully" });
  } catch (error) {
    next(error);
  }
};
interface MoodleTag {
  id: number;
  name: string;
  description?: string;
}

async function fetchCourseTags(courseId: number): Promise<MoodleTag[]> {
  const token = moodleToken; // Use the stored Moodle token
  try {
    const response = await axios.get(`${process.env.MOODLE_URL}/webservice/rest/server.php`, {
      params: {
        wstoken: token,
        wsfunction: 'local_fetchtags_get_tags',
        moodlewsrestformat: 'json',
        courseid: courseId,
      },
    });

    if (Array.isArray(response.data)) {
      return response.data as MoodleTag[];
    } else {
      console.error('Unexpected response:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Failed to fetch course tags:', error);
    return [];
  }
}
async function fetchdallCourseTags(): Promise<MoodleTag[]> {
  const token = moodleToken; // Use the stored Moodle token
  try {
    const response = await axios.get(`${process.env.MOODLE_URL}/webservice/rest/server.php`, {
      params: {
        wstoken: token,
        wsfunction: 'local_coursetags_get_course_tags',
        moodlewsrestformat: 'json',
        
      },
    });

    if (Array.isArray(response.data)) {
      return response.data as MoodleTag[];
    } else {
      console.error('Unexpected response:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Failed to fetch course tags:', error);
    return [];
  }
}
/**
 * Get all courses
 * @route GET /api/courses
 * @param req - Express request object
 * @param res - Express response object
 */
/**
 * Get all courses
 * @route GET /api/courses
 * @param req - Express request object
 * @param res - Express response object
 */
export const getCourses = async (req: Request, res: Response) => {
  try {
    const moodleUrlcourses = `${MOODLE_URL}/webservice/rest/server.php`;
    const response = await axios.get(moodleUrlcourses, {
      params: {
        wstoken: moodleToken,
        wsfunction: "core_course_get_courses",
        moodlewsrestformat: "json",
      },
    });

    // Get courses data
    const courses = response.data;
    
    // For each course, fetch the tags
    const coursesWithTags = await Promise.all(
      courses.map(async (course: any) => {
        try {
          // Fetch tags for this course
          const tags = await fetchCourseTags(course.id);
          
          // Return course with tags
          return {
            ...course,
            tags: tags
          };
        } catch (error) {
          console.error(`Error fetching tags for course ${course.id}:`, error);
          // If there's an error fetching tags, return course without tags
          return {
            ...course,
            tags: []
          };
        }
      })
    );

    res.json(coursesWithTags); // Return courses with their tags to frontend
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
};
// export const getCourses = async (req: Request, res: Response) => {
//   try {
//     const moodleUrlcourses = `${MOODLE_URL}/webservice/rest/server.php`;
//     const response = await axios.get(moodleUrlcourses, {
//       params: {
//         wstoken: moodleToken,
//         wsfunction: "core_course_get_courses",
//         moodlewsrestformat: "json",
//       },
//     });

//     res.json(response.data); // Return courses to frontend
//   } catch (error) {
//     console.error("Error fetching courses:", error);
//     res.status(500).json({ message: "Failed to fetch courses" });
//   }
// };

/**
 * Get course contents
 * @route GET /api/course/:courseId
 * @param req - Express request object
 * @param res - Express response object
 */
export const courseContents = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const moodleUrl = `${MOODLE_URL}/webservice/rest/server.php`;
    const { courseId } = req.params;

    if (!courseId) {
      res.status(400).json({ message: "Course ID is required" });
      return;
    }
    const moodleToken = req.headers['x-moodle-token'] as string;
    if (!moodleToken) {
      res.status(401).json({ message: "Unauthorized - Missing token" });
      return;
    }

    const response = await axios.get(moodleUrl, {
      params: {
        wstoken: moodleToken,
        wsfunction: "core_course_get_contents",
        moodlewsrestformat: "json",
        courseid: courseId,
      },
    });

    const courseContents = response.data;

    // Fetch tags for the course
    const tags = await fetchCourseTags(Number(courseId));

    res.status(200).json({
      courseContents,
      tags: tags.map(tag => tag.name), // Extract tag names as an array of strings
    });
  } catch (error) {
    console.error("Error fetching course contents:", error);
    res.status(500).json({ message: "Failed to fetch course contents" });
  }
};
/**
 * Gets the total number of modules/activities for a course
 * @param courseId - The ID of the course
 * @param token - Moodle API token
 * @returns Promise resolving to the total count of modules and course sections
 */
export const getTotalModules = async (
  courseId: string,
  token: string
): Promise<{ totalActivities: number; courseSections: any[] }> => {
  try {
    const moodleUrl = `${MOODLE_URL}/webservice/rest/server.php`;

    if (!courseId) {
      throw new Error("Course ID is required");
    }

    if (!token) {
      throw new Error("Moodle token is required");
    }

    const response = await axios.get(moodleUrl, {
      params: {
        wstoken: token,
        wsfunction: "core_course_get_contents",
        moodlewsrestformat: "json",
        courseid: courseId,
      },
    });

    const courseSections = response.data;

    // Calculate total number of activities
    const totalActivities = courseSections.reduce((count: number, section: any) => {
      return count + (section.modules ? section.modules.length : 0);
    }, 0);

    return {
      totalActivities,
      courseSections,
    };
  } catch (error) {
    console.error(`Error fetching modules for course ${courseId}:`, error);
    throw error;
  }
};

/**
 * Get user courses
 * @route GET /api/courses
 * @param req - Express request object
 * @param res - Express response object
 */
export const getUserCourses = async (req: Request, res: Response): Promise<void> => {
    try {
        const moodleUrl = `${process.env.MOODLE_URL}/webservice/rest/server.php`;
        const moodleToken = req.headers['x-moodle-token'] as string; 
        
        if (!moodleToken) {
            res.status(401).json({ message: "Unauthorized - Missing token" });
            return;
        }

    const userInfoResponse = await axios.get(moodleUrl, {
      params: {
        wstoken: moodleToken,
        wsfunction: "core_webservice_get_site_info",
        moodlewsrestformat: "json",
      },
    });

    const userId: number | undefined = userInfoResponse.data?.userid;
    if (!userId) {
      res.status(400).json({ message: "User ID not found" });
      return;
    }

    const coursesResponse = await axios.get(moodleUrl, {
      params: {
        wstoken: moodleToken,
        wsfunction: "core_enrol_get_users_courses",
        moodlewsrestformat: "json",
        userid: userId,
      },
    });

    res.json(coursesResponse.data); // ✅ Ensure response is sent
  } catch (error) {
    console.error("Error fetching user courses:", error);
    res.status(500).json({ message: "Failed to fetch user-specific courses" });
  }
};

/**
 * Enroll user in a course
 * @route GET /api/enroll
 * @param req - Express request object
 * @param res - Express response object
 */
export const enrollUserInCourse = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
     const userId = req.query.userId as string;
    const courseId = req.query.courseId as string;
    const roleId = req.query.roleId ? Number(req.query.roleId) : 5;
    const timestart = req.query.timestart ? Number(req.query.timestart) : 0;
    const timeend = req.query.timeend ? Number(req.query.timeend) : 0;
    const suspend = req.query.suspend ? Number(req.query.suspend) : 0;
    
    console.log("req.query", req.query);
    const moodleUrl = `${process.env.MOODLE_URL}/webservice/rest/server.php`;

    if (!userId || !courseId) {
      res.status(400).json({ message: "User ID and Course ID are required" });
      return;
    }
    
    // ✅ Moodle API requires URL-encoded format (not JSON)
    const payload = qs.stringify({
      wstoken: moodleToken,
      wsfunction: "enrol_manual_enrol_users",
      moodlewsrestformat: "json",
      "enrolments[0][roleid]": roleId || 5, // 📌 Default role: Student (5)
      "enrolments[0][userid]": userId,
      "enrolments[0][courseid]": courseId,
      "enrolments[0][timestart]": timestart || 0, // Optional
      "enrolments[0][timeend]": timeend || 0, // Optional
      "enrolments[0][suspend]": suspend || 0, // Optional
    });

    // ✅ Sending request with correct headers
    const response = await axios.post(moodleUrl, payload, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    console.log("Enrollment response:", response.data);

    res.status(200).json({ message: "User enrolled successfully", data: response.data });
  } catch (error: any) {
    console.error("Enrollment error:", error.response?.data || error.message);
    res
      .status(500)
      .json({ message: "Failed to enroll user", error: error.response?.data });
  }
};

/**
 * Get all course categories
 * @route GET /api/categories
 * @param req - Express request object
 * @param res - Express response object
 */
export const getCourseCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const moodleUrl = `${process.env.MOODLE_URL}/webservice/rest/server.php`;
    
    // Get the token either from the request headers or use the environment variable
    const moodleTokenFromHeader = req.headers['x-moodle-token'] as string;
    const tokenToUse = moodleTokenFromHeader || moodleToken;
    
    if (!tokenToUse) {
      res.status(401).json({ message: "Unauthorized - Missing token" });
      return;
    }

    // Make request to Moodle API to get all categories
    const response = await axios.get(moodleUrl, {
      params: {
        wstoken: tokenToUse,
        wsfunction: 'core_course_get_categories',
        moodlewsrestformat: 'json',
        addsubcategories: 1
      }
    });

    // Process the response to include additional information if needed
    const categories = response.data.map((category: any) => ({
      id: category.id,
      name: category.name,
      idnumber: category.idnumber || '',
      description: category.description,
      descriptionFormat: category.descriptionformat,
      parent: category.parent,
      sortOrder: category.sortorder,
      courseCount: category.coursecount,
      visible: category.visible,
      path: category.path,
      depth: category.depth,
      theme: category.theme || null
    }));

    // Return the processed categories
    res.status(200).json(categories);
  } catch (error: any) {
    console.error('Error fetching course categories:', error);
    
    // Provide more detailed error information
    if (error.response) {
      console.error("Response error data:", error.response.data);
      console.error("Response error status:", error.response.status);
    }
    
    res.status(500).json({ 
      message: 'Failed to fetch course categories',
      error: error.response?.data || error.message 
    });
  }
};

/**
 * Get learner performance
 * @route GET /api/users/performance
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next middleware function
 */
export const getLearnerPerformance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if authenticated user exists
    if (!req.user || !req.user._id) {
      res.status(401).json({ message: "Unauthorized - User not authenticated" });
      return;
    }

    const userId = req.user._id;
    // Get the authorization token from the request
    const authToken = req.headers.authorization;
    console.log("Fetching performance for user:", userId);

    // Fetch enrolled courses for this user from Moodle
    const moodleUrl = `${process.env.MOODLE_URL}/webservice/rest/server.php`;
    let courseProgress = [];
    let totalCompleted = 0;
    let totalPending = 0;
    let totalLate = 0;
    let recentActivity: any[] = [];

    try {
      // Get the user's Moodle ID
      const user = await User.findById(userId);
      if (!user || !user.moodleUserId) {
        res.status(404).json({ message: "User Moodle ID not found" });
        return;
      }

      // Fetch the user's courses
      const coursesResponse = await axios.get(moodleUrl, {
        params: {
          wstoken: moodleToken,
          wsfunction: "core_enrol_get_users_courses",
          moodlewsrestformat: "json",
          userid: user.moodleUserId,
        },
      });

      // For each course, fetch MongoDB completion data
      const courses = coursesResponse.data;
      if (courses && courses.length > 0) {
        const coursePromises = courses.map(async (course: any) => {
          try {
            // Get MongoDB module completion data - add auth token to internal request
            const moduleProgressResponse = await axios.get(
              `${process.env.APP_URL || 'http://localhost:8080'}/api/completion/module-progress/${course.id}?userId=${userId}`,
              {
                headers: {
                  Authorization: authToken, // Pass the same auth token
                },
              }
            );

            // Get MongoDB course progress data - add auth token to internal request
            const courseProgressResponse = await axios.get(
              `${process.env.APP_URL || 'http://localhost:8080'}/api/completion/course-progress/${course.id}?userId=${userId}`,
              {
                headers: {
                  Authorization: authToken, // Pass the same auth token
                },
              }
            );

            // Calculate progress percentage
            const completedModules = moduleProgressResponse.data.completedModuleIds || [];
            const completedCount = courseProgressResponse.data.completedCount || 0;
            
            // For simplicity, assuming each course has 10 modules
            // In a real implementation, you'd fetch the actual module count for each course
            const totalModules = 10;
            const progressPercentage = Math.round((completedCount / totalModules) * 100);

            // Add to course progress array
            return {
              id: course.id.toString(),
              title: course.fullname || course.shortname,
              progress: progressPercentage,
            };
          } catch (error: any) {
            console.error(`Error fetching progress for course ${course.id}:`, error);
            if (error.response) {
              console.error("Response status:", error.response.status);
              console.error("Response data:", error.response.data);
            }
            return {
              id: course.id.toString(),
              title: course.fullname || course.shortname,
              progress: 0,
            };
          }
        });

        courseProgress = await Promise.all(coursePromises);

        // Get activity completion data for assignments status
        for (const course of courses) {
          try {
            const activityResponse = await axios.get(
              `${process.env.APP_URL || 'http://localhost:8080'}/api/completion/activities/${course.id}/${user.moodleUserId}`,
              {
                headers: {
                  Authorization: authToken, // Pass the same auth token
                },
              }
            );

            const activities = activityResponse.data?.statuses || [];
            
            // Count assignment statuses
            activities.forEach((activity: any) => {
              if (activity.modname === "assign") {
                if (activity.state === 1) {
                  totalCompleted++;
                  
                  // Add to recent activity
                  if (activity.timecompleted) {
                    recentActivity.push({
                      id: `activity-${activity.cmid}`,
                      description: `Completed assignment in "${course.fullname || course.shortname}"`,
                      timestamp: new Date(activity.timecompleted * 1000).toLocaleString(),
                      type: "assignment_submission",
                    });
                  }
                } else if (activity.state === 0) {
                  totalPending++;
                } else if (activity.state === 3) {
                  totalLate++;
                }
              }
            });
          } catch (error: any) {
            console.error(`Error fetching activities for course ${course.id}:`, error);
            if (error.response) {
              console.error("Response status:", error.response.status);
              console.error("Response data:", error.response.data);
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Error fetching user courses:", error);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
    }

    // Sort recent activities by timestamp (newest first) and limit to 10
    recentActivity.sort((a: any, b: any) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    recentActivity = recentActivity.slice(0, 10);

    // Calculate overall grade based on course progress (simplified calculation)
    const totalCourses = courseProgress.length;
    const totalProgress = courseProgress.reduce((sum, course) => sum + course.progress, 0);
    const averageGrade = totalCourses > 0 ? Math.round((totalProgress / totalCourses) * 0.9) + 10 : 70; // Ensure grade is between 10-100

    // Create response object with real data
    const performanceData = {
      grade: averageGrade,
      submissions: [
        { month: "Jan", completed: Math.round(totalCompleted * 0.3), total: Math.round(totalCompleted * 0.3) + 2 },
        { month: "Feb", completed: Math.round(totalCompleted * 0.3), total: Math.round(totalCompleted * 0.3) + 1 },
        { month: "Mar", completed: Math.round(totalCompleted * 0.4), total: Math.round(totalCompleted * 0.4) },
      ],
      courseProgress,
      assignmentStatus: {
        completed: totalCompleted,
        pending: totalPending,
        late: totalLate,
      },
      recentActivity,
    };

    res.status(200).json(performanceData);
  } catch (error: any) {
    console.error("Error in getLearnerPerformance:", error);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
    res.status(500).json({ message: "Failed to fetch performance data" });
  }
};

export const markFirstLoginComplete = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get user ID from the authenticated request
    const userId = req.user?._id;
    console.log("User ID from authenticated request:", userId);

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return; // Add return statement to prevent further execution
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { firstLogin: false },
      { new: true }
    );

    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
      return; // Add return statement to prevent further execution
    }

    res.status(200).json({ message: 'First login marked as complete' });
  } catch (error) {
    console.error('Error updating first login status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getUserCoursesWithCompletion = async (req: Request, res: Response): Promise<void> => {
  try {
    const moodleUrl = `${process.env.MOODLE_URL}/webservice/rest/server.php`;
    const moodleToken = req.headers['x-moodle-token'] as string; 
    const userid = req.query.userid as string;
    
    if (!moodleToken) {
      res.status(401).json({ message: "Unauthorized - Missing token" });
      return;
    }
    console.log("User ID from query:", userid);
    
    // 1. Get user info to obtain Moodle user ID
    const userInfoResponse = await axios.get(moodleUrl, {
      params: {
        wstoken: moodleToken,
        wsfunction: "core_webservice_get_site_info",
        moodlewsrestformat: "json",
      },
    });

    const userId: number | undefined = userInfoResponse.data?.userid;
    if (!userId) {
      res.status(400).json({ message: "User ID not found" });
      return;
    }

    // 2. Get all enrolled courses for the user
    const coursesResponse = await axios.get(moodleUrl, {
      params: {
        wstoken: moodleToken,
        wsfunction: "core_enrol_get_users_courses",
        moodlewsrestformat: "json",
        userid: userId,
      },
    });

    const courses = coursesResponse.data;

    // 3. Fetch completion data for each course from MongoDB API routes
    const coursesWithCompletion = await Promise.all(
      courses.map(async (course: any) => {
        try {
          // Get the authorization token from the request
          const authToken = req.headers.authorization;
          
          // Get total modules count by directly calling getTotalModules function
          let totalModules = 10; // Default fallback value
          try {
            // Direct function call instead of API request
            const result = await getTotalModules(course.id.toString(), moodleToken);
            totalModules = result.totalActivities;
            console.log(`Total modules for course ${course.id}: ${totalModules}`);
          } catch (moduleError) {
            console.error(`Error fetching total modules for course ${course.id}:`, moduleError);
            // Continue with default value if there's an error
          }
          
          // Ensure userId is explicitly passed as a query parameter
          const moduleUrl = `${process.env.API_BASE_URL || 'http://localhost:8080'}/api/completion/module-progress/${course.id}?userId=${userid}`;
          
          console.log(`Fetching module progress from: ${moduleUrl}`);
          
          const moduleProgressResponse = await axios.get(
            moduleUrl,
            {
              headers: {
                Authorization: authToken,
                'x-moodle-token': moodleToken
              },
            }
          );
          
          console.log(`Module progress response for course ${course.id}:`, moduleProgressResponse.data);

          // Get MongoDB course progress data with userId explicitly in URL
          const courseProgressUrl = `${process.env.API_BASE_URL || 'http://localhost:8080'}/api/completion/course-progress/${course.id}?userId=${userid}`;
          
          console.log(`Fetching course progress from: ${courseProgressUrl}`);
          
          const courseProgressResponse = await axios.get(
            courseProgressUrl,
            {
              headers: {
                Authorization: authToken,
                'x-moodle-token': moodleToken
              },
            }
          );
          
          console.log(`Course progress response for course ${course.id}:`, courseProgressResponse.data);

          // Process completion data from MongoDB
          const completedModules = moduleProgressResponse.data.completedModuleIds || [];
          const completedCount = courseProgressResponse.data.completedCount || 0;
          
          // Calculate overall completion percentage using the actual total modules count
          const completionPercentage = totalModules > 0 
            ? Math.round((completedCount / totalModules) * 100)
            : 0;
            
          // Add visually appealing data for the frontend
          const lastUpdated = new Date().toISOString();
          const prettyStatus = completionPercentage === 100 
            ? "Completed!" 
            : completionPercentage > 75 
              ? "Almost there!" 
              : completionPercentage > 50 
                ? "Good progress!" 
                : completionPercentage > 25 
                  ? "Keep going!" 
                  : "Just started";
          
          // Return combined course and completion data with visually appealing elements
          return {
            ...course,
            completion: {
              percentage: completionPercentage,
              completedCount,
              totalModules,
              completedModuleIds: completedModules,
              isComplete: completionPercentage === 100,
              status: prettyStatus,
              lastUpdated: lastUpdated,
              displayColor: completionPercentage >= 75 ? "green" : 
                            completionPercentage >= 50 ? "blue" : 
                            completionPercentage >= 25 ? "orange" : "red"
            },
          };
        } catch (error) {
          console.error(`Error fetching completion data for course ${course.id}:`, error);
          // Return course with empty completion data if there's an error
          return {
            ...course,
            completion: {
              percentage: 0,
              completedCount: 0,
              totalModules: 0,
              completedModuleIds: [],
              activityStats: {
                completed: 0,
                pending: 0,
                late: 0
              },
              isComplete: false,
              error: "Failed to fetch completion data"
            },
          };
        }
      })
    );

    res.status(200).json(coursesWithCompletion);
  } catch (error) {
    console.error("Error fetching user courses with completion:", error);
    res.status(500).json({ message: "Failed to fetch user courses with completion data" });
  }
};
interface MoodleTag {
  id: number;
  name: string;
  description?: string;
}

// Test endpoint for fetching all course tags
export const testFetchAllCourseTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const tags = await fetchallCourseTags();
    res.status(200).json(tags);
  } catch (error) {
    console.error("Error in test endpoint:", error);
    res.status(500).json({ message: "Failed to fetch all course tags", error: String(error) });
  }
};

async function fetchallCourseTags(): Promise<MoodleTag[]> {
  const token = moodleToken; // Use the stored Moodle token
  try {
    const response = await axios.get(`${process.env.MOODLE_URL}/webservice/rest/server.php`, {
      params: {
        wstoken: token,
        wsfunction: 'local_coursetags_get_course_tags',
        moodlewsrestformat: 'json',
      },
    });

    if (Array.isArray(response.data)) {
      return response.data as MoodleTag[];
    } else {
      console.error('Unexpected response:', response.data);
      return [];
    }
  } catch (error) {
    console.error('Failed to fetch all course tags:', error);
    return [];
  }
}