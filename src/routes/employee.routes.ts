import { Router } from "express";
import {
	createEmployee,
	getAllEmployees,
	getEmployee,
	findEmployeeById,
	updateEmployee,
	deleteEmployee,
} from "../controllers/employee.controller.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import AppError from "../utils/app.error.js";
import { authorizeRoles, isLoggedIn } from "../middlewares/auth.middleware.js";

// Ensure upload directory exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir);
}

// Multer disk storage configuration
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadDir);
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		const ext = path.extname(file.originalname);
		cb(null, file.fieldname + "-" + uniqueSuffix + ext);
	},
});

const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
	fileFilter: (
		req: Request,
		file: Express.Multer.File,
		cb: multer.FileFilterCallback
	) => {
		if (
			file.mimetype ===
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
			file.mimetype === "text/csv"
		) {
			cb(null, true);
		} else {
			cb(new AppError("Only .xlsx and .csv files are allowed!", 400));
		}
	},
});

const router = Router();

router.get("/", isLoggedIn, getEmployee);
router.get("/all", isLoggedIn, authorizeRoles("ADMIN"), getAllEmployees);
router.post("/create", isLoggedIn, authorizeRoles("ADMIN"), createEmployee);
router.post(
	"/create/bulk",
	isLoggedIn,
	authorizeRoles("ADMIN"),
	upload.single("file"),
	createEmployee
);

router.get("/:id", isLoggedIn, authorizeRoles("ADMIN"), findEmployeeById);
router.patch("/:id", isLoggedIn, authorizeRoles("ADMIN"), updateEmployee);
router.delete("/:id", isLoggedIn, authorizeRoles("ADMIN"), deleteEmployee);

export default router;
