import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { validateResource, validateRating, validateFeedback } from '../middleware/validation.js';
import { readData, writeData } from '../helpers/data_manager.js';

const router = express.Router();


const RESOURCES_FILE = 'resources.json';
const RATINGS_FILE = 'ratings.json';
const FEEDBACK_FILE = 'feedback.json';


router.get('/', async (req, res, next) => {
    try {
        const resources = await readData(RESOURCES_FILE);
        const { type, authorId } = req.query;
        
        let filteredResources = resources;

        if (type) {
            filteredResources = resources.filter(r => r.type === type);
        }

        if (authorId) {
            filteredResources = resources.filter(r => r.authorId === authorId);
        }

        res.status(200).json(filteredResources);
    } catch (error) {
        next(error);
    }
});


router.get('/:id', async (req, res, next) => {
    try {
        const resourceId = req.params.id;
        const resources = await readData(RESOURCES_FILE);
        const ratings = await readData(RATINGS_FILE);
        
        const resource = resources.find(r => r.id === resourceId);
        const resourceRatings = ratings.filter(rating => rating.resourceId === resourceId);

        let averageRating = 0;
        if (resourceRatings.length > 0) {
            const sumOfRatings = resourceRatings.reduce((sum, rating) => sum + rating.ratingValue, 0);
            averageRating = sumOfRatings / resourceRatings.length;
        }

        if (resource) {
            resource.averageRating = averageRating;
            res.status(200).json(resource);
        } else {
            res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.` });
        }
    } catch (error) {
        next(error);
    }
});


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
        next(error);
    }
});


router.put('/:id', async (req, res, next) => {
    const resourceId = req.params.id;
    const newData = req.body; 
    
    if (!newData || Object.keys(newData).length === 0) {
        res.status(400).json({ error: 'Keine Daten zum Aktualisieren vorhanden.' });
        return;
    }

    try {
        const data = await readData(DATA_FILE);
        const resources = JSON.parse(data);

        const resourceIndex = resources.findIndex(r => r.id === resourceId);

        if (resourceIndex === -1) {
            res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.`});
            return;
        }

        resources[resourceIndex] = {...resources[resourceIndex], ...newData};

        await writeData(DATA_FILE, resources);

        res.status(200).json(resources[resourceIndex]);
    } catch(error) {
        next(error);
    }
});


router.delete('/:id', async (req, res, next) => {
    const resourceId = req.params.id;

    try {
        const resources = await readData(DATA_FILE);
        const initialLength = resources.length;
        resources = resources.filter(r => r.id !== resourceId);

        if (resources.length === initialLength) {
            res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.` });
            return;
        }

        await writeData(DATA_FILE, resources);

        res.status(204).end();
    } catch (error) {
        next(error);
    }
});


router.post('/:resourceId/ratings', validateRating, async (req, res, next) => {
    const resourceId = req.params.resourceId;
    const { ratingValue, userId } = req.body;

    const newRating = {
        id: uuidv4(), 
        resourceId: resourceId,
        ratingValue: ratingValue,
        userId: userId ? userId : 'anonymous', 
        timestamp: new Date().toISOString()
    };

    try {
        const ratings = await readData(RATINGS_FILE);       
        ratings.push(newRating);
        await writeData(RATINGS_FILE, ratings);

        res.status(201).json(newRating);
    } catch (error) {
        next(error); 
    }
});


router.post('/:resourceId/feedback', validateFeedback, async (req, res, next) => {
    const resourceId = req.params.resourceId;
    const { feedbackText, userId } = req.body;

    const newFeedback = {
        id: uuidv4(), 
        resourceId: resourceId, 
        feedbackText: feedbackText.trim(), 
        userId: userId ? userId:  'anonymous', 
        timestamp: new Date().toISOString()
    };

    try {
        const feedback = await readData(FEEDBACK_FILE);
        feedback.push(newFeedback);
        await writeData(FEEDBACK_FILE, feedback);

        res.status(201).json(newFeedback);
    } catch (error) {
        next(error);
    }
});


router.put('/:resourceId/feedback/:feedbackId', validateFeedback, async (req, res, next) => {
    const resourceId = req.params.resourceId;
    const feedbackId = req.params.feedbackId;
    const { feedbackText } = req.body;

    try {
        let feedback = await readData(FEEDBACK_FILE);
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

        await writeData(FEEDBACK_FILE, feedback);

        res.status(200).json(feedback[feedbackIndex]);
        } catch (error) {
        next(error);
    }
});


router.delete('/:resourceId/feedback/:feedbackId', async (req, res, next) => {
    const resourceId = req.params.resourceId;
    const feedbackId = req.params.feedbackId;

    try {
        const feedback = await readData(FEEDBACK_FILE);
        const initialLength = feedback.length;
        feedback = feedback.filter(f => !(f.id === feedbackId && f.resourceId === resourceId));

        if (feedback.length === initialLength) {
            res.status(404).json({ error: `Feedback mit ID ${feedbackId} für Ressource ${resourceId} nicht gefunden.` });
            return;
        }

        await writeData(FEEDBACK_FILE, feedback);

        res.status(204).end();
        } catch (error) {
        next(error);
    }
});


export default router;