import express from 'express';
import resourcesRouter from './routes/resources.js';
import { errorHandler } from './middleware/error-handler.js';
import { logger } from './middleware/logger.js';
import 'dotenv/config';
import cors from 'cors';

const PORT = process.env.PORT || 5002;

const app = express();

// Middleware (pre-routes)
app.use(logger);
app.use(express.json());
app.use(cors());

// Routes
app.use('/resources', resourcesRouter);

// Middleware (post-routes)
app.use(errorHandler);


app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});