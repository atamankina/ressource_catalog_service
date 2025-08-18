/**
 * @file Dies ist die Hauptanwendungsdatei für den Resource Catalog Service.
 * @description Initialisiert die Express.js-Anwendung, registriert globale Middleware und bindet den Ressourcen-Router ein.
 */

import express from 'express';
import resourcesRouter from './routes/resources.js';
import { errorHandler } from './middleware/error-handler.js';
import { logger } from './middleware/logger.js';
import 'dotenv/config';
import cors from 'cors';

/**
 * @constant {number} PORT - Der Port, auf dem der Server lauschen soll.
 * Wird aus den Umgebungsvariablen (`process.env.PORT`) gelesen oder auf 5002 als Standardwert gesetzt.
 */
const PORT = process.env.PORT || 5002;

/**
 * @constant {express.Application} app - Die Express.js-Anwendungsinstanz.
 */
const app = express();

/**
 * @section Middleware
 * @description Registriert globale Middleware, die für jede eingehende Anfrage ausgeführt wird.
 */

/**
 * @middleware {Function} logger - Protokolliert Details jeder eingehenden HTTP-Anfrage.
 * Muss vor anderen Routen oder Middleware platziert werden, um alle Anfragen abzufangen.
 */
app.use(logger);

/**
 * @middleware {Function} express.json - Parst eingehende Anfragen mit JSON-Payloads.
 * Macht JSON-Daten im Request-Body über `req.body` zugänglich.
 */
app.use(express.json());

/**
 * @middleware {Function} cors - Aktiviert Cross-Origin Resource Sharing (CORS).
 * Erlaubt Anfragen von verschiedenen Ursprüngen (Domains) an diesen Server.
 * Dies ist wichtig für die Frontend-Backend-Kommunikation.
 */
app.use(cors());

/**
 * @section Routen
 * @description Registriert den Ressourcen-Router.
 */

/**
 * @route {string} /resources - Basispfad für alle Ressourcen-API-Endpunkte.
 * @middleware {express.Router} resourcesRouter - Der Router, der alle Endpunkte für Ressourcen, Bewertungen und Feedback behandelt.
 */
app.use('/resources', resourcesRouter);

/**
 * @section Fehlerbehandlung
 * @description Registriert eine globale Fehlerbehandlungs-Middleware.
 */

/**
 * @middleware {Function} errorHandler - Globale Fehlerbehandlungs-Middleware.
 * Diese Middleware sollte zuletzt registriert werden, um alle Fehler abzufangen,
 * die in den vorherigen Routen oder Middleware auftreten.
 * Sie sorgt für eine konsistente Fehlerantwort (`500 Internal Server Error`).
 */
app.use(errorHandler);

/**
 * Startet den Express.js-Server auf dem konfigurierten Port.
 * @listens PORT
 */
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});