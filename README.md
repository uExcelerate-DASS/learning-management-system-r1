# TorchBearer LMS: Personalized Learning Platform

## Project Overview

LearnerCoach is an advanced learning management platform that enhances Moodle with personalized learning paths, intelligent course recommendations, and detailed coaching analytics. The platform bridges the gap between educators and learners by providing tailored course recommendations, progress tracking, and performance analysis.

## Project Objectives

- **Personalize Learning Experiences**: Provide customized course recommendations based on user interests, behavior, and learning patterns
- **Enhance Coaching Effectiveness**: Equip coaches with tools to monitor student progress and provide timely interventions
- **Integrate with Moodle**: Seamlessly extend Moodle's capabilities without disrupting the core LMS functionality
- **Enable Data-Driven Decisions**: Provide analytics and insights to both learners and coaches

## Core Features

### For Learners
- Personalized course recommendations based on interests and learning patterns
- Progress tracking and performance analytics
- Customizable learner profiles with interest tagging
- Clear visualization of course completion and learning journey

### For Coaches
- Comprehensive dashboard to monitor student engagement and progress
- Student performance analytics and intervention tools
- Course management and content organization
- Direct integration with Moodle course editing

## Project Architecture

The project consists of three main components:

1. **Frontend Client (React)**: User interface for learners and coaches
2. **Backend API (Node.js)**: Core application logic and data management
3. **Recommendation Engine (Python/FastAPI)**: Advanced recommendation algorithms

## Technical Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Material UI
- **Backend**: Node.js, Express, TypeScript, MongoDB
- **Recommendation Engine**: Python, FastAPI, scikit-learn
- **Integration**: Moodle Web Services API
- **DevOps**: Docker, GitHub Actions

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- MongoDB
- Moodle instance with Web Services enabled
- Docker (optional)

### Installation and Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/your-org/dass-spring-2025-project-team-4.git
cd dass-spring-2025-project-team-4
```

#### 2. Setup Backend Server

```bash
cd code/server
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and Moodle credentials

# Start the server
npm run dev
```

#### 3. Setup Frontend Client

```bash
cd code/client
npm install
cp .env.example .env
# Edit .env with your API endpoints

# Start the client
npm run dev
```

#### 4. Setup Recommendation Engine

```bash
cd code/recommendation-engine
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your Moodle and MongoDB credentials

# Start the recommendation API
cd api
uvicorn main:app --reload
```

## API Documentation

### Backend API

The backend server exposes the following REST API endpoints:

#### Authentication API
- **POST** `/api/auth/login`: User login
- **POST** `/api/auth/register`: User registration
- **POST** `/api/auth/validate`: Validate authentication token

#### User API
- **GET** `/api/users/profile`: Get current user profile
- **PUT** `/api/users/profile`: Update user profile
- **PUT** `/api/users/preferences`: Update user preferences
- **GET** `/api/users/learners/:learnerId/progress`: Get specific learner's progress
- **DELETE** `/api/users/profile`: Delete user account
- **GET** `/api/users/course/:courseId`: Get course details and contents
- **GET** `/api/users/allcourses`: Get all available courses
- **GET** `/api/users/courses`: Get courses for the current user
- **GET** `/api/users/coursesprogress`: Get user courses with completion status
- **GET** `/api/users/enroll`: Enroll user in a course
- **GET** `/api/users/performance`: Get learner performance analytics
- **GET** `/api/users/categories`: Get all course categories
- **PUT** `/api/users/first-login-complete`: Mark first login complete

#### Coach API
- **GET** `/api/users/coach/courses/:userId`: Get courses coached by a user
- **GET** `/api/users/coach/students/:courseId`: Get students enrolled in a course
- **GET** `/api/users/coach/students`: Get all students from coach courses with details

#### Course Completion API
- **GET** `/api/completion/module-progress/:courseId`: Get completed modules for a course
- **POST** `/api/completion/complete-module`: Mark a module as complete
- **GET** `/api/completion/course-progress/:courseId`: Get overall course progress
- **GET** `/api/completion/activities/:courseId/:userId`: Get all activity completion statuses in a course
- **GET** `/api/completion/course/:courseId/:userId`: Get course completion status
- **POST** `/api/completion/course/self-complete`: Mark a course as self-completed
- **POST** `/api/completion/activity/update`: Update an activity's completion status manually

### Recommendation API

Available at `http://localhost:8000/docs` when the FastAPI server is running. See the detailed [Recommendation Engine Documentation](/code/recommendation-engine/README.md) for comprehensive API information.

## Project Structure

```
code/
├── client/                  # React frontend application
├── server/                  # Node.js backend API
└── recommendation-engine/   # Python recommendation service
```

## Project Deliverables

1. **Frontend Client**
   - Learner Dashboard with course recommendations
   - Coach Dashboard with student analytics
   - Course Detail views with activity recommendations
   - User profile and interest management

2. **Backend API**
   - Authentication and user management
   - Course and activity data management
   - Integration with Moodle Web Services
   - Analytics and reporting endpoints

3. **Recommendation Engine**
   - Multiple recommendation algorithms (popularity, content-based, collaborative)
   - User interest matching
   - Activity sequencing recommendations
   - Performance analytics

4. **Documentation**
   - API documentation
   - System architecture diagrams
   - User guides for learners and coaches
   - Developer documentation

## Team

### Team 4, Spring 2025
- Arshiya Noureen
- Sanyam Agarwal
- Kushal Mangla
- Vishak Kashyap
- Shreyas Deb


