"""
Base Class for Recommendation Engine
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import logging

from ..services.moodle_client import MoodleClient

logger = logging.getLogger(__name__)

class BaseRecommender(ABC):
    """
    Abstract base class for all recommendation algorithms.
    
    This class defines the interface that all recommender classes should implement.
    """
    
    def __init__(self, moodle_client: MoodleClient):
        """
        Initialize the recommender.
        
        Args:
            moodle_client: An initialized MoodleClient to interact with Moodle data
        """
        self.moodle_client = moodle_client
        logger.info(f"Initializing {self.__class__.__name__}")
    
    @abstractmethod
    def recommend_courses(self, user_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Generate course recommendations for a specific user.
        
        Args:
            user_id: The ID of the user to generate recommendations for
            limit: Maximum number of recommendations to return
            
        Returns:
            A list of recommended course objects
        """
        pass
    
    @abstractmethod
    def recommend_activities(self, user_id: int, course_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Generate activity recommendations for a specific user within a course.
        
        Args:
            user_id: The ID of the user to generate recommendations for
            course_id: The ID of the course to generate activity recommendations within
            limit: Maximum number of recommendations to return
            
        Returns:
            A list of recommended activity objects
        """
        pass
    
    def get_user_courses(self, user_id: int) -> List[Dict[str, Any]]:
        """
        Get the courses a user is enrolled in.
        
        Args:
            user_id: The ID of the user
            
        Returns:
            A list of course objects
        """
        courses = self.moodle_client.get_user_courses(user_id)
        logger.info(f"Retrieved {len(courses)} courses for user {user_id}")
        return courses
    
    def get_all_courses(self) -> List[Dict[str, Any]]:
        """
        Get all courses available in the system.
        
        Returns:
            A list of all course objects
        """
        courses = self.moodle_client.get_site_courses()
        logger.info(f"Retrieved {len(courses)} courses from the site")
        return courses
    
    def get_course_contents(self, course_id: int) -> List[Dict[str, Any]]:
        """
        Get the contents of a specific course.
        
        Args:
            course_id: The ID of the course
            
        Returns:
            A list of course content objects
        """
        contents = self.moodle_client.get_course_contents(course_id)
        logger.info(f"Retrieved contents for course {course_id}: {len(contents)} sections")
        return contents
