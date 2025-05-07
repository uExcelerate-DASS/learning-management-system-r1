import express, { Request, Response } from "express";
import {
  getActivityCompletionStatus,
  getCourseCompletionStatus,
  updateActivityCompletionStatus,
  markCourseSelfCompleted,
} from '@/controllers/completionControllerMoodle';
import { getCompletedModules, markModuleComplete, getCourseProgress } from '../controllers/mongoCompletionController';

const router = express.Router();

/**
 * @route GET /api/completion/module-progress/:courseId
 * @desc Get completed modules for a course
 * @access Public
 */
router.get('/module-progress/:courseId', async (req: Request, res: Response) => {
  await getCompletedModules(req, res);
});

/**
 * @route POST /api/completion/complete-module
 * @desc Mark a module as complete
 * @access Public
 */
router.post('/complete-module', async (req: Request, res: Response) => {
  await markModuleComplete(req, res);
});

/**
 * @route GET /api/completion/course-progress/:courseId
 * @desc Get course progress
 * @access Public
 */
router.get('/course-progress/:courseId', async (req: Request, res: Response) => {
  await getCourseProgress(req, res);
});

/**
 * @route GET /api/completion/activities/:courseId/:userId
 * @desc Get all activity completion statuses in a course
 * @access Public
 */
router.get("/activities/:courseId/:userId", async (req: Request, res: Response) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const userId = parseInt(req.params.userId);
    const data = await getActivityCompletionStatus(courseId, userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @route GET /api/completion/course/:courseId/:userId
 * @desc Get course completion status
 * @access Public
 */
router.get("/course/:courseId/:userId", async (req: Request, res: Response) => {
  try {
    const courseId = parseInt(req.params.courseId);
    const userId = parseInt(req.params.userId);
    const data = await getCourseCompletionStatus(courseId, userId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * @route POST /api/completion/course/self-complete
 * @desc Mark a course as self-completed
 * @access Public
 */
router.post("/course/self-complete", (req: Request, res: Response) => {
  (async () => {
    try {
      const { courseId }: { courseId: number } = req.body;
      const moodleToken = req.headers.authorization?.split(" ")[1]; // Extract Bearer Token

      if (!courseId) {
        return res.status(400).json({ error: "Course ID is required" });
      }

      if (!moodleToken) {
        return res.status(401).json({ error: "Authorization token is required" });
      }
      const data = await markCourseSelfCompleted(Number(courseId), moodleToken);
      return res.json(data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({ error: error.message });
      }
      return res.status(500).json({ error: "An unknown error occurred" });
    }
  })();
});

/**
 * @route POST /api/completion/activity/update
 * @desc Update an activity's completion status manually
 * @access Public
 */
router.post("/activity/update", (req: Request, res: Response) => {
  (async () => {
    try {
      const { cmid, completed }: { cmid: number; completed: boolean } = req.body;
      const moodleToken = req.headers.authorization?.split(" ")[1]; // Extract Bearer Token
      if (!moodleToken) {
        return res.status(401).json({ error: "Authorization token is required" });
      }

      if (!cmid || completed === undefined) {
        return res.status(400).json({
          error: "Course Module ID and completion status are required",
        });
      }

      const data = await updateActivityCompletionStatus(Number(cmid), completed, moodleToken);
      return res.json(data);
    } catch (error: unknown) {
      if (error instanceof Error) {
        return res.status(500).json({ error: error.message });
      }
      return res.status(500).json({ error: "An unknown error occurred" });
    }
  })();
});

export default router;