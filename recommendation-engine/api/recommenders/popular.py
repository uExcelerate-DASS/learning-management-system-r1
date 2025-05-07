"""
Popular Recommender implementation based on course and activity popularity.
"""
from typing import List, Dict, Any, Optional
import logging
from collections import Counter
import time

from .base_recommender import BaseRecommender
from ..services.moodle_client import MoodleClient

logger = logging.getLogger(__name__)

# Configuration parameters for popularity scoring
POPULARITY_CONFIG = {
    # Course scoring parameters
    'ENROLLMENT_WEIGHT': 0.8,     # Weight for enrollment count in the total score
    'RECENCY_WEIGHT': 0.2,        # Weight for course recency in the total score
    'MAX_ENROLLMENT_SCORE': 5.0,  # Cap for enrollment score
    'RECENCY_PERIOD_DAYS': 30,    # How recent a course should be to get recency boost
    'DEFAULT_SCORE': 2.0,         # Default score for courses that couldn't be analyzed
    
    # Activity scoring parameters
    'COMPLETION_WEIGHT': 2.0,     # Weight given to activity completions
    'VIEW_WEIGHT': 1.0,           # Weight given to activity views
    'MAX_ACTIVITY_SCORE': 5.0,    # Maximum score for activities
    
    # Debug settings
    'VERBOSE': True,              # Enable verbose logging for debugging
}

class PopularRecommender(BaseRecommender):
    """
    Recommender that suggests courses and activities based on overall popularity.
    
    This recommender does not personalize recommendations but provides items that 
    are generally popular among all users.
    """
    
    def __init__(self, moodle_client: MoodleClient):
        """
        Initialize the popular recommender.
        
        Args:
            moodle_client: An initialized MoodleClient to interact with Moodle data
        """
        super().__init__(moodle_client)
        logger.info("PopularRecommender initialized")
    
    def _calculate_course_popularity_scores(self, all_courses: List[Dict]) -> Dict[int, float]:
        """
        Calculate popularity scores for all courses.
        
        Args:
            all_courses: List of all courses in the system
        
        Returns:
            Dict mapping course IDs to popularity scores
        """
        logger.info("Calculating course popularity scores")
        start_time = time.time()
        popularity_scores = {}
        current_time = time.time()
        
        try:
            # Initialize popularity scores with default values
            popularity_scores = {
                course['id']: POPULARITY_CONFIG['DEFAULT_SCORE'] 
                for course in all_courses if 'id' in course
            }
            
            # Create a map of course IDs to course objects for quick lookup
            course_map = {course['id']: course for course in all_courses if 'id' in course}
            
            # Calculate recency scores
            for course_id, course in course_map.items():
                if 'timecreated' in course:
                    # Apply recency boost if course is new
                    days_seconds = POPULARITY_CONFIG['RECENCY_PERIOD_DAYS'] * 24 * 60 * 60
                    time_diff = current_time - course.get('timecreated', 0)
                    if time_diff < days_seconds:
                        recency_factor = 1.0 * (1 - time_diff/days_seconds)
                        recency_score = recency_factor
                        
                        # Update popularity score with recency component
                        popularity_scores[course_id] = (
                            popularity_scores[course_id] * (1 - POPULARITY_CONFIG['RECENCY_WEIGHT']) + 
                            recency_score * POPULARITY_CONFIG['RECENCY_WEIGHT']
                        )
                        
                        if POPULARITY_CONFIG['VERBOSE']:
                            logger.debug(f"Applied recency boost to course {course_id}: {recency_score:.2f}")
            
            # Skip the default site course
            if 1 in popularity_scores:
                del popularity_scores[1]
            
            # Calculate enrollment scores
            logger.info("Calculating enrollment scores")
            
            # To keep this efficient without caching, we'll process in batches
            course_ids = list(course_map.keys())
            if 1 in course_ids:  # Exclude site course
                course_ids.remove(1)
            
            batch_size = 10
            enrollment_counts = {}
            
            for i in range(0, len(course_ids), batch_size):
                batch = course_ids[i:i+batch_size]
                logger.info(f"Processing enrollment batch {i//batch_size + 1}, courses {batch}")
                
                for course_id in batch:
                    try:
                        enrolled_users = self.moodle_client.get_course_enrolled_users(course_id)
                        enrollment_count = len(enrolled_users)
                        enrollment_counts[course_id] = enrollment_count
                        
                        if POPULARITY_CONFIG['VERBOSE']:
                            logger.debug(f"Course {course_id} has {enrollment_count} enrollments")
                    except Exception as e:
                        logger.warning(f"Error getting enrollments for course {course_id}: {e}")
                        enrollment_counts[course_id] = 0
            
            # Apply enrollment scores
            for course_id, count in enrollment_counts.items():
                if course_id in popularity_scores:
                    # Calculate enrollment score (normalized to 0-5 range)
                    enrollment_score = min(
                        count / 10.0, 
                        POPULARITY_CONFIG['MAX_ENROLLMENT_SCORE']
                    )
                    
                    # Calculate combined score
                    original_score = popularity_scores[course_id]
                    popularity_scores[course_id] = (
                        enrollment_score * POPULARITY_CONFIG['ENROLLMENT_WEIGHT'] +
                        original_score * POPULARITY_CONFIG['RECENCY_WEIGHT']
                    )
                    
                    if POPULARITY_CONFIG['VERBOSE']:
                        logger.debug(f"Course {course_id} enrollment score: {enrollment_score:.2f}, " +
                                     f"final score: {popularity_scores[course_id]:.2f}")
                        
            logger.info(f"Popularity scores calculated for {len(popularity_scores)} courses " +
                       f"in {time.time() - start_time:.2f} seconds")
            
        except Exception as e:
            logger.error(f"Error calculating popularity scores: {e}", exc_info=True)
        
        return popularity_scores
    
    def _get_activity_engagement_scores(self, course_id: int) -> Dict[int, float]:
        """
        Calculate engagement scores for activities in a course.
        
        Args:
            course_id: ID of the course to analyze
            
        Returns:
            Dict mapping activity IDs to engagement scores
        """
        logger.info(f"Calculating activity engagement scores for course {course_id}")
        engagement_scores = {}
        
        try:
            # Get all users enrolled in the course
            enrolled_users = self.moodle_client.get_course_enrolled_users(course_id)
            
            if not enrolled_users:
                logger.info(f"No enrolled users found in course {course_id}")
                return {}
                
            logger.info(f"Found {len(enrolled_users)} enrolled users in course {course_id}")
            
            # Count how many users have completed or viewed each activity
            activity_counts = Counter()
            
            # Get completion status for each user
            for user in enrolled_users:
                user_id = user.get('id')
                if not user_id:
                    continue
                    
                try:
                    completion_data = self.moodle_client.get_activities_completion_status(user_id, course_id)
                    
                    if completion_data and 'statuses' in completion_data:
                        for status in completion_data['statuses']:
                            activity_id = status.get('cmid', 0)
                            if activity_id == 0:
                                continue
                                
                            if status.get('state') == 1:  # Completed
                                activity_counts[activity_id] += POPULARITY_CONFIG['COMPLETION_WEIGHT']
                            elif status.get('viewed', False):
                                activity_counts[activity_id] += POPULARITY_CONFIG['VIEW_WEIGHT']
                                
                except Exception as e:
                    logger.warning(f"Error getting completion data for user {user_id} in course {course_id}: {e}")
            
            # Normalize scores
            if activity_counts:
                max_count = max(activity_counts.values()) if activity_counts else 1
                for activity_id, count in activity_counts.items():
                    engagement_score = count / max_count * POPULARITY_CONFIG['MAX_ACTIVITY_SCORE']
                    engagement_scores[activity_id] = engagement_score
                    
                    if POPULARITY_CONFIG['VERBOSE']:
                        logger.debug(f"Activity {activity_id} has engagement score {engagement_score:.2f}")
                        
                logger.info(f"Calculated engagement scores for {len(engagement_scores)} activities")
            else:
                logger.info("No activity engagement data found")
            
        except Exception as e:
            logger.warning(f"Error calculating activity engagement for course {course_id}: {e}", exc_info=True)
        
        return engagement_scores
    
    def recommend_courses(self, user_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Recommend courses based on popularity.
        
        This implementation gets all courses available in the system, excludes courses
        the user is already enrolled in, and returns the top courses based on enrollment
        counts, ratings, and recency.
        
        Args:
            user_id: The ID of the user to generate recommendations for
            limit: Maximum number of recommendations to return
            
        Returns:
            A list of recommended course objects
        """
        logger.info(f"Generating popularity-based course recommendations for user {user_id}")
        
        try:
            # Get all courses
            all_courses = self.get_all_courses()
            logger.info(f"Retrieved {len(all_courses)} courses for analysis")
            
            # Get user's current courses to exclude them
            user_courses = self.get_user_courses(user_id)
            user_course_ids = set(course['id'] for course in user_courses)
            logger.info(f"User {user_id} is enrolled in {len(user_course_ids)} courses")
            
            # Filter out courses the user is already enrolled in and exclude default course (id=1)
            potential_recommendations = [
                course for course in all_courses 
                if course['id'] not in user_course_ids and course['id'] != 1
            ]
            
            logger.info(f"Found {len(potential_recommendations)} potential courses to recommend")
            
            # Calculate popularity scores
            popularity_scores = self._calculate_course_popularity_scores(all_courses)
            
            # Sort courses by their popularity score
            sorted_recommendations = sorted(
                potential_recommendations,
                key=lambda c: popularity_scores.get(c['id'], 0),
                reverse=True  # Higher scores first
            )
            
            # Add popularity score to each recommendation
            result = []
            for course in sorted_recommendations[:limit]:
                # Add popularity score to the course data
                course_with_score = course.copy()
                score = popularity_scores.get(course['id'], 0)
                course_with_score['popularity_score'] = score
                
                # Add explanation of why this course was recommended
                enrollment_count = 0
                try:
                    enrolled_users = self.moodle_client.get_course_enrolled_users(course['id'])
                    enrollment_count = len(enrolled_users)
                except Exception:
                    pass
                
                # Create human-readable explanation
                course_with_score['recommendation_reason'] = (
                    f"This course is popular (score: {score:.2f}) with {enrollment_count} enrollments"
                )
                
                if 'timecreated' in course and time.time() - course.get('timecreated', 0) < POPULARITY_CONFIG['RECENCY_PERIOD_DAYS'] * 24 * 60 * 60:
                    course_with_score['recommendation_reason'] += " and is relatively new"
                
                result.append(course_with_score)
                logger.info(f"Recommending course {course['id']}: {course.get('fullname')} with score {score:.2f}")
            
            logger.info(f"Returning {len(result)} popularity-based recommendations")
            return result
            
        except Exception as e:
            logger.error(f"Error in popularity-based recommend_courses: {e}", exc_info=True)
            return []
    
    def recommend_activities(self, user_id: int, course_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Recommend activities within a course based on popularity.
        
        This implementation analyzes activity completions and views to determine
        which activities are most engaging across all users.
        
        Args:
            user_id: The ID of the user to generate recommendations for
            course_id: The ID of the course to generate activity recommendations within
            limit: Maximum number of recommendations to return
            
        Returns:
            A list of recommended activity objects
        """
        logger.info(f"Generating popularity-based activity recommendations for user {user_id} in course {course_id}")
        
        try:
            # Get course contents
            course_sections = self.get_course_contents(course_id)
            logger.info(f"Retrieved {len(course_sections)} sections for course {course_id}")
            
            # Extract all modules/activities from all sections
            all_activities = []
            for section in course_sections:
                if 'modules' in section:
                    all_activities.extend(section['modules'])
            
            logger.info(f"Found {len(all_activities)} activities in course {course_id}")
            
            # Get user's completed activities to exclude them
            completion_data = self.moodle_client.get_activities_completion_status(user_id, course_id)
            completed_activities = []
            
            if completion_data and 'statuses' in completion_data:
                for status in completion_data['statuses']:
                    if status.get('state') == 1:  # Completed
                        completed_activities.append(status.get('cmid', 0))
                        
                logger.info(f"User has completed {len(completed_activities)} activities")
            
            # Filter out completed activities
            potential_activities = [
                activity for activity in all_activities
                if activity.get('id') not in completed_activities
            ]
            
            logger.info(f"Found {len(potential_activities)} potential activities to recommend")
            
            # Get engagement scores for activities
            engagement_scores = self._get_activity_engagement_scores(course_id)
            
            # Sort activities by engagement score
            sorted_activities = sorted(
                potential_activities,
                key=lambda a: engagement_scores.get(a.get('id', 0), 0),
                reverse=True  # Higher engagement first
            )
            
            # Add engagement score to each recommendation
            result = []
            for activity in sorted_activities[:limit]:
                # Add engagement score to the activity data
                activity_with_score = activity.copy()
                score = engagement_scores.get(activity.get('id', 0), 0)
                activity_with_score['engagement_score'] = score
                
                # Add explanation of why this activity was recommended
                activity_with_score['recommendation_reason'] = (
                    f"This activity is popular with other students (engagement score: {score:.2f})"
                )
                
                result.append(activity_with_score)
                logger.info(f"Recommending activity {activity.get('id')}: {activity.get('name')} with score {score:.2f}")
            
            logger.info(f"Returning {len(result)} popularity-based activity recommendations")
            return result
        
        except Exception as e:
            logger.error(f"Error in popularity-based recommend_activities: {e}", exc_info=True)
            return []
