import requests
from typing import Dict, List, Any, Optional
import logging
import json
import time
import functools
from cachetools import cached, TTLCache
import threading

logger = logging.getLogger(__name__)

def performance_log(func):
    """Decorator to log the execution time of functions."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        logger.info(f"Function '{func.__name__}' executed in {(end_time - start_time):.2f} seconds")
        return result
    return wrapper

class MoodleClient:
    """Client to interact with Moodle Web Services API."""
    
    # Class-level cache for shared data across instances
    _cache = TTLCache(maxsize=1000, ttl=300)  # Cache with 5 minute TTL
    _cache_lock = threading.Lock()
    
    def __init__(self, base_url: str, token: str, timeout: int = 10):
        """
        Initialize the Moodle client.
        
        Args:
            base_url: The base URL of the Moodle instance (e.g., 'http://34.57.113.242/moodle')
            token: The web service token for authentication
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.token = token
        self.timeout = timeout
        self.ws_endpoint = f"{self.base_url}/webservice/rest/server.php"
        self.session = requests.Session()  # Use session for connection pooling
        logger.info(f"Initialized MoodleClient for {self.base_url}")
    
    def _make_request(self, wsfunction: str, params: Dict = None) -> Dict:
        """Make a request to the Moodle web service."""
        if params is None:
            params = {}
            
        # Common parameters for all requests
        request_params = {
            'wstoken': self.token,
            'wsfunction': wsfunction,
            'moodlewsrestformat': 'json',
        }
        
        # Merge specific params with common params
        request_params.update(params)
        
        cache_key = f"{wsfunction}_{json.dumps(sorted([(k, v) for k, v in params.items()]))}"
        
        # Check cache first
        with MoodleClient._cache_lock:
            if cache_key in MoodleClient._cache:
                logger.debug(f"Cache hit for {wsfunction}")
                return MoodleClient._cache[cache_key]
        
        logger.info(f"Making request to Moodle API: {wsfunction}")
        logger.debug(f"Request params: {json.dumps({k: v for k, v in request_params.items() if k != 'wstoken'})}")
        
        try:
            response = self.session.post(self.ws_endpoint, data=request_params, timeout=self.timeout)
            logger.info(f"Response status from Moodle API: {response.status_code}")
            
            if response.status_code != 200:
                logger.error(f"Error response from Moodle API: {response.status_code} - {response.text}")
                return {"error": f"Error {response.status_code}: {response.text}"}
            
            # Try to parse as JSON
            try:
                result = response.json()
                
                # Check if Moodle returned an exception or error
                if isinstance(result, dict) and ('exception' in result or 'errorcode' in result):
                    error_msg = result.get('message', str(result))
                    logger.error(f"Moodle API error: {error_msg}")
                    return {"error": error_msg}
                
                # Cache successful responses
                with MoodleClient._cache_lock:
                    MoodleClient._cache[cache_key] = result
                
                return result
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON response: {response.text}")
                return {"error": "Invalid JSON response from Moodle API"}
                
        except requests.Timeout:
            logger.error(f"Timeout while connecting to Moodle API (function: {wsfunction})")
            return {"error": "Connection to Moodle API timed out"}
        except requests.RequestException as e:
            logger.error(f"Error making request to Moodle API: {e}")
            return {"error": str(e)}
    
    @performance_log
    @cached(cache=TTLCache(maxsize=100, ttl=300))  # Method-level cache with 5-min TTL
    def test_connection(self) -> Dict:
        """Test the connection to the Moodle API."""
        logger.info("Testing connection to Moodle")
        return self._make_request('core_webservice_get_site_info')
    
    @performance_log
    def get_user_courses(self, user_id: int) -> List[Dict]:
        """Get courses for a specific user."""
        logger.info(f"Getting courses for user {user_id}")
        result = self._make_request('core_enrol_get_users_courses', {'userid': user_id})
        
        if isinstance(result, dict) and 'error' in result:
            logger.error(f"Error getting user courses: {result['error']}")
            return []
        
        logger.info(f"Retrieved {len(result) if isinstance(result, list) else 0} courses for user {user_id}")
        return result if isinstance(result, list) else []
    
    @performance_log
    def get_course_contents(self, course_id: int) -> List[Dict]:
        """Get content details for a specific course."""
        logger.info(f"Getting contents for course {course_id}")
        result = self._make_request('core_course_get_contents', {'courseid': course_id})
        
        if isinstance(result, dict) and 'error' in result:
            logger.error(f"Error getting course contents: {result['error']}")
            return []
        
        logger.info(f"Retrieved {len(result) if isinstance(result, list) else 0} sections for course {course_id}")
        return result if isinstance(result, list) else []
    
    @performance_log
    def get_user_info(self, user_id: int) -> Dict:
        """Get user information."""
        logger.info(f"Getting info for user {user_id}")
        users = self._make_request('core_user_get_users_by_field', {
            'field': 'id', 
            'values[0]': user_id
        })
        
        if isinstance(users, dict) and 'error' in users:
            logger.error(f"Error getting user info: {users['error']}")
            return {}
        
        return users[0] if users and isinstance(users, list) and len(users) > 0 else {}
    
    @performance_log
    def get_site_courses(self) -> List[Dict]:
        """Get all available courses in the site."""
        logger.info("Getting all site courses")
        result = self._make_request('core_course_get_courses')
        
        if isinstance(result, dict) and 'error' in result:
            logger.error(f"Error getting site courses: {result['error']}")
            return []
        
        logger.info(f"Retrieved {len(result) if isinstance(result, list) else 0} courses from site")
        return result if isinstance(result, list) else []
    
    @performance_log
    def get_course_enrolled_users(self, course_id: int) -> List[Dict]:
        """Get all users enrolled in a specific course."""
        logger.info(f"Getting enrolled users for course {course_id}")
        result = self._make_request('core_enrol_get_enrolled_users', {'courseid': course_id})
        
        if isinstance(result, dict) and 'error' in result:
            logger.error(f"Error getting enrolled users: {result['error']}")
            return []
        
        logger.info(f"Retrieved {len(result) if isinstance(result, list) else 0} enrolled users for course {course_id}")
        return result if isinstance(result, list) else []
    
    @performance_log
    def get_activities_completion_status(self, user_id: int, course_id: int) -> Dict:
        """Get completion status for activities in a course for a specific user."""
        logger.info(f"Getting activity completion for user {user_id} in course {course_id}")
        result = self._make_request('core_completion_get_activities_completion_status', {
            'userid': user_id,
            'courseid': course_id
        })
        
        if isinstance(result, dict) and 'error' in result:
            logger.error(f"Error getting activities completion status: {result['error']}")
            return {}
        
        activities_count = len(result.get('statuses', [])) if isinstance(result, dict) else 0
        logger.info(f"Retrieved completion status for {activities_count} activities")
        return result if isinstance(result, dict) else {}
    
    @performance_log
    def get_course_tags(self, course_id: int) -> List[Dict[str, Any]]:
        """
        Get tags for a specific course using the local_fetchtags_get_tags function.
        
        Args:
            course_id: The ID of the course
            
        Returns:
            A list of tag objects with 'id' and 'name' properties
        """
        try:
            logger.info(f"Fetching tags for course ID: {course_id}")
            response = self._make_request('local_fetchtags_get_tags', {'courseid': course_id})
            
            # Check if response is valid
            if isinstance(response, dict) and 'error' in response:
                logger.error(f"Error fetching tags: {response['error']}")
                return []
                
            # Debug content of response
            logger.debug(f"Tag response: {response}")
                
            # Clean up the response if needed
            if isinstance(response, list):
                logger.info(f"Retrieved {len(response)} tags for course {course_id}")
                return response
            elif isinstance(response, dict) and 'tags' in response:
                logger.info(f"Retrieved {len(response['tags'])} tags for course {course_id}")
                return response['tags']
            else:
                logger.warning(f"Unexpected tag response format: {type(response)}")
                return []
                
        except Exception as e:
            logger.error(f"Exception fetching tags for course {course_id}: {e}", exc_info=True)
            return []
    
    @performance_log
    def get_all_course_tags(self) -> Dict[int, List[str]]:
        """
        Get tags for all courses in a single API call using local_coursetags_get_course_tags.
        This is much more efficient than fetching tags for each course individually.
        
        Returns:
            Dictionary mapping course IDs to their list of tags
        """
        logger.info("Fetching tags for all courses in a single call")
        try:
            response = self._make_request('local_coursetags_get_course_tags')
            
            # Check if response is valid
            if isinstance(response, dict) and 'error' in response:
                logger.error(f"Error fetching all course tags: {response['error']}")
                return {}
                
            # Process the response into a course_id -> tags mapping
            course_tags = {}
            if isinstance(response, list):
                for course_data in response:
                    if isinstance(course_data, dict) and 'id' in course_data and 'tags' in course_data:
                        course_id = course_data['id']
                        tags = course_data['tags']
                        if isinstance(tags, list):
                            course_tags[course_id] = tags
                
                logger.info(f"Retrieved tags for {len(course_tags)} courses in a single call")
            else:
                logger.warning(f"Unexpected response format from local_coursetags_get_course_tags: {type(response)}")
                
            return course_tags
                
        except Exception as e:
            logger.error(f"Exception fetching all course tags: {e}", exc_info=True)
            return {}

    @performance_log
    def batch_get_courses_contents(self, course_ids: List[int]) -> Dict[int, List[Dict]]:
        """
        Get content details for multiple courses in parallel.
        
        Args:
            course_ids: List of course IDs
            
        Returns:
            Dictionary mapping course IDs to their content
        """
        import concurrent.futures
        
        logger.info(f"Batch getting contents for {len(course_ids)} courses")
        results = {}
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_course = {
                executor.submit(self.get_course_contents, course_id): course_id 
                for course_id in course_ids
            }
            
            for future in concurrent.futures.as_completed(future_to_course):
                course_id = future_to_course[future]
                try:
                    results[course_id] = future.result()
                except Exception as e:
                    logger.error(f"Error getting contents for course {course_id}: {e}")
                    results[course_id] = []
        
        return results
    
    @performance_log
    def batch_get_courses_tags(self, course_ids: List[int]) -> Dict[int, List[Dict]]:
        """
        Get tags for multiple courses in parallel.
        
        Args:
            course_ids: List of course IDs
            
        Returns:
            Dictionary mapping course IDs to their tags
        """
        import concurrent.futures
        
        logger.info(f"Batch getting tags for {len(course_ids)} courses")
        results = {}
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_course = {
                executor.submit(self.get_course_tags, course_id): course_id 
                for course_id in course_ids
            }
            
            for future in concurrent.futures.as_completed(future_to_course):
                course_id = future_to_course[future]
                try:
                    results[course_id] = future.result()
                except Exception as e:
                    logger.error(f"Error getting tags for course {course_id}: {e}")
                    results[course_id] = []
        
        return results
    
    def clear_cache(self):
        """Clear the client's cache."""
        with MoodleClient._cache_lock:
            MoodleClient._cache.clear()
        logger.info("MoodleClient cache cleared")
