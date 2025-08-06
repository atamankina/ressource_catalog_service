# Express.js: Walkthrough Tag 3

Willkommen zurück zum letzten Tag! Heute implementieren wir die verbleibenden CRUD-Methoden: **`PUT`** zum Aktualisieren und **`DELETE`** zum Löschen von Ressourcen.

### Ticket RC-006: `PUT` Endpunkt zum Aktualisieren einer Ressource

Das Ziel ist es, einen Endpunkt zu erstellen, der es ermöglicht, eine bestehende Ressource anhand ihrer ID zu aktualisieren.

### Schritt 1: Erstelle den `PUT`Endpunkt in `routes/resources.js`

1. Öffne die Datei **`routes/resources.js`**.
2. Füge den folgenden Code direkt unter dem `router.post`Endpunkt hinzu:
    
    ```jsx
    router.put('/:id', (req, res) => {
    
    ```
    
- **`router.put(...)`**: Diese Methode definiert eine Route, die auf die **HTTP-Methode `PUT`** reagiert. `PUT` wird verwendet, um eine **vollständige Aktualisierung** einer vorhandenen Ressource durchzuführen.
- `/:id`: Wir verwenden wieder einen URL-Parameter, um die zu aktualisierende Ressource zu identifizieren.

### Schritt 2: Lese die ID und die neuen Daten aus der Anfrage

Innerhalb des Route-Handlers lesen wir die ID und die neuen Daten aus dem Request.

```jsx
    const resourceId = req.params.id;
    const updatedData = req.body;

```

- `req.params.id`: Die ID der zu aktualisierenden Ressource.
- `req.body`: Das Objekt, das die neuen Daten für die Ressource enthält.

### Schritt 3: Validierung der übergebenen Daten

Wir überprüfen, ob der Request-Body überhaupt Daten enthält.

```jsx
    if (Object.keys(updatedData).length === 0) {
        res.status(400).json({ error: 'Keine Daten zum Aktualisieren bereitgestellt.' });
        return;
    }

```

- `Object.keys(updatedData).length === 0`: Prüft, ob das `updatedData`Objekt leer ist.

### Schritt 4: Implementiere die Logik zum Aktualisieren der Ressource

Jetzt laden wir die Daten, suchen die Ressource, aktualisieren sie und schreiben die Datei zurück.

```jsx
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        let resources = JSON.parse(data);

```

- `let resources = ...`: Wir verwenden `let` statt `const`, da wir das Array später überschreiben müssen.

```jsx
        const resourceIndex = resources.findIndex(r => r.id === resourceId);

```

- `resources.findIndex(...)`: Diese Array-Methode ist ähnlich wie `find()`, gibt aber den **Index** des ersten Elements zurück, für das die Bedingung wahr ist. Wenn nichts gefunden wird, gibt sie `1` zurück.

```jsx
        if (resourceIndex === -1) {
            res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.` });
            return;
        }

```

- `resourceIndex === -1`: Überprüft, ob die Ressource existiert.

```jsx
        resources[resourceIndex] = { ...resources[resourceIndex], ...updatedData };

```

- `...resources[resourceIndex], ...updatedData`: Dies ist eine erweiterte Verwendung des **Spread-Operators**. Zuerst kopiert er alle Eigenschaften der alten Ressource an den Index `resourceIndex`. Dann kopiert er alle Eigenschaften aus dem `updatedData`Objekt. Wenn es Überschneidungen gibt, werden die Eigenschaften aus `updatedData` die der alten Ressource überschreiben. So aktualisieren wir die Ressource.

```jsx
        const newResourcesData = JSON.stringify(resources, null, 2);
        fs.writeFileSync(DATA_FILE, newResourcesData, 'utf-8');

```

- Wir konvertieren das aktualisierte Array wieder in einen JSON-String und überschreiben die Datei.

```jsx
        res.status(200).json(resources[resourceIndex]);

```

- `res.status(200)`: Bei Erfolg senden wir den HTTP-Statuscode **200 OK**.

### Schritt 5: Füge den `catch`Block hinzu

```jsx
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Ressource:', error);
        res.status(500).json({ error: 'Interner Serverfehler beim Aktualisieren der Ressource.' });
    }
});

```

**Manuelle Tests für Ticket RC-006**

1. **Stoppe den Server und starte ihn neu:**
    
    ```bash
    node server.js
    
    ```
    
2. **Sende eine `PUT`Anfrage mit `curl`, um eine Ressource zu aktualisieren:**
    
    ```bash
    curl -X PUT -H "Content-Type: application/json" -d '{"title": "Webentwicklung von Grund auf neu lernen"}' http://localhost:5002/resources/1
    
    ```
    
    - Überprüfe die Antwort im Terminal. Die aktualisierte Ressource mit der neuen `title`Eigenschaft sollte zurückgegeben werden.
    - Öffne `data/resources.json` und verifiziere, dass der Titel der Ressource mit der ID `1` geändert wurde.

### Ticket RC-007: `DELETE` Endpunkt zum Löschen einer Ressource

Das Ziel ist es, einen Endpunkt zu erstellen, der es ermöglicht, eine Ressource anhand ihrer ID zu löschen.

### Schritt 1: Erstelle den `DELETE`Endpunkt in `routes/resources.js`

1. Füge den folgenden Code direkt unter dem `router.put`Endpunkt hinzu:
    
    ```jsx
    router.delete('/:id', (req, res) => {
    
    ```
    
- **`router.delete(...)`**: Diese Methode definiert eine Route, die auf die **HTTP-Methode `DELETE`** reagiert. `DELETE` wird verwendet, um eine Ressource zu entfernen.

### Schritt 2: Lese die ID aus der Anfrage

```jsx
    const resourceId = req.params.id;

```

- `req.params.id`: Die ID der zu löschenden Ressource.

### Schritt 3: Implementiere die Logik zum Löschen der Ressource

Jetzt laden wir die Daten, finden die Ressource, entfernen sie und schreiben die Datei zurück.

```jsx
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        let resources = JSON.parse(data);
        const initialLength = resources.length;

```

- `const initialLength`: Speichert die ursprüngliche Anzahl der Ressourcen, um später zu überprüfen, ob wirklich eine Ressource gelöscht wurde.

```jsx
        resources = resources.filter(r => r.id !== resourceId);

```

- `resources.filter(...)`: Dies ist eine Array-Methode, die ein **neues Array** zurückgibt, das nur die Elemente enthält, für die die gegebene Bedingung wahr ist. Wir filtern also alle Ressourcen heraus, deren `id` der zu löschenden `resourceId` entspricht.

```jsx
        if (resources.length === initialLength) {
            res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.` });
            return;
        }

```

- Hier prüfen wir, ob das neue Array kürzer ist als das alte. Wenn nicht, bedeutet das, dass keine passende Ressource gefunden wurde.

```jsx
        const newResourcesData = JSON.stringify(resources, null, 2);
        fs.writeFileSync(DATA_FILE, newResourcesData, 'utf-8');

```

- Wir schreiben das neue, gefilterte Array in die Datei.

```jsx
        res.status(204).end();

```

- `res.status(204)`: Bei Erfolg senden wir den HTTP-Statuscode **204 No Content**. Dieser Statuscode wird verwendet, wenn die Anfrage erfolgreich war, aber keine Antwort zurückgesendet werden muss.
- `.end()`: Beendet die Antwort, ohne einen Body zu senden.

### Schritt 4: Füge den `catch`Block hinzu

```jsx
    } catch (error) {
        console.error('Fehler beim Löschen der Ressource:', error);
        res.status(500).json({ error: 'Interner Serverfehler beim Löschen der Ressource.' });
    }
});

```

**Manuelle Tests für Ticket RC-007**

1. **Stoppe den Server und starte ihn neu:**
    
    ```bash
    node server.js
    
    ```
    
2. **Sende eine `DELETE`Anfrage mit `curl`:**
    
    ```bash
    curl -X DELETE http://localhost:5002/resources/2
    
    ```
    
    - Die Antwort sollte leer sein und der Statuscode `204 No Content` zurückgegeben werden.
    - Überprüfe `data/resources.json`. Die Ressource mit der ID `2` sollte aus dem Array entfernt worden sein.
    - Versuche, die gelöschte Ressource abzurufen:
        
        ```bash
        curl http://localhost:5002/resources/2
        
        ```
        
        Die Antwort sollte ein **`404 Not Found`** sein.
        
3. **Führe den nächsten Git-Commit aus.**
    
    ```bash
    git add .
    git commit -m "feat(resources): Add PUT and DELETE endpoints for CRUD"
    
    ```

### Ticket RC-010: Globale Fehler-Handling-Middleware

Die Fehlerbehandlung in unserem Code ist aktuell verstreut in den `try...catch`-Blöcken. Eine bessere Praxis ist es, eine zentrale Middleware zu erstellen, die alle Fehler abfängt und konsistent behandelt.

### Konzept: Fehler-Handling-Middleware

- Eine spezielle Form der Middleware mit **vier Argumenten**: `(err, req, res, next)`.
- Express erkennt diese Signatur und ruft sie nur auf, wenn ein Fehler auftritt, z. B. wenn `next(error)` in einer anderen Middleware oder einem Handler aufgerufen wird.

### Schritt 1: Erstelle die Datei für die Fehler-Middleware

1. Erstelle im `middleware`Ordner eine neue Datei mit dem Namen **`error-handler.js`**.

### Schritt 2: Implementiere die Fehler-Handling-Middleware in `middleware/error-handler.js`

1. Öffne die neue Datei `middleware/error-handler.js`.
2. Füge den Code hinzu:
    
    ```jsx
    const errorHandler = (err, req, res, next) => {
    
    ```
    
- `const errorHandler = (err, req, res, next) => { ... }`: Dies ist unsere spezielle Fehler-Middleware mit den vier Argumenten. `err` ist das Fehlerobjekt, das von einem vorherigen Schritt übergeben wurde.
    
    ```jsx
        console.error(err.stack);
    
    ```
    
- `console.error(err.stack)`: Es ist gute Praxis, den vollständigen Fehler-Stack im Terminal zu loggen, um ihn bei der Fehlersuche zu sehen, aber diese Information nicht an den Client zu senden.
    
    ```jsx
        res.status(500).json({
            error: 'Ein interner Serverfehler ist aufgetreten.'
        });
    
    ```
    
- `res.status(500).json(...)`: Wir senden immer eine generische, sichere Fehlermeldung mit dem Statuscode `500` an den Client zurück.
    
    ```jsx
    };
    
    ```
    
1. Füge den Export hinzu:
    
    ```jsx
    export { errorHandler };
    
    ```
    

### Schritt 3: Wende die globale Fehler-Handling-Middleware in `server.js` an

1. Öffne die Datei **`server.js`**.
2. Importiere die neue Middleware ganz oben:
    
    ```jsx
    import { errorHandler } from './middleware/error-handler.js';
    
    ```
    
3. Füge die Middleware als **letzte Route** in die Datei ein:
    
    ```jsx
    app.use(errorHandler);
    
    ```
    
- `app.use(errorHandler)`: Fehler-Handling-Middleware muss **nach allen anderen Routen und Middleware** platziert werden, damit sie wirklich nur aufgerufen wird, wenn ein Fehler in einem der vorhergehenden Schritte aufgetreten ist.

### Schritt 4: Vereinfache die Fehlerbehandlung in `routes/resources.js`

1. Öffne die Datei **`routes/resources.js`**.
2. Lösche alle `try...catch`Blöcke und die manuelle `res.status(500)`Logik.
3. Passe die Route-Handler so an, dass sie bei Fehlern **`next(error)`** aufrufen, um den Fehler an die zentrale Middleware weiterzuleiten.
4. Der neue Codeblock für den `/resources`Endpunkt (`GET`) sollte so aussehen:
    
    ```jsx
    router.get('/', (req, res, next) => {
        try {
            const data = fs.readFileSync(DATA_FILE, 'utf-8');
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
    
    ```
    
5. Wiederhole diesen Schritt für alle anderen Endpunkte (`GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`). Jedes Mal, wenn ein Fehler auftritt, rufe einfach `next(error)` auf, anstatt den Fehler manuell zu behandeln.

**Manuelle Tests für Ticket RC-010**

1. **Stoppe den Server und starte ihn neu:**
    
    ```bash
    node server.js
    
    ```
    
2. **Provoziere einen Fehler in einem der Endpunkte**, indem du zum Beispiel absichtlich den Pfad zur `resources.json` in der `routes/resources.js` falsch schreibst.
3. **Sende eine Anfrage an `/resources` mit `curl`:**
    
    ```bash
    curl http://localhost:5002/resources
    
    ```
    
    - Erwartete Antwort: Die generische Fehlermeldung `{"error": "Ein interner Serverfehler ist aufgetreten."}` und der Statuscode `500 Internal Server Error`.
    - Überprüfe das Terminal, in dem dein Server läuft. Du solltest den vollständigen Fehler-Stacklog sehen, der vom `console.error` in der Fehler-Middleware erzeugt wurde.
4. **Korrigiere den Pfad in `routes/resources.js`** wieder.
5. **Führe den nächsten Git-Commit aus.**

```bash
git add .
git commit -m "feat(errors): Implement global error handling middleware"

```