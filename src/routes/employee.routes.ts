import { Router } from "express";
import { createEmployee } from "../controllers/employee.controller.js";
import multer from "multer";
import { Request } from "express";
import AppError from "../utils/app.error.js";

const upload = multer({
	limits: { fileSize: 5 * 1024 * 1024 },
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
router.post("/create", createEmployee);
router.post("create/bulk", upload.single("file"), createEmployee);

export default router;
