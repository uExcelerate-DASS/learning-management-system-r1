import { User } from "@/models/User";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { createMoodleUser } from "@/services/moodleService";
import { assignUserRole } from "@/services/moodleService";
import axios from "axios";
import { getMoodleToken } from "@/services/moodleService";
import dotenv from 'dotenv';
import path from 'path';
import qs from 'qs';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const MOODLE_URL = process.env.MOODLE_URL;

/**
 * Extended Request interface for authentication routes
 * @interface AuthRequest
 * @extends Request
 */
export interface AuthRequest extends Request {
    body: {
        name?: string;
        email: string;
        password: string;
        role?:'coach' |'learner' |'admin';
    }
}

/**
 * Mapping of role names to their corresponding Moodle role IDs
 */
const roleMapping: { [key: string]: number } = {
    'admin': 1,
    'coach': 3,
    'learner': 5,
    
};

/**
 * Authenticates a user and generates a JWT token
 * @async
 * @param {AuthRequest} req - Express request object with email and password
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 * 
 * @throws {400} - If email or password is missing
 * @throws {404} - If user is not found
 * @throws {401} - If password is incorrect
 * @throws {500} - For internal server errors
 */
// export const logidfn = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
//     console.log("Login endpoint reached");
//     try {
//         console.log(req.body);
//         const { email, password } = req.body;

//         if (!email || !password) {
//             res.status(400).json({ message: "Email and password are required" });
//             return;
//         }

//         const user = await User.findOne({ email });

//         if (!user) {
//             res.status(404).json({ message: "User not found" });
//             return;
//         }

//         const isPasswordCorrect = await user.comparePassword(password);

//         if (!isPasswordCorrect) {
//             res.status(401).json({ message: "Invalid password" });
//             return;
//         }

//         // Generate JWT for your app
//         const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, { expiresIn: "1h" });

//         // Get Moodle login token
//         let moodleToken = null;
//         try {
//             moodleToken = await getMoodleToken(email, password);
//             console.log("Moodle token:", moodleToken); 
//         } catch (error) {
//             console.error("Error fetching Moodle token:", error);
//         }

//         // Construct Moodle Auto-login URL
//         const moodleAutoLoginUrl = `${MOODLE_URL}/login/index.php?token=${moodleToken}`;
//         console.log("moodleId:", user.moodleUserId);
//         res.status(200).json({ token, moodleAutoLoginUrl, user: { id: user._id, moodleToken: moodleToken, moodleid: user.moodleUserId, name: user.name, email: user.email, role: user.role, firstLogin: user.firstLogin } });
//         return;
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Internal server error" });
//         next(error);
//     } finally {
//         console.log("Login endpoint finished");
//     }
// };
export const login = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    console.log("Login endpoint reached");

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ message: "Email and password are required" });
            return;
        }

        const user = await User.findOne({ email });

        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const isPasswordCorrect = await user.comparePassword(password);
        if (!isPasswordCorrect) {
            res.status(401).json({ message: "Invalid password" });
            return;
        }

        // 1. Generate JWT for your app
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
        let moodleToken = null;
        try {
            moodleToken = await getMoodleToken(email, password);
            console.log("Moodle token:", moodleToken); 
        } catch (error) {
            console.error("Error fetching Moodle token:", error);
        }
        
        // 2. Generate Moodle one-time login URL via auth_userkey only for coach users
        let moodleLoginUrl: string | null = null;
        const moodleAutoLoginUrl = `${MOODLE_URL}/login/index.php?token=${moodleToken}`;

        // Only generate the special login URL for coach users
        if (user.role === 'coach') {
            try {
                const MOODLE_TOKEN = process.env.MOODLE_API_TOKEN; // Token for web service user
                const MOODLE_URL = process.env.MOODLE_URL || 'https://yourmoodle.com';
                const FUNCTION_NAME = 'auth_userkey_request_login_url';

                const serverUrl = `${MOODLE_URL}/webservice/rest/server.php?wstoken=${MOODLE_TOKEN}&wsfunction=${FUNCTION_NAME}&moodlewsrestformat=json`;
                console.log(email);
                const params = qs.stringify({
                    'user[username]': email, // or 'user[email]' if that's the configured mapping field
                });
            
                const response = await axios.post(serverUrl, params, {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                });
                console.log("Response from Moodle:", response.data);
                moodleLoginUrl = response.data.loginurl;
               
            } catch (error) {
                console.error('Failed to get Moodle login URL:', error);
            }
        }
      
        res.status(200).json({
            token,
            moodleAutoLoginUrl,moodleLoginUrl,
            user: {
                id: user._id,
                moodleToken: moodleToken,
                moodleid: user.moodleUserId,
                name: user.name,
                email: user.email,
                role: user.role,
                firstLogin: user.firstLogin
            }
        });
       // res.status(200).json({ token, moodleAutoLoginUrl, user: { id: user._id, moodleToken: moodleToken, moodleid: user.moodleUserId, name: user.name, email: user.email, role: user.role, firstLogin: user.firstLogin } });


    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
        next(error);
    } finally {
        console.log("Login endpoint finished");
    }
};

/**
 * Registers a new user in both the application and Moodle
 * @async
 * @param {AuthRequest} req - Express request object with user details
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 * 
 * @throws {400} - If required fields are missing
 * @throws {409} - If user already exists
 * @throws {500} - For internal server errors
 */
export const register = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    console.log("Register endpoint reached");

    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password || !role) {
            res.status(400).json({ message: "Name, email, password, and role are required" });
            return;
        }

        // Check if user already exists in the database
        let existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(409).json({ message: "User already exists" });
            return;
        }

        // First, create user in Moodle
        let userId;
        try {
            userId = await createMoodleUser(name, email, email.split('@')[0], password);
            if (!userId) {
                throw new Error("Moodle user creation failed");
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error("Error creating Moodle user:", error.response?.data || error.message);
                res.status(500).json({ message: "Moodle registration failed", error: error.response?.data || error.message });
            } else {
                console.error("Error during Moodle registration:", (error as Error).message);
                res.status(500).json({ message: "Moodle registration error: Check Email Syntax", error: (error as Error).message });
            }
            return;
        }

        // Assign role in Moodle
        try {
            const roleId = roleMapping[role];
            console.log("Role ID:", roleId);
            await assignUserRole(userId, roleId);
        } catch (error) {
            console.error("Error assigning role in Moodle:", (error as Error).message);
            res.status(500).json({ message: "Failed to assign role in Moodle", error: (error as Error).message });
            return;
        }

        // Only if Moodle registration succeeds, save the user in MongoDB
        const newUser = new User({ name, email, password, role, moodleUserId: userId, firstLogin: true });
        await newUser.save();

        // Generate JWT Token
        // const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET as string, { expiresIn: "1h" });

        res.status(201).json({
            message: "User registered successfully",
            user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role, firstLogin: newUser.firstLogin },
        });

    } catch (error) {
        console.error("Unexpected server error:", error);
        res.status(500).json({ message: "Internal server error" });
        next(error);
    } finally {
        console.log("Register endpoint finished");
    }
};

/**
 * Validates a JWT token and returns user information
 * @async
 * @param {AuthRequest} req - Express request object with authorization header
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * @returns {Promise<void>}
 * 
 * @throws {400} - If token is missing
 * @throws {404} - If user is not found
 * @throws {500} - For internal server errors
 */
export const validateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    console.log("Validate token endpoint reached");
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            res.status(400).json({ message: "Token is required" });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;

        const user = await User.findById(decoded.id);

        if (!user) {
            res.status(404).json({ message: "No user found with this id" });
            return;
        }

        res.status(200).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
        return;
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
        next(error);
        return;
    } finally {
        console.log("Validate token endpoint finished");
    }
}