import axios from "axios";
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MOODLE_URL = process.env.MOODLE_URL;
const MOODLE_REGISTER_URL = `${MOODLE_URL}/webservice/rest/server.php`;
const MOODLE_LOGIN_URL = `${MOODLE_URL}/login/token.php`;
const MOODLE_API_TOKEN = process.env.MOODLE_API_TOKEN;

if (!MOODLE_URL || !MOODLE_API_TOKEN) {
    throw new Error("Missing MOODLE_URL or MOODLE_API_TOKEN in environment variables");}

/**
 * Creates a new user in Moodle
 * @async
 * @param {string} name - Full name of the user
 * @param {string} email - User's email address
 * @param {string} username - Desired username
 * @param {string} password - User's password
 * @returns {Promise<number>} Created user's ID
 * @throws {Error} If user creation fails
 */
export const createMoodleUser = async (name: string, email: string, username: string, password: string) => {
    try {
        const formData = new URLSearchParams();
        formData.append("wstoken", MOODLE_API_TOKEN);
        formData.append("wsfunction", "core_user_create_users");
        formData.append("moodlewsrestformat", "json");
        formData.append("users[0][username]", email);
        formData.append("users[0][firstname]", name.split(" ")[0]);
        formData.append("users[0][lastname]", name.split(" ").slice(1).join(" ") || "User");
        formData.append("users[0][email]", email);
        formData.append("users[0][password]", password);
        formData.append("users[0][auth]", "manual");

        console.log("Sending request to Moodle:", formData.toString());

        const response = await axios.post(MOODLE_REGISTER_URL, formData.toString(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        console.log("Moodle Response:", response.data);

        if (response.data && !response.data.exception) {
            console.log("Moodle User Created:", response.data);
            return response.data[0].id;
        } else {
            console.error("Moodle Error Response:", response.data);
            throw new Error(response.data.message || "Moodle user creation failed.");
        }
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
            console.error("Moodle API Error:", error.response?.data || error.message);
        } else {
            console.error("Unexpected Error:", error.message);
        }
        throw new Error("Failed to create Moodle user.");
    }
};
export const getMoodleToken = async (username: string, password: string): Promise<string | null> => {
    try {
        console.log("🚀 Sending request to Moodle for token");
        
        
        const response = await axios.post(MOODLE_LOGIN_URL, null, {
            params: {
                username: username.trim(),
                password: password.trim(),
                service: "MoodleAPIService", // Make sure this matches the service in Moodle
            },
        });
        if (response.data.token) {
            return response.data.token;
        } else {
            console.error("Failed to get Moodle token:", response.data);
            return null;
        }
    } catch (error) {
        console.error("Error fetching Moodle token:", error);
        return null;
    }
};
/**
 * Assigns a role to a user in Moodle
 * @async
 * @param {number} userid - Moodle user ID
 * @param {number} roleid - Moodle role ID to assign
 * @returns {Promise<any>} Response from Moodle API
 * @throws {Error} If role assignment fails
 */
export const assignUserRole = async (userid: number, roleid: number) => {
    try {
        const params = new URLSearchParams();
        params.append("wstoken", MOODLE_API_TOKEN);
        params.append("wsfunction", "core_role_assign_roles");
        params.append("moodlewsrestformat", "json");

        // Assign role at system level
        params.append("assignments[0][roleid]", String(roleid));
        params.append("assignments[0][userid]", String(userid));
        params.append("assignments[0][contextlevel]", "system");
        params.append("assignments[0][contextid]", "1"); // System context ID is always 1

        console.log("🚀 Sending system-level role assignment request:", params.toString());

        const response = await axios.post(MOODLE_REGISTER_URL, params, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        console.log("✅ Moodle Role Assignment done:", response.data);
        return response.data;
    } catch (error: any) {
        console.error("❌ Moodle Role Assignment Error:", error.response?.data || error.message);
        throw new Error("Failed to assign role.");
    }
};