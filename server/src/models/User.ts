import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * User Interface Definition
 * @interface IUser
 * @extends Document
 */
export interface IUser extends Document {
    email: string;
    password: string;
    name: string;
    moodleUserId?: number;
    role: 'learner' | 'coach' | 'admin';
    firstLogin: boolean; // Add firstLogin field
    preferences: {
        interests: string[];
    };
    profile?: {
        favoritePasstime?: string;
        productivityHabit?: string;
        skillInProgress?: string;
    };
    comparePassword: (password: string) => Promise<boolean>;
}

/**
 * Mongoose Schema for User
 */
const userSchema = new Schema<IUser>({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    moodleUserId: { type: Number },
    role: { type: String, required: true, enum: ['learner', 'coach', 'admin'] },
    firstLogin: { type: Boolean, default: true }, // Default to true for new users
    preferences: {
        interests: [{ type: String }],
    },
    profile: {
        favoritePasstime: { type: String },
        productivityHabit: { type: String },
        skillInProgress: { type: String },
    }
}, { timestamps: true });

/**
 * Password hashing middleware
 */
userSchema.pre<IUser>('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(this.password, salt);
        this.password = hash;
        return next();
    } catch (error: any) {
        return next(error);
    }
});

/**
 * Password comparison method
 * @param password 
 * @returns 
 */
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
};

export const User = mongoose.model<IUser>('User', userSchema);