/**
 * @file Dieses Modul stellt eine Middleware zur Protokollierung von HTTP-Anfragen und -Antworten bereit.
 * @description Protokolliert eingehende Anfragen und ausgehende Antworten mit Zeitstempeln, Methoden, URLs, Statuscodes und Dauern.
 */

/**
 * Middleware-Funktion zur Protokollierung von HTTP-Anfragen und -Antworten.
 * Loggt die eingehende Anfrage (Methode, URL) und die ausgehende Antwort (Statuscode, Antwortzeit).
 * @param {object} req - Das Request-Objekt von Express.
 * @param {object} res - Das Response-Objekt von Express.
 * @param {function} next - Die Callback-Funktion zum Aufrufen der nächsten Middleware.
 */
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