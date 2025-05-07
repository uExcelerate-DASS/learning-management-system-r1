"""
Content-Based Recommender implementation based on course content similarity.
"""
from typing import List, Dict, Any, Optional
import logging
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from .base_recommender import BaseRecommender
from ..services.moodle_client import MoodleClient

logger = logging.getLogger(__name__)

# Configuration parameters for content-based filtering
CONTENT_CONFIG = {
    # Content analysis parameters
    'MIN_DESCRIPTION_LENGTH': 10,       # Minimum content length to analyze
    'SIMILARITY_THRESHOLD': 0.1,        # Minimum content similarity to consider
    'MAX_CONTENT_LENGTH': 10000,        # Maximum length of content to analyze
    'DEFAULT_SCORE': 1.0,               # Default score if no content data available
    'ITEM_SCORE_THRESHOLD': 0.2,        # Minimum score for item recommendations
    
    # Course fields to analyze
    'ANALYZED_COURSE_FIELDS': ['fullname', 'summary', 'categoryname'],
    
    # Activity fields to analyze
    'ANALYZED_ACTIVITY_FIELDS': ['name', 'description', 'modname'],
    
    # Feature weights
    'CATEGORY_MATCH_WEIGHT': 2.0,       # Weight for matching category
    'TAG_MATCH_WEIGHT': 3.0,            # Weight for matching tags (high weight as it's very relevant)
    'CONTENT_SIMILARITY_WEIGHT': 1.0,   # Weight for content similarity
    
    # Debug settings
    'VERBOSE': True,                    # Enable verbose logging for debugging
}

class ContentBasedRecommender(BaseRecommender):
    """
    Recommender that suggests courses and activities based on content similarity.
    
    This recommender analyzes course titles, descriptions, categories, and tags to
    recommend similar items based on content the user has previously engaged with.
    """
    
    def __init__(self, moodle_client: MoodleClient):
        """
        Initialize the content-based recommender.
        
        Args:
            moodle_client: An initialized MoodleClient to interact with Moodle data
        """
        super().__init__(moodle_client)
        logger.info("ContentBasedRecommender initialized")
    
    def _clean_text(self, text):
        """Clean and normalize text for analysis."""
        if not text:
            return ""
        # Convert to string if not already
        if not isinstance(text, str):
            text = str(text)
        # Limit text length to avoid performance issues
        text = text[:CONTENT_CONFIG['MAX_CONTENT_LENGTH']]
        # Remove HTML tags
        text = re.sub('<[^<]+?>', ' ', text)
        # Convert to lowercase
        text = text.lower()
        # Remove special characters and excessive spaces
        text = re.sub(r'[^\w\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def _get_course_tags(self, course_id: int, all_course_tags: Dict[int, List[str]] = None) -> List[str]:
        """
        Get tags for a specific course, either from the provided all_course_tags mapping
        or by making an individual API call if necessary.
        
        Args:
            course_id: The ID of the course
            all_course_tags: Optional pre-fetched mapping of course IDs to tags
            
        Returns:
            List of tag names
        """
        # If we have pre-fetched tags, use them
        if all_course_tags is not None and course_id in all_course_tags:
            tag_names = all_course_tags[course_id]
            if CONTENT_CONFIG['VERBOSE']:
                logger.info(f"Using pre-fetched tags for course {course_id}: {tag_names}")
            return tag_names
        
        # Otherwise fall back to individual fetch
        tags = self.moodle_client.get_course_tags(course_id)
        
        # Extract tag names
        tag_names = [tag.get('name', '') for tag in tags if isinstance(tag, dict) and 'name' in tag]
        
        if CONTENT_CONFIG['VERBOSE']:
            logger.info(f"Fetched {len(tag_names)} tags for course {course_id}: {tag_names}")
            
        return tag_names

    def _extract_course_features(self, course, all_course_tags: Dict[int, List[str]] = None):
        """
        Extract features from a course for content-based analysis.
        
        Args:
            course: A course object with details
            all_course_tags: Optional pre-fetched mapping of course IDs to tags
            
        Returns:
            Dictionary with extracted features
        """
        if CONTENT_CONFIG['VERBOSE']:
            logger.info(f"Extracting features for course: {course.get('fullname', 'Unknown')} (ID: {course.get('id', 'Unknown')})")
            
        features = {
            'id': course.get('id', 0),
            'content': '',
            'category_id': course.get('categoryid', 0),
            'category_name': course.get('categoryname', ''),
            'tags': []
        }
        
        # Compile content from various course fields
        content_parts = []
        for field in CONTENT_CONFIG['ANALYZED_COURSE_FIELDS']:
            if field in course and course[field]:
                content_parts.append(self._clean_text(course[field]))
                if CONTENT_CONFIG['VERBOSE']:
                    logger.debug(f"Added content from {field}: {course[field][:50]}...")
        
        features['content'] = ' '.join(content_parts)
        
        # Get tags using the API endpoint
        course_id = course.get('id', 0)
        if course_id > 0:
            features['tags'] = self._get_course_tags(course_id, all_course_tags)
            
            # Add tag texts to content for better matching
            if features['tags']:
                tag_text = ' '.join(features['tags'])
                # Add tags to content with higher weight (repeat them)
                features['content'] += ' ' + ' '.join([tag_text] * 3)  # Repeat tags for higher weight
                
                if CONTENT_CONFIG['VERBOSE']:
                    logger.debug(f"Added tags to content: {features['tags']}")
        
        return features
    
    def _extract_activity_features(self, activity):
        """
        Extract features from an activity for content-based analysis.
        
        Args:
            activity: An activity object with details
            
        Returns:
            Dictionary with extracted features
        """
        features = {
            'id': activity.get('id', 0),
            'content': '',
            'module_name': activity.get('modname', '')
        }
        
        # Compile content from various activity fields
        content_parts = []
        for field in CONTENT_CONFIG['ANALYZED_ACTIVITY_FIELDS']:
            if field in activity and activity[field]:
                content_parts.append(self._clean_text(activity[field]))
        
        features['content'] = ' '.join(content_parts)
        return features
    
    def _calculate_course_content_similarity(self, user_id: int, all_courses: List[Dict]) -> Dict[int, float]:
        """
        Calculate content similarity between user's enrolled courses and all other courses.
        This new implementation doesn't rely on cached data.
        
        Args:
            user_id: ID of the user to find course similarities for
            all_courses: List of all courses in the system
            
        Returns:
            Dict mapping course IDs to similarity scores
        """
        logger.info(f"Calculating content similarity for user {user_id}")
        similarity_scores = {}
        
        try:
            # Get user's enrolled courses
            user_courses = self.get_user_courses(user_id)
            user_course_ids = [course['id'] for course in user_courses]
            
            # If user has no courses, return empty dict
            if not user_course_ids:
                logger.info(f"User {user_id} is not enrolled in any courses")
                return {}
                
            logger.info(f"User {user_id} is enrolled in {len(user_course_ids)} courses")
            
            # Fetch all course tags in a single API call for efficiency
            logger.info("Fetching tags for all courses in a single call")
            all_course_tags = self.moodle_client.get_all_course_tags()
            logger.info(f"Retrieved tags for {len(all_course_tags)} courses")
            
            # Extract features for user's courses
            user_course_features = []
            user_course_tags = set()
            
            for course_id in user_course_ids:
                # Find the course in all_courses
                course_data = next((c for c in all_courses if c.get('id') == course_id), None)
                if course_data:
                    features = self._extract_course_features(course_data, all_course_tags)
                    user_course_features.append(features)
                    user_course_tags.update(features['tags'])
            
            logger.info(f"Extracted features for {len(user_course_features)} user courses")
            logger.info(f"User's courses have tags: {user_course_tags}")
            
            # If no user course features, return empty dict
            if not user_course_features:
                return {}
                
            # Extract features for all other courses
            other_courses_features = []
            other_course_ids = []
            
            for course in all_courses:
                course_id = course.get('id')
                if course_id and course_id not in user_course_ids and course_id != 1:  # Skip site course
                    features = self._extract_course_features(course, all_course_tags)
                    other_courses_features.append(features)
                    other_course_ids.append(course_id)
            
            logger.info(f"Extracted features for {len(other_courses_features)} other courses")
            
            if not other_courses_features:
                return {}
                
            # Prepare texts for vectorization
            user_course_texts = [f['content'] for f in user_course_features if len(f['content']) >= CONTENT_CONFIG['MIN_DESCRIPTION_LENGTH']]
            other_course_texts = [f['content'] for f in other_courses_features if len(f['content']) >= CONTENT_CONFIG['MIN_DESCRIPTION_LENGTH']]
            
            if not user_course_texts or not other_course_texts:
                logger.warning("Not enough content for similarity calculation")
                return {}
                
            # Create a combined list of all texts for vectorization
            all_texts = user_course_texts + other_course_texts
            
            # Create and fit TF-IDF vectorizer
            vectorizer = TfidfVectorizer(
                stop_words='english',
                max_features=5000,
                ngram_range=(1, 2)
            )
            
            try:
                # Transform all texts to TF-IDF vectors
                tfidf_matrix = vectorizer.fit_transform(all_texts)
                
                # Split the matrix back into user and other course vectors
                user_vectors = tfidf_matrix[:len(user_course_texts)]
                other_vectors = tfidf_matrix[len(user_course_texts):]
                
                # Calculate cosine similarity between user vectors and other vectors
                # This gives a matrix of shape (len(user_vectors), len(other_vectors))
                similarities = cosine_similarity(user_vectors, other_vectors)
                
                # For each other course, take the maximum similarity with any user course
                for i, course_id in enumerate(other_course_ids):
                    if i < other_vectors.shape[0]:
                        # Get max similarity across all user courses
                        max_sim = np.max(similarities[:, i]) if similarities.shape[1] > i else 0
                        
                        if max_sim >= CONTENT_CONFIG['SIMILARITY_THRESHOLD']:
                            similarity_scores[course_id] = float(max_sim)
                            
                            # Apply tag-based boosting
                            course_tags = set(other_courses_features[i]['tags'])
                            common_tags = user_course_tags.intersection(course_tags)
                            
                            if common_tags:
                                # Add tag-based boost (0.1 per common tag, max 0.4)
                                tag_boost = min(len(common_tags) * 0.1, 0.4)
                                original_score = similarity_scores[course_id]
                                similarity_scores[course_id] = min(original_score + tag_boost, 1.0)
                                
                                logger.info(f"Applied tag boost to course {course_id}: {original_score:.2f} -> "
                                           f"{similarity_scores[course_id]:.2f} for common tags: {common_tags}")
                
                logger.info(f"Found {len(similarity_scores)} courses with similarity above threshold")
                
            except Exception as e:
                logger.error(f"Error calculating similarity: {e}", exc_info=True)
                return {}
                
        except Exception as e:
            logger.error(f"Error in content similarity calculation: {e}", exc_info=True)
            
        return similarity_scores
    
    def recommend_courses(self, user_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Recommend courses based on content similarity with user's enrolled courses.
        
        Args:
            user_id: The ID of the user to generate recommendations for
            limit: Maximum number of recommendations to return
            
        Returns:
            A list of recommended course objects
        """
        logger.info(f"Generating content-based course recommendations for user {user_id}")
        
        try:
            # Get all courses for the analysis
            all_courses = self.get_all_courses()
            logger.info(f"Retrieved {len(all_courses)} courses for analysis")
            
            # Get content similarity scores
            similarity_scores = self._calculate_course_content_similarity(user_id, all_courses)
            
            if not similarity_scores:
                logger.info(f"No content similarity data for user {user_id}. Falling back to all courses.")
                # Fall back to all courses, sorted by most recently created
                user_courses = self.get_user_courses(user_id)
                user_course_ids = set(course['id'] for course in user_courses)
                
                potential_courses = [c for c in all_courses 
                                    if c.get('id') and c['id'] not in user_course_ids 
                                    and c['id'] != 1]  # Exclude site course
                
                # Sort by creation time (newest first)
                sorted_courses = sorted(
                    potential_courses,
                    key=lambda c: c.get('timecreated', 0),
                    reverse=True
                )
                
                logger.info(f"Returning {min(limit, len(sorted_courses))} courses based on recency (fallback)")
                return sorted_courses[:limit]
            
            # Create recommendation list
            course_map = {course['id']: course for course in all_courses if 'id' in course}
            recommendations = []
            
            for course_id, score in sorted(similarity_scores.items(), key=lambda x: x[1], reverse=True):
                if score < CONTENT_CONFIG['ITEM_SCORE_THRESHOLD']:
                    continue
                    
                if course_id in course_map:
                    course_data = course_map[course_id].copy()
                    course_data['content_similarity_score'] = float(score)
                    
                    # Add tag data to recommendations for better explanation
                    course_data['tags'] = self._get_course_tags(course_id)
                    
                    # Add explanation of why this course was recommended
                    course_data['recommendation_reason'] = (
                        f"This course has similar content to courses you're enrolled in "
                        f"(similarity score: {score:.2f})"
                    )
                    
                    if course_data.get('tags'):
                        course_data['recommendation_reason'] += f" and shares tags: {', '.join(course_data['tags'][:3])}"
                    
                    recommendations.append(course_data)
                    logger.info(f"Recommending course {course_id}: {course_data.get('fullname')} with score {score:.2f}")
                    
                if len(recommendations) >= limit:
                    break
            
            logger.info(f"Returning {len(recommendations)} content-based recommendations")
            return recommendations
            
        except Exception as e:
            logger.error(f"Error in content-based recommend_courses: {e}", exc_info=True)
            return []
    
    def recommend_activities(self, user_id: int, course_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Recommend activities within a course based on content similarity.
        
        Args:
            user_id: The ID of the user to generate recommendations for
            course_id: The ID of the course to generate activity recommendations within
            limit: Maximum number of recommendations to return
            
        Returns:
            A list of recommended activity objects
        """
        logger.info(f"Generating content-based activity recommendations for user {user_id} in course {course_id}")
        
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
            
            # Create a map from activity ID to activity data
            activity_map = {activity['id']: activity for activity in all_activities if 'id' in activity}
            
            # Get user's completed activities in this course
            completion_data = self.moodle_client.get_activities_completion_status(user_id, course_id)
            
            # Extract completed and viewed activity IDs
            completed_activities = []
            viewed_activities = []
            
            if completion_data and 'statuses' in completion_data:
                for status in completion_data['statuses']:
                    activity_id = status.get('cmid', 0)
                    if activity_id == 0:
                        continue
                    
                    if status.get('state') == 1:  # Completed
                        completed_activities.append(activity_id)
                    elif status.get('viewed', False):
                        viewed_activities.append(activity_id)
                    
                logger.info(f"User has completed {len(completed_activities)} activities and viewed {len(viewed_activities)} activities")
            else:
                logger.info("No completion data available, will recommend based on content only")
                
            # Combine completed and viewed activities, with completed having higher priority
            engaged_activities = completed_activities + [a for a in viewed_activities if a not in completed_activities]
            
            # If no engaged activities, return activities sorted by section order
            if not engaged_activities:
                logger.info("No engaged activities found, returning activities in section order")
                return all_activities[:limit]
                
            # Extract features for all activities
            activity_features = {}
            
            for activity in all_activities:
                activity_id = activity.get('id')
                if activity_id:
                    features = self._extract_activity_features(activity)
                    activity_features[activity_id] = features
            
            # Extract features for engaged activities
            engaged_features = [activity_features.get(aid, {'content': ''}) for aid in engaged_activities]
            engaged_texts = [f['content'] for f in engaged_features if len(f['content']) >= CONTENT_CONFIG['MIN_DESCRIPTION_LENGTH']]
            
            # Extract features for other activities
            other_activities = [aid for aid in activity_map.keys() if aid not in engaged_activities]
            other_features = [activity_features.get(aid, {'content': ''}) for aid in other_activities]
            other_texts = [f['content'] for f in other_features if len(f['content']) >= CONTENT_CONFIG['MIN_DESCRIPTION_LENGTH']]
            
            # If either list is empty, return activities in section order
            if not engaged_texts or not other_texts:
                logger.info("Not enough content for similarity calculation, returning activities in section order")
                # Filter out engaged activities
                remaining_activities = [a for a in all_activities if a.get('id') not in engaged_activities]
                return remaining_activities[:limit]
                
            # Create a TF-IDF vectorizer and transform texts
            vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
            
            try:
                # Combine texts for vectorization
                all_texts = engaged_texts + other_texts
                
                # Fit and transform
                tfidf_matrix = vectorizer.fit_transform(all_texts)
                
                # Split back into engaged and other vectors
                engaged_vectors = tfidf_matrix[:len(engaged_texts)]
                other_vectors = tfidf_matrix[len(engaged_texts):]
                
                # Calculate similarities
                similarities = cosine_similarity(engaged_vectors, other_vectors)
                
                # For each other activity, get maximum similarity with engaged activities
                similarity_scores = {}
                
                for i, activity_id in enumerate(other_activities):
                    if i < len(other_texts) and len(other_features[i]['content']) >= CONTENT_CONFIG['MIN_DESCRIPTION_LENGTH']:
                        # Get position in the other_texts array
                        text_index = other_texts.index(other_features[i]['content'])
                        
                        if text_index < other_vectors.shape[0]:
                            max_sim = np.max(similarities[:, text_index])
                            
                            if max_sim >= CONTENT_CONFIG['ITEM_SCORE_THRESHOLD']:
                                similarity_scores[activity_id] = float(max_sim)
                                logger.debug(f"Activity {activity_id} has similarity score {max_sim}")
                
                # Create recommendation list
                recommendations = []
                
                for activity_id, score in sorted(similarity_scores.items(), key=lambda x: x[1], reverse=True):
                    if activity_id in activity_map:
                        activity_data = activity_map[activity_id].copy()
                        activity_data['content_similarity_score'] = score
                        activity_data['recommendation_reason'] = "Similar to activities you've engaged with"
                        recommendations.append(activity_data)
                        
                        logger.info(f"Recommending activity {activity_id}: {activity_data.get('name')} with score {score:.2f}")
                        
                    if len(recommendations) >= limit:
                        break
                
                # If we don't have enough recommendations, add some in section order
                if len(recommendations) < limit:
                    remaining = limit - len(recommendations)
                    recommended_ids = {r['id'] for r in recommendations}
                    engaged_ids = set(engaged_activities)
                    
                    for activity in all_activities:
                        if ('id' in activity and 
                            activity['id'] not in recommended_ids and 
                            activity['id'] not in engaged_ids):
                            activity_copy = activity.copy()
                            activity_copy['recommendation_reason'] = "Suggested based on course structure"
                            recommendations.append(activity_copy)
                            
                            if len(recommendations) >= limit:
                                break
                
                logger.info(f"Returning {len(recommendations)} activity recommendations")
                return recommendations
                
            except Exception as e:
                logger.error(f"Error calculating activity similarities: {e}", exc_info=True)
                # Return activities in section order as fallback
                remaining_activities = [a for a in all_activities if a.get('id') not in engaged_activities]
                return remaining_activities[:limit]
                
        except Exception as e:
            logger.error(f"Error in recommend_activities: {e}", exc_info=True)
            return []
