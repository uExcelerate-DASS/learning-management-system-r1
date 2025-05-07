import { Request, Response, NextFunction } from "express";
import { User, IUser } from "@/models/User";
import axios from "axios";
import dotenv from "dotenv";
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
 * Get activity completion status
 * @param userId - User ID
 * @param courseId - Course ID
 * @returns Activity completion status
 */
export const getActivityCompletionStatus = async (userId: number, courseId: number) => {
    try {
        const moodleUrl = `${process.env.MOODLE_URL}/webservice/rest/server.php`;
        const moodletokenfun = process.env.MOODLE_API_TOKEN;
        const response = await axios.get(moodleUrl, {
            params: {
                wstoken: moodletokenfun,
                wsfunction: "core_completion_get_activities_completion_status",
                moodlewsrestformat: "json",
                userid: userId,
                courseid: courseId,
            },
        });
  
        return response.data;
    } catch (error) {
        console.error("Error fetching activity completion status:", error);
        throw error;
    }
  };
  //state: 0 → Incomplete
  // state: 1 → Completed
  // state: 2 → Passed
  // state: 3 → Failed
  
  /**
   * Get course completion status
   * @param userId - User ID
   * @param courseId - Course ID
   * @returns Course completion status
   */
  export const getCourseCompletionStatus = async (userId: number, courseId: number) => {
    try {
        const moodleUrl = `${process.env.MOODLE_URL}/webservice/rest/server.php`;
        const moodletokenfun = process.env.MOODLE_API_TOKEN;
  
        const response = await axios.get(moodleUrl, {
            params: {
                wstoken: moodletokenfun,
                wsfunction: "core_completion_get_course_completion_status",
                moodlewsrestformat: "json",
                courseid: String(courseId), // ✅ Ensure it's a valid string
                userid: String(userId), // ✅ Ensure it's a valid string    
            },
        });
  
        return response.data;
    } catch (error) {
        console.error("Error fetching course completion status:", error);
        throw error;
    }
  };
  
  //"completed": 1 → Course completed
  //"completed": 0 → Course not completed
  
  /**
   * Get user progress
   * @route GET /api/progress/:userId/:courseId
   * @param req - Express request object
   * @param res - Express response object
   */
  export const getUserProgress = async (req: Request, res: Response) => {
      try {
          const { userId, courseId } = req.params;
  
          if (!userId || !courseId) {
              return res.status(400).json({ message: "User ID and Course ID are required" });
          }
  
          const courseStatus = await getCourseCompletionStatus(Number(userId), Number(courseId));
          const activityStatus = await getActivityCompletionStatus(Number(userId), Number(courseId));
  
          res.json({
              courseCompletion: courseStatus,
              activityCompletion: activityStatus,
          });
      } catch (error) {
          res.status(500).json({ message: "Failed to fetch progress data" });
      }
  };
  // Store completion data in a database
  // ✅ Display a progress bar in the frontend
  // ✅ Send notifications for completed courses
  
  /**
   * Mark course as self-completed
   * @param courseId - Course ID
   * @param moodletokenfun - Moodle token
   * @returns API Response
   */
  export const markCourseSelfCompleted = async (courseId: number,moodletokenfun:string): Promise<any> => {
    const moodleUrl = `${process.env.MOODLE_URL}/webservice/rest/server.php`;
    try {
      const response = await axios.post(moodleUrl, null, {
        params: {
          wstoken: moodletokenfun,
          wsfunction: "core_completion_mark_course_self_completed",
          moodlewsrestformat: "json",
          courseid: courseId,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error marking course as self-completed:", error);
      throw new Error("Failed to mark course as self-completed");
    }
  };
  
  /**
   * Manually update an activity's completion status.
   * @param cmid - Course Module ID
   * @param completed - Completion status (true/false)
   * @param moodletokenfun - Moodle token
   * @returns API Response with status and warnings
   */
  export const updateActivityCompletionStatus = async (
    cmid: number,
    completed: boolean,
    moodletokenfun:string
  ): Promise<any> => {
    const moodleUrl = `${process.env.MOODLE_URL}/webservice/rest/server.php`;
  
    try {
      const response = await axios.post(moodleUrl, null, {
        params: {
          wstoken: moodletokenfun,
          wsfunction: "core_completion_update_activity_completion_status_manually",
          moodlewsrestformat: "json",
          cmid,
          completed: completed ? 1 : 0,
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error updating activity completion status:", error);
      throw new Error("Failed to update activity completion status");
    }
  };
  
  