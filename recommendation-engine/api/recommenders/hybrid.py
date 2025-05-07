"""
Hybrid Recommender implementation that combines multiple recommendation strategies.
"""
from typing import List, Dict, Any, Optional
import logging
from collections import defaultdict
import time

from .base_recommender import BaseRecommender
from .content_based import ContentBasedRecommender
from .collaborative import CollaborativeRecommender
from .popular import PopularRecommender
from .interests_based import InterestsBasedRecommender
from ..services.moodle_client import MoodleClient

logger = logging.getLogger(__name__)

# Configuration parameters for hybrid recommendations
HYBRID_CONFIG = {
    # Weights for each recommendation strategy (should sum to 1.0)
    'CONTENT_BASED_WEIGHT': 0.25,     # Weight for content-based recommendations
    'COLLABORATIVE_WEIGHT': 0.25,     # Weight for collaborative recommendations
    'POPULARITY_WEIGHT': 0.15,        # Weight for popularity-based recommendations
    'INTERESTS_BASED_WEIGHT': 0.35,   # Weight for interests-based recommendations (highest weight)
    
    # Recommendation parameters
    'SCORE_NORMALIZATION': True,      # Whether to normalize scores from different recommenders
    'MIN_RECOMMENDATION_SCORE': 0.1,  # Minimum score for recommendations
    'DEFAULT_SCORE_VALUE': 0.5,       # Default score to use when a recommender doesn't provide one
    
    # Result combination strategy
    # Options: 'weighted_average', 'max_score', 'mixed'
    'COMBINATION_STRATEGY': 'weighted_average',
    
    # Debug settings
    'VERBOSE': True,                  # Enable verbose logging for debugging
}

class HybridRecommender(BaseRecommender):
    """
    Recommender that combines results from multiple recommendation strategies.
    
    This recommender uses a weighted combination of content-based, collaborative,
    interests-based, and popularity-based recommendations to provide better, 
    more diverse and personalized suggestions.
    """
    
    def __init__(self, moodle_client: MoodleClient):
        """
        Initialize the hybrid recommender with individual recommenders.
        
        Args:
            moodle_client: An initialized MoodleClient to interact with Moodle data
        """
        super().__init__(moodle_client)
        self.content_based = ContentBasedRecommender(moodle_client)
        self.collaborative = CollaborativeRecommender(moodle_client)
        self.popularity = PopularRecommender(moodle_client)
        self.interests_based = InterestsBasedRecommender(moodle_client)
        logger.info("HybridRecommender initialized with all component recommenders")
    
    def _normalize_scores(self, recommendations_list: List[List[Dict[str, Any]]]) -> List[List[Dict[str, Any]]]:
        """
        Normalize scores across different recommendation sources to a 0-1 range.
        
        Args:
            recommendations_list: List of recommendation lists from different sources
            
        Returns:
            List of recommendation lists with normalized scores
        """
        logger.info("Normalizing scores across recommendation sources")
        
        normalized_recommendations = []
        
        for i, recommendations in enumerate(recommendations_list):
            if not recommendations:
                normalized_recommendations.append([])
                continue
                
            # Identify the score key in this recommendation set
            score_keys = [
                'content_similarity_score',
                'collaborative_score',
                'popularity_score',
                'interest_match_score'
            ]
            
            score_key = None
            for key in score_keys:
                if key in recommendations[0]:
                    score_key = key
                    break
            
            if not score_key:
                # No score found, use items as is
                normalized_recommendations.append(recommendations)
                continue
                
            # Find min and max scores
            scores = [rec.get(score_key, 0) for rec in recommendations]
            min_score = min(scores) if scores else 0
            max_score = max(scores) if scores else 1
            
            # Avoid division by zero
            score_range = max_score - min_score
            if score_range == 0:
                score_range = 1
                
            # Normalize scores
            normalized_items = []
            for rec in recommendations:
                normalized_item = rec.copy()
                original_score = rec.get(score_key, 0)
                normalized_score = (original_score - min_score) / score_range
                normalized_item['normalized_score'] = normalized_score
                normalized_items.append(normalized_item)
                
            normalized_recommendations.append(normalized_items)
            
            if HYBRID_CONFIG['VERBOSE']:
                logger.debug(f"Normalized source {i}: original range [{min_score:.2f}, {max_score:.2f}]")
        
        return normalized_recommendations
    
    def _combine_recommendations(
        self, 
        content_based_recs: List[Dict[str, Any]], 
        collaborative_recs: List[Dict[str, Any]], 
        popularity_recs: List[Dict[str, Any]],
        interests_based_recs: List[Dict[str, Any]],
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Combine recommendations from different sources with appropriate weighting.
        
        Args:
            content_based_recs: List of content-based recommendations
            collaborative_recs: List of collaborative recommendations
            popularity_recs: List of popularity-based recommendations
            interests_based_recs: List of interests-based recommendations
            limit: Maximum number of recommendations to return
            
        Returns:
            Combined and re-ranked list of recommendations
        """
        logger.info("Combining recommendations from multiple sources")
        start_time = time.time()
        
        # Prepare all recommendations for combination
        all_recs_lists = [
            content_based_recs, 
            collaborative_recs, 
            popularity_recs, 
            interests_based_recs
        ]
        
        # Normalize scores if configured to do so
        if HYBRID_CONFIG['SCORE_NORMALIZATION']:
            normalized_recs_lists = self._normalize_scores(all_recs_lists)
            content_based_recs = normalized_recs_lists[0]
            collaborative_recs = normalized_recs_lists[1]
            popularity_recs = normalized_recs_lists[2]
            interests_based_recs = normalized_recs_lists[3]
        
        # Build a map of item ID to their recommendations from each source
        combined_scores = defaultdict(float)
        item_sources = defaultdict(list)
        item_data = {}  # To store the actual item data
        
        # Process content-based recommendations
        for rec in content_based_recs:
            item_id = rec.get('id')
            if not item_id:
                continue
                
            score = rec.get('normalized_score' if HYBRID_CONFIG['SCORE_NORMALIZATION'] else 'content_similarity_score', 
                           HYBRID_CONFIG['DEFAULT_SCORE_VALUE'])
            
            combined_scores[item_id] += score * HYBRID_CONFIG['CONTENT_BASED_WEIGHT']
            item_sources[item_id].append(('content-based', score))
            
            if item_id not in item_data:
                item_data[item_id] = rec
        
        # Process collaborative recommendations
        for rec in collaborative_recs:
            item_id = rec.get('id')
            if not item_id:
                continue
                
            score = rec.get('normalized_score' if HYBRID_CONFIG['SCORE_NORMALIZATION'] else 'collaborative_score', 
                           HYBRID_CONFIG['DEFAULT_SCORE_VALUE'])
            
            combined_scores[item_id] += score * HYBRID_CONFIG['COLLABORATIVE_WEIGHT']
            item_sources[item_id].append(('collaborative', score))
            
            if item_id not in item_data:
                item_data[item_id] = rec
        
        # Process popularity recommendations
        for rec in popularity_recs:
            item_id = rec.get('id')
            if not item_id:
                continue
                
            score = rec.get('normalized_score' if HYBRID_CONFIG['SCORE_NORMALIZATION'] else 'popularity_score', 
                           HYBRID_CONFIG['DEFAULT_SCORE_VALUE'])
            
            combined_scores[item_id] += score * HYBRID_CONFIG['POPULARITY_WEIGHT']
            item_sources[item_id].append(('popularity', score))
            
            if item_id not in item_data:
                item_data[item_id] = rec
        
        # Process interests-based recommendations (new)
        for rec in interests_based_recs:
            item_id = rec.get('id')
            if not item_id:
                continue
                
            score = rec.get('normalized_score' if HYBRID_CONFIG['SCORE_NORMALIZATION'] else 'interest_match_score', 
                           HYBRID_CONFIG['DEFAULT_SCORE_VALUE'])
            
            combined_scores[item_id] += score * HYBRID_CONFIG['INTERESTS_BASED_WEIGHT']
            item_sources[item_id].append(('interests-based', score))
            
            if item_id not in item_data:
                item_data[item_id] = rec
        
        # Sort items by their combined score
        sorted_items = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)
        
        # Create final recommendations list with explanations
        result = []
        for item_id, combined_score in sorted_items:
            if combined_score < HYBRID_CONFIG['MIN_RECOMMENDATION_SCORE']:
                continue
                
            if item_id in item_data:
                item = item_data[item_id].copy()
                item['hybrid_score'] = combined_score
                
                # Create explanation about recommendation sources
                sources = item_sources[item_id]
                if sources:
                    source_descriptions = []
                    
                    # Organize source contributions for explanation
                    interests_contribution = 0.0
                    content_contribution = 0.0
                    collaborative_contribution = 0.0
                    popularity_contribution = 0.0
                    
                    for source_type, score in sources:
                        if source_type == 'interests-based':
                            interests_contribution = score
                        elif source_type == 'content-based':
                            content_contribution = score
                        elif source_type == 'collaborative':
                            collaborative_contribution = score
                        elif source_type == 'popularity':
                            popularity_contribution = score
                        
                        source_descriptions.append(f"{source_type} ({score:.2f})")
                    
                    # Create a more user-friendly explanation
                    main_reason = ""
                    if interests_contribution > 0 and 'interests' in item_data[item_id].get('recommendation_reason', '').lower():
                        # Use the detailed interests-based explanation if available
                        main_reason = item_data[item_id]['recommendation_reason']
                    else:
                        # Create explanation based on highest contribution
                        contributions = [
                            (interests_contribution * HYBRID_CONFIG['INTERESTS_BASED_WEIGHT'], "matches your interests"),
                            (content_contribution * HYBRID_CONFIG['CONTENT_BASED_WEIGHT'], "has similar content to courses you're taking"),
                            (collaborative_contribution * HYBRID_CONFIG['COLLABORATIVE_WEIGHT'], "is popular with similar users"),
                            (popularity_contribution * HYBRID_CONFIG['POPULARITY_WEIGHT'], "is highly rated overall")
                        ]
                        
                        top_reason = max(contributions, key=lambda x: x[0])
                        main_reason = f"Primarily recommended because it {top_reason[1]}"
                    
                    # Final recommendation explanation
                    item['recommendation_reason'] = f"{main_reason} (hybrid score: {combined_score:.2f})"
                    
                    # Store detailed source contributions
                    item['recommendation_sources'] = source_descriptions
                    
                    # If original recommendation had tags, keep them
                    if 'tags' in item_data[item_id]:
                        item['tags'] = item_data[item_id]['tags']
                
                result.append(item)
                
                if HYBRID_CONFIG['VERBOSE']:
                    logger.debug(f"Item {item_id} hybrid score: {combined_score:.2f} from sources: {sources}")
                
            if len(result) >= limit:
                break
        
        logger.info(f"Combined {len(result)} recommendations from multiple sources in {time.time() - start_time:.2f} seconds")
        return result
    
    def recommend_courses(self, user_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Recommend courses using a hybrid approach combining multiple recommendation strategies.
        
        This implementation gets recommendations from content-based, collaborative, interests-based
        and popularity-based recommenders and combines them with appropriate weights.
        
        Args:
            user_id: The ID of the user to generate recommendations for
            limit: Maximum number of recommendations to return
            
        Returns:
            A list of recommended course objects
        """
        logger.info(f"Generating hybrid course recommendations for user {user_id}")
        
        try:
            # Get recommendations from each source
            extended_limit = limit * 2  # Request more items to ensure diversity
            
            # Pre-fetch all course tags in a single call for efficiency
            # This will be used by content-based and interests-based recommenders
            all_course_tags = self.moodle_client.get_all_course_tags()
            logger.info(f"Pre-fetched tags for {len(all_course_tags)} courses for efficient recommendation")
            
            logger.info("Getting content-based recommendations")
            content_based_recs = self.content_based.recommend_courses(user_id, extended_limit)
            
            logger.info("Getting collaborative recommendations")
            collaborative_recs = self.collaborative.recommend_courses(user_id, extended_limit)
            
            logger.info("Getting popularity-based recommendations")
            popularity_recs = self.popularity.recommend_courses(user_id, extended_limit)
            
            logger.info("Getting interests-based recommendations")
            interests_based_recs = self.interests_based.recommend_courses(user_id, extended_limit)
            
            # Combine recommendations with appropriate weighting
            recommendations = self._combine_recommendations(
                content_based_recs,
                collaborative_recs,
                popularity_recs,
                interests_based_recs,
                limit
            )
            
            logger.info(f"Returning {len(recommendations)} hybrid course recommendations")
            return recommendations
            
        except Exception as e:
            logger.error(f"Error in hybrid recommend_courses: {e}", exc_info=True)
            
            # If hybrid fails, fallback to interests-based or popularity-based recommendations
            logger.info("Attempting interests-based recommendations fallback due to error")
            try:
                interests_recs = self.interests_based.recommend_courses(user_id, limit)
                if interests_recs:
                    return interests_recs
                    
                logger.info("Falling back to popularity-based recommendations")
                return self.popularity.recommend_courses(user_id, limit)
            except Exception as fallback_error:
                logger.error(f"Error in fallback recommendations: {fallback_error}")
                return []
    
    def recommend_activities(self, user_id: int, course_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Recommend activities within a course using a hybrid approach.
        
        This implementation combines activity recommendations from content-based,
        collaborative, interests-based, and popularity-based recommenders.
        
        Args:
            user_id: The ID of the user to generate recommendations for
            course_id: The ID of the course to generate activity recommendations within
            limit: Maximum number of recommendations to return
            
        Returns:
            A list of recommended activity objects
        """
        logger.info(f"Generating hybrid activity recommendations for user {user_id} in course {course_id}")
        
        try:
            # Get recommendations from each source
            extended_limit = limit * 2  # Request more items to ensure diversity
            
            logger.info("Getting content-based activity recommendations")
            content_based_recs = self.content_based.recommend_activities(user_id, course_id, extended_limit)
            
            logger.info("Getting collaborative activity recommendations")
            collaborative_recs = self.collaborative.recommend_activities(user_id, course_id, extended_limit)
            
            logger.info("Getting popularity-based activity recommendations")
            popularity_recs = self.popularity.recommend_activities(user_id, course_id, extended_limit)
            
            logger.info("Getting interests-based activity recommendations")
            interests_based_recs = self.interests_based.recommend_activities(user_id, course_id, extended_limit)
            
            # Combine recommendations with appropriate weighting
            recommendations = self._combine_recommendations(
                content_based_recs,
                collaborative_recs,
                popularity_recs,
                interests_based_recs,
                limit
            )
            
            logger.info(f"Returning {len(recommendations)} hybrid activity recommendations")
            return recommendations
            
        except Exception as e:
            logger.error(f"Error in hybrid recommend_activities: {e}", exc_info=True)
            
            # If hybrid fails, fallback to interests-based or content-based recommendations
            logger.info("Attempting interests-based activity recommendations fallback due to error")
            try:
                interests_recs = self.interests_based.recommend_activities(user_id, course_id, limit)
                if interests_recs:
                    return interests_recs
                
                logger.info("Falling back to content-based activity recommendations")
                return self.content_based.recommend_activities(user_id, course_id, limit)
            except Exception as fallback_error:
                logger.error(f"Error in fallback activity recommendations: {fallback_error}")
                return []
