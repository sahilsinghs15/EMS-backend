import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { createReadStream, promises as fsPromises } from "fs";
import { parse as parseCsv } from "csv-parse";
import ExcelJS from "exceljs";
import AppError from "../utils/app.error.js";
import { mapFileDataToSchema } from "../helpers/mapFileData.js";
import { Employee, IEmployee } from "../models/employee.model.js";
import { UserModel } from "../models/user.model.js";
import { Types } from "mongoose";

interface RequestWithId extends Request {
	params: {
		id: string;
	};
}

// @Admin
export const createEmployee = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		let filePath: string | undefined;

		try {
			if (req.file) {
				if (!req.file.path) {
					return next(new AppError("Uploaded file path is missing.", 400));
				}

				filePath = req.file.path;
				let employeesData: IEmployee[] = [];

				if (req.file.originalname.endsWith(".xlsx")) {
					const workbook = new ExcelJS.Workbook();
					await workbook.xlsx.readFile(filePath);
					const worksheet = workbook.getWorksheet(1);

					if (!worksheet) {
						return next(
							new AppError(
								"The uploaded file does not contain a valid worksheet.",
								400
							)
						);
					}

					const data: any[] = [];
					const header: string[] = [];
					worksheet.getRow(1)?.eachCell((cell, colNumber) => {
						header[colNumber - 1] = cell.value?.toString() || "";
					});

					worksheet.eachRow((row, rowNumber) => {
						if (rowNumber > 1) {
							const rowData: any = {};
							row.eachCell((cell, colNumber) => {
								rowData[header[colNumber - 1]!] = cell.value;
							});
							data.push(rowData);
						}
					});

					employeesData = mapFileDataToSchema(data);
				} else if (req.file.originalname.endsWith(".csv")) {
					const data = await new Promise<any[]>((resolve, reject) => {
						const parsedData: any[] = [];
						const stream = createReadStream(filePath!);
						stream
							.pipe(parseCsv({ columns: true }))
							.on("data", (row: any) => {
								parsedData.push(row);
							})
							.on("end", () => resolve(parsedData))
							.on("error", (error: any) => reject(error));
					});

					employeesData = mapFileDataToSchema(data);
				} else {
					return next(new AppError("Unsupported file type", 400));
				}

				const userAccountsInFile = employeesData
					.map((emp) => emp.userAccount)
					.filter(Boolean);

				if (userAccountsInFile.length > 0) {
					const existingUsers = await UserModel.find({
						_id: { $in: userAccountsInFile },
					});

					if (existingUsers.length !== userAccountsInFile.length) {
						const existingUserIds = new Set(
							existingUsers.map((user) => user._id.toString())
						);
						const missingIds = userAccountsInFile.filter(
							(id) => !existingUserIds.has(id!.toString())
						);
						return next(
							new AppError(
								`One or more user accounts not found. Missing IDs: ${missingIds.join(
									", "
								)}`,
								404
							)
						);
					}
				}

				const result = await Employee.insertMany(employeesData, {
					ordered: false,
				});

				const usersToVerify = employeesData.filter((emp) => emp.userAccount);
				if (usersToVerify.length > 0) {
					const updatePromises = usersToVerify.map((emp) =>
						UserModel.findByIdAndUpdate(emp.userAccount, { isVerified: true })
					);
					await Promise.all(updatePromises);
				}

				res.status(201).json({
					success: true,
					message: `${result.length} employees created successfully`,
					employees: result,
				});
			} else {
				const {
					fullName,
					employeeId,
					dateOfBirth,
					gender,
					nationality,
					photoUrl,
					employmentInfo,
					contactInfo,
					userAccount,
				} = req.body;

				if (
					!fullName ||
					!employeeId ||
					!dateOfBirth ||
					!employmentInfo ||
					!contactInfo
				) {
					return next(
						new AppError("Missing required fields for manual entry.", 400)
					);
				}

				if (userAccount) {
					const userExists = await UserModel.exists({ _id: userAccount });
					if (!userExists) {
						return next(new AppError("User account not found.", 404));
					}
				}

				const employee = await Employee.create({
					fullName,
					employeeId,
					dateOfBirth,
					gender,
					nationality,
					photoUrl,
					employmentInfo,
					contactInfo,
					userAccount,
				});

				if (userAccount) {
					await UserModel.findByIdAndUpdate(userAccount, { isVerified: true });
				}

				res.status(201).json({
					success: true,
					message: "Employee created successfully",
					employee,
				});
			}
		} catch (error: any) {
			if (error.code === 11000) {
				return next(
					new AppError("Duplicate employee ID or email found in file.", 409)
				);
			}
			return next(
				new AppError(`File processing failed: ${error.message}`, 500)
			);
		} finally {
			if (filePath) {
				try {
					await fsPromises.unlink(filePath);
				} catch (unlinkError) {
					console.error("Error deleting temporary file:", unlinkError);
				}
			}
		}
	}
);

// @Admin
export const getAllEmployees = asyncHandler(
	async (req: Request, res: Response) => {
		const employees = await Employee.find({});
		res.status(200).json({
			success: true,
			message: "Employees data fetched successfully",
			employees,
		});
	}
);

// @User or @Admin
export const getEmployee = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const userId = req.user?._id;
		if (!userId) {
			return next(new AppError("User not authenticated", 401));
		}

		const employee = await Employee.findOne({ userAccount: userId });

		if (!employee) {
			return next(new AppError("Employee does not exist", 404));
		}

		res.status(200).json({
			success: true,
			message: "Employee details fetched successfully",
			employee,
		});
	}
);

// @Admin
export const findEmployeeById = asyncHandler(
	async (req: RequestWithId, res: Response, next: NextFunction) => {
		if (!req.params.id || !Types.ObjectId.isValid(req.params.id)) {
			return next(new AppError("Invalid employee ID provided", 400));
		}

		const employee = await Employee.findById(req.params.id);

		if (!employee) {
			return next(new AppError("Employee not found", 404));
		}

		res.status(200).json({
			success: true,
			message: "Employee found successfully",
			employee,
		});
	}
);

// @Admin
export const updateEmployee = asyncHandler(
	async (req: RequestWithId, res: Response, next: NextFunction) => {
		if (req.body.userAccount || req.body.employeeId) {
			return next(
				new AppError(
					"Updating 'userAccount' or 'employeeId' is not allowed.",
					403
				)
			);
		}

		if (!req.params.id || !Types.ObjectId.isValid(req.params.id)) {
			return next(new AppError("Invalid employee ID provided", 400));
		}

		const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true,
		});

		if (!employee) {
			return next(new AppError("Employee not found", 404));
		}

		res.status(200).json({
			success: true,
			message: "Employee updated successfully",
			employee,
		});
	}
);

// @Admin
export const deleteEmployee = asyncHandler(
	async (req: RequestWithId, res: Response, next: NextFunction) => {
		if (!req.params.id || !Types.ObjectId.isValid(req.params.id)) {
			return next(new AppError("Invalid employee ID provided", 400));
		}

		const employee = await Employee.findById(req.params.id);

		if (!employee) {
			return next(new AppError("Employee not found", 404));
		}

		const user = await UserModel.findById(employee.userAccount);
		if (!user) {
			return next(new AppError("User does not exist", 404));
		}

		if (user.role === "ADMIN") {
			return next(
				new AppError(
					"Employee Data of the user having ADMIN Role Cannot deleted!",
					403
				)
			);
		}

		await Employee.findByIdAndDelete(req.params.id);

		res.status(200).json({
			success: true,
			message: "Employee deleted successfully",
			data: null,
		});
	}
);
