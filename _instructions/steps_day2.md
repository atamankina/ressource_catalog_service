# Express.js:  Walkthrough Tag 2

Willkommen zurück! Heute lernst du, wie man den Code mit einem Express Router strukturiert und implementierst das Erstellen neuer Ressourcen mit der **HTTP-`POST`-Methode**.

### Ticket RC-009: Code-Refactoring mit Express Router

Um unseren Code besser zu organisieren, lagern wir die Ressourcen-Endpunkte in eine separate Datei aus.

### Schritt 1: Erstelle den Routen-Ordner und die Datei

1. Erstelle im Stammverzeichnis einen neuen Ordner namens **`routes`**.
2. Erstelle im `routes`Ordner eine neue Datei mit dem Namen **`resources.js`**.

### Schritt 2: Erstelle den Router in `routes/resources.js`

1. Öffne die neue Datei `routes/resources.js`.
2. Füge die notwendigen Imports hinzu:
    
    ```jsx
    import express from 'express';
    import fs from 'fs';
    import path from 'path';
    import { fileURLToPath } from 'url';
    
    ```
    
3. Füge die Helfer-Variablen und den Datenpfad hinzu:
    
    ```jsx
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const DATA_FILE = path.join(__dirname, '../data', 'resources.json');
    
    ```
    
- `'../data'`: Der Pfad zur `resources.json` muss nun angepasst werden, da sich die `resources.js`Datei im Ordner `routes` befindet und einen Schritt zurückgehen muss.
1. Initialisiere das Router-Objekt:
    
    ```jsx
    const router = express.Router();
    
    ```
    
- **`express.Router()`**: Dies erstellt ein neues, isoliertes **Router-Objekt**. Dieses Objekt funktioniert ähnlich wie das `app`Objekt, dient aber nur zur Gruppierung von Routen, die sich auf eine gemeinsame Basis-URL beziehen (in diesem Fall `/resources`).

### Schritt 3: Verschiebe die Endpunkte in den Router

1. Öffne die Datei `server.js` und **kopiere** den Code beider `app.get`Endpunkte.
2. Füge den kopierten Code in die `resources.js` ein.
3. Ändere `app.get` in `router.get`.
4. Passe die Pfade an:
    - `app.get('/resources', ...)` wird zu `router.get('/', ...)`.
    - `app.get('/resources/:id', ...)` wird zu `router.get('/:id', ...)`.
- Warum? Der Basispfad (`/resources`) wird später in der `server.js` definiert und automatisch allen Routen in diesem Router vorangestellt.

### Schritt 4: Exportiere den Router

Damit der Router in `server.js` verwendet werden kann, muss er exportiert werden.

```jsx
export default router;

```

- `export default router`: Stellt das Router-Objekt für andere Dateien zur Verfügung.

### Schritt 5: Bereinige die `server.js` und binde den Router ein

1. Öffne die Datei **`server.js`**.
2. **Lösche** alle Imports für `fs`, `path` und `fileURLToPath`.
3. **Lösche** die Helfer-Variablen (`__filename`, `__dirname`, `DATA_FILE`) und die beiden `app.get`Endpunkte.
4. Füge die folgende Import-Anweisung hinzu:
    
    ```jsx
    import resourcesRouter from './routes/resources.js';
    
    ```
    
- `import resourcesRouter`: Importiert das Router-Objekt, das wir in der `resources.js` exportiert haben.
1. Füge diese Zeile direkt unter `const app = express();` hinzu:
    
    ```jsx
    app.use('/resources', resourcesRouter);
    
    ```
    
- **`app.use(...)`**: Eine Express-Methode, um **Middleware** (einschließlich Routern) zu verwenden.
- `'/resources'`: Dies ist der Basispfad für den Router. Alle Routen in `resourcesRouter` (z.B. `/` und `/:id`) werden diesem Pfad vorangestellt.

**Manuelle Tests für Ticket RC-004**

1. **Stoppe den Server und starte ihn neu:**
    
    ```bash
    node server.js
    
    ```
    
2. **Öffne deinen Webbrowser oder `curl` im Terminal und teste die Endpunkte:**
    - Testen Sie `http://localhost:5002/resources`. Die Antwort sollte das komplette Ressourcen-Array sein.
    - Testen Sie `http://localhost:5002/resources/1`. Die Antwort sollte die einzelne Ressource mit ID `1` sein.
3. **Führe den nächsten Git-Commit aus.**
    
    ```bash
    git add .
    git commit -m "refactor(resources): Extract resource routes to a router"
    
    ```
    

### Ticket RC-005: `POST` Endpunkt zum Erstellen einer neuen Ressource

Das Ziel ist es, einen Endpunkt zu erstellen, der neue Ressourcen entgegennimmt und in unserer `resources.json`-Datei speichert.

### Schritt 1: Installiere die `uuid`Bibliothek

Wir benötigen eine Bibliothek, um eindeutige IDs für neue Ressourcen zu generieren.

```bash
npm install uuid

```

- `npm install uuid`: Dieser Befehl installiert das `uuid`Paket, das wir später verwenden werden.

### Schritt 2: Füge die `express.json()`Middleware in `server.js` hinzu

Damit unser Server den Body von `POST`-Anfragen verarbeiten kann, benötigen wir eine spezielle Middleware.

1. Öffne die Datei **`server.js`**.
2. Füge diese Zeile direkt unter `const app = express();` hinzu:
    
    ```jsx
    app.use(express.json());
    
    ```
    
- **Middleware**: Middleware sind Funktionen, die Express ausführt, bevor deine Route erreicht wird. Sie haben Zugriff auf die Anfrage (`req`) und die Antwort (`res`) und können diese manipulieren.
- **`express.json()`**: Dies ist eine integrierte Middleware. Ihre Aufgabe ist es, den Body einer eingehenden Anfrage zu lesen, wenn dieser im **JSON-Format** vorliegt, und ihn in ein JavaScript-Objekt umzuwandeln. Dieses Objekt wird dann auf `req.body` platziert.
- **Wichtig**: Diese Zeile muss vor `app.use('/resources', resourcesRouter);` stehen, da die Middleware vor dem Router ausgeführt werden muss, um den Request-Body zu verarbeiten.

### Schritt 3: Importiere `uuid` in `routes/resources.js`

1. Öffne die Datei **`routes/resources.js`**.
2. Füge die folgende Import-Anweisung ganz oben in der Datei hinzu:
    
    ```jsx
    import { v4 as uuidv4 } from 'uuid';
    
    ```
    
- `import { v4 as uuidv4 }`: Wir importieren die `v4`Funktion aus dem `uuid`Paket, die eine zufällige UUID generiert. `as uuidv4` gibt der Funktion einen Alias, um sie leichter lesbar zu machen.

### Schritt 4: Erstelle den `POST`Endpunkt

Wir beginnen mit dem Rahmen für den neuen Endpunkt.

1. Füge den folgenden Code nach den `router.get`Endpunkten hinzu:
    
    ```jsx
    router.post('/', (req, res) => {
    
    ```
    
- **`router.post(...)`**: Diese Methode definiert einen Endpunkt, der auf die **HTTP-Methode `POST`** reagiert. `POST` wird verwendet, um neue Daten an einen Server zu senden und eine neue Ressource zu erstellen.

### Schritt 5: Lese und validiere die Daten aus dem Request-Body

Zuerst greifen wir auf die Daten zu, die vom Client gesendet wurden, und validieren sie.

```jsx
    const newResourceData = req.body;

```

- `const newResourceData = req.body`: Hier greifen wir auf das Objekt zu, das die `express.json()`Middleware für uns erstellt hat.

```jsx
    if (!newResourceData.title || !newResourceData.type) {
        res.status(400).json({ error: 'Titel und Typ der Ressource sind erforderlich.' });
        return;
    }

```

- `!newResourceData.title || !newResourceData.type`: Dies ist eine grundlegende Validierung. Die Bedingung prüft, ob die `title`oder `type`Eigenschaft im Request-Body fehlt oder leer ist.
- `res.status(400)`: Wenn die Daten ungültig sind, senden wir den HTTP-Statuscode **400 Bad Request**.
- `return`: Beendet die Ausführung der Funktion, um zu verhindern, dass der restliche Code ausgeführt wird.

### Schritt 6: Erstelle das neue Ressourcenobjekt

Wenn die Daten gültig sind, erstellen wir ein neues JavaScript-Objekt.

```jsx
    const newResource = {
        id: uuidv4(),
        ...newResourceData
    };

```

- `id: uuidv4()`: Hier rufen wir unsere importierte Funktion auf, um eine einzigartige ID für die neue Ressource zu generieren.
- `...newResourceData`: Dies ist der **Spread-Operator**. Er kopiert alle Eigenschaften (z.B. `title`, `type`) aus dem `newResourceData`Objekt direkt in das neue `newResource`Objekt.

### Schritt 7: Speichere die neue Ressource in der JSON-Datei

Jetzt müssen wir die bestehenden Daten laden, die neue Ressource hinzufügen und die Datei mit dem aktualisierten Inhalt überschreiben.

```jsx
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        const resources = JSON.parse(data);
        resources.push(newResource);
        const newResourcesData = JSON.stringify(resources, null, 2);
        fs.writeFileSync(DATA_FILE, newResourcesData, 'utf-8');

```

- `fs.readFileSync(...)`: Liest den aktuellen Inhalt der Datei.
- `JSON.parse(...)`: Konvertiert den JSON-String in ein Array.
- `resources.push(...)`: Fügt das neue `newResource`Objekt am Ende des Arrays hinzu.
- `JSON.stringify(...)`: Konvertiert das aktualisierte Array zurück in einen JSON-String. Die Parameter `null, 2` sorgen für eine saubere, lesbare Formatierung.
- `fs.writeFileSync(...)`: Schreibt den aktualisierten JSON-String in die Datei, wobei der alte Inhalt vollständig überschrieben wird.

### Schritt 8: Sende eine Erfolgsantwort und füge den `catch`Block hinzu

Nachdem die Ressource erfolgreich gespeichert wurde, geben wir eine Rückmeldung an den Client.

```jsx
        res.status(201).json(newResource);
    } catch (error) {
        console.error('Fehler beim Schreiben in die Datei:', error);
        res.status(500).json({ error: 'Interner Serverfehler beim Erstellen der Ressource.' });
    }
});

```

- `res.status(201)`: Setzt den HTTP-Statuscode auf **201 Created**. Dieser Code signalisiert, dass die Ressource erfolgreich erstellt wurde.
- `.json(newResource)`: Sendet die neu erstellte Ressource, einschließlich ihrer generierten ID, zurück an den Client.

**Manuelle Tests für Ticket RC-005**

1. **Stoppe den Server und starte ihn neu:**
    
    ```bash
    node server.js
    
    ```
    
2. **Sende eine erfolgreiche `POST`Anfrage mit `curl`:**
    
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"title": "Grundlagen der Express.js Middleware", "type": "Artikel"}' http://localhost:5002/resources
    
    ```
    
    - Überprüfe die Antwort im Terminal. Du solltest die JSON-Daten der neuen Ressource sehen, einschließlich der generierten `id`.
    - Öffne die Datei `data/resources.json` und verifiziere, dass die neue Ressource hinzugefügt wurde.
3. **Sende eine fehlerhafte `POST`Anfrage mit fehlenden Daten:**
    
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"title": "Unvollständige Daten"}' http://localhost:5002/resources
    
    ```
    
    - Die Antwort sollte die JSON-Fehlermeldung `{"error": "Titel und Typ der Ressource sind erforderlich."}` und den Statuscode **400 Bad Request** enthalten.
4. **Führe den nächsten Git-Commit aus.**
    
    ```bash
    git add .
    git commit -m "feat(resources): Add POST /resources endpoint"
    
    ```