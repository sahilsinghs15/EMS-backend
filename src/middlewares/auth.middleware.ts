import jwt, { JwtPayload } from "jsonwebtoken";
import AppError from "../utils/app.error.js";
import asyncHandler from "express-async-handler";
import { NextFunction, Request, Response } from "express";
import { UserDocument, UserModel } from "../models/user.model.js";

export const isLoggedIn = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const { token } = req.cookies;

		if (!token) {
			return next(
				new AppError(
					"Token not received - Unauthorized, please login to continue",
					401
				)
			);
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET ?? "");

		if (typeof decoded === "string" || !("id" in decoded)) {
			return next(
				new AppError(
					"Invalid token payload - Unauthorized, please login again",
					401
				)
			);
		}
		const decodedPayload = decoded as JwtPayload;

		const user = await UserModel.findById(decodedPayload.id);

		if (!user) {
			return next(new AppError("User not found, please login again", 401));
		}
		req.user = user;

		next();
	}
);

type Role = "USER" | "DEVELOPER" | "TEAMLEAD" | "HR" | "ADMIN";

export const authorizeRoles = (...roles: Role[]) => {
	return asyncHandler(
		async (req: Request, res: Response, next: NextFunction) => {
			const user = req.user as UserDocument;
			if (!roles.includes(user.role)) {
				return next(
					new AppError("You do not have permission to view this route", 403)
				);
			}
			next();
		}
	);
};
