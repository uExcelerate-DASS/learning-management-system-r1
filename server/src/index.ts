/**
 * Main server entry point
 * @module index
 */

import express, { Express } from "express";
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import completionRoutes from './routes/completionRoutes'; 
import { connectUserDatabase } from './config/userDb';
import debugRoutes from './routes/debugRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';

/**
 * Load environment variables from .env file
 * Path is relative to the dist directory
 */
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Express application instance
 * @type {Express}
 */
const app: Express = express();

/**
 * Server port number
 * Falls back to 3000 if PORT environment variable is not set
 * @type {number}
 */
const port = process.env.PORT || 3000;

/**
 * Initialize database connection
 */
connectUserDatabase();

/**
 * Middleware Setup
 * - CORS: Enable Cross-Origin Resource Sharing
 * - express.json(): Parse JSON request bodies
 */
app.use(cors());
app.use(express.json());

/**
 * Route Definitions
 * - /api/debug: Development and debugging endpoints
 * - /api/auth: Authentication and authorization endpoints
 * - /api/users: User management endpoints (learners & coaches)
 * - /api/completion: Module completion endpoints
 */
app.use('/api/debug', debugRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use("/api/completion", completionRoutes);


/**
 * Start the Express server
 * Logs the port number and local URL in development mode
 */
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  if (process.env.NODE_ENV === 'development') {
    console.log(`http://localhost:${port}`);
  };
});