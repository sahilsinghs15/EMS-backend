import { Request, Response, NextFunction } from "express";
import asyncHandler from "express-async-handler";
import { unlinkSync, createReadStream } from "fs";
import { parse as parseCsv } from "csv-parse";
import ExcelJS from "exceljs";
import AppError from "../utils/app.error.js";
import { mapFileDataToSchema } from "../helpers/mapFileData.js";
import { Employee, IEmployee } from "../models/employee.model.js";
import { UserModel } from "../models/user.model.js";

export const createEmployee = asyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		// Check if a file was uploaded
		if (req.file) {
			// Handle bulk upload
			const filePath = req.file.path;
			let employeesData: IEmployee[] = [];

			try {
				if (req.file.originalname.endsWith(".xlsx")) {
					// Parse .xlsx file using ExcelJS
					const workbook = new ExcelJS.Workbook();
					await workbook.xlsx.readFile(filePath);
					const worksheet = workbook.getWorksheet(1);

					// Check if the worksheet exists
					if (!worksheet) {
						return next(
							new AppError(
								"The uploaded file does not contain a valid worksheet.",
								400
							)
						);
					}

					// Convert worksheet data to JSON
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
					// Parse .csv file
					const data = await new Promise<any[]>((resolve, reject) => {
						const parsedData: any[] = [];
						const stream = createReadStream(filePath);
						stream
							.pipe(parseCsv({ columns: true }))
							.on("data", (row: any) => parsedData.push(row))
							.on("end", () => resolve(parsedData))
							.on("error", (error: any) => reject(error));
					});
					employeesData = mapFileDataToSchema(data);
				} else {
					return next(new AppError("Unsupported file type", 400));
				}

				const userAccountsInFile = employeesData
					.map((emp) => emp.userAccount)
					.filter(Boolean); // Filter out undefined or null values

				if (userAccountsInFile.length > 0) {
					const existingUsers = await UserModel.find({
						_id: { $in: userAccountsInFile },
					});

					if (existingUsers.length !== userAccountsInFile.length) {
						// Find the missing IDs for a more detailed error message
						const existingUserIds = new Set(
							existingUsers.map((user) => user._id.toString())
						);
						const missingIds = userAccountsInFile.filter(
							(id) => !existingUserIds.has(id!.toString())
						);

						// Clean up the temporary file before returning an error
						unlinkSync(filePath);
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
				// Insert data into the database in bulk
				const result = await Employee.insertMany(employeesData, {
					ordered: false,
				});

				// Update user verification status for bulk uploads
				const usersToVerify = employeesData.filter((emp) => emp.userAccount);

				if (usersToVerify.length > 0) {
					const updatePromises = usersToVerify.map((emp) =>
						UserModel.findByIdAndUpdate(emp.userAccount, { isVerified: true })
					);
					await Promise.all(updatePromises);
				}

				// Remove the temporary file
				unlinkSync(filePath);

				res.status(201).json({
					success: true,
					message: `${result.length} employees created successfully`,
					employees: result,
				});
			} catch (error: any) {
				// Clean up the file on error
				unlinkSync(filePath);
				if (error.code === 11000) {
					return next(
						new AppError("Duplicate employee ID or email found in file.", 409)
					);
				}
				return next(
					new AppError(`File processing failed: ${error.message}`, 500)
				);
			}
		} else {
			// Handle manual entry from the request body
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

			// Update user verification status for manual entry
			if (userAccount) {
				await UserModel.findByIdAndUpdate(userAccount, { isVerified: true });
			}

			res.status(201).json({
				success: true,
				message: "Employee created successfully",
				employee,
			});
		}
	}
);
