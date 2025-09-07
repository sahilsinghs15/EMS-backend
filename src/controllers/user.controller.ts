import { NextFunction, Request, Response } from "express";
import { UserModel } from "../models/user.model.js";
import AppError from "../utils/app.error.js";
import asyncHandler from "express-async-handler";

const cookieOptions = {
	secure: process.env.NODE_ENV === "production",
	maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
	httpOnly: true,
};

export const registerUser = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const { username, email, password } = req.body;

		// Corrected logical check for required fields
		if (!username || !email || !password) {
			return next(
				new AppError("username, Email, and Password are required", 403)
			);
		}

		// Use create, which automatically saves the document
		const user = await UserModel.create({
			username: username,
			email: email,
			password: password,
		});

		if (!user) {
			return next(new AppError("User not created, some error occurred", 403));
		}

		// JWT generation does not need to be awaited
		const token = user.generateJWTToken();

		res.cookie("token", token, cookieOptions);

		res.status(201).json({
			success: true,
			message: "User created successfully",
			user,
		});
	}
);

export const loginUser = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const { email, password } = req.body;

		if (!email || !password) {
			return next(new AppError("Email and Password are required", 400));
		}

		// Explicitly select the password field for comparison
		const user = await UserModel.findOne({ email }).select("+password");

		//Admin will verify the user first
		if (user?.isVerified != true) {
			return next(new AppError("You are not verified for the login", 401));
		}

		if (!(user && (await user.comparePassword(password)))) {
			return next(
				new AppError(
					"Email or Password do not match or user does not exist",
					401
				)
			);
		}

		const token = user.generateJWTToken();
		res.cookie("token", token, cookieOptions);

		res.status(200).json({
			success: true,
			message: "User logged in successfully",
			user,
		});
	}
);

export const logoutUser = asyncHandler(
	async (_req: Request, res: Response, _next: NextFunction) => {
		res.cookie("token", null, {
			secure: process.env.NODE_ENV === "production",
			maxAge: 0,
			httpOnly: true,
		});

		res.status(200).json({
			success: true,
			message: "User logged out successfully",
		});
	}
);

export const getLoggedInUserDetails = asyncHandler(
	async (req: Request, res: Response, _next: NextFunction) => {
		const user = await UserModel.findById(req.user?._id);

		res.status(200).json({
			success: true,
			message: "User details",
			user,
		});
	}
);

export const updateUser = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const { username, email } = req.body;
		const userId = req.user?._id;

		if (!userId) {
			return next(new AppError("User ID not found in request", 400));
		}

		// Find the user by the authenticated user's ID for security
		const user = await UserModel.findById(userId);

		if (!user) {
			return next(new AppError("Invalid user id or user does not exist", 400));
		}

		if (username) {
			user.username = username;
		}
		if (email) {
			user.email = email;
		}

		await user.save();

		res.status(200).json({
			success: true,
			message: "User details updated successfully",
			user,
		});
	}
);
