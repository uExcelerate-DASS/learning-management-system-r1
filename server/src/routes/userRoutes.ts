import express from 'express';
import { protect } from '@/middlewares/authMiddleware';
import {
    getUserProfile,
    updateUserProfile,
    updatePreferences,
    getLearnerProgress,
    deleteUserAccount,
    courseContents,
    getCourses,
    getUserCourses,
    enrollUserInCourse,
    getLearnerPerformance,
    getCourseCategories,
    markFirstLoginComplete,
    getUserCoursesWithCompletion,
    testFetchAllCourseTags
} from '@/controllers/userController';
import { getCoachCourses, getCourseStudents, getAllStudentsFromCoachCourses, getAllStudentsWithCourses } from '@/controllers/coachController';
const router = express.Router();

/**
 * @route GET /profile
 * @desc Get user profile
 * @access Private
 */
router.get('/profile', protect, getUserProfile);

/**
 * @route PUT /profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile', protect, updateUserProfile);

/**
 * @route PUT /preferences
 * @desc Update user preferences
 * @access Public
 */
router.put('/preferences', protect, updatePreferences); //tbd for r2

/**
 * @route GET /learners/:learnerId/progress
 * @desc Get learner progress
 * @access Private
 */
router.get('/learners/:learnerId/progress', protect, getLearnerProgress);//tbd

/**
 * @route DELETE /profile
 * @desc Delete user account
 * @access Private
 */
router.delete('/profile', protect, deleteUserAccount); //tbd

/**
 * @route GET /course/:courseId
 * @desc Get course contents
 * @access Public
 */
router.get("/course/:courseId", courseContents); //tbd

/**
 * @route GET /allcourses
 * @desc Get all courses
 * @access Public
 */
router.get('/allcourses', getCourses);

/**
 * @route GET /courses
 * @desc Get user courses
 * @access Public
 */
router.get('/courses', getUserCourses);
router.get('/coursesprogress', getUserCoursesWithCompletion);

/**
 * @route GET /enroll
 * @desc Enroll user in a course
 * @access Public
 */
router.get('/enroll', enrollUserInCourse);

/**
 * @route GET /performance
 * @desc Get learner performance
 * @access Private
 */
router.get('/performance', protect, getLearnerPerformance);

/**
 * @route GET /coach/courses/:userId
 * @desc Get courses coached by a user
 * @access Public
 */
router.get("/coach/courses/:userId", getCoachCourses);

/**
 * @route GET /coach/students/:courseId
 * @desc Get students enrolled in a course
 * @access Public
 */
router.get("/coach/students/:courseId", getCourseStudents);

// router.get('/coach/students', getAllStudentsFromCoachCourses); //tbd
router.get('/coach/students', getAllStudentsWithCourses); //tbd

/**
 * @route GET /categories
 * @desc Get all course categories
 * @access Public
 */
router.get('/categories', getCourseCategories);

/**
 * @route PUT /first-login-complete
 * @desc Mark first login complete
 * @access Private
 */
router.put('/first-login-complete', protect, markFirstLoginComplete);
router.get("/fetch-all-tags", testFetchAllCourseTags);


export default router;