import { Schema, model, HydratedDocument } from "mongoose";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { Model } from "mongoose";

export interface IUser {
	username: string;
	email: string;
	password?: string; // Optional because we use select: false
	role: "USER" | "DEVELOPER" | "TEAMLEAD" | "HR" | "ADMIN";
	isVerified: boolean;
}

export interface IUserMethods {
	comparePassword(plainPassword: string): Promise<boolean>;
	generateJWTToken(): string;
}

// Combine the document and methods interfaces
export type UserDocument = HydratedDocument<IUser, IUserMethods>;

const userSchema = new Schema<IUser, {}, IUserMethods>(
	{
		username: {
			type: String,
			required: [true, "username is required"],
			minlength: [5, "username must be at least 5 characters"],
			unique: [true, "username must be unique"],
			lowercase: true,
			trim: true,
		},
		email: {
			type: String,
			required: [true, "Email is required"],
			unique: true,
			lowercase: true,
			match: [
				/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
				"Please fill in a valid email address",
			],
		},
		password: {
			type: String,
			required: [true, "Password is required"],
			minlength: [8, "Password must be at least 8 characters"],
			select: false,
		},
		role: {
			type: String,
			enum: ["USER", "DEVELOPER", "TEAMLEAD", "HR", "ADMIN"],
			default: "USER",
		},
		isVerified: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
	}
);

userSchema.set("toJSON", {
	transform: (doc, ret: any) => {
		delete ret.password;
		delete ret.__v;
		return ret;
	},
});

userSchema.pre<UserDocument>("save", async function (next) {
	if (!this.isModified("password")) {
		return next();
	}
	this.password = await bcrypt.hash(this.password!, 10);
	next();
});

userSchema.methods.comparePassword = async function (
	plainPassword: string
): Promise<boolean> {
	return await bcrypt.compare(plainPassword, this.password!);
};

userSchema.methods.generateJWTToken = function (): string {
	const secretKey = process.env.JWT_SECRET || "SECRET";

	const tokenOptions = {
		expiresIn: process.env.JWT_EXPIRY || "1h",
		algorithm: "HS256",
	} as SignOptions;

	return jwt.sign({ id: this._id, role: this.role }, secretKey, tokenOptions);
};
const User = model<IUser, IUserMethods>("User", userSchema);
export const UserModel = User as unknown as Model<IUser, {}, IUserMethods>;
