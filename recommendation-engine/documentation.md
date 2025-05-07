# Recommendation Engine Documentation

## Overview

The recommendation engine provides personalized course and activity recommendations for users in the Moodle-based learning platform. It implements multiple recommendation strategies to suggest relevant content to learners based on their interests, behavior, and similarity to other users.

## Architecture

The recommendation engine is implemented as a REST API using FastAPI. It communicates with Moodle via its Web Services API to fetch course data, user enrollments, and activity completions. It also connects to MongoDB to access user profile information, including explicitly stated interests.

### Key Components

1. **API Layer** (`main.py`): Exposes REST endpoints to request recommendations
2. **Recommender Classes**: Multiple recommendation strategies implemented as classes
3. **MoodleClient** (`services/moodle_client.py`): Interface to Moodle Web Services
4. **Configuration** (`config.py`): System settings and environment variables

## Recommendation Algorithms

The engine implements the following recommendation strategies:

### 1. Popularity-Based Recommender

**Description**: Suggests courses and activities that are generally popular among all users.

**Key metrics**:
- Enrollment counts (weighted at 80%)
- Recency of course creation (weighted at 20%)
- Activity completion and view counts

**Configuration parameters**:
```python
POPULARITY_CONFIG = {
    'ENROLLMENT_WEIGHT': 0.8,
    'RECENCY_WEIGHT': 0.2,
    'MAX_ENROLLMENT_SCORE': 5.0,
    'RECENCY_PERIOD_DAYS': 30,
    'DEFAULT_SCORE': 2.0,
    'COMPLETION_WEIGHT': 2.0,
    'VIEW_WEIGHT': 1.0,
    'MAX_ACTIVITY_SCORE': 5.0,
    'VERBOSE': True,
}
```

### 2. Content-Based Recommender

**Description**: Analyzes course content (titles, descriptions, categories, and tags) to recommend items similar to what the user has previously engaged with.

**Key techniques**:
- TF-IDF vectorization of course content
- Cosine similarity calculation
- Tag matching with boosted weighting

**Configuration parameters**:
```python
CONTENT_CONFIG = {
    'MIN_DESCRIPTION_LENGTH': 10,
    'SIMILARITY_THRESHOLD': 0.1,
    'MAX_CONTENT_LENGTH': 10000,
    'DEFAULT_SCORE': 1.0,
    'ITEM_SCORE_THRESHOLD': 0.2,
    'ANALYZED_COURSE_FIELDS': ['fullname', 'summary', 'categoryname'],
    'ANALYZED_ACTIVITY_FIELDS': ['name', 'description', 'modname'],
    'CATEGORY_MATCH_WEIGHT': 2.0,
    'TAG_MATCH_WEIGHT': 3.0,
    'CONTENT_SIMILARITY_WEIGHT': 1.0,
    'VERBOSE': True,
}
```

### 3. Collaborative Filtering Recommender

**Description**: Identifies similar users and recommends items that those similar users have engaged with.

**Key techniques**:
- User-course enrollment matrix construction
- Cosine similarity between users
- Weighted scoring based on user similarity

**Configuration parameters**:
```python
COLLABORATIVE_CONFIG = {
    'MIN_COMMON_COURSES': 1,
    'MAX_SIMILAR_USERS': 10,
    'SIMILARITY_THRESHOLD': 0.1,
    'COURSE_SCORE_THRESHOLD': 0.2,
    'DEFAULT_SCORE': 1.0,
    'ACTIVITY_COMPLETION_WEIGHT': 3.0,
    'ACTIVITY_VIEW_WEIGHT': 1.0,
    'ACTIVITY_SCORE_THRESHOLD': 0.1,
    'VERBOSE': True,
}
```

### 4. Interests-Based Recommender

**Description**: Recommends courses that match users' explicitly stated interests from their MongoDB profiles.

**Key techniques**:
- Interest matching using MongoDB user profiles
- TF-IDF vectorization for content similarity
- Tag matching weighted by relevance

**Configuration parameters**:
```python
INTERESTS_CONFIG = {
    'MIN_DESCRIPTION_LENGTH': 10,
    'SIMILARITY_THRESHOLD': 0.1,
    'MAX_CONTENT_LENGTH': 10000,
    'DEFAULT_SCORE': 1.0,
    'ITEM_SCORE_THRESHOLD': 0.2,
    'ANALYZED_COURSE_FIELDS': ['fullname', 'summary', 'categoryname'],
    'MONGODB_URI': os.environ.get('MONGODB_URI', ''),
    'MONGODB_DB_NAME': 'test',
    'MONGODB_COLLECTION': 'users',
    'DIRECT_INTEREST_MATCH_WEIGHT': 2.0,
    'TAG_MATCH_WEIGHT': 1.5,
    'CONTENT_SIMILARITY_WEIGHT': 1.0,
    'VERBOSE': True,
}
```

### 5. Hybrid Recommender

**Description**: Combines results from all other recommendation strategies to provide more diverse and robust recommendations.

**Key features**:
- Weighted combination of all recommendation approaches
- Score normalization across different algorithms
- Explanations of why items are recommended

**Configuration parameters**:
```python
HYBRID_CONFIG = {
    'CONTENT_BASED_WEIGHT': 0.25,
    'COLLABORATIVE_WEIGHT': 0.25,
    'POPULARITY_WEIGHT': 0.15,
    'INTERESTS_BASED_WEIGHT': 0.35,
    'SCORE_NORMALIZATION': True,
    'MIN_RECOMMENDATION_SCORE': 0.1,
    'DEFAULT_SCORE_VALUE': 0.5,
    'COMBINATION_STRATEGY': 'weighted_average',
    'VERBOSE': True,
}
```

## API Endpoints

The recommendation engine provides a comprehensive set of RESTful API endpoints to access various recommendation features. All endpoints return JSON responses and follow standard HTTP status codes.

### Course Recommendations

#### Get Recommendations Using Specified Algorithm

**Endpoint**: `GET /users/{user_id}/recommendations/courses`

**Description**: Retrieve course recommendations for a specific user using any of the available recommendation algorithms.

**Path Parameters**:
- `user_id` (integer): The Moodle user ID for which to generate recommendations

**Query Parameters**:
- `algorithm` (string, optional): The recommendation algorithm to use. Defaults to "hybrid"
  - Allowed values: "popular", "content-based", "collaborative", "interests-based", "hybrid"
- `limit` (integer, optional): Maximum number of recommendations to return. Defaults to 10
- `force_refresh` (boolean, optional): If true, bypasses the cache and generates fresh recommendations. Defaults to false

**Response Format**:
```json
[
  {
    "id": 12,
    "fullname": "Introduction to Leadership",
    "summary": "Learn the fundamentals of effective leadership...",
    "categoryname": "Business",
    "imageurl": "http://moodle.example.com/pluginfile.php/1/course/images/12.jpg",
    "url": "http://moodle.example.com/course/view.php?id=12",
    "hybrid_score": 0.85,
    "popularity_score": 0.7,
    "content_score": 0.9,
    "collaborative_score": 0.8,
    "interests_score": 0.9,
    "recommendation_reason": "This course matches your interests in leadership and matches courses similar users have enrolled in",
    "enrolled": false
  },
  // Additional course recommendations...
]
```

**Example Request**:
```
GET /users/42/recommendations/courses?algorithm=hybrid&limit=5
```

#### Algorithm-Specific Endpoints

The following endpoints provide direct access to specific recommendation algorithms:

- **GET** `/users/{user_id}/recommendations/popular`
  - Returns course recommendations based solely on popularity metrics
  - Example: `GET /users/42/recommendations/popular?limit=5`

- **GET** `/users/{user_id}/recommendations/collaborative`
  - Returns course recommendations based on collaborative filtering
  - Example: `GET /users/42/recommendations/collaborative?limit=5`

- **GET** `/users/{user_id}/recommendations/content-based`
  - Returns course recommendations based on content similarity to user's current courses
  - Example: `GET /users/42/recommendations/content-based?limit=5`

- **GET** `/users/{user_id}/recommendations/interests-based`
  - Returns course recommendations based on user's explicit interests
  - Example: `GET /users/42/recommendations/interests-based?limit=5`

- **GET** `/users/{user_id}/recommendations/hybrid`
  - Returns course recommendations using a weighted combination of all algorithms
  - Example: `GET /users/42/recommendations/hybrid?limit=5`

### Activity Recommendations

#### Get Activity Recommendations Using Specified Algorithm

**Endpoint**: `GET /users/{user_id}/recommendations/courses/{course_id}/activities`

**Description**: Retrieve activity recommendations for a specific user within a course using any of the available recommendation algorithms.

**Path Parameters**:
- `user_id` (integer): The Moodle user ID
- `course_id` (integer): The Moodle course ID

**Query Parameters**:
- `algorithm` (string, optional): The recommendation algorithm to use. Defaults to "hybrid"
  - Allowed values: "popular", "content-based", "collaborative", "interests-based", "hybrid"
- `limit` (integer, optional): Maximum number of recommendations to return. Defaults to 10
- `module_type` (string, optional): Filter by activity module type
  - Allowed values: "assign", "quiz", "resource", "page", "forum", etc.

**Response Format**:
```json
[
  {
    "id": 123,
    "course_id": 12,
    "name": "Week 1 Quiz: Leadership Fundamentals",
    "description": "Test your knowledge of leadership principles...",
    "modname": "quiz",
    "module_id": 5,
    "url": "http://moodle.example.com/mod/quiz/view.php?id=123",
    "hybrid_score": 0.92,
    "popularity_score": 0.85,
    "content_score": 0.95,
    "collaborative_score": 0.88,
    "interests_score": 0.91,
    "recommendation_reason": "This activity is highly relevant to your progress in the course and has been completed by similar users",
    "completed": false,
    "section": "Week 1",
    "available_from": "2025-01-15T00:00:00Z"
  },
  // Additional activity recommendations...
]
```

**Example Request**:
```
GET /users/42/recommendations/courses/12/activities?algorithm=content-based&limit=3
```

#### Algorithm-Specific Activity Endpoints

The following endpoints provide direct access to specific activity recommendation algorithms within a course:

- **GET** `/users/{user_id}/recommendations/courses/{course_id}/popular`
  - Returns activity recommendations based solely on popularity metrics
  - Example: `GET /users/42/recommendations/courses/12/popular?limit=5`

- **GET** `/users/{user_id}/recommendations/courses/{course_id}/collaborative`
  - Returns activity recommendations based on collaborative filtering
  - Example: `GET /users/42/recommendations/courses/12/collaborative?limit=5`

- **GET** `/users/{user_id}/recommendations/courses/{course_id}/content-based`
  - Returns activity recommendations based on content similarity to user's completed activities
  - Example: `GET /users/42/recommendations/courses/12/content-based?limit=5`

- **GET** `/users/{user_id}/recommendations/courses/{course_id}/interests-based`
  - Returns activity recommendations based on user's explicit interests
  - Example: `GET /users/42/recommendations/courses/12/interests-based?limit=5`

- **GET** `/users/{user_id}/recommendations/courses/{course_id}/hybrid`
  - Returns activity recommendations using a weighted combination of all algorithms
  - Example: `GET /users/42/recommendations/courses/12/hybrid?limit=5`

### User-specific Data Endpoints

- **GET** `/users/{user_id}/courses`
  - Returns all courses a user is enrolled in
  - Query params: `include_details` (boolean)
  - Example: `GET /users/42/courses?include_details=true`

- **GET** `/users/{user_id}/interests`
  - Returns a user's explicit interests from MongoDB
  - Example: `GET /users/42/interests`

- **POST** `/users/{user_id}/interests`
  - Updates a user's interests
  - Request body: JSON array of interest strings
  - Example: `POST /users/42/interests` with body `["leadership", "time management", "communication"]`

- **GET** `/users/{user_id}/courses/{course_id}/progress`
  - Returns a user's progress in a specific course
  - Example: `GET /users/42/courses/12/progress`

### Debug & Utility Endpoints

- **GET** `/debug`
  - Description: Simple health check to verify the API is running
  - Response: `{"status": "OK", "timestamp": "2025-05-07T10:15:30Z"}`

- **GET** `/debug/moodle`
  - Description: Tests the connection to the Moodle server
  - Response: `{"status": "OK", "moodle_version": "4.1.2", "connection_time_ms": 123}`

- **GET** `/debug/mongodb-users`
  - Description: Tests the connection to MongoDB and fetches a sample of users
  - Query params: `limit` (integer, default 5)
  - Response: Sample user data with sensitive information redacted

- **GET** `/recommendation-types`
  - Description: Lists all available recommendation algorithms with descriptions
  - Response: Dictionary of algorithm names and descriptions

- **GET** `/cache/clear`
  - Description: Clears all recommendation caches
  - Query params: `type` (string, optional - specific cache to clear)
  - Response: `{"status": "OK", "message": "Cache cleared successfully"}`

- **GET** `/cache/status`
  - Description: Returns information about the cache status
  - Response: Cache hit rates, size, and other statistics

- **GET** `/performance-test`
  - Description: Runs performance tests for different recommendation algorithms
  - Query params: `iterations` (integer, default 10)
  - Response: Timing information for each algorithm

## API Integration Examples

### Frontend API Integration (React)

```typescript
// React hook for fetching course recommendations
const useCourseRecommendations = (userId: number, algorithm = 'hybrid', limit = 5) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/users/${userId}/recommendations/${algorithm}?limit=${limit}`
        );
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        setRecommendations(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [userId, algorithm, limit]);

  return { recommendations, loading, error };
};
```

### Node.js Backend Integration

```javascript
const axios = require('axios');

// Service function to fetch recommendations
async function getRecommendations(userId, algorithm = 'hybrid', limit = 5) {
  try {
    const response = await axios.get(
      `${process.env.RECOMMENDATION_API_URL}/users/${userId}/recommendations/${algorithm}`,
      {
        params: { limit },
        timeout: 5000, // 5 second timeout
      }
    );
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching recommendations: ${error.message}`);
    // Fallback to simpler algorithm if advanced algorithm fails
    if (algorithm !== 'popular' && error.response?.status === 500) {
      console.log('Falling back to popularity-based recommendations');
      return getRecommendations(userId, 'popular', limit);
    }
    throw error;
  }
}
```

### Python Client

```python
import requests
from typing import List, Dict, Any, Optional

class RecommendationClient:
    def __init__(self, base_url: str, timeout: int = 10):
        self.base_url = base_url
        self.timeout = timeout
    
    def get_course_recommendations(
        self,
        user_id: int,
        algorithm: str = 'hybrid',
        limit: int = 10,
        force_refresh: bool = False
    ) -> List[Dict[str, Any]]:
        """Fetch course recommendations for a user."""
        url = f"{self.base_url}/users/{user_id}/recommendations/{algorithm}"
        params = {'limit': limit, 'force_refresh': force_refresh}
        
        response = requests.get(url, params=params, timeout=self.timeout)
        response.raise_for_status()
        
        return response.json()
    
    def get_activity_recommendations(
        self,
        user_id: int,
        course_id: int,
        algorithm: str = 'hybrid',
        limit: int = 10,
        module_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetch activity recommendations for a user within a course."""
        url = f"{self.base_url}/users/{user_id}/recommendations/courses/{course_id}/{algorithm}"
        params = {'limit': limit}
        
        if module_type:
            params['module_type'] = module_type
            
        response = requests.get(url, params=params, timeout=self.timeout)
        response.raise_for_status()
        
        return response.json()
```

## Error Handling

All API endpoints follow standard HTTP status codes:

- **200 OK**: Request was successful
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Authenticated but not authorized to access the resource
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Request validation error
- **500 Internal Server Error**: Server-side error

Error responses include detailed information:

```json
{
  "status": "error",
  "code": 400,
  "message": "Invalid parameters",
  "details": "Parameter 'algorithm' must be one of: popular, content-based, collaborative, interests-based, hybrid"
}
```

## Configuration

The recommendation engine can be configured via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `MOODLE_URL` | URL of the Moodle site | http://34.57.113.242/moodle |
| `MOODLE_API_TOKEN` | Moodle Web Services token | (required) |
| `MONGODB_URI` | MongoDB connection URI | (required) |
| `MONGODB_DB_NAME` | MongoDB database name | test |
| `API_DEBUG` | Enable debug mode | true |
| `API_LOG_LEVEL` | Logging level | INFO |
| `ENABLE_CACHING` | Enable result caching | true |
| `REQUEST_TIMEOUT` | API request timeout | 15 |
| `MAX_WORKERS` | Max worker threads | 5 |
| `CACHE_TTL` | Cache time-to-live (seconds) | 300 |

## Usage Examples

### Python Client Example

```python
import requests

BASE_URL = "http://localhost:8000"  # Adjust as needed

# Get hybrid recommendations for user 123
response = requests.get(f"{BASE_URL}/users/123/recommendations/hybrid?limit=5")
recommendations = response.json()

for rec in recommendations:
    print(f"Course: {rec['fullname']}")
    print(f"Reason: {rec['recommendation_reason']}")
    print(f"Score: {rec.get('hybrid_score', 0)}")
    print("---")
```

### Using the API in Production

The recommendation API should be deployed as a separate service and can be accessed by the main application server. Recommendations can be cached to improve performance and reduce load on the Moodle server.

## Performance Considerations

- **Caching**: The system uses in-memory caching to avoid recalculating recommendations frequently
- **Batching**: Course enrollments are processed in batches to avoid overwhelming the Moodle server
- **Fallbacks**: If sophisticated algorithms fail, simpler ones (like popularity) are used as fallbacks

## Extending the System

To add a new recommendation algorithm:

1. Create a new class that inherits from `BaseRecommender`
2. Implement the required methods: `recommend_courses()` and `recommend_activities()`
3. Add the new recommender to the `recommendation_types` dictionary in `__init__.py`

## Troubleshooting

Common issues:

1. **Moodle Connection Errors**: Ensure the Moodle URL and API token are correct
2. **MongoDB Connection Errors**: Verify the MongoDB URI and credentials
3. **Slow Response Times**: Consider increasing caching, adjusting batch sizes, or optimizing algorithms

## Dependencies

- FastAPI: Web framework
- Requests: HTTP client for Moodle API
- pymongo: MongoDB client
- scikit-learn: For TF-IDF and cosine similarity calculations
- numpy: For numerical operations

## Security Notes

- The API should be deployed behind appropriate authentication/authorization
- Moodle API tokens should be kept secure and rotated periodically
- MongoDB credentials should be managed securely