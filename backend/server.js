import app from "./src/app.js"
import connectToDB from "./src/config/database.js"
import { scheduleInternshipStatusJob } from "./src/jobs/internshipStatus.job.js"
import { scheduleRetentionJob } from "./src/jobs/retention.job.js"

const startServer = async () => {
    await connectToDB();
    scheduleInternshipStatusJob();
    scheduleRetentionJob();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is listening on port ${PORT}`);
    });
};

startServer().catch((error) => {
    console.error("Server startup failed", error);
    process.exitCode = 1;
});

