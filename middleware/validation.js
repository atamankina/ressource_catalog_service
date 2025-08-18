/**
 * @file Dieses Modul stellt Validierungs-Middleware-Funktionen für den Resource Catalog Service bereit.
 * @description Enthält Middleware zur Validierung von Ressourcendaten, Bewertungen und Feedback.
 */

/**
 * Middleware zur Validierung der Daten für eine neue Ressource (POST /resources).
 * Stellt sicher, dass 'title' und 'type' im Request-Body vorhanden sind.
 * @param {object} req - Das Request-Objekt von Express.
 * @param {object} res - Das Response-Objekt von Express.
 * @param {function} next - Die Callback-Funktion zum Aufrufen der nächsten Middleware.
 */
const validateResource = (req, res, next) => {
    const { title, type } = req.body;

    if (!title || !type) {
        return res.status(400).json({
            error: 'Titel und Typ der Ressource sind erforderlich.'
        });
    }
    next();
};

export { validateResource };

/**
 * Middleware zur Validierung der Daten für eine Bewertung (POST /resources/:id/ratings).
 * Stellt sicher, dass 'ratingValue' eine ganze Zahl zwischen 1 und 5 ist.
 * Wandelt 'ratingValue' in eine Ganzzahl um.
 * @param {object} req - Das Request-Objekt von Express.
 * @param {object} res - Das Response-Objekt von Express.
 * @param {function} next - Die Callback-Funktion zum Aufrufen der nächsten Middleware.
 */
export const validateRating = (req, res, next) => {
    let { ratingValue } = req.body;
    ratingValue = parseInt(ratingValue, 10);

    if (isNaN(ratingValue) || !Number.isInteger(ratingValue)) {
        return res.status(400).json({ 
            error: 'Bewertung muss eine ganze Zahl sein/'
        });
    }

    if (ratingValue <1 || ratingValue > 5) {
        return res.status(400).json({ 
            error: "Bewertung muss zwischen 1 und 5 liegen."
        });
    }

    req.body.ratingValue = ratingValue;
    next();
};

/**
 * Middleware zur Validierung der Daten für Feedback (POST/PUT /resources/:id/feedback).
 * Stellt sicher, dass 'feedbackText' vorhanden und zwischen 10 und 500 Zeichen lang ist.
 * @param {object} req - Das Request-Objekt von Express.
 * @param {object} res - Das Response-Objekt von Express.
 * @param {function} next - Die Callback-Funktion zum Aufrufen der nächsten Middleware.
 */
export const validateFeedback = (req, res, next) => {
    const { feedbackText } = req.body;

    if (typeof feedbackText !== 'string' || !feedbackText.trim()) {
        return res.status(400).json({ 
            error: 'Feedback-Text ist erforderlich und darf nicth leer sein.'
        });
    }

    if (feedbackText.trim().length < 10 || feedbackText.trim().length > 500) {
        return res.status(400).json({
            error: 'Feedback-Text muss zwischen 10 und 500 Zeichen lang sein.' 
        });
    }

    next();
};
