"""
Configuration settings for the recommendation engine.
"""
import os
import logging
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Moodle connection - using environment variables if set, otherwise defaults
MOODLE_BASE_URL = os.environ.get("MOODLE_URL", "http://34.57.113.242/moodle")
MOODLE_TOKEN = os.environ.get("MOODLE_API_TOKEN", "")

# MongoDB connection - should be set from environment variables
MONGODB_URI = os.environ.get("MONGODB_URI", "")  # Don't provide a default, require explicit setting
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME", "test")

# API settings
API_DEBUG = os.environ.get("API_DEBUG", "true").lower() == "true"
API_LOG_LEVEL = os.environ.get("API_LOG_LEVEL", "INFO")

# Performance optimization settings
ENABLE_CACHING = os.environ.get("ENABLE_CACHING", "true").lower() == "true"
REQUEST_TIMEOUT = int(os.environ.get("REQUEST_TIMEOUT", "15"))
MAX_WORKERS = int(os.environ.get("MAX_WORKERS", "5"))
CACHE_TTL = int(os.environ.get("CACHE_TTL", "300"))  # 5 minutes by default

# Configure logger
logger = logging.getLogger("recommendation_engine")
logging.basicConfig(
    level=getattr(logging, API_LOG_LEVEL.upper(), logging.INFO),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Log configuration details (without sensitive info)
logger.info(f"Configuration loaded")
logger.info(f"MOODLE_BASE_URL: {MOODLE_BASE_URL}")
logger.info(f"ENABLE_CACHING: {ENABLE_CACHING}")
logger.info(f"REQUEST_TIMEOUT: {REQUEST_TIMEOUT} seconds")
logger.info(f"MAX_WORKERS: {MAX_WORKERS}")
logger.info(f"CACHE_TTL: {CACHE_TTL} seconds")

if MONGODB_URI:
    logger.info(f"MongoDB: Connection details provided")
else:
    logger.warning(f"MongoDB: No connection URI provided")
logger.info(f"API_DEBUG: {API_DEBUG}")
