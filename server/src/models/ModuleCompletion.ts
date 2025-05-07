import mongoose, { Schema, Document } from 'mongoose';

export interface IModuleCompletion extends Document {
  userId: string;
  courseId: number;
  moduleId: number;
  completedAt: Date;
}

const ModuleCompletionSchema: Schema = new Schema({
  userId: { type: String, required: true },
  courseId: { type: Number, required: true },
  moduleId: { type: Number, required: true },
  completedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Create a compound index to ensure one completion record per user-module combination
ModuleCompletionSchema.index({ userId: 1, courseId: 1, moduleId: 1 }, { unique: true });

export default mongoose.model<IModuleCompletion>('ModuleCompletion', ModuleCompletionSchema);