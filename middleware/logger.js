export const logger = (req, res, next) => {
    const start = process.hrtime();
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    res.on('finish', () => {
        const end = process.hrtime(start);
        const durationInMilliseconds = (end[0] * 1000) + (end[1] / 1_000_000);
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Status: ${res.statusCode} - Dauer: ${durationInMilliseconds.toFixed(2)}ms`);      
    });

    next();
};