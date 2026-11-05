import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dns from 'dns';

import authRouter from './routes/auth.routes.js';
import internRouter from './routes/intern.routes.js';
import adminRouter from './routes/admin.routes.js';
import teamleaderRouter from './routes/teamleader.routes.js';
import analyticsRouter from './routes/adminAnalytics.routes.js';

// Use public DNS providers (Cloudflare and Google) to avoid local DNS issues.
// Remove or modify if you rely on system DNS or have internal DNS requirements.
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();

app.get('/', (req, res) => {
    res.status(200).send("OK");
});
// Allow the frontend to send and receive the authentication cookie.
// `FRONTEND_URL` is a comma-separated list of allowed origins.
// Requests without an origin (server-to-server, Postman, curl) are allowed too.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

app.use(cors({
	origin(origin) {
		// No origin header -> allow (server-to-server, Postman, curl, health checks).
		if (!origin) return true;
		// Allow any of the configured origins (e.g. Cloudflare Pages + localhost).
		if (allowedOrigins.includes(origin)) return origin;
		// Block disallowed origins.
		else {
            // This properly responds to the browser rejecting the origin
            callback(new Error('Not allowed by CORS'));
        }
	},
	credentials: true
}));

// Parse JSON request bodies and populate `req.body`.
app.use(express.json());

// Parse cookies and populate `req.cookies`.
app.use(cookieParser());

// Mount authentication routes at `/api/auth` (e.g., `/api/auth/login`).
app.use('/api/auth', authRouter);

app.use('/api/intern', internRouter);

app.use('/api/admin/analytics', analyticsRouter);

app.use('/api/admin', adminRouter);

app.use('/api/teamleader', teamleaderRouter);

export default app;