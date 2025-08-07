# Express.js: Walkthrough Tag 4

Willkommen zurück! Heute verbessern wir die Funktionalität unseres Servers, indem wir die Ressourcen-Filterung implementieren und unseren Code mit robuster Middleware und zentralisierter Fehlerbehandlung sicherer und wartbarer machen.

### Ticket RC-010: `GET` Endpunkt mit Query-Parametern zur Filterung

Das Ziel dieses Tickets ist es, den `/resources`-Endpunkt zu erweitern, sodass Benutzer Ressourcen nach Attributen wie `type` oder `authorId` filtern können. Hierfür verwenden wir **Query-Parameter**.

### Konzept: Query-Parameter vs. URL-Parameter

- **URL-Parameter** (`/resources/:id`): Werden verwendet, um eine **spezifische Ressource** eindeutig zu identifizieren. Sie sind ein fester Bestandteil der URL.
- **Query-Parameter** (`/resources?type=Kurs&authorId=...`): Werden verwendet, um **eine Sammlung von Ressourcen zu filtern, zu sortieren oder zu paginieren**. Sie stehen nach einem Fragezeichen `?` am Ende der URL und bestehen aus Schlüssel-Wert-Paaren, die durch ein `&` getrennt sind.

### Schritt 1: Erweitere den `GET /resources`Endpunkt in `routes/resources.js`

1. Öffne die Datei **`routes/resources.js`**.
2. Navigiere zum bestehenden `router.get('/', ...)`Endpunkt.
3. Passe den Code im `try`Block an, um die Query-Parameter zu lesen und die Filterlogik zu implementieren.
    
    ```jsx
    router.get('/', (req, res, next) => {
        try {
            const data = fs.readFileSync(DATA_FILE, 'utf-8');
            let resources = JSON.parse(data);
    
    ```
    
- Wir verwenden `let resources = ...` anstelle von `const`, da wir das Array basierend auf den Query-Parametern filtern werden.
    
    ```jsx
            const { type, authorId } = req.query;
    
    ```
    
- `req.query`: Express stellt alle Query-Parameter im `req.query`Objekt zur Verfügung. `type=Kurs` in der URL wird zu `req.query.type = 'Kurs'`.
- `const { type, authorId } = req.query`: Dies ist **Destructuring-Assignment** in JavaScript. Es erstellt direkt Konstanten `type` und `authorId` aus dem `req.query`Objekt. Wenn ein Parameter in der URL fehlt, ist die entsprechende Konstante `undefined`.
    
    ```jsx
            if (type) {
                resources = resources.filter(r => r.type === type);
            }
    
    ```
    
- `if (type)`: Prüft, ob der `type`Query-Parameter in der Anfrage vorhanden ist.
- `resources.filter(...)`: Dies ist eine Array-Methode, die ein **neues Array** zurückgibt, das nur die Elemente enthält, für die die Rückgabe der Callback-Funktion `true` ist. Wir filtern das `resources`Array, um nur jene zu behalten, deren `type` mit dem angeforderten `type` übereinstimmt.
    
    ```jsx
            if (authorId) {
                resources = resources.filter(r => r.authorId === authorId);
            }
    
    ```
    
- Die Logik ist dieselbe wie oben, um nach der `authorId` zu filtern. Die Filterung wird nacheinander angewendet, was bedeutet, dass wenn beide Parameter vorhanden sind, beide Filter kombiniert werden.
    
    ```jsx
            res.json(resources);
    
    ```
    
- Wir senden das möglicherweise gefilterte Array zurück.
    
    ```jsx
        } catch (error) {
            next(error)
        }
    });
    
    ```
    

**Manuelle Tests für Ticket RC-008**

1. **Stoppe den Server und starte ihn neu:**
    
    ```bash
    node server.js
    
    ```
    
2. **Testen Sie die Endpunkte mit `curl`:**
    - **Filtern nach `type`**: Sende eine Anfrage, um alle Ressourcen vom Typ `Kurs` zu erhalten.
        
        ```bash
        curl http://localhost:5002/resources?type=Kurs
        
        ```
        
        Erwartete Antwort: Ein JSON-Array mit nur der Ressource `{"id": "1", ...}`.
        
    - **Filtern nach `authorId`**: Sende eine Anfrage, um alle Ressourcen des Autors `a1b2c3d4` zu erhalten.
        
        ```bash
        curl http://localhost:5002/resources?authorId=a1b2c3d4
        
        ```
        
        Erwartete Antwort: Ein JSON-Array mit beiden Ressourcen.
        
    - **Kombinierte Filterung**: Sende eine Anfrage, um alle Ressourcen vom Typ `Video` des Autors `a1b2c3d4` zu erhalten.
        
        ```bash
        curl http://localhost:5002/resources?type=Video&authorId=a1b2c3d4
        
        ```
        
        Erwartete Antwort: Ein JSON-Array mit nur der Ressource `{"id": "2", ...}`.
        
3. **Führe den nächsten Git-Commit aus.**
    
    ```bash
    git add .
    git commit -m "feat(resources): Add filtering to GET /resources with query params"
    
    ```
    

### Ticket RC-009-1: Eigene Middleware zur Validierung erstellen

Obwohl wir bereits eine grundlegende Validierung im `POST`-Endpunkt haben, ist es gute Praxis, die Validierungslogik in eine wiederverwendbare **Middleware-Funktion** auszulagern.

### Konzept: Middleware-Funktionen

- Eine **Middleware-Funktion** ist eine Funktion, die Zugriff auf das Request-Objekt (`req`), das Response-Objekt (`res`) und die nächste Middleware-Funktion im Request-Response-Zyklus (`next`) hat.
- Ihr Zweck ist es, Aktionen auszuführen, bevor der eigentliche Route-Handler ausgeführt wird (z. B. Authentifizierung, Logging, Validierung).
- Die Signatur einer Middleware ist immer `(req, res, next) => { ... }`.
- Der Aufruf von `next()` ist entscheidend. Er gibt die Kontrolle an die nächste Middleware oder den Route-Handler weiter. Wird `next()` nicht aufgerufen, bleibt der Request "stecken".

### Schritt 1: Erstelle den Middleware-Ordner und die Datei

1. Erstelle im Stammverzeichnis einen neuen Ordner namens **`middleware`**.
2. Erstelle im `middleware`Ordner eine neue Datei mit dem Namen **`validation.js`**.

### Schritt 2: Implementiere die Validierungs-Middleware in `middleware/validation.js`

1. Öffne die neue Datei `middleware/validation.js`.
2. Füge den Code für die Middleware-Funktion hinzu.
    
    ```jsx
    const validateResource = (req, res, next) => {
    
    ```
    
- `const validateResource = (req, res, next) => { ... }`: Dies ist unsere Middleware-Funktion. Sie nimmt die drei obligatorischen Parameter entgegen.
    
    ```jsx
        const { title, type } = req.body;
    
    ```
    
- `const { title, type } = req.body`: Wir lesen die relevanten Daten aus dem Request-Body.
    
    ```jsx
        if (!title || !type) {
            return res.status(400).json({ error: 'Titel und Typ der Ressource sind erforderlich.' });
        }
    
    ```
    
- Die Validierungslogik ist dieselbe wie zuvor. Wenn die Validierung fehlschlägt, senden wir eine Antwort und beenden die Funktion mit `return`. Es ist nicht notwendig, `next()` aufzurufen, da der Request hier beendet wird.
    
    ```jsx
        next();
    
    ```
    
- **`next()`**: Wenn die Validierung erfolgreich ist, rufen wir `next()` auf. Dies ist der kritische Schritt, der Express anweist, zum nächsten Schritt im Request-Response-Zyklus zu springen (in diesem Fall zu unserem `router.post`Handler).
    
    ```jsx
    };
    
    ```
    
1. Füge am Ende der Datei den Export hinzu:
    
    ```jsx
    export { validateResource };
    
    ```
    

### Schritt 3: Wende die Middleware in `routes/resources.js` an

1. Öffne die Datei **`routes/resources.js`**.
2. Importiere die neue Middleware ganz oben:
    
    ```jsx
    import { validateResource } from '../middleware/validation.js';
    
    ```
    
- Wir importieren die Funktion aus dem neuen `middleware`Ordner.
1. Passe den `router.post`Endpunkt an, indem du die Middleware als zweiten Parameter hinzufügst:
    
    ```jsx
    router.post('/', validateResource, (req, res, next) => {
    
    ```
    
- `validateResource`: Wir fügen unsere Middleware zwischen dem Pfad (`'/'`) und dem eigentlichen Handler ein. Express wird diese Funktion nun zuerst ausführen.
1. **Lösche die alte Validierungslogik** aus dem `router.post`Handler, da sie nun von der Middleware übernommen wird.
    
    ```jsx
    router.post('/', validateResource, (req, res, next) => {
        const newResourceData = req.body;
    
        // --- Diese Zeilen löschen ---
        // if (!newResourceData.title || !newResourceData.type) {
        //     res.status(400).json({ error: 'Titel und Typ der Ressource sind erforderlich.' });
        //     return;
        // }
        // -----------------------------
    
        const newResource = {
            id: uuidv4(),
            ...newResourceData
        };
        // ... restlicher Code bleibt unverändert ...
    
    ```
    

**Manuelle Tests für Ticket RC-009-1**

1. **Stoppe den Server und starte ihn neu:**
    
    ```bash
    node server.js
    
    ```
    
2. **Sende eine fehlerhafte `POST`Anfrage mit `curl` (fehlender Titel):**
    
    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"type": "Artikel"}' http://localhost:5002/resources
    
    ```
    
    - Erwartete Antwort: Die JSON-Fehlermeldung `{"error": "Titel und Typ der Ressource sind erforderlich."}` und der Statuscode `400 Bad Request`. Dies beweist, dass die Middleware funktioniert.
3. **Führe den nächsten Git-Commit aus.**
    
    ```bash
    git add .
    git commit -m "feat(validation): Create custom validation middleware for POST"
    
    ```
    

