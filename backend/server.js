import app from "./src/app.js"
import connectToDB from "./src/config/database.js"
import { scheduleInternshipStatusJob } from "./src/jobs/internshipStatus.job.js"
import { scheduleRetentionJob } from "./src/jobs/retention.job.js"

const startServer = async () => {
    const PORT = process.env.PORT || 3000;
    
    // 1. Instantly open the port to make Render happy and set service to live
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is listening on port ${PORT}`);
    });

    try {
        // 2. Run Database connection asynchronously in the background
        console.log("Connecting to MongoDB...");
        await connectToDB();
        console.log("MongoDB connection verified.");

        // 3. Register your background jobs safely
        console.log("Initializing background cron workers...");
        setTimeout(() => {
            scheduleInternshipStatusJob();
            scheduleRetentionJob();
            console.log("All background cron workers are safely active in the event loop.");
        }, 5000);
        
    } catch (error) {
        console.error("Post-startup background services failed:", error);
        // Optional: keep running or kill the server depending on your fallback logic
    }
};

startServer().catch((error) => {
    console.error("Server execution crash:", error);
    process.exitCode = 1;
});
