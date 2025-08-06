import express from 'express';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const data_file = path.join(__dirname, '../data', 'resources.json');


router.get('/', (req, res, next) => {
    try {
        const data = readFileSync(data_file, 'utf8');
        const resources = JSON.parse(data);
        res.json(resources);
    } catch (error) {
        next(error);
    }
});


router.get('/:id', (req, res, next) => {
    try {
        // hier wird die ID aus der Anfrage ausgelesen und in der Konstante gespeichert, weiter wird diese ID fuer die Suche benutzt
        const resourceId = req.params.id;
        const data = readFileSync(data_file, 'utf8');
        const resources = JSON.parse(data);
        const resource = resources.find(r => r.id === resourceId);

        if (resource) {
            res.json(resource);
        } else {
            res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.` })
        }

    } catch (error) {
        next(error);
    }
});


router.post('/', (req, res, next) => {
    const newData = req.body;

    if (!newData.title || !newData.type) {
        res.status(400).json({ error: 'title und type sind erforderlich.' });
        return;
    }

    // 1. Neues Resource Objekt

    const newResource = {
        id: uuidv4(),
        ...newData
    }

    try {
        // 2. Vorhandene Daten aus der Datei lesen und in einem Array speichern.
        const data = readFileSync(data_file, 'utf8');
        const resources = JSON.parse(data);
        // 3. Das neue Objekt in das Array hinzufuegen.
        resources.push(newResource);
        // 4. Das neue Array in die Datei schreiben.
        writeFileSync(data_file, JSON.stringify(resources, null, 2), 'utf8');
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
        const data = readFileSync(data_file, 'utf8');
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
        writeFileSync(data_file, JSON.stringify(resources, null, 2), 'utf8');

        res.status(200).json(resources[resourceIndex]);

    } catch(error) {
        next(error);
    }
});


router.delete('/:id', (req, res, next) => {
    const resourceId = req.params.id;

    try {
        const data = readFileSync(data_file, 'utf8');
        let resources = JSON.parse(data);
        const initialLength = resources.length;
        resources = resources.filter(r => r.id !== resourceId);

        if (resources.length === initialLength) {
            res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.` });
            return;
        }

        writeFileSync(data_file, JSON.stringify(resources, null, 2), 'utf8');

        res.status(204).end();

    } catch (error) {
        next(error);
    }
});


export default router;