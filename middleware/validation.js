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
