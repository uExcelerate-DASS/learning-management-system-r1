"""
Interests-Based Recommender implementation that uses user's stated preferences from MongoDB.
"""
from typing import List, Dict, Any, Optional
import logging
import re
import time
import os
from bson.objectid import ObjectId
import pymongo
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from .base_recommender import BaseRecommender
from ..services.moodle_client import MoodleClient

logger = logging.getLogger(__name__)

# Configuration parameters for interests-based filtering
INTERESTS_CONFIG = {
    # Content analysis parameters
    'MIN_DESCRIPTION_LENGTH': 10,      # Minimum content length to analyze
    'SIMILARITY_THRESHOLD': 0.1,       # Minimum similarity to consider
    'MAX_CONTENT_LENGTH': 10000,       # Maximum length of content to analyze
    'DEFAULT_SCORE': 1.0,              # Default score if no data available
    'ITEM_SCORE_THRESHOLD': 0.2,       # Minimum score for recommendations
    
    # Course fields to analyze
    'ANALYZED_COURSE_FIELDS': ['fullname', 'summary', 'categoryname'],
    
    # MongoDB configuration
    'MONGODB_URI': os.environ.get('MONGODB_URI', ''),
    'MONGODB_DB_NAME': 'test',
    'MONGODB_COLLECTION': 'users',
    
    # Interest matching weights
    'DIRECT_INTEREST_MATCH_WEIGHT': 2.0,  # Weight when a course directly matches an interest
    'TAG_MATCH_WEIGHT': 1.5,              # Weight for matching tags
    'CONTENT_SIMILARITY_WEIGHT': 1.0,     # Weight for general content similarity
    
    # Debug settings
    'VERBOSE': True,                    # Enable verbose logging for debugging
}

class InterestsBasedRecommender(BaseRecommender):
    """
    Recommender that suggests courses and activities based on user's stated interests.
    
    This recommender fetches user interests from MongoDB and matches them with
    course content and tags to provide personalized recommendations.
    """
    
    def __init__(self, moodle_client: MoodleClient):
        """
        Initialize the interests-based recommender.
        
        Args:
            moodle_client: An initialized MoodleClient to interact with Moodle data
        """
        super().__init__(moodle_client)
        self.mongo_client = None
        self._initialize_mongo_client()
        logger.info("InterestsBasedRecommender initialized")
    
    def _initialize_mongo_client(self):
        """Initialize MongoDB client to fetch user interests."""
        try:
            if not INTERESTS_CONFIG['MONGODB_URI']:
                logger.warning("MongoDB URI not provided. Interest-based recommendations will be limited.")
                return
                
            self.mongo_client = pymongo.MongoClient(INTERESTS_CONFIG['MONGODB_URI'])
            self.mongo_db = self.mongo_client[INTERESTS_CONFIG['MONGODB_DB_NAME']]
            logger.info(f"MongoDB client initialized for {INTERESTS_CONFIG['MONGODB_URI']}")
            
            # Test connection
            db_names = self.mongo_client.list_database_names()
            logger.info(f"Connected to MongoDB. Available databases: {db_names}")
        except Exception as e:
            logger.error(f"Error connecting to MongoDB: {e}", exc_info=True)
            self.mongo_client = None
    
    def _clean_text(self, text):
        """Clean and normalize text for analysis."""
        if not text:
            return ""
        # Convert to string if not already
        if not isinstance(text, str):
            text = str(text)
        # Limit text length to avoid performance issues
        text = text[:INTERESTS_CONFIG['MAX_CONTENT_LENGTH']]
        # Remove HTML tags
        text = re.sub('<[^<]+?>', ' ', text)
        # Convert to lowercase
        text = text.lower()
        # Remove special characters and excessive spaces
        text = re.sub(r'[^\w\s]', ' ', text)
        text = re.sub(r'\s+', ' ', text).strip()
        return text
    
    def _get_user_interests(self, user_id: int) -> List[str]:
        """
        Get user interests from MongoDB based on Moodle user ID.
        
        Args:
            user_id: The Moodle user ID
            
        Returns:
            List of interest keywords
        """
        interests = []
        
        if not self.mongo_client:
            logger.warning("MongoDB client not initialized. Cannot fetch user interests.")
            return interests
        
        try:
            # Query MongoDB for user by email
            users_collection = self.mongo_db[INTERESTS_CONFIG['MONGODB_COLLECTION']]
            user_doc = users_collection.find_one({"moodleUserId": user_id})
            email = user_doc.get('email') if user_doc else None
            
            if not user_doc:
                logger.warning(f"User with email {email} not found in MongoDB")
                return interests
                
            logger.info(f"Found user in MongoDB: {user_doc.get('name')} (ID: {user_doc.get('_id')})")
            
            # Extract interests from preferences
            if 'preferences' in user_doc and 'interests' in user_doc['preferences'] and user_doc['preferences']['interests']:
                interests = user_doc['preferences']['interests']
                logger.info(f"User has {len(interests)} interests: {interests}")
            else:
                logger.info("User has no specified interests in MongoDB")
                
        except Exception as e:
            logger.error(f"Error fetching user interests from MongoDB: {e}", exc_info=True)
            
        return interests
    
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
            if INTERESTS_CONFIG['VERBOSE']:
                logger.info(f"Using pre-fetched tags for course {course_id}: {tag_names}")
            return tag_names
        
        # Otherwise fall back to individual fetch
        tags = self.moodle_client.get_course_tags(course_id)
        
        # Extract tag names
        tag_names = [tag.get('name', '') for tag in tags if isinstance(tag, dict) and 'name' in tag]
        
        if INTERESTS_CONFIG['VERBOSE']:
            logger.info(f"Fetched {len(tag_names)} tags for course {course_id}: {tag_names}")
            
        return tag_names
    
    def _extract_course_features(self, course, all_course_tags: Dict[int, List[str]] = None):
        """
        Extract features from a course for interest-based matching.
        
        Args:
            course: A course object with details
            all_course_tags: Optional pre-fetched mapping of course IDs to tags
            
        Returns:
            Dictionary with extracted features
        """
        if INTERESTS_CONFIG['VERBOSE']:
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
        for field in INTERESTS_CONFIG['ANALYZED_COURSE_FIELDS']:
            if field in course and course[field]:
                content_parts.append(self._clean_text(course[field]))
                if INTERESTS_CONFIG['VERBOSE']:
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
                
                if INTERESTS_CONFIG['VERBOSE']:
                    logger.debug(f"Added tags to content: {features['tags']}")
        
        return features
    
    def _calculate_interest_course_matches(self, user_id: int, all_courses: List[Dict], all_course_tags: Dict[int, List[str]] = None) -> Dict[int, float]:
        """
        Calculate match scores between user interests and available courses.
        
        Args:
            user_id: ID of the user
            all_courses: List of all courses in the system
            all_course_tags: Optional pre-fetched mapping of course IDs to tags
            
        Returns:
            Dict mapping course IDs to interest match scores
        """
        logger.info(f"Calculating interest-based matches for user {user_id}")
        match_scores = {}
        
        try:
            # Get user interests
            user_interests = self._get_user_interests(user_id)
            
            if not user_interests:
                logger.info(f"No interests found for user {user_id}. Cannot provide interest-based recommendations.")
                return {}
                
            # Create a combined interest text for similarity matching
            interest_text = ' '.join([self._clean_text(interest) for interest in user_interests])
            logger.info(f"User interests text: {interest_text}")
            
            # Extract features for all courses
            course_features = {}
            
            for course in all_courses:
                course_id = course.get('id')
                if course_id and course_id != 1:  # Skip site course
                    features = self._extract_course_features(course, all_course_tags)
                    course_features[course_id] = features
            
            logger.info(f"Extracted features for {len(course_features)} courses")
            
            # For each course, calculate match with user's interests
            for course_id, features in course_features.items():
                course_content = features['content']
                course_tags = features['tags']
                
                if len(course_content) < INTERESTS_CONFIG['MIN_DESCRIPTION_LENGTH']:
                    continue
                    
                # Initialize match score
                match_score = 0.0
                
                # 1. Direct keyword match in content
                direct_matches = []
                for interest in user_interests:
                    clean_interest = self._clean_text(interest)
                    if clean_interest and clean_interest in course_content:
                        direct_matches.append(interest)
                        match_score += INTERESTS_CONFIG['DIRECT_INTEREST_MATCH_WEIGHT']
                
                # 2. Tag matches with interests
                tag_matches = []
                for interest in user_interests:
                    clean_interest = self._clean_text(interest)
                    for tag in course_tags:
                        clean_tag = self._clean_text(tag)
                        if (clean_interest and clean_tag and 
                            (clean_interest in clean_tag or clean_tag in clean_interest)):
                            tag_matches.append(tag)
                            match_score += INTERESTS_CONFIG['TAG_MATCH_WEIGHT']
                
                # 3. General content similarity using TF-IDF and cosine similarity
                if course_content and interest_text:
                    try:
                        vectorizer = TfidfVectorizer(stop_words='english')
                        tfidf_matrix = vectorizer.fit_transform([interest_text, course_content])
                        cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
                        
                        # Add cosine similarity to score
                        content_match_score = cosine_sim * INTERESTS_CONFIG['CONTENT_SIMILARITY_WEIGHT']
                        match_score += content_match_score
                        
                        if INTERESTS_CONFIG['VERBOSE'] and cosine_sim > INTERESTS_CONFIG['SIMILARITY_THRESHOLD']:
                            logger.debug(f"Course {course_id} has content similarity score: {cosine_sim:.2f}")
                    except Exception as e:
                        logger.error(f"Error calculating content similarity: {e}")
                
                # If match score meets threshold, add to results
                if match_score > INTERESTS_CONFIG['ITEM_SCORE_THRESHOLD']:
                    match_scores[course_id] = min(match_score, 5.0)  # Cap at 5.0
                    
                    if INTERESTS_CONFIG['VERBOSE']:
                        logger.debug(f"Course {course_id} interest match: score={match_score:.2f}, " +
                                    f"direct_matches={direct_matches}, tag_matches={tag_matches}")
            
            logger.info(f"Found {len(match_scores)} courses matching user interests")
                
        except Exception as e:
            logger.error(f"Error in interest-based matching: {e}", exc_info=True)
            
        return match_scores
    
    def recommend_courses(self, user_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Recommend courses based on user's stated interests.
        
        Args:
            user_id: The ID of the user to generate recommendations for
            limit: Maximum number of recommendations to return
            
        Returns:
            A list of recommended course objects
        """
        logger.info(f"Generating interest-based course recommendations for user {user_id}")
        start_time = time.time()
        
        try:
            # Get all courses for matching
            all_courses = self.get_all_courses()
            logger.info(f"Retrieved {len(all_courses)} courses for analysis")
            
            # Get user's current courses to exclude them
            user_courses = self.get_user_courses(user_id)
            user_course_ids = set(course['id'] for course in user_courses)
            
            # Pre-fetch all course tags
            all_course_tags = self.moodle_client.get_all_course_tags()
            
            # Match courses with user interests
            interest_match_scores = self._calculate_interest_course_matches(user_id, all_courses, all_course_tags)
            
            if not interest_match_scores:
                logger.info(f"No interest matches found for user {user_id}. Falling back to recent courses.")
                # Fall back to recent courses
                potential_courses = [c for c in all_courses 
                                    if c.get('id') and c['id'] not in user_course_ids 
                                    and c['id'] != 1]  # Exclude site course
                
                # Sort by creation time (newest first)
                sorted_courses = sorted(
                    potential_courses,
                    key=lambda c: c.get('timecreated', 0),
                    reverse=True
                )
                
                # Add explanation for fallback
                result = []
                for course in sorted_courses[:limit]:
                    course_copy = course.copy()
                    course_copy['recommendation_reason'] = "Recent course (no interest matches found)"
                    result.append(course_copy)
                
                logger.info(f"Returning {len(result)} courses based on recency (fallback)")
                return result
            
            # Create recommendation list
            course_map = {course['id']: course for course in all_courses if 'id' in course}
            recommendations = []
            
            for course_id, score in sorted(interest_match_scores.items(), key=lambda x: x[1], reverse=True):
                # Skip courses user is already enrolled in
                if course_id in user_course_ids:
                    continue
                    
                if course_id in course_map:
                    course_data = course_map[course_id].copy()
                    course_data['interest_match_score'] = score
                    
                    # Get course tags for better explanation
                    course_tags = self._get_course_tags(course_id, all_course_tags)
                    
                    # Get user interests
                    user_interests = self._get_user_interests(user_id)
                    
                    # Find matching interests and tags
                    matching_interests = []
                    for interest in user_interests:
                        clean_interest = self._clean_text(interest)
                        # Check if interest appears in course title or summary
                        course_content = self._clean_text(course_data.get('fullname', '') + ' ' + course_data.get('summary', ''))
                        if clean_interest in course_content:
                            matching_interests.append(interest)
                            
                        # Check tag matches
                        for tag in course_tags:
                            clean_tag = self._clean_text(tag)
                            if clean_interest in clean_tag or clean_tag in clean_interest:
                                if interest not in matching_interests:
                                    matching_interests.append(interest)
                    
                    # Create explanation
                    if matching_interests:
                        course_data['recommendation_reason'] = (
                            f"Matches your interests: {', '.join(matching_interests)} (score: {score:.2f})"
                        )
                    else:
                        course_data['recommendation_reason'] = (
                            f"Content related to your interests (score: {score:.2f})"
                        )
                    
                    # Store tags for display
                    course_data['tags'] = course_tags
                    
                    recommendations.append(course_data)
                    logger.info(f"Recommending course {course_id}: {course_data.get('fullname')} with score {score:.2f}")
                    
                if len(recommendations) >= limit:
                    break
            
            logger.info(f"Returning {len(recommendations)} interest-based recommendations in {time.time() - start_time:.2f} seconds")
            return recommendations
            
        except Exception as e:
            logger.error(f"Error in interest-based recommend_courses: {e}", exc_info=True)
            return []
    
    def recommend_activities(self, user_id: int, course_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Recommend activities within a course based on user's interests.
        
        Args:
            user_id: The ID of the user to generate recommendations for
            course_id: The ID of the course to generate activity recommendations within
            limit: Maximum number of recommendations to return
            
        Returns:
            A list of recommended activity objects
        """
        logger.info(f"Generating interest-based activity recommendations for user {user_id} in course {course_id}")
        
        try:
            # Get user interests
            user_interests = self._get_user_interests(user_id)
            
            if not user_interests:
                logger.info(f"No interests found for user {user_id}. Using default activity order.")
                # Fall back to sequential activity recommendation
                course_sections = self.get_course_contents(course_id)
                all_activities = []
                
                for section in course_sections:
                    if 'modules' in section:
                        all_activities.extend(section['modules'])
                
                logger.info(f"Returning {min(limit, len(all_activities))} activities in default order (fallback)")
                return all_activities[:limit]
            
            # Get course contents
            course_sections = self.get_course_contents(course_id)
            logger.info(f"Retrieved {len(course_sections)} sections for course {course_id}")
            
            # Extract all activities from all sections
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
            
            logger.info(f"User has completed {len(completed_activities)} activities in this course")
            
            # Filter out completed activities
            potential_activities = [
                activity for activity in all_activities
                if activity.get('id') not in completed_activities
            ]
            
            # Create a combined interest text for similarity matching
            interest_text = ' '.join([self._clean_text(interest) for interest in user_interests])
            
            # Calculate interest match scores for each activity
            activity_scores = {}
            for activity in potential_activities:
                activity_id = activity.get('id', 0)
                if not activity_id:
                    continue
                
                # Combine relevant activity text fields
                activity_content = self._clean_text(
                    activity.get('name', '') + ' ' +
                    activity.get('description', '') + ' ' +
                    activity.get('modname', '')
                )
                
                if len(activity_content) < INTERESTS_CONFIG['MIN_DESCRIPTION_LENGTH']:
                    continue
                
                # Initialize match score
                match_score = 0.0
                
                # 1. Direct keyword match
                direct_matches = []
                for interest in user_interests:
                    clean_interest = self._clean_text(interest)
                    if clean_interest and clean_interest in activity_content:
                        direct_matches.append(interest)
                        match_score += INTERESTS_CONFIG['DIRECT_INTEREST_MATCH_WEIGHT']
                
                # 2. General content similarity
                if activity_content and interest_text:
                    try:
                        vectorizer = TfidfVectorizer(stop_words='english')
                        tfidf_matrix = vectorizer.fit_transform([interest_text, activity_content])
                        cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
                        
                        # Add cosine similarity to score
                        match_score += cosine_sim * INTERESTS_CONFIG['CONTENT_SIMILARITY_WEIGHT']
                        
                    except Exception as e:
                        logger.error(f"Error calculating activity content similarity: {e}")
                
                # Store score if above threshold
                if match_score > INTERESTS_CONFIG['ITEM_SCORE_THRESHOLD']:
                    activity_scores[activity_id] = min(match_score, 5.0)  # Cap at 5.0
                    
                    if INTERESTS_CONFIG['VERBOSE']:
                        logger.debug(f"Activity {activity_id} interest match score: {match_score:.2f}")
            
            # Sort activities by match score
            sorted_activities = sorted(
                potential_activities,
                key=lambda a: activity_scores.get(a.get('id', 0), 0),
                reverse=True
            )
            
            # Create result list with explanations
            result = []
            for activity in sorted_activities:
                activity_id = activity.get('id', 0)
                score = activity_scores.get(activity_id, 0)
                
                if score > 0:  # Only include activities with a positive score
                    activity_copy = activity.copy()
                    activity_copy['interest_match_score'] = score
                    
                    # Create explanation
                    matching_interests = []
                    activity_content = self._clean_text(
                        activity.get('name', '') + ' ' +
                        activity.get('description', '')
                    )
                    
                    for interest in user_interests:
                        clean_interest = self._clean_text(interest)
                        if clean_interest in activity_content:
                            matching_interests.append(interest)
                    
                    if matching_interests:
                        activity_copy['recommendation_reason'] = (
                            f"Matches your interests: {', '.join(matching_interests)} (score: {score:.2f})"
                        )
                    else:
                        activity_copy['recommendation_reason'] = (
                            f"Content related to your interests (score: {score:.2f})"
                        )
                    
                    result.append(activity_copy)
                    logger.info(f"Recommending activity {activity_id}: {activity.get('name')} with score {score:.2f}")
                    
                if len(result) >= limit:
                    break
            
            # If we don't have enough recommendations, add some in section order
            if len(result) < limit:
                remaining = limit - len(result)
                recommended_ids = {r.get('id', 0) for r in result}
                completed_ids = set(completed_activities)
                
                for activity in all_activities:
                    activity_id = activity.get('id', 0)
                    if activity_id not in recommended_ids and activity_id not in completed_ids:
                        activity_copy = activity.copy()
                        activity_copy['recommendation_reason'] = "Suggested based on course structure"
                        result.append(activity_copy)
                        
                        if len(result) >= limit:
                            break
            
            logger.info(f"Returning {len(result)} interest-based activity recommendations")
            return result
            
        except Exception as e:
            logger.error(f"Error in interest-based recommend_activities: {e}", exc_info=True)
            return []
