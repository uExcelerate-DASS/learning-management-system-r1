"""
Collaborative Filtering Recommender implementation based on user similarities.
"""
from typing import List, Dict, Any, Optional
import logging
from collections import Counter, defaultdict
import math
import time

from .base_recommender import BaseRecommender
from ..services.moodle_client import MoodleClient

logger = logging.getLogger(__name__)

# Configuration parameters for collaborative filtering
COLLABORATIVE_CONFIG = {
    # Similarity and recommendation parameters
    'MIN_COMMON_COURSES': 1,      # Minimum common courses to consider users similar
    'MAX_SIMILAR_USERS': 10,      # Maximum number of similar users to consider
    'SIMILARITY_THRESHOLD': 0.1,  # Minimum similarity score to consider
    'COURSE_SCORE_THRESHOLD': 0.2, # Minimum score for course recommendations
    'DEFAULT_SCORE': 1.0,         # Default score if no collaborative data available
    
    # Activity recommendation parameters
    'ACTIVITY_COMPLETION_WEIGHT': 3.0,   # Weight for completed activities
    'ACTIVITY_VIEW_WEIGHT': 1.0,         # Weight for viewed activities
    'ACTIVITY_SCORE_THRESHOLD': 0.1,     # Minimum score for activity recommendations
    
    # Debug settings
    'VERBOSE': True,              # Enable verbose logging for debugging
}

class CollaborativeRecommender(BaseRecommender):
    """
    Recommender that suggests courses and activities based on collaborative filtering.
    
    This recommender identifies similar users and recommends items based on what
    those similar users have enrolled in or engaged with.
    """
    
    def __init__(self, moodle_client: MoodleClient):
        """
        Initialize the collaborative recommender.
        
        Args:
            moodle_client: An initialized MoodleClient to interact with Moodle data
        """
        super().__init__(moodle_client)
        logger.info("CollaborativeRecommender initialized")
    
    def _build_user_course_matrix(self) -> Dict[int, Dict[int, float]]:
        """
        Build the user-course matrix for collaborative filtering.
        
        This matrix contains information about which users are enrolled in which courses
        and their engagement levels with those courses.
        
        Returns:
            Dict mapping user IDs to {course_id -> rating} mappings
        """
        logger.info("Building user-course matrix for collaborative filtering")
        start_time = time.time()
        
        try:
            # Step 1: Get all courses
            all_courses = self.get_all_courses()
            course_ids = [course['id'] for course in all_courses if 'id' in course and course['id'] != 1]  # Exclude site course
            
            logger.info(f"Found {len(course_ids)} courses to analyze")
            
            user_course_matrix = {}
            
            # Step 2: For each course, get enrolled users and build matrix
            batch_size = 5  # Process courses in batches to avoid overwhelming the server
            
            for i in range(0, len(course_ids), batch_size):
                batch = course_ids[i:i+batch_size]
                logger.info(f"Processing course batch {i//batch_size + 1}/{(len(course_ids) + batch_size - 1) // batch_size}: {batch}")
                
                for course_id in batch:
                    try:
                        # Get enrolled users for this course
                        enrolled_users = self.moodle_client.get_course_enrolled_users(course_id)
                        
                        if COLLABORATIVE_CONFIG['VERBOSE']:
                            logger.debug(f"Course {course_id} has {len(enrolled_users)} enrolled users")
                        
                        # For each enrolled user, update the matrix
                        for user in enrolled_users:
                            user_id = user.get('id')
                            if not user_id:
                                continue
                            
                            # Initialize user in matrix if needed
                            if user_id not in user_course_matrix:
                                user_course_matrix[user_id] = {}
                            
                            # Set enrollment with default engagement score
                            user_course_matrix[user_id][course_id] = 1.0
                                
                    except Exception as e:
                        logger.warning(f"Error processing course {course_id}: {e}")
            
            logger.info(f"User-course matrix built in {time.time() - start_time:.2f} seconds")
            logger.info(f"Matrix contains data for {len(user_course_matrix)} users")
            
            return user_course_matrix
            
        except Exception as e:
            logger.error(f"Error building user-course matrix: {e}", exc_info=True)
            return {}
    
    def _get_user_activities(self, user_id: int, course_id: int) -> Dict[int, float]:
        """
        Get activities a user has engaged with in a course.
        
        Args:
            user_id: The user ID
            course_id: The course ID
            
        Returns:
            Dict mapping activity IDs to engagement scores
        """
        logger.info(f"Getting activity engagement for user {user_id} in course {course_id}")
        activity_engagements = {}
        
        try:
            # Get user's activity data in this course
            completion_data = self.moodle_client.get_activities_completion_status(user_id, course_id)
            
            if not completion_data or 'statuses' not in completion_data:
                return {}
                
            # Process each activity
            for status in completion_data['statuses']:
                activity_id = status.get('cmid', 0)
                if activity_id == 0:
                    continue
                    
                # Calculate activity engagement score based on completion and views
                engagement = 0.0
                if status.get('state') == 1:  # Completed
                    engagement += COLLABORATIVE_CONFIG['ACTIVITY_COMPLETION_WEIGHT']
                if status.get('viewed', False):
                    engagement += COLLABORATIVE_CONFIG['ACTIVITY_VIEW_WEIGHT']
                    
                if engagement > 0:
                    activity_engagements[activity_id] = engagement
                    
            if COLLABORATIVE_CONFIG['VERBOSE']:
                logger.debug(f"User {user_id} has engaged with {len(activity_engagements)} activities in course {course_id}")
                
        except Exception as e:
            logger.warning(f"Error getting activities for user {user_id} in course {course_id}: {e}")
            
        return activity_engagements
    
    def _calculate_user_similarity(self, user_id: int, all_users_matrix: Dict[int, Dict[int, float]]) -> Dict[int, float]:
        """
        Calculate similarity between the given user and all other users.
        
        Uses cosine similarity based on course enrollments.
        
        Args:
            user_id: ID of the user to find similar users for
            all_users_matrix: The user-course matrix for all users
            
        Returns:
            Dict mapping user IDs to similarity scores (0-1)
        """
        logger.info(f"Calculating user similarity for user {user_id}")
        similarity_scores = {}
        
        # If user not in matrix or no data available, return empty dict
        if not all_users_matrix or user_id not in all_users_matrix:
            return {}
            
        user_courses = all_users_matrix[user_id]
        if not user_courses:
            return {}
            
        logger.info(f"User {user_id} is enrolled in {len(user_courses)} courses")
        
        # Calculate similarity with each other user using cosine similarity
        for other_id, other_courses in all_users_matrix.items():
            if other_id == user_id:
                continue
                
            # Find common courses
            common_courses = set(user_courses.keys()) & set(other_courses.keys())
            
            if len(common_courses) < COLLABORATIVE_CONFIG['MIN_COMMON_COURSES']:
                continue
                
            # Calculate dot product
            dot_product = sum(user_courses[course_id] * other_courses[course_id] for course_id in common_courses)
            
            # Calculate magnitudes
            user_magnitude = math.sqrt(sum(score * score for score in user_courses.values()))
            other_magnitude = math.sqrt(sum(score * score for score in other_courses.values()))
            
            # Calculate cosine similarity
            if user_magnitude > 0 and other_magnitude > 0:
                similarity = dot_product / (user_magnitude * other_magnitude)
                
                # Only include users with similarity above threshold
                if similarity >= COLLABORATIVE_CONFIG['SIMILARITY_THRESHOLD']:
                    similarity_scores[other_id] = similarity
                    
                    if COLLABORATIVE_CONFIG['VERBOSE']:
                        logger.debug(f"User {other_id} is similar to user {user_id} with score {similarity:.2f} " +
                                    f"(common courses: {len(common_courses)})")
        
        logger.info(f"Found {len(similarity_scores)} similar users for user {user_id}")
        return similarity_scores
    
    def recommend_courses(self, user_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Recommend courses using collaborative filtering.
        
        This implementation finds similar users and recommends courses they are enrolled in
        but the target user is not.
        
        Args:
            user_id: The ID of the user to generate recommendations for
            limit: Maximum number of recommendations to return
            
        Returns:
            A list of recommended course objects
        """
        logger.info(f"Generating collaborative course recommendations for user {user_id}")
        
        try:
            # Build the user-course matrix (without caching)
            user_course_matrix = self._build_user_course_matrix()
            
            # Get user's existing courses
            user_courses = self.get_user_courses(user_id)
            user_course_ids = set(course['id'] for course in user_courses)
            
            logger.info(f"User {user_id} is enrolled in {len(user_course_ids)} courses")
            
            # Get similar users
            similar_users = self._calculate_user_similarity(user_id, user_course_matrix)
            
            if not similar_users:
                logger.info(f"No similar users found for user {user_id}. Falling back to newest courses.")
                # If no similar users, fall back to getting all courses and filtering
                all_courses = self.get_all_courses()
                potential_courses = [c for c in all_courses if c['id'] not in user_course_ids and c['id'] != 1]
                
                # Sort by some default criteria (e.g., newest first)
                sorted_courses = sorted(
                    potential_courses, 
                    key=lambda c: c.get('timecreated', 0), 
                    reverse=True
                )
                
                # Add explanation for fallback
                result = []
                for course in sorted_courses[:limit]:
                    course_copy = course.copy()
                    course_copy['recommendation_reason'] = "Recent course (no collaborative data available)"
                    result.append(course_copy)
                    
                logger.info(f"Returning {len(result)} courses based on recency (fallback)")
                return result
            
            # Find top similar users
            top_similar_users = sorted(similar_users.items(), key=lambda x: x[1], reverse=True)[:COLLABORATIVE_CONFIG['MAX_SIMILAR_USERS']]
            
            logger.info(f"Using top {len(top_similar_users)} similar users for recommendations")
            
            # Collect course recommendations from similar users
            course_scores = defaultdict(float)
            similar_user_courses = {}
            
            for similar_user_id, similarity in top_similar_users:
                if similar_user_id in user_course_matrix:
                    # Get courses this similar user is enrolled in
                    user_enrolled_courses = user_course_matrix[similar_user_id]
                    similar_user_courses[similar_user_id] = user_enrolled_courses
                    
                    for course_id, rating in user_enrolled_courses.items():
                        # Only recommend courses the user isn't already enrolled in
                        if course_id not in user_course_ids and course_id != 1:
                            course_scores[course_id] += similarity * rating
                            
                            if COLLABORATIVE_CONFIG['VERBOSE']:
                                logger.debug(f"Course {course_id} score increased by {similarity * rating:.2f} " + 
                                           f"based on similar user {similar_user_id}")
            
            # Get full course data for recommended courses
            all_courses = self.get_all_courses()
            course_map = {course['id']: course for course in all_courses}
            
            # Create recommendation list
            recommendations = []
            for course_id, score in sorted(course_scores.items(), key=lambda x: x[1], reverse=True):
                if score < COLLABORATIVE_CONFIG['COURSE_SCORE_THRESHOLD']:
                    continue
                    
                if course_id in course_map:
                    course_data = course_map[course_id].copy()
                    course_data['collaborative_score'] = score
                    
                    # Generate explanation for this recommendation
                    recommenders = [
                        user_id for user_id, courses in similar_user_courses.items()
                        if course_id in courses
                    ]
                    
                    recommender_count = len(recommenders)
                    if recommender_count > 0:
                        course_data['recommendation_reason'] = (
                            f"Recommended because {recommender_count} similar users " +
                            f"are enrolled in this course (score: {score:.2f})"
                        )
                    else:
                        course_data['recommendation_reason'] = f"Collaborative recommendation (score: {score:.2f})"
                    
                    recommendations.append(course_data)
                    logger.info(f"Recommending course {course_id}: {course_data.get('fullname')} with score {score:.2f}")
                    
                if len(recommendations) >= limit:
                    break
            
            logger.info(f"Returning {len(recommendations)} collaborative recommendations")
            return recommendations
            
        except Exception as e:
            logger.error(f"Error in collaborative recommend_courses: {e}", exc_info=True)
            return []
    
    def recommend_activities(self, user_id: int, course_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Recommend activities within a course using collaborative filtering.
        
        This implementation finds similar users and recommends activities they have engaged with
        in the same course.
        
        Args:
            user_id: The ID of the user to generate recommendations for
            course_id: The ID of the course to generate activity recommendations within
            limit: Maximum number of recommendations to return
            
        Returns:
            A list of recommended activity objects
        """
        logger.info(f"Generating collaborative activity recommendations for user {user_id} in course {course_id}")
        
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
            
            # Create activity map for quick lookups
            activity_map = {activity['id']: activity for activity in all_activities if 'id' in activity}
            
            # Get user's activities in this course
            user_activities = self._get_user_activities(user_id, course_id)
            user_activity_ids = set(user_activities.keys())
            
            logger.info(f"User {user_id} has engaged with {len(user_activity_ids)} activities in course {course_id}")
            
            # Build user-course matrix to find similar users
            user_course_matrix = self._build_user_course_matrix()
            
            # Get similar users
            similar_users = self._calculate_user_similarity(user_id, user_course_matrix)
            
            if not similar_users:
                logger.info(f"No similar users found for user {user_id} in course {course_id}. Using default ordering.")
                # If no similar users, sort activities by some default criteria
                sorted_activities = sorted(
                    [a for a in all_activities if a.get('id') not in user_activity_ids],
                    key=lambda a: a.get('name', '')
                )
                
                # Add explanation for fallback
                result = []
                for activity in sorted_activities[:limit]:
                    activity_copy = activity.copy()
                    activity_copy['recommendation_reason'] = "Suggested activity (no collaborative data available)"
                    result.append(activity_copy)
                
                logger.info(f"Returning {len(result)} activities based on default ordering (fallback)")
                return result
            
            # Find top similar users
            top_similar_users = sorted(similar_users.items(), key=lambda x: x[1], reverse=True)[:COLLABORATIVE_CONFIG['MAX_SIMILAR_USERS']]
            
            logger.info(f"Using top {len(top_similar_users)} similar users for activity recommendations")
            
            # Collect activity recommendations from similar users
            activity_scores = defaultdict(float)
            recommender_counts = Counter()
            
            for similar_user_id, similarity in top_similar_users:
                # Get activities this similar user has engaged with
                similar_user_activities = self._get_user_activities(similar_user_id, course_id)
                
                for activity_id, engagement in similar_user_activities.items():
                    if activity_id not in user_activity_ids:
                        activity_scores[activity_id] += similarity * engagement
                        recommender_counts[activity_id] += 1
                        
                        if COLLABORATIVE_CONFIG['VERBOSE']:
                            logger.debug(f"Activity {activity_id} score increased by {similarity * engagement:.2f} " + 
                                       f"based on similar user {similar_user_id}")
            
            # Create recommendation list
            recommendations = []
            for activity_id, score in sorted(activity_scores.items(), key=lambda x: x[1], reverse=True):
                if score < COLLABORATIVE_CONFIG['ACTIVITY_SCORE_THRESHOLD']:
                    continue
                    
                if activity_id in activity_map:
                    activity_data = activity_map[activity_id].copy()
                    activity_data['collaborative_score'] = score
                    
                    # Generate explanation for this recommendation
                    recommender_count = recommender_counts[activity_id]
                    activity_data['recommendation_reason'] = (
                        f"Recommended because {recommender_count} similar users " +
                        f"engaged with this activity (score: {score:.2f})"
                    )
                    
                    recommendations.append(activity_data)
                    logger.info(f"Recommending activity {activity_id}: {activity_data.get('name')} with score {score:.2f}")
                    
                if len(recommendations) >= limit:
                    break
                    
            # If we don't have enough recommendations, add some default ones
            if len(recommendations) < limit:
                remaining = limit - len(recommendations)
                recommended_ids = {r['id'] for r in recommendations}
                
                logger.info(f"Adding {remaining} default recommendations to reach the limit")
                
                for activity in all_activities:
                    if ('id' in activity and 
                        activity['id'] not in recommended_ids and 
                        activity['id'] not in user_activity_ids):
                        activity_copy = activity.copy()
                        activity_copy['recommendation_reason'] = "Additional suggestion based on course structure"
                        recommendations.append(activity_copy)
                        
                        if len(recommendations) >= limit:
                            break
            
            logger.info(f"Returning {len(recommendations)} collaborative activity recommendations")
            return recommendations
            
        except Exception as e:
            logger.error(f"Error in collaborative recommend_activities: {e}", exc_info=True)
            return []
