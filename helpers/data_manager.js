/**
 * @file Dieses Modul stellt asynchrone Hilfsfunktionen zum Lesen und Schreiben von JSON-Daten bereit.
 * @description Kapselt Dateisystemoperationen, um den Datenzugriff zu standardisieren und nicht-blockierend zu gestalten.
 */

import * as fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Liest Daten asynchron aus einer JSON-Datei im 'data'-Ordner des Service-Stammverzeichnisses.
 * @param {string} fileName - Der Name der JSON-Datei (z.B. 'resources.json', 'ratings.json', 'feedback.json').
 * @returns {Promise<Array>} Ein Promise, das das geparste Array aus der JSON-Datei auflöst.
 * Gibt ein leeres Array zurück, wenn die Datei nicht existiert.
 */
export const readData = async (fileName) => {
    const filePath = path.join(__dirname, '../data', fileName);

    if (!fs.existsSync(filePath)) {
        return [];
    }

    const data = await fsp.readFile(filePath, 'utf-8');
    return JSON.parse(data);
};

/**
 * Schreibt Daten asynchron in eine JSON-Datei im 'data'-Ordner des Service-Stammverzeichnisses.
 * @param {string} fileName - Der Name der JSON-Datei.
 * @param {Array} data - Das Array von Daten, das in die JSON-Datei geschrieben werden soll.
 * @returns {Promise<void>} Ein Promise, das aufgelöst wird, wenn der Schreibvorgang abgeschlossen ist.
 */
export const writeData = async (fileName, data) => {
    const filePath = path.join(__dirname, '../data', fileName);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    const jsonData = JSON.stringify(data, null, 2);
    await fsp.writeFile(filePath, jsonData, 'utf-8');
};