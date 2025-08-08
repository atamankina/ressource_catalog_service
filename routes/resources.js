import express from 'express';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { validateResource } from '../middleware/validation.js';

const router = express.Router();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data', 'resources.json');
const RATINGS_FILE = path.join(__dirname, '../data', 'ratings.json');
const FEEDBACK_FILE = path.join(__dirname, '../data', 'feedback.json');


router.get('/', (req, res, next) => {
    try {
        const data = readFileSync(DATA_FILE, 'utf8');
        let resources = JSON.parse(data);
        const { type, authorId } = req.query;

        if (type) {
            resources = resources.filter(r => r.type === type);
        }

        if (authorId) {
            resources = resources.filter(r => r.authorId === authorId);
        }
        res.json(resources);
    } catch (error) {
        next(error);
    }
});


router.get('/:id', (req, res, next) => {
    try {
        // hier wird die ID aus der Anfrage ausgelesen und in der Konstante gespeichert, weiter wird diese ID fuer die Suche benutzt
        const resourceId = req.params.id;

        const data = readFileSync(DATA_FILE, 'utf8');
        const resources = JSON.parse(data);
        const resource = resources.find(r => r.id === resourceId);

        const ratingsData = readFileSync(RATINGS_FILE, 'utf8');
        const allRatings = JSON.parse(ratingsData);
        const resourceRatings = allRatings.filter(rating => rating.resourceId === resourceId);

        let averageRating = 0;
        if (resourceRatings.length > 0) {
            const sumOfRatings = resourceRatings.reduce((sum, rating) => sum + rating.ratingValue, 0);
            averageRating = sumOfRatings / resourceRatings.length;
        }

        if (resource) {
            resource.averageRating = averageRating;
            res.json(resource);
        } else {
            res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.` })
        }

    } catch (error) {
        next(error);
    }
});


router.post('/', validateResource, (req, res, next) => {
    const newData = req.body;

    // 1. Neues Resource Objekt

    const newResource = {
        id: uuidv4(),
        ...newData
    }

    try {
        // 2. Vorhandene Daten aus der Datei lesen und in einem Array speichern.
        const data = readFileSync(DATA_FILE, 'utf8');
        const resources = JSON.parse(data);
        // 3. Das neue Objekt in das Array hinzufuegen.
        resources.push(newResource);
        // 4. Das neue Array in die Datei schreiben.
        writeFileSync(DATA_FILE, JSON.stringify(resources, null, 2), 'utf8');
        // 5. Antwort schicken.
        res.status(201).json(newResource);
    } catch (error) {
        next(error);
    }

});


router.put('/:id', (req, res, next) => {
    // 1. ID auslesen
    const resourceId = req.params.id;
    const newData = req.body; 
    
    if (!newData || Object.keys(newData).length === 0) {
        res.status(400).json({ error: 'Keine Daten zum Aktualisieren vorhanden.' });
        return;
    }

    try {
        // 2. Alle Ressourcen laden
        const data = readFileSync(DATA_FILE, 'utf8');
        const resources = JSON.parse(data);

        // 3. Die Ressource nach der ID suchen
        // const resource = resources.find(r => r.id === resourceId);
        const resourceIndex = resources.findIndex(r => r.id === resourceId);

        // 4. Wenn die Ressource nicht existiert - dann 404
        if (resourceIndex === -1) {
            res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.`});
            return;
        }

        // 5. Wenn die Ressource existiert - updaten
        resources[resourceIndex] = {...resources[resourceIndex], ...newData};

        // 6. Updates in der Datei speichern.
        writeFileSync(DATA_FILE, JSON.stringify(resources, null, 2), 'utf8');

        res.status(200).json(resources[resourceIndex]);

    } catch(error) {
        next(error);
    }
});


router.delete('/:id', (req, res, next) => {
    const resourceId = req.params.id;

    try {
        const data = readFileSync(DATA_FILE, 'utf8');
        let resources = JSON.parse(data);
        const initialLength = resources.length;
        resources = resources.filter(r => r.id !== resourceId);

        if (resources.length === initialLength) {
            res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.` });
            return;
        }

        writeFileSync(DATA_FILE, JSON.stringify(resources, null, 2), 'utf8');

        res.status(204).end();

    } catch (error) {
        next(error);
    }
});


router.post('/:resourceId/ratings', (req, res, next) => {
    const resourceId = req.params.resourceId;
    const { ratingValue, userId } = req.body;

    if (!ratingValue || ratingValue < 1 || ratingValue > 5 || !Number.isInteger(ratingValue)) {
        res.status(400).json({ error: 'Bewertung muss eine ganze Zahl zwischen 1 und 5 sein.' });
        return;
    }

    const newRating = {
        id: uuidv4(), 
        resourceId: resourceId,
        ratingValue: ratingValue,
        userId: userId || 'anonymous', 
        timestamp: new Date().toISOString() 
    };

    try {
        const data = readFileSync(RATINGS_FILE, 'utf8');
        const ratings = JSON.parse(data);

        ratings.push(newRating);

        writeFileSync(RATINGS_FILE, JSON.stringify(ratings, null, 2), 'utf8');

        res.status(201).json(newRating);

    } catch (error) {
        next(error); 
    }
});


router.post('/:resourceId/feedback', (req, res, next) => {
    const resourceId = req.params.resourceId;
    const { feedbackText, userId } = req.body;

    if (!feedbackText || feedbackText.trim().length < 10 || feedbackText.trim().length > 500) {
        res.status(400).json({ error: 'Feedback-Text muss zwischen 10 und 500 Zeichen lang sein.' });
        return;
    }

    const newFeedback = {
        id: uuidv4(), 
        resourceId: resourceId, 
        feedbackText: feedbackText.trim(), 
        userId: userId || 'anonymous', 
        timestamp: new Date().toISOString() 
    };

    try {
        const data = readFileSync(FEEDBACK_FILE, 'utf8');
        const feedback = JSON.parse(data);
        feedback.push(newFeedback);
        writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2), 'utf8');
        res.status(201).json(newFeedback);

    } catch (error) {
        next(error);
    }
});


router.put('/:resourceId/feedback/:feedbackId', (req, res, next) => {
    const resourceId = req.params.resourceId;
    const feedbackId = req.params.feedbackId;
    const { feedbackText } = req.body;

    if (!feedbackText || feedbackText.trim().length < 10 || feedbackText.trim().length > 500) {
        res.status(400).json({ error: 'Aktualisierter Feedback-Text muss zwischen 10 und 500 Zeichen lang sein.' });
        return;
    }

    try {
        const data = readFileSync(FEEDBACK_FILE, 'utf8');
        let feedback = JSON.parse(data);
        const feedbackIndex = feedback.findIndex(f => f.id === feedbackId && f.resourceId === resourceId);
        
        if (feedbackIndex === -1) {
            res.status(404).json({ error: `Feedback mit ID ${feedbackId} für Ressource ${resourceId} nicht gefunden.` });
            return;
        }

        feedback[feedbackIndex] = {
            ...feedback[feedbackIndex], 
            feedbackText: feedbackText.trim(), 
            timestamp: new Date().toISOString() 
        };

        writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2), 'utf8');
        res.status(200).json(feedback[feedbackIndex]);
        } catch (error) {
        next(error);
    }

});


router.delete('/:resourceId/feedback/:feedbackId', (req, res, next) => {
    const resourceId = req.params.resourceId;
    const feedbackId = req.params.feedbackId;

    try {
        const data = readFileSync(FEEDBACK_FILE, 'utf8');
        let feedback = JSON.parse(data);
        const initialLength = feedback.length;
        feedback = feedback.filter(f => !(f.id === feedbackId && f.resourceId === resourceId));

        if (feedback.length === initialLength) {
            res.status(404).json({ error: `Feedback mit ID ${feedbackId} für Ressource ${resourceId} nicht gefunden.` });
            return;
        }

        writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2), 'utf8');
        res.status(204).end();
        } catch (error) {
        next(error);
    }
});



export default router;