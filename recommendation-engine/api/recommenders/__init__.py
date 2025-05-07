from .base_recommender import BaseRecommender
from .popular import PopularRecommender
from .collaborative import CollaborativeRecommender
from .content_based import ContentBasedRecommender
from .hybrid import HybridRecommender
from .interests_based import InterestsBasedRecommender

recommendation_types = {
    "popular": PopularRecommender,
    "collaborative": CollaborativeRecommender,
    "content-based": ContentBasedRecommender,
    "hybrid": HybridRecommender,
    "interests-based": InterestsBasedRecommender,
}