# Express.js: Walkthrough - Bewertungsfunktion

Willkommen zurück! Heute erweitern wir unseren `Resource Catalog Service` um eine Bewertungsfunktion. Benutzer sollen Ressourcen bewerten können, und wir werden die durchschnittliche Bewertung für jede Ressource berechnen und anzeigen.

### Ticket RC-014: Ressource bewerten

Das Ziel dieses Tickets ist es, einen neuen Endpunkt zu erstellen, der es Benutzern ermöglicht, eine Bewertung (1-5 Sterne) für eine spezifische Ressource abzugeben.

### Schritt 1: Erstelle die Mock-Daten für Bewertungen

Bevor wir Bewertungen speichern können, benötigen wir eine Datei, die als Speicherort dient.

1. Erstelle im Ordner **`data`** (den du bereits hast) eine neue Datei mit dem Namen **`ratings.json`**.
2. Füge den folgenden JSON-Inhalt ein. Dies ist ein leeres Array, da wir noch keine Bewertungen haben.
    
    ```
    []
    
    ```
    
    - Dies ist ein leeres **JSON-Array**. Es wird unsere "Datenbank" für die Bewertungen sein.

### Schritt 2: Definiere den Datenpfad für Bewertungen in `routes/resources.js`

Wir müssen den Pfad zu unserer neuen `ratings.json`-Datei in der `resources.js` verfügbar machen.

1. Öffne die Datei **`routes/resources.js`**.
2. Füge die folgende Zeile direkt unter der Definition von `const DATA_FILE = ...` hinzu:
    
    ```
    const RATINGS_FILE = path.join(__dirname, '../data', 'ratings.json');
    
    ```
    
    - `const RATINGS_FILE`: Definiert eine neue Konstante, die den vollständigen Pfad zu unserer `ratings.json`Datei enthält.
    - `path.join(__dirname, '../data', 'ratings.json')`: Erstellt den Pfad. `__dirname` ist das Verzeichnis der aktuellen Datei (`routes/`). `../` geht einen Ordner nach oben (zum Stammverzeichnis des Service), dann navigieren wir in den `data`Ordner und schließlich zur `ratings.json`.

### Schritt 3: Erstelle den `POST`Endpunkt für Bewertungen

Wir definieren den neuen Endpunkt, der Bewertungen entgegennimmt.

1. Füge den folgenden Codeblock in **`routes/resources.js`** unter dem `router.post('/')`Endpunkt (dem Endpunkt zum Erstellen von Ressourcen) hinzu:
    
    ```
    router.post('/:resourceId/ratings', (req, res, next) => {
        // Die Logik für diesen Endpunkt kommt in den nächsten Schritten
    });
    
    ```
    
    - `router.post(...)`: Wir verwenden die **HTTP-Methode `POST`**, da wir neue Bewertungsdaten an den Server senden, um sie zu speichern.
    - `'/:resourceId/ratings'`: Dies ist der Pfad für unseren neuen Endpunkt.
        - `:resourceId`: Dies ist ein **URL-Parameter**. Er ermöglicht es uns, die ID der Ressource direkt in der URL zu übergeben, die bewertet werden soll (z.B. `/resources/1/ratings`).
        - `/ratings`: Dies ist der spezifische Endpunkt für Bewertungen innerhalb einer Ressource.
    - `(req, res, next) => { ... }`: Dies ist der Route-Handler. `next` ist hier wichtig, falls wir Fehler an unsere zentrale Fehler-Middleware weitergeben müssen.

### Schritt 4: Lese die Daten aus der Anfrage

Wir lesen die `resourceId` aus den URL-Parametern und die Bewertungsdaten aus dem Request-Body.

1. Füge die folgenden Zeilen in den `router.post('/:resourceId/ratings', ...)`Block ein:
    
    ```
        const resourceId = req.params.resourceId;
        const { ratingValue, userId } = req.body;
    
    ```
    
    - `const resourceId = req.params.resourceId`: Greift auf den Wert des URL-Parameters `resourceId` zu.
    - `const { ratingValue, userId } = req.body`: Verwendet **Destructuring-Assignment**, um die Eigenschaften `ratingValue` und `userId` direkt aus dem `req.body`Objekt zu extrahieren. Denke daran, dass `req.body` von der `express.json()`Middleware (die wir in `server.js` hinzugefügt haben) geparst wird.

### Schritt 5: Validiere die eingehenden Bewertungsdaten

Es ist entscheidend, die Daten zu validieren, um sicherzustellen, dass sie unseren Erwartungen entsprechen (z.B. Bewertung zwischen 1 und 5).

1. Füge die Validierungslogik in den `router.post('/:resourceId/ratings', ...)`Block ein:
    
    ```
        if (!ratingValue || ratingValue < 1 || ratingValue > 5 || !Number.isInteger(ratingValue)) {
            return res.status(400).json({ error: 'Bewertung muss eine ganze Zahl zwischen 1 und 5 sein.' });
        }
    
    ```
    
    - `!ratingValue`: Prüft, ob `ratingValue` überhaupt vorhanden ist.
    - `ratingValue < 1 || ratingValue > 5`: Prüft, ob der Wert außerhalb des gültigen Bereichs liegt.
    - `!Number.isInteger(ratingValue)`: Prüft, ob der Wert keine ganze Zahl ist.
    - `return res.status(400).json(...)`: Wenn die Validierung fehlschlägt, senden wir den HTTP-Statuscode **400 Bad Request** und eine detaillierte Fehlermeldung. `return` beendet die Funktion hier.

### Schritt 6: Erstelle das neue Bewertungsobjekt

Wenn die Daten gültig sind, erstellen wir ein Objekt, das die neue Bewertung repräsentiert.

1. Füge die folgenden Zeilen in den `router.post('/:resourceId/ratings', ...)`Block ein:
    
    ```
        const newRating = {
            id: uuidv4(), // Generiere eine eindeutige ID für die Bewertung selbst
            resourceId: resourceId,
            ratingValue: ratingValue,
            userId: userId || 'anonymous', // Verwende 'anonymous' wenn keine userId übergeben wird
            timestamp: new Date().toISOString() // Füge einen Zeitstempel hinzu
        };
    
    ```
    
    - `id: uuidv4()`: Generiert eine einzigartige ID für diese spezifische Bewertung.
    - `resourceId: resourceId`: Speichert die ID der Ressource, zu der diese Bewertung gehört.
    - `ratingValue: ratingValue`: Speichert den eigentlichen Sternenwert.
    - `userId: userId || 'anonymous'`: Speichert die Benutzer-ID. Wenn `userId` nicht im Request-Body vorhanden ist, wird stattdessen der String `'anonymous'` verwendet. Dies ist ein Beispiel für einen **Fallback-Wert**.
    - `timestamp: new Date().toISOString()`: Fügt einen Zeitstempel hinzu, wann die Bewertung erstellt wurde. `toISOString()` formatiert das Datum in einem standardisierten String.

### Schritt 7: Speichere die neue Bewertung in `data/ratings.json`

Wir laden die bestehenden Bewertungen, fügen die neue hinzu und speichern die aktualisierte Liste zurück in die Datei.

1. Füge einen `try`Block hinzu, um Dateizugriffsfehler zu behandeln:
    
    ```
        try {
            const data = fs.readFileSync(RATINGS_FILE, 'utf-8');
            const ratings = JSON.parse(data);
    
    ```
    
    - `fs.readFileSync(RATINGS_FILE, 'utf-8')`: Liest den Inhalt der `ratings.json`Datei.
    - `JSON.parse(data)`: Konvertiert den JSON-String in ein JavaScript-Array.
    
    ```
            ratings.push(newRating);
    
    ```
    
    - `ratings.push(newRating)`: Fügt das neu erstellte `newRating`Objekt zum Array der Bewertungen hinzu.
    
    ```
            const newRatingsData = JSON.stringify(ratings, null, 2);
            fs.writeFileSync(RATINGS_FILE, newRatingsData, 'utf-8');
    
    ```
    
    - `JSON.stringify(..., null, 2)`: Konvertiert das aktualisierte Array zurück in einen JSON-String. `null, 2` sorgt für eine lesbare Formatierung mit 2 Leerzeichen Einrückung.
    - `fs.writeFileSync(RATINGS_FILE, newRatingsData, 'utf-8')`: Schreibt den aktualisierten JSON-String in die `ratings.json`Datei, wobei der alte Inhalt vollständig überschrieben wird.

### Schritt 8: Sende eine Erfolgsantwort und füge den `catch`Block hinzu

Nachdem die Bewertung erfolgreich gespeichert wurde, senden wir eine Bestätigung an den Client.

1. Füge die Erfolgsantwort hinzu:
    
    ```
            res.status(201).json(newRating);
    
    ```
    
    - `res.status(201)`: Setzt den HTTP-Statuscode auf **201 Created**. Dies ist der korrekte Statuscode, um zu signalisieren, dass eine neue Ressource erfolgreich erstellt wurde.
    - `.json(newRating)`: Sendet das neu erstellte Bewertungsobjekt als JSON-Antwort zurück an den Client.
2. Schließe den `try`Block und füge den `catch`Block hinzu:
    
    ```
        } catch (error) {
            console.error('Fehler beim Schreiben der Bewertung in die Datei:', error);
            next(error); // Leite den Fehler an die zentrale Fehler-Middleware weiter
        }
    });
    
    ```
    
    - `console.error(...)`: Gibt eine Fehlermeldung in der Serverkonsole aus, die bei der Fehlersuche hilft.
    - `next(error)`: Leitet den Fehler an unsere globale Fehler-Middleware weiter, die wir in Tag 4 implementiert haben.

**Manuelle Tests für Ticket RC-014**

1. **Stoppe den Server und starte ihn neu:**
    
    ```
    node server.js
    
    ```
    
2. **Sende eine erfolgreiche `POST`Anfrage mit `curl`:**
    - **Bewertung für Ressource 1 (mit userId):**
        
        ```
        curl -X POST -H "Content-Type: application/json" -d '{"ratingValue": 5, "userId": "user_abc"}' http://localhost:5002/resources/1/ratings
        
        ```
        
        - Erwartete Antwort: Ein JSON-Objekt der neuen Bewertung mit `id`, `resourceId: "1"`, `ratingValue: 5`, `userId: "user_abc"` und einem `timestamp`. Statuscode `201 Created`.
        - Überprüfe die Datei `data/ratings.json`. Die neue Bewertung sollte hinzugefügt worden sein.
    - **Bewertung für Ressource 1 (anonym):**
        
        ```
        curl -X POST -H "Content-Type: application/json" -d '{"ratingValue": 4}' http://localhost:5002/resources/1/ratings
        
        ```
        
        - Erwartete Antwort: Ein JSON-Objekt der neuen Bewertung mit `userId: "anonymous"`. Statuscode `201 Created`.
    - **Bewertung für Ressource 2:**
        
        ```
        curl -X POST -H "Content-Type: application/json" -d '{"ratingValue": 3, "userId": "user_xyz"}' http://localhost:5002/resources/2/ratings
        
        ```
        
        - Erwartete Antwort: Ein JSON-Objekt der neuen Bewertung. Statuscode `201 Created`.
3. **Sende eine fehlerhafte `POST`Anfrage mit ungültigem Bewertungswert:**
    
    ```
    curl -X POST -H "Content-Type: application/json" -d '{"ratingValue": 0, "userId": "test"}' http://localhost:5002/resources/1/ratings
    ```sh
    curl -X POST -H "Content-Type: application/json" -d '{"ratingValue": 6, "userId": "test"}' http://localhost:5002/resources/1/ratings
    ```sh
    curl -X POST -H "Content-Type: application/json" -d '{"ratingValue": "drei", "userId": "test"}' http://localhost:5002/resources/1/ratings
    
    ```
    
    - Erwartete Antwort: `{"error": "Bewertung muss eine ganze Zahl zwischen 1 und 5 sein."}` und Statuscode `400 Bad Request`.
4. **Sende eine fehlerhafte `POST`Anfrage ohne `ratingValue`:**
    
    ```
    curl -X POST -H "Content-Type: application/json" -d '{"userId": "test"}' http://localhost:5002/resources/1/ratings
    
    ```
    
    - Erwartete Antwort: `{"error": "Bewertung muss eine ganze Zahl zwischen 1 und 5 sein."}` und Statuscode `400 Bad Request`.
5. **Führe den nächsten Git-Commit aus.**
    
    ```
    git add .
    git commit -m "feat(ratings): Implement POST /resources/:resourceId/ratings endpoint"
    
    ```
    

### Ticket RC-015: Durchschnittliche Bewertung anzeigen

Das Ziel dieses Tickets ist es, den Endpunkt zum Abrufen einer einzelnen Ressource (`GET /resources/:id`) zu erweitern, um die berechnete durchschnittliche Bewertung anzuzeigen.

### Schritt 1: Lade die Bewertungsdaten im `GET /:id`Endpunkt

Wir müssen die Bewertungen laden, um den Durchschnitt berechnen zu können.

1. Öffne die Datei **`routes/resources.js`**.
2. Navigiere zum `router.get('/:id', ...)`Endpunkt.
3. Füge die folgenden Zeilen am Anfang des `try`Blocks hinzu, direkt nach `const resourceId = req.params.id;`:
    
    ```
        const resourceId = req.params.id;
    
        const ratingsData = fs.readFileSync(RATINGS_FILE, 'utf-8');
        const allRatings = JSON.parse(ratingsData);
    
    ```
    
    - `fs.readFileSync(RATINGS_FILE, 'utf-8')`: Liest den Inhalt der `ratings.json`Datei.
    - `JSON.parse(ratingsData)`: Konvertiert den JSON-String in ein JavaScript-Array.

### Schritt 2: Filtere die Bewertungen für die spezifische Ressource

Wir brauchen nur die Bewertungen, die zur angefragten Ressource gehören.

1. Füge die folgende Zeile direkt nach dem Laden von `allRatings` hinzu:
    
    ```
        const resourceRatings = allRatings.filter(rating => rating.resourceId === resourceId);
    
    ```
    
    - `allRatings.filter(...)`: Erstellt ein **neues Array**, das nur die Bewertungen enthält, deren `resourceId` mit der `resourceId` aus der URL übereinstimmt.

### Schritt 3: Berechne die durchschnittliche Bewertung

Wir berechnen den Durchschnittswert basierend auf den gefilterten Bewertungen.

1. Füge die folgenden Zeilen direkt nach der Filterung der Bewertungen hinzu:
    
    ```
        let averageRating = 0;
        if (resourceRatings.length > 0) {
            const sumOfRatings = resourceRatings.reduce((sum, rating) => sum + rating.ratingValue, 0);
            averageRating = sumOfRatings / resourceRatings.length;
        }
    
    ```
    
    - `let averageRating = 0;`: Initialisiert die Variable für die durchschnittliche Bewertung. Wenn keine Bewertungen vorhanden sind, bleibt sie `0`.
    - `if (resourceRatings.length > 0)`: Prüft, ob überhaupt Bewertungen für diese Ressource existieren, um eine Division durch Null zu vermeiden.
    - `resourceRatings.reduce(...)`: Die `reduce()`Methode ist eine leistungsstarke Array-Methode. Sie führt eine **Reducer-Funktion** für jedes Element im Array aus und akkumuliert ein einzelnes Ergebnis.
        - `(sum, rating) => sum + rating.ratingValue`: Dies ist die Reducer-Funktion. `sum` ist der bisherige Akkumulator, `rating` ist das aktuelle Element. Sie addiert den `ratingValue` jedes Elements zur `sum`.
        - `, 0`: Der zweite Parameter von `reduce()` ist der **Initialwert** für `sum`.
    - `averageRating = sumOfRatings / resourceRatings.length`: Berechnet den Durchschnitt.

### Schritt 4: Füge die durchschnittliche Bewertung zum Ressourcenobjekt hinzu

Bevor wir die Ressource zurücksenden, fügen wir das neue Feld hinzu.

1. Navigiere zur `if (resource)`Bedingung, die prüft, ob die Ressource gefunden wurde.
2. Füge die folgende Zeile **innerhalb** dieses Blocks hinzu, direkt vor `res.json(resource);`:
    
    ```
            resource.averageRating = averageRating;
    
    ```
    
    - `resource.averageRating = averageRating`: Fügt dem `resource`Objekt eine neue Eigenschaft namens `averageRating` hinzu und weist ihr den berechneten Wert zu.

**Manuelle Tests für Ticket RC-015**

1. **Stelle sicher, dass du Bewertungen in `data/ratings.json` hast** (z.B. die, die du in den Tests für RC-014 erstellt hast).
2. **Stoppe den Server und starte ihn neu:**
    
    ```
    node server.js
    
    ```
    
3. **Teste den `GET /resources/:id`Endpunkt mit `curl` oder im Browser:**
    - **Ressource mit Bewertungen:**
        
        ```
        curl http://localhost:5002/resources/1
        
        ```
        
        - Erwartete Antwort: Das JSON-Objekt der Ressource mit ID `1` sollte nun ein neues Feld `averageRating` enthalten, das den korrekten Durchschnittswert der Bewertungen für diese Ressource anzeigt (z.B. `4.5` wenn du 5 und 4 Sterne vergeben hast).
    - **Ressource ohne Bewertungen (oder eine neue Ressource erstellen und dann abrufen):**
        - Füge eine neue Ressource über den `POST /resources`Endpunkt hinzu, für die noch keine Bewertungen existieren.
        - Rufe diese neue Ressource ab:
            
            ```
            curl http://localhost:5002/resources/<ID_DER_NEUEN_RESSOURCE>
            
            ```
            
        - Erwartete Antwort: Das Ressourcenobjekt sollte `averageRating: 0` (oder `null`, je nachdem, wie du es initialisiert hast) enthalten.
4. **Führe den nächsten Git-Commit aus.**
    
    ```
    git add .
    git commit -m "feat(ratings): Calculate and display average rating for resources"
    
    ```