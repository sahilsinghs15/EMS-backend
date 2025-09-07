import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import express from "express";
import errorMiddleware from "./middlewares/error.middleware.js";
import userRoutes from "./routes/user.routes.js";
import employeeRoutes from "./routes/employee.routes.js";
const app = express();
const port = process.env.PORT || 3000;

const corsOptions = {
	origin: "http://localhost:5173",
	credentials: true,
};
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(morgan("dev"));
app.use(cookieParser());

app.use("/api/user", userRoutes);
app.use("/api/employee", employeeRoutes);
// Return 404 for any undefined routes
app.use((_req, res) => {
	res.status(404).send("This Page does not exist, 404");
});

app.use(errorMiddleware);

export default app;
