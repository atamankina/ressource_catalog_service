/**
 * @file Dieses Modul stellt eine globale Fehler-Handling-Middleware für Express.js bereit.
 * @description Fängt Fehler im Request-Response-Zyklus ab und sendet eine konsistente Fehlerantwort.
 */

/**
 * Globale Fehler-Handling-Middleware.
 * Diese Middleware wird aufgerufen, wenn ein Fehler in einem der vorhergehenden Schritte auftritt (z.B. durch next(error)).
 * Protokolliert den Fehler auf der Konsole des Servers und sendet eine generische 500er-Antwort an den Client.
 * @param {Error} err - Das Fehlerobjekt, das von der vorherigen Middleware/Route übergeben wurde.
 * @param {object} req - Das Request-Objekt von Express.
 * @param {object} res - Das Response-Objekt von Express.
 * @param {function} next - Die Callback-Funktion zum Aufrufen der nächsten Middleware (hier nicht immer nötig, da die Antwort gesendet wird).
 */
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Ein interner Serverfehler ist aufgetreten.'
    });
}

export { errorHandler };