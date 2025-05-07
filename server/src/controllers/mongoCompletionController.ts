import { Request, Response } from 'express';
import ModuleCompletion from '../models/ModuleCompletion';
import axios from 'axios';

/**
 * Get all completed modules for a user in a specific course
 * @route GET /api/completion/module-progress/:courseId
 * @param req - Express request object
 * @param res - Express response object
 */
export const getCompletedModules = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { userId } = req.query; // Get userId from query params

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const completions = await ModuleCompletion.find({ 
      userId: String(userId), 
      courseId: Number(courseId)
    });

    // Extract just the moduleIds for the frontend
    const completedModuleIds = completions.map(completion => completion.moduleId);
    console.log('completedModuleIds:', completedModuleIds);
    res.status(200).json({ completedModuleIds });
  } catch (error) {
    console.error('Error fetching completed modules:', error);
    res.status(500).json({ message: 'Failed to fetch completed modules' });
  }
};

/**
 * Mark a module as complete
 * @route POST /api/completion/complete-module
 * @param req - Express request object
 * @param res - Express response object
 */
export const markModuleComplete = async (req: Request, res: Response) => {
  try {
    const { courseId, moduleId, userId } = req.body;
    
    if (!userId || !courseId || !moduleId) {
      return res.status(400).json({ message: 'User ID, Course ID and Module ID are required' });
    }

    // Create or update the completion record
    await ModuleCompletion.findOneAndUpdate(
      { 
        userId: String(userId), 
        courseId: Number(courseId), 
        moduleId: Number(moduleId) 
      },
      { completedAt: new Date() },
      { upsert: true, new: true }
    );

    // Get the updated list of completed modules for this course
    const completions = await ModuleCompletion.find({
      userId: String(userId), 
      courseId: Number(courseId)
    });
    console.log('completions:', completions);
    const completedModuleIds = completions.map(completion => completion.moduleId);
    
    res.status(200).json({ 
      message: 'Module marked as complete', 
      completedModuleIds 
    });
  } catch (error) {
    console.error('Error marking module as complete:', error);
    res.status(500).json({ message: 'Failed to mark module as complete' });
  }
};

/**
 * Get course progress (percentage of completed modules)
 * @route GET /api/completion/course-progress/:courseId
 * @param req - Express request object
 * @param res - Express response object
 */
export const getCourseProgress = async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Count completed modules for this course
    const completedCount = await ModuleCompletion.countDocuments({
      userId: String(userId),
      courseId: Number(courseId)
    });

    // For simplicity, just return the count of completed modules
    // The frontend can calculate the percentage
    res.status(200).json({ 
      completedCount,
      userId: userId
    });
  } catch (error) {
    console.error('Error getting course progress:', error);
    res.status(500).json({ message: 'Failed to get course progress' });
  }
};