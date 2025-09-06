import { Schema, model,HydratedDocument } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';

export interface IUser{
  fullName: string;
  email: string;
  password?: string; // Optional because we use select: false
  role: 'USER' | 'DEVELOPER' | 'TEAMLEAD' | 'HR' | 'ADMIN';
}

export interface IUserMethods {
  comparePassword(plainPassword: string): Promise<boolean>;
  generateJWTToken(): string;
}

// Combine the document and methods interfaces
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

const userSchema = new Schema<IUser, {}, IUserMethods>({
  fullName: {
    type: String,
    required: [true, 'Name is required'],
    minlength: [5, 'Name must be at least 5 characters'],
    lowercase: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      'Please fill in a valid email address',
    ],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  role: {
    type: String,
    enum: ['USER', 'DEVELOPER', 'TEAMLEAD', 'HR', 'ADMIN'],
    default: 'USER',
  },

}, {
  timestamps: true,
});

userSchema.pre<UserDocument>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password!, 10);
  next();
});

userSchema.methods.comparePassword = async function (plainPassword: string): Promise<boolean> {
  // NOTE: You must explicitly select the password field in your query for this to work
  // Example: User.findOne({ email: '...' }).select('+password');
  return await bcrypt.compare(plainPassword, this.password!);
};

userSchema.methods.generateJWTToken = function (): string {
  const secretKey = process.env.JWT_SECRET || 'SECRET';

  const tokenOptions = {
    expiresIn: process.env.JWT_EXPIRY || '1h',
    algorithm: 'HS256',
  } as SignOptions;

  return jwt.sign(
    { id: this._id, role: this.role },
    secretKey,
    tokenOptions,
  );
};
const User = model<IUser, IUserMethods>('User', userSchema);
export default User;


