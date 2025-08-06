import express from 'express';
import resourcesRouter from './routes/resources.js';
import { errorHandler } from './middleware/error-handler.js';

const port = 5002;

const app = express();

// Middleware (pre-routes)
app.use(express.json());

// Routes
app.use('/resources', resourcesRouter);

// Middleware (post-routes)
app.use(errorHandler);


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});