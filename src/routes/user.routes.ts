import { Router } from "express";
import {
	getLoggedInUserDetails,
	loginUser,
	logoutUser,
	registerUser,
	updateUser,
} from "../controllers/user.controller.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/me", isLoggedIn, getLoggedInUserDetails);
router.put("/update", isLoggedIn, updateUser);

export default router;
