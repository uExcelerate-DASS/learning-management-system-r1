import mongoose from 'mongoose';

/**
 * Establishes connection to MongoDB database
 * @async
 * @function connectUserDatabase
 * @throws {Error} If connection fails
 * @returns {Promise<void>}
 */
export const connectUserDatabase = async () => {
    try {
        // Set up connection event listeners
        mongoose.connection.on('connected', () => {
            console.log('Connected to MongoDB at: ', process.env.MONGODB_URI);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('Disconnected from MongoDB');
        });
        
        // Attempt to connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI as string);
    } catch (error) {
        console.error('Error connecting to MongoDB: ', error);
        process.exit(1);
    }
};