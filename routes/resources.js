/**
 * @file Dieser Router verwaltet alle API-Endpunkte für Ressourcen, Bewertungen und Feedback im Resource Catalog Service.
 * @description Enthält Routen für CRUD-Operationen auf Ressourcen und deren zugehörigen Bewertungen/Feedback.
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { validateResource, validateRating, validateFeedback } from '../middleware/validation.js';
import { readData, writeData } from '../helpers/data_manager.js';

const router = express.Router();


const RESOURCES_FILE = 'resources.json';
const RATINGS_FILE = 'ratings.json';
const FEEDBACK_FILE = 'feedback.json';

/**
 * GET /
 * @summary Ruft alle Ressourcen ab, optional gefiltert nach Typ oder Autor-ID.
 * @param {express.Request} req - Das Express-Request-Objekt.
 * @param {object} req.query - Query-Parameter für die Filterung.
 * @param {string} [req.query.type] - Optionaler Typ der Ressource zum Filtern.
 * @param {string} [req.query.authorId] - Optionale Autor-ID zum Filtern.
 * @param {express.Response} res - Das Express-Response-Objekt.
 * @param {express.NextFunction} next - Die Next-Middleware-Funktion.
 * @returns {Array<object>} 200 - Ein Array von Ressourcenobjekten, gefiltert oder ungefiltert.
 * @returns {object} 500 - Interner Serverfehler.
 */
router.get('/', async (req, res, next) => {
    try {
        const resources = await readData(RESOURCES_FILE);
        const { type, authorId } = req.query;
        
        let filteredResources = resources;

        if (type) {
            filteredResources = resources.filter(r => String(r.type) === String(type));
        }

        if (authorId) {
            filteredResources = resources.filter(r => String(r.authorId) === String(authorId));
        }

        res.status(200).json(filteredResources);
    } catch (error) {
        console.error('Fehler beim Abrufen aller Ressourcen:', error);
        next(error);
    }
});

/**
 * GET /:id
 * @summary Ruft eine einzelne Ressource anhand ihrer ID ab und berechnet die durchschnittliche Bewertung.
 * @param {express.Request} req - Das Express-Request-Objekt.
 * @param {string} req.params.id - Die ID der abzurufenden Ressource.
 * @param {express.Response} res - Das Express-Response-Objekt.
 * @param {express.NextFunction} next - Die Next-Middleware-Funktion.
 * @returns {object} 200 - Das Ressourcenobjekt mit hinzugefügter durchschnittlicher Bewertung.
 * @returns {object} 404 - Ressource nicht gefunden.
 * @returns {object} 500 - Interner Serverfehler.
 */
router.get('/:id', async (req, res, next) => {
    try {
        const resourceId = req.params.id;
        const resources = await readData(RESOURCES_FILE);
        const ratings = await readData(RATINGS_FILE);
        
        const resource = resources.find(r => String(r.id) === resourceId);
        const resourceRatings = ratings.filter(rating => String(rating.resourceId) === resourceId);

        let averageRating = 0;
        if (resourceRatings.length > 0) {
            const sumOfRatings = resourceRatings.reduce((sum, rating) => sum + Number(rating.ratingValue), 0);
            averageRating = sumOfRatings / resourceRatings.length;
        }

        if (resource) {
            resource.averageRating = averageRating;
            res.status(200).json(resource);
        } else {
            res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.` });
        }
    } catch (error) {
        console.error(`Fehler beim Abrufen der Ressource mit ID ${req.params.id}:`, error);
        next(error);
    }
});

/**
 * POST /
 * @summary Erstellt eine neue Ressource.
 * @description Nimmt Ressourcendaten im Request-Body entgegen, generiert eine UUID und speichert die Ressource.
 * @param {express.Request} req - Das Express-Request-Objekt.
 * @param {object} req.body - Die Daten der neuen Ressource (z.B. { title: string, type: string, ... }).
 * @param {express.Response} res - Das Express-Response-Objekt.
 * @param {express.NextFunction} next - Die Next-Middleware-Funktion.
 * @returns {object} 201 - Das neu erstellte Ressourcenobjekt.
 * @returns {object} 400 - Ungültige oder fehlende Ressourcendaten (validiert durch `validateResource` Middleware).
 * @returns {object} 500 - Interner Serverfehler.
 */
router.post('/', validateResource, async (req, res, next) => {
    const newResourceData = req.body;

    const newResource = {
        id: uuidv4(),
        ...newResourceData,
        createdAt: new Date().toISOString()
    }

    try {
        const resources = await readData(RESOURCES_FILE);
        resources.push(newResource);
        await writeData(RESOURCES_FILE, resources);
        res.status(201).json(newResource);
    } catch (error) {
        console.error('Fehler beim Erstellen einer Ressource:', error);
        next(error);
    }
});

/**
 * PUT /:id
 * @summary Aktualisiert eine bestehende Ressource vollständig oder teilweise.
 * @description Nimmt die Ressourcen-ID aus den Parametern und die zu aktualisierenden Daten im Request-Body entgegen.
 * @param {express.Request} req - Das Express-Request-Objekt.
 * @param {string} req.params.id - Die ID der zu aktualisierenden Ressource.
 * @param {object} req.body - Die neuen Daten für die Ressource.
 * @param {express.Response} res - Das Express-Response-Objekt.
 * @param {express.NextFunction} next - Die Next-Middleware-Funktion.
 * @returns {object} 200 - Das aktualisierte Ressourcenobjekt.
 * @returns {object} 400 - Keine Daten zum Aktualisieren vorhanden oder ungültige Daten.
 * @returns {object} 404 - Ressource nicht gefunden.
 * @returns {object} 500 - Interner Serverfehler.
 */
router.put('/:id', async (req, res, next) => {
    const resourceId = req.params.id;
    const newData = req.body; 
    
    if (!newData || Object.keys(newData).length === 0) {
        res.status(400).json({ error: 'Keine Daten zum Aktualisieren vorhanden.' });
        return;
    }

    try {
        const data = await readData(RESOURCES_FILE);
        const resources = JSON.parse(data);

        const resourceIndex = resources.findIndex(r => r.id === resourceId);

        if (resourceIndex === -1) {
            res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.`});
            return;
        }

        resources[resourceIndex] = {...resources[resourceIndex], ...newData};

        await writeData(RESOURCES_FILE, resources);

        res.status(200).json(resources[resourceIndex]);
    } catch(error) {
        console.error(`Fehler beim Aktualisieren der Ressource mit ID ${req.params.id}:`, error);
        next(error);
    }
});

/**
 * DELETE /:id
 * @summary Löscht eine Ressource anhand ihrer ID.
 * @param {express.Request} req - Das Express-Request-Objekt.
 * @param {string} req.params.id - Die ID der zu löschenden Ressource.
 * @param {express.Response} res - Das Express-Response-Objekt.
 * @param {express.NextFunction} next - Die Next-Middleware-Funktion.
 * @returns {object} 204 - Erfolgreich gelöscht (kein Inhalt zurückgegeben).
 * @returns {object} 404 - Ressource nicht gefunden.
 * @returns {object} 500 - Interner Serverfehler.
 */
router.delete('/:id', async (req, res, next) => {
    const resourceId = req.params.id;

    try {
        const resources = await readData(RESOURCES_FILE);
        const initialLength = resources.length;
        resources = resources.filter(r => r.id !== resourceId);

        if (resources.length === initialLength) {
            res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.` });
            return;
        }

        await writeData(RESOURCES_FILE, resources);

        res.status(204).end();
    } catch (error) {
        console.error(`Fehler beim Löschen der Ressource mit ID ${req.params.id}:`, error);
        next(error);
    }
});

/**
 * POST /:resourceId/ratings
 * @summary Fügt einer Ressource eine neue Bewertung hinzu.
 * @description Nimmt Bewertungsdaten (ratingValue, userId) entgegen, generiert eine UUID und speichert die Bewertung.
 * @param {express.Request} req - Das Express-Request-Objekt.
 * @param {string} req.params.resourceId - Die ID der Ressource, die bewertet wird.
 * @param {object} req.body - Die Bewertungsdaten ({ ratingValue: number, userId: string }).
 * @param {express.Response} res - Das Express-Response-Objekt.
 * @param {express.NextFunction} next - Die Next-Middleware-Funktion.
 * @returns {object} 201 - Das neu erstellte Bewertungsobjekt.
 * @returns {object} 400 - Ungültige oder fehlende Bewertungsdaten (validiert durch `validateRating` Middleware).
 * @returns {object} 500 - Interner Serverfehler.
 */
router.post('/:resourceId/ratings', validateRating, async (req, res, next) => {
    const resourceId = req.params.resourceId;
    const { ratingValue, userId } = req.body;

    const newRating = {
        id: uuidv4(), 
        resourceId: resourceId,
        ratingValue: ratingValue,
        userId: userId ? String(userId) : 'anonymous', 
        timestamp: new Date().toISOString()
    };

    try {
        const ratings = await readData(RATINGS_FILE);       
        ratings.push(newRating);
        await writeData(RATINGS_FILE, ratings);

        res.status(201).json(newRating);
    } catch (error) {
        console.error(`Fehler beim Hinzufügen einer Bewertung für Ressource ${req.params.resourceId}:`, error);
        next(error); 
    }
});

/**
 * POST /:resourceId/feedback
 * @summary Fügt einer Ressource ein neues Feedback hinzu.
 * @description Nimmt Feedback-Text und optional eine Benutzer-ID entgegen, generiert eine UUID und speichert das Feedback.
 * @param {express.Request} req - Das Express-Request-Objekt.
 * @param {string} req.params.resourceId - Die ID der Ressource, für die Feedback gegeben wird.
 * @param {object} req.body - Die Feedback-Daten ({ feedbackText: string, [userId]: string }).
 * @param {express.Response} res - Das Express-Response-Objekt.
 * @param {express.NextFunction} next - Die Next-Middleware-Funktion.
 * @returns {object} 201 - Das neu erstellte Feedback-Objekt.
 * @returns {object} 400 - Ungültige oder fehlende Feedback-Daten (validiert durch `validateFeedback` Middleware).
 * @returns {object} 500 - Interner Serverfehler.
 */
router.post('/:resourceId/feedback', validateFeedback, async (req, res, next) => {
    const resourceId = req.params.resourceId;
    const { feedbackText, userId } = req.body;

    const newFeedback = {
        id: uuidv4(), 
        resourceId: resourceId, 
        feedbackText: feedbackText.trim(), 
        userId: userId ? String(userId):  'anonymous', 
        timestamp: new Date().toISOString()
    };

    try {
        const feedback = await readData(FEEDBACK_FILE);
        feedback.push(newFeedback);
        await writeData(FEEDBACK_FILE, feedback);

        res.status(201).json(newFeedback);
    } catch (error) {
        console.error(`Fehler beim Hinzufügen von Feedback für Ressource ${req.params.resourceId}:`, error);
        next(error);
    }
});

/**
 * PUT /:resourceId/feedback/:feedbackId
 * @summary Aktualisiert ein bestehendes Feedback für eine Ressource.
 * @description Nimmt die IDs der Ressource und des Feedbacks sowie den aktualisierten Feedback-Text entgegen.
 * @param {express.Request} req - Das Express-Request-Objekt.
 * @param {string} req.params.resourceId - Die ID der Ressource, zu der das Feedback gehört.
 * @param {string} req.params.feedbackId - Die ID des zu aktualisierenden Feedbacks.
 * @param {object} req.body - Die aktualisierten Feedback-Daten ({ feedbackText: string }).
 * @param {express.Response} res - Das Express-Response-Objekt.
 * @param {express.NextFunction} next - Die Next-Middleware-Funktion.
 * @returns {object} 200 - Das aktualisierte Feedback-Objekt.
 * @returns {object} 400 - Ungültige oder fehlende Feedback-Daten (validiert durch `validateFeedback` Middleware).
 * @returns {object} 404 - Feedback nicht gefunden.
 * @returns {object} 500 - Interner Serverfehler.
 */
router.put('/:resourceId/feedback/:feedbackId', validateFeedback, async (req, res, next) => {
    const resourceId = req.params.resourceId;
    const feedbackId = req.params.feedbackId;
    const { feedbackText } = req.body;

    try {
        let feedback = await readData(FEEDBACK_FILE);
        const feedbackIndex = feedback.findIndex(f => String(f.id) === feedbackId && String(f.resourceId) === resourceId);
        
        if (feedbackIndex === -1) {
            res.status(404).json({ error: `Feedback mit ID ${feedbackId} für Ressource ${resourceId} nicht gefunden.` });
            return;
        }

        feedback[feedbackIndex] = {
            ...feedback[feedbackIndex], 
            feedbackText: feedbackText.trim(), 
            timestamp: new Date().toISOString()
        };

        await writeData(FEEDBACK_FILE, feedback);

        res.status(200).json(feedback[feedbackIndex]);
        } catch (error) {
        console.error(`Fehler beim Aktualisieren von Feedback ${req.params.feedbackId} für Ressource ${req.params.resourceId}:`, error);
        next(error);
    }
});

/**
 * DELETE /:resourceId/feedback/:feedbackId
 * @summary Löscht ein Feedback für eine bestimmte Ressource.
 * @description Löscht ein Feedback-Element anhand seiner ID und der zugehörigen Ressourcen-ID.
 * @param {express.Request} req - Das Express-Request-Objekt.
 * @param {string} req.params.resourceId - Die ID der Ressource, zu der das Feedback gehört.
 * @param {string} req.params.feedbackId - Die ID des zu löschenden Feedbacks.
 * @param {express.Response} res - Das Express-Response-Objekt.
 * @param {express.NextFunction} next - Die Next-Middleware-Funktion.
 * @returns {object} 204 - Erfolgreich gelöscht (kein Inhalt zurückgegeben).
 * @returns {object} 404 - Feedback nicht gefunden.
 * @returns {object} 500 - Interner Serverfehler.
 */
router.delete('/:resourceId/feedback/:feedbackId', async (req, res, next) => {
    const resourceId = req.params.resourceId;
    const feedbackId = req.params.feedbackId;

    try {
        const feedback = await readData(FEEDBACK_FILE);
        const initialLength = feedback.length;
        feedback = feedback.filter(f => !(String(f.id) === feedbackId && String(f.resourceId) === resourceId));

        if (feedback.length === initialLength) {
            res.status(404).json({ error: `Feedback mit ID ${feedbackId} für Ressource ${resourceId} nicht gefunden.` });
            return;
        }

        await writeData(FEEDBACK_FILE, feedback);

        res.status(204).end();
        } catch (error) {
        console.error(`Fehler beim Löschen von Feedback ${req.params.feedbackId} für Ressource ${req.params.resourceId}:`, error);
        next(error);
    }
});


export default router;