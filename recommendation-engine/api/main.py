from fastapi import FastAPI, Depends, HTTPException, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from typing import List, Dict, Optional, Any
import time
from pydantic import BaseModel

from .services.moodle_client import MoodleClient
from .config import MOODLE_BASE_URL, MOODLE_TOKEN, ENABLE_CACHING
from .recommenders import recommendation_types, BaseRecommender, PopularRecommender, CollaborativeRecommender, ContentBasedRecommender, HybridRecommender, InterestsBasedRecommender

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Recommendation Engine API",
    description="API for the recommendation engine",
    version="1.0.0",
    docs_url="/docs",
)

# Allow CORS for all origins
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache for memoization of recommendations
recommendation_cache = {}
CACHE_TTL = 300  # Cache time-to-live in seconds (5 minutes)

# Dependency to get Moodle client
def get_moodle_client():
    if not MOODLE_TOKEN:
        logger.warning("No Moodle token provided. API calls to Moodle will fail.")
    return MoodleClient(MOODLE_BASE_URL, MOODLE_TOKEN, timeout=15)

@app.on_event("startup")
async def startup_event():
    """Run startup tasks."""
    logger.info("Starting recommendation engine API")
    logger.info(f"Moodle URL: {MOODLE_BASE_URL}")
    logger.info(f"Caching enabled: {ENABLE_CACHING}")
    
    # Test Moodle connection on startup
    try:
        client = get_moodle_client()
        info = client.test_connection()
        if 'error' in info:
            logger.error(f"Moodle connection test failed: {info['error']}")
        else:
            logger.info(f"Connected to Moodle site: {info.get('sitename', 'Unknown')}")
    except Exception as e:
        logger.error(f"Error testing Moodle connection: {e}")

@app.get("/debug", response_model=Dict[str, str])
async def debug():
    """
    Debug endpoint to check if the API is running.
    """
    return JSONResponse(content={"status": "API is running"})

@app.get("/debug/moodle", response_model=Dict[str, Any])
async def debug_moodle(
    moodle_client: MoodleClient = Depends(get_moodle_client)
):
    """
    Debug endpoint to check if the Moodle client is working.
    """
    start_time = time.time()
    logger.info("Testing Moodle connection")
    
    response = moodle_client.test_connection()
    if "error" in response:
        logger.error(f"Moodle connection test failed: {response['error']}")
        raise HTTPException(status_code=500, detail=response["error"])
        
    end_time = time.time()
    logger.info(f"Moodle connection test successful in {end_time - start_time:.2f} seconds")
    
    return JSONResponse(content={
        "status": "Moodle client is working", 
        "data": response,
        "execution_time_seconds": end_time - start_time
    })

@app.get("/cache/clear", response_model=Dict[str, Any])
async def clear_cache(
    moodle_client: MoodleClient = Depends(get_moodle_client)
):
    """
    Clear all caches in the system.
    """
    logger.info("Clearing all caches")
    
    # Clear moodle client cache
    moodle_client.clear_cache()
    
    # Clear recommendation cache
    global recommendation_cache
    recommendation_cache = {}
    
    return JSONResponse(content={"success": True, "message": "All caches cleared"})

@app.get("/cache/status", response_model=Dict[str, Any])
async def cache_status():
    """
    Get current cache status.
    """
    return JSONResponse(content={
        "success": True, 
        "cached_recommendations": len(recommendation_cache),
        "enable_caching": ENABLE_CACHING
    })

@app.get("/recommendation-types", response_model=Dict[str, List[str]])
async def get_recommendation_types():
    """
    Get available recommendation algorithms.
    """
    return JSONResponse(content={"success": True, "recommendation_types": list(recommendation_types.keys())})

@app.get("/users/{user_id}/recommendations/courses", response_model=List[Dict[str, Any]])
async def get_course_recommendations(
    user_id: int = Path(..., description="User ID"),
    algorithm: str = Query("popular", description="Recommendation algorithm to use"),
    limit: int = Query(5, description="Maximum number of recommendations to return"),
    force_refresh: bool = Query(False, description="Force refresh the recommendations"),
    moodle_client: MoodleClient = Depends(get_moodle_client)
):
    """
    Get course recommendations for a specific user.
    """
    start_time = time.time()
    
    # Generate cache key
    cache_key = f"courses_{user_id}_{algorithm}_{limit}"
    
    # Check cache first if not forcing refresh
    if not force_refresh and ENABLE_CACHING and cache_key in recommendation_cache:
        cache_entry = recommendation_cache[cache_key]
        # Check if cache is still valid
        if time.time() - cache_entry["timestamp"] < CACHE_TTL:
            logger.info(f"Returning cached recommendations for user {user_id} using {algorithm}")
            end_time = time.time()
            return JSONResponse(content={
                "data": cache_entry["data"],
                "cached": True,
                "execution_time_seconds": end_time - start_time
            })
    
    logger.info(f"Getting course recommendations for user {user_id} using {algorithm} algorithm")
    
    if algorithm not in recommendation_types:
        logger.error(f"Unknown recommendation algorithm: {algorithm}")
        raise HTTPException(status_code=400, detail=f"Unknown recommendation algorithm: {algorithm}")
    
    recommender_class = recommendation_types[algorithm]
    recommender = recommender_class(moodle_client)
    
    try:
        recommendations = recommender.recommend_courses(user_id, limit)
        logger.info(f"Generated {len(recommendations)} course recommendations for user {user_id}")
        
        # Cache the results
        if ENABLE_CACHING:
            recommendation_cache[cache_key] = {
                "data": recommendations,
                "timestamp": time.time()
            }
        
        end_time = time.time()
        logger.info(f"Generated recommendations in {end_time - start_time:.2f} seconds")
        
        return JSONResponse(content={
            "data": recommendations,
            "cached": False,
            "execution_time_seconds": end_time - start_time
        })
    except Exception as e:
        logger.error(f"Error generating recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate recommendations: {str(e)}")

@app.get("/performance-test", response_model=Dict[str, Any])
async def performance_test(
    moodle_client: MoodleClient = Depends(get_moodle_client)
):
    """
    Run a performance test to check API response times.
    """
    results = {}
    total_time = time.time()
    
    # Test connection
    start = time.time()
    connection_info = moodle_client.test_connection()
    results["test_connection"] = time.time() - start
    
    # Test getting all courses
    start = time.time()
    courses = moodle_client.get_site_courses()
    results["get_site_courses"] = time.time() - start
    results["courses_count"] = len(courses)
    
    # Test course contents if we have courses
    if courses and len(courses) > 0:
        course_id = courses[0]["id"]
        
        # Test single course content
        start = time.time()
        content = moodle_client.get_course_contents(course_id)
        results["get_course_contents"] = time.time() - start
        
        # Test course tags
        start = time.time()
        tags = moodle_client.get_course_tags(course_id)
        results["get_course_tags"] = time.time() - start
        
        # Test enrolled users
        start = time.time()
        users = moodle_client.get_course_enrolled_users(course_id)
        results["get_course_enrolled_users"] = time.time() - start
        results["enrolled_users_count"] = len(users)
    
    results["total_execution_time"] = time.time() - total_time
    
    return JSONResponse(content={
        "success": True,
        "performance_results": results
    })

# Remaining endpoints from the original file remain unchanged
@app.get("/users/{user_id}/recommendations/courses/{course_id}/activities", response_model=List[Dict[str, Any]])
async def get_activity_recommendations(
    user_id: int = Path(..., description="User ID"),
    course_id: int = Path(..., description="Course ID"),
    algorithm: str = Query("popular", description="Recommendation algorithm to use"),
    limit: int = Query(5, description="Maximum number of recommendations to return"),
    moodle_client: MoodleClient = Depends(get_moodle_client)
):
    """
    Get activity recommendations for a specific user within a course.
    """
    logger.info(f"Getting activity recommendations for user {user_id} in course {course_id} using {algorithm} algorithm")
    
    if algorithm not in recommendation_types:
        logger.error(f"Unknown recommendation algorithm: {algorithm}")
        raise HTTPException(status_code=400, detail=f"Unknown recommendation algorithm: {algorithm}")
    
    recommender_class = recommendation_types[algorithm]
    recommender = recommender_class(moodle_client)
    
    try:
        recommendations = recommender.recommend_activities(user_id, course_id, limit)
        logger.info(f"Generated {len(recommendations)} activity recommendations for user {user_id} in course {course_id}")
        return recommendations
    except Exception as e:
        logger.error(f"Error generating activity recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate activity recommendations: {str(e)}")

@app.get("/users/{user_id}/recommendations/popular", response_model=List[Dict[str, Any]])
async def get_popular_recommendations(
    user_id: int = Path(..., description="User ID"),
    limit: int = Query(5, description="Maximum number of recommendations to return"),
    moodle_client: MoodleClient = Depends(get_moodle_client)
):
    """
    Get popular course recommendations for a specific user.
    This is a shortcut endpoint for the popular recommendation algorithm.
    """
    logger.info(f"Getting popular recommendations for user {user_id}")
    recommender = PopularRecommender(moodle_client)
    
    try:
        recommendations = recommender.recommend_courses(user_id, limit)
        logger.info(f"Generated {len(recommendations)} popular recommendations for user {user_id}")
        return recommendations
    except Exception as e:
        logger.error(f"Error generating popular recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate popular recommendations: {str(e)}")

@app.get("/users/{user_id}/recommendations/collaborative", response_model=List[Dict[str, Any]])
async def get_collaborative_recommendations(
    user_id: int = Path(..., description="User ID"),
    limit: int = Query(5, description="Maximum number of recommendations to return"),
    moodle_client: MoodleClient = Depends(get_moodle_client)
):
    """
    Get collaborative filtering course recommendations for a specific user.
    This is a shortcut endpoint for the collaborative recommendation algorithm.
    """
    logger.info(f"Getting collaborative recommendations for user {user_id}")
    recommender = CollaborativeRecommender(moodle_client)
    
    try:
        recommendations = recommender.recommend_courses(user_id, limit)
        logger.info(f"Generated {len(recommendations)} collaborative recommendations for user {user_id}")
        return recommendations
    except Exception as e:
        logger.error(f"Error generating collaborative recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate collaborative recommendations: {str(e)}")

@app.get("/users/{user_id}/recommendations/courses/{course_id}/collaborative", response_model=List[Dict[str, Any]])
async def get_collaborative_activity_recommendations(
    user_id: int = Path(..., description="User ID"),
    course_id: int = Path(..., description="Course ID"),
    limit: int = Query(5, description="Maximum number of recommendations to return"),
    moodle_client: MoodleClient = Depends(get_moodle_client)
):
    """
    Get collaborative filtering activity recommendations for a specific user within a course.
    This is a shortcut endpoint for the collaborative recommendation algorithm for activities.
    """
    logger.info(f"Getting collaborative activity recommendations for user {user_id} in course {course_id}")
    recommender = CollaborativeRecommender(moodle_client)
    
    try:
        recommendations = recommender.recommend_activities(user_id, course_id, limit)
        logger.info(f"Generated {len(recommendations)} collaborative activity recommendations for user {user_id} in course {course_id}")
        return recommendations
    except Exception as e:
        logger.error(f"Error generating collaborative activity recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate collaborative activity recommendations: {str(e)}")

@app.get("/users/{user_id}/recommendations/content-based", response_model=List[Dict[str, Any]])
async def get_content_based_recommendations(
    user_id: int = Path(..., description="User ID"),
    limit: int = Query(5, description="Maximum number of recommendations to return"),
    moodle_client: MoodleClient = Depends(get_moodle_client)
):
    """
    Get content-based course recommendations for a specific user.
    This is a shortcut endpoint for the content-based recommendation algorithm.
    """
    logger.info(f"Getting content-based recommendations for user {user_id}")
    recommender = ContentBasedRecommender(moodle_client)
    
    try:
        recommendations = recommender.recommend_courses(user_id, limit)
        logger.info(f"Generated {len(recommendations)} content-based recommendations for user {user_id}")
        return recommendations
    except Exception as e:
        logger.error(f"Error generating content-based recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate content-based recommendations: {str(e)}")

@app.get("/users/{user_id}/recommendations/courses/{course_id}/content-based", response_model=List[Dict[str, Any]])
async def get_content_based_activity_recommendations(
    user_id: int = Path(..., description="User ID"),
    course_id: int = Path(..., description="Course ID"),
    limit: int = Query(5, description="Maximum number of recommendations to return"),
    moodle_client: MoodleClient = Depends(get_moodle_client)
):
    """
    Get content-based activity recommendations for a specific user within a course.
    This is a shortcut endpoint for the content-based recommendation algorithm for activities.
    """
    logger.info(f"Getting content-based activity recommendations for user {user_id} in course {course_id}")
    recommender = ContentBasedRecommender(moodle_client)
    
    try:
        recommendations = recommender.recommend_activities(user_id, course_id, limit)
        logger.info(f"Generated {len(recommendations)} content-based activity recommendations for user {user_id} in course {course_id}")
        return recommendations
    except Exception as e:
        logger.error(f"Error generating content-based activity recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate content-based activity recommendations: {str(e)}")

@app.get("/users/{user_id}/recommendations/hybrid", response_model=List[Dict[str, Any]])
async def get_hybrid_recommendations(
    user_id: int = Path(..., description="User ID"),
    limit: int = Query(5, description="Maximum number of recommendations to return"),
    moodle_client: MoodleClient = Depends(get_moodle_client)
):
    """
    Get hybrid course recommendations for a specific user.
    This is a shortcut endpoint for the hybrid recommendation algorithm that combines
    content-based, collaborative, and popularity-based recommendations.
    """
    logger.info(f"Getting hybrid recommendations for user {user_id}")
    recommender = HybridRecommender(moodle_client)
    
    try:
        recommendations = recommender.recommend_courses(user_id, limit)
        logger.info(f"Generated {len(recommendations)} hybrid recommendations for user {user_id}")
        return recommendations
    except Exception as e:
        logger.error(f"Error generating hybrid recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate hybrid recommendations: {str(e)}")

@app.get("/users/{user_id}/recommendations/courses/{course_id}/hybrid", response_model=List[Dict[str, Any]])
async def get_hybrid_activity_recommendations(
    user_id: int = Path(..., description="User ID"),
    course_id: int = Path(..., description="Course ID"),
    limit: int = Query(5, description="Maximum number of recommendations to return"),
    moodle_client: MoodleClient = Depends(get_moodle_client)
):
    """
    Get hybrid activity recommendations for a specific user within a course.
    This is a shortcut endpoint for the hybrid recommendation algorithm that combines
    content-based, collaborative, and popularity-based activity recommendations.
    """
    logger.info(f"Getting hybrid activity recommendations for user {user_id} in course {course_id}")
    recommender = HybridRecommender(moodle_client)
    
    try:
        recommendations = recommender.recommend_activities(user_id, course_id, limit)
        logger.info(f"Generated {len(recommendations)} hybrid activity recommendations for user {user_id} in course {course_id}")
        return recommendations
    except Exception as e:
        logger.error(f"Error generating hybrid activity recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate hybrid activity recommendations: {str(e)}")

@app.get("/users/{user_id}/recommendations/interests-based", response_model=List[Dict[str, Any]])
async def get_interests_based_recommendations(
    user_id: int = Path(..., description="User ID"),
    limit: int = Query(5, description="Maximum number of recommendations to return"),
    moodle_client: MoodleClient = Depends(get_moodle_client)
):
    """
    Get interest-based course recommendations for a specific user.
    This is a shortcut endpoint for the interests-based recommendation algorithm
    that uses the user's MongoDB profile interests.
    """
    logger.info(f"Getting interest-based recommendations for user {user_id}")
    recommender = InterestsBasedRecommender(moodle_client)
    
    try:
        recommendations = recommender.recommend_courses(user_id, limit)
        logger.info(f"Generated {len(recommendations)} interest-based recommendations for user {user_id}")
        return recommendations
    except Exception as e:
        logger.error(f"Error generating interest-based recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate interest-based recommendations: {str(e)}")

@app.get("/users/{user_id}/recommendations/courses/{course_id}/interests-based", response_model=List[Dict[str, Any]])
async def get_interests_based_activity_recommendations(
    user_id: int = Path(..., description="User ID"),
    course_id: int = Path(..., description="Course ID"),
    limit: int = Query(5, description="Maximum number of recommendations to return"),
    moodle_client: MoodleClient = Depends(get_moodle_client)
):
    """
    Get interest-based activity recommendations for a specific user within a course.
    This is a shortcut endpoint for the interests-based recommendation algorithm for activities,
    using the user's MongoDB profile interests.
    """
    logger.info(f"Getting interest-based activity recommendations for user {user_id} in course {course_id}")
    recommender = InterestsBasedRecommender(moodle_client)
    
    try:
        recommendations = recommender.recommend_activities(user_id, course_id, limit)
        logger.info(f"Generated {len(recommendations)} interest-based activity recommendations for user {user_id} in course {course_id}")
        return recommendations
    except Exception as e:
        logger.error(f"Error generating interest-based activity recommendations: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate interest-based activity recommendations: {str(e)}")

@app.get("/debug/mongodb-users", response_model=Dict[str, Any])
async def get_mongodb_users():
    """
    Debug endpoint to fetch user data from MongoDB.
    """
    try:
        import pymongo
        import os
        from dotenv import load_dotenv
        
        # Load environment variables from .env file
        load_dotenv()
        
        # Get MongoDB connection string
        mongo_uri = os.getenv("MONGODB_URI")
        if not mongo_uri:
            return JSONResponse(content={"error": "MongoDB URI not found in environment"})
        
        # Connect to MongoDB
        client = pymongo.MongoClient(mongo_uri)
        db = client["test"]  # Using the "test" database as specified
        users = db["users"]  # Assuming the collection name is "users"
        
        # Fetch a limited number of users
        user_data = list(users.find({}, {"password": 0}).limit(5))  # Exclude password for security
        
        # Convert ObjectId to string for JSON serialization
        for user in user_data:
            if "_id" in user:
                user["_id"] = str(user["_id"])
        
        return JSONResponse(content={"success": True, "users": user_data})
    except Exception as e:
        logger.error(f"Error fetching MongoDB users: {e}", exc_info=True)
        return JSONResponse(content={"error": str(e)}, status_code=500)
