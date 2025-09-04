import app from "./app.js";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import path from "path";
import { fileURLToPath } from 'url';
import connectionToDb from "./config/db.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    api_key: process.env.CLOUDINARY_API_KEY ?? '',
    api_secret: process.env.CLOUDINARY_API_SECRET ?? '',
});

const PORT = process.env.PORT || 5000;

// Connect to the database and then start the server
const startServer = async () => {
    try {
        await connectionToDb();
        app.listen(PORT, () => {
            console.log(`Server is running at ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
