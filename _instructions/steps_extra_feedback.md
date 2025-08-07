# Express.js :  Walkthrough - Feedback-Funktion

Willkommen zurück! Heute erweitern wir unseren `Resource Catalog Service` um die Möglichkeit, Text-Feedback zu Ressourcen hinzuzufügen, zu ändern und zu löschen. Dies ist eine klassische **CRUD**-Operation für eine verschachtelte Ressource.

### Ticket RC-016: Text-Feedback zu einer Ressource hinzufügen

Das Ziel dieses Tickets ist es, einen neuen Endpunkt zu erstellen, der es Benutzern ermöglicht, ein Text-Feedback für eine spezifische Ressource zu hinterlassen.

### Konzept: Verschachtelte Routen und `req.params`

- **Verschachtelte Routen**: Bisher hatten wir Routen wie `/resources` oder `/resources/:id`. Jetzt wollen wir Feedback **zu einer bestimmten Ressource** hinzufügen. Die URL wird dann `/resources/:resourceId/feedback` lauten. Hier haben wir zwei URL-Parameter: `resourceId` und `feedback` ist der Endpunkt für die Sammlung von Feedback zu dieser Ressource.
- **`req.params`**: Wie du bereits weißt, enthält `req.params` die Werte der URL-Parameter. Bei `/resources/:resourceId/feedback` kannst du auf `req.params.resourceId` zugreifen.

### Schritt 1: Erstelle die Mock-Daten für Feedback

Bevor wir Feedback speichern können, benötigen wir eine neue JSON-Datei, die als Speicherort dient.

1. Öffne deinen Code-Editor.
2. Navigiere zum Ordner **`data`** in deinem Projekt.
3. Erstelle in diesem Ordner eine neue Datei mit dem Namen **`feedback.json`**.
4. Füge den folgenden JSON-Inhalt in die Datei ein:
    
    ```
    []
    
    ```
    
    - `[]`: Dies ist ein **leeres JSON-Array**. Es dient als unsere "Datenbank" für alle Text-Feedback-Einträge. Wenn wir Feedback hinzufügen, werden diese Objekte in dieses Array eingefügt.

### Schritt 2: Definiere den Datenpfad für Feedback in `routes/resources.js`

Wir müssen den Pfad zu unserer neuen `feedback.json`-Datei in der `resources.js` verfügbar machen, da alle Feedback-bezogenen Routen in diesem Router definiert werden.

1. Öffne die Datei **`routes/resources.js`** in deinem Code-Editor.
2. Navigiere zu den Zeilen, in denen `DATA_FILE` (für Ressourcen) definiert ist.
3. Füge die folgende Zeile direkt unter der Definition von `const DATA_FILE = ...` hinzu:
    
    ```
    const FEEDBACK_FILE = path.join(__dirname, '../data', 'feedback.json');
    
    ```
    
    - `const FEEDBACK_FILE`: Wir deklarieren eine neue Konstante, die den vollständigen Dateipfad zu unserer `feedback.json`Datei speichern wird.
    - `path.join(...)`: Diese Methode kombiniert Pfadsegmente zu einem gültigen Pfad.
    - `__dirname`: Dies ist der Pfad zum Verzeichnis, in dem sich die aktuelle Datei (`resources.js`) befindet (also der `routes`Ordner).
    - `'../data'`: Von `routes/` aus müssen wir mit `../` eine Ebene nach oben gehen (ins Stammverzeichnis des Service) und dann in den Ordner `data` navigieren.
    - `'feedback.json'`: Der Name der Datei, auf die wir zugreifen möchten.

### Schritt 3: Erstelle den `POST`Endpunkt für Feedback

Wir definieren den neuen Endpunkt, der auf `POST`-Anfragen reagiert, um Feedback entgegenzunehmen.

1. Navigiere in **`routes/resources.js`** zum Ende der Datei, nach dem `router.post('/')`Endpunkt (dem Endpunkt zum Erstellen von Ressourcen).
2. Füge den Rahmen für den neuen Endpunkt hinzu:
    
    ```
    router.post('/:resourceId/feedback', (req, res, next) => {
        // Hier kommt die Logik für diesen Endpunkt
    });
    
    ```
    
    - `router.post(...)`: Wir verwenden die **HTTP-Methode `POST`**, da wir neue Daten (das Feedback) an den Server senden, um sie zu speichern und eine neue Ressource (ein Feedback-Eintrag) zu erstellen.
    - `'/:resourceId/feedback'`: Dies ist der Pfad für unseren neuen Endpunkt.
        - `:resourceId`: Dies ist ein **URL-Parameter**. Er ermöglicht es uns, die ID der Ressource direkt in der URL zu übergeben, die bewertet werden soll (z.B. `/resources/1/feedback`).
        - `/feedback`: Dies ist der spezifische Endpunkt für die Sammlung von Feedback zu einer bestimmten Ressource.
    - `(req, res, next) => { ... }`: Dies ist der **Route-Handler**.
        - `req`: Das Request-Objekt, das Informationen über die eingehende Anfrage enthält.
        - `res`: Das Response-Objekt, mit dem wir eine Antwort an den Client senden.
        - `next`: Die `next()`Funktion ist hier wichtig, falls wir Fehler an unsere zentrale Fehler-Middleware weitergeben müssen.

### Schritt 4: Lese die Daten aus der Anfrage

Wir lesen die `resourceId` aus den URL-Parametern und den Feedback-Text sowie optional die Benutzer-ID aus dem Request-Body.

1. Füge die folgenden Zeilen in den `router.post('/:resourceId/feedback', ...)`Block ein:
    
    ```
        const resourceId = req.params.resourceId;
    
    ```
    
    - `const resourceId = req.params.resourceId`: Greift auf den Wert des URL-Parameters `resourceId` zu, den der Client in der URL bereitgestellt hat.
    
    ```
        const { feedbackText, userId } = req.body;
    
    ```
    
    - `const { feedbackText, userId } = req.body`: Verwendet **Destructuring-Assignment** in JavaScript. Dies ist eine Kurzschreibweise, um die Eigenschaften `feedbackText` und `userId` direkt aus dem `req.body`Objekt zu extrahieren. Denke daran, dass das `req.body`Objekt von der `express.json()`Middleware (die wir in `server.js` hinzugefügt haben) geparst wird.

### Schritt 5: Validiere die eingehenden Feedback-Daten

Es ist entscheidend, die Daten zu validieren, um sicherzustellen, dass sie unseren Erwartungen entsprechen (z.B. Feedback-Text darf nicht leer sein und sollte eine angemessene Länge haben).

1. Füge die Validierungslogik in den `router.post('/:resourceId/feedback', ...)`Block ein:
    
    ```
        if (!feedbackText || feedbackText.trim().length < 10 || feedbackText.trim().length > 500) {
            return res.status(400).json({ error: 'Feedback-Text muss zwischen 10 und 500 Zeichen lang sein.' });
        }
    
    ```
    
    - `!feedbackText`: Prüft, ob `feedbackText` überhaupt vorhanden ist (z.B. `undefined` oder `null`).
    - `feedbackText.trim().length < 10`: `trim()` entfernt Leerzeichen am Anfang und Ende des Strings. Dann prüfen wir, ob die Länge des bereinigten Textes kleiner als 10 Zeichen ist.
    - `feedbackText.trim().length > 500`: Prüft, ob die Länge des bereinigten Textes größer als 500 Zeichen ist.
    - `||`: Der logische **ODER**Operator. Wenn eine dieser Bedingungen wahr ist, ist die gesamte `if`Bedingung wahr.
    - `return res.status(400).json(...)`: Wenn die Validierung fehlschlägt, senden wir den HTTP-Statuscode **400 Bad Request** und eine detaillierte Fehlermeldung als JSON. Das `return` beendet die Ausführung der Funktion an dieser Stelle, sodass kein weiterer Code ausgeführt wird.

### Schritt 6: Erstelle das neue Feedback-Objekt

Wenn die Daten gültig sind, erstellen wir ein JavaScript-Objekt, das den neuen Feedback-Eintrag repräsentiert.

1. Füge die folgenden Zeilen in den `router.post('/:resourceId/feedback', ...)`Block ein, direkt nach der Validierung:
    
    ```
        const newFeedback = {
            id: uuidv4(), // Generiere eine eindeutige ID für diesen Feedback-Eintrag
            resourceId: resourceId, // Die ID der Ressource, zu der dieses Feedback gehört
            feedbackText: feedbackText.trim(), // Speichere den bereinigten Feedback-Text
            userId: userId || 'anonymous', // Verwende 'anonymous', wenn keine userId übergeben wird
            timestamp: new Date().toISOString() // Füge einen Zeitstempel hinzu, wann das Feedback erstellt wurde
        };
    
    ```
    
    - `id: uuidv4()`: Ruft die `uuidv4()`Funktion auf (die wir aus dem `uuid`Paket importiert haben), um eine **einzigartige ID** für diesen spezifischen Feedback-Eintrag zu generieren.
    - `resourceId: resourceId`: Speichert die ID der Ressource, zu der dieses Feedback gehört.
    - `feedbackText: feedbackText.trim()`: Speichert den tatsächlichen Feedback-Text, wobei führende/nachfolgende Leerzeichen entfernt werden.
    - `userId: userId || 'anonymous'`: Speichert die Benutzer-ID. Wenn `userId` im Request-Body nicht vorhanden ist (z.B. weil der Nutzer nicht angemeldet ist), wird stattdessen der String `'anonymous'` als **Fallback-Wert** verwendet.
    - `timestamp: new Date().toISOString()`: Erstellt ein neues `Date`Objekt (den aktuellen Zeitpunkt) und konvertiert es mit `toISOString()` in einen standardisierten String (ISO 8601-Format), der leicht zu speichern und zu vergleichen ist.

### Schritt 7: Speichere das neue Feedback in `data/feedback.json`

Wir laden die bestehenden Feedback-Einträge, fügen den neuen hinzu und speichern die aktualisierte Liste zurück in die Datei.

1. Füge einen `try`Block hinzu, um Dateizugriffsfehler zu behandeln:
    
    ```
        try {
    
    ```
    
    - `try`: Dieser Block versucht, den darin enthaltenen Code auszuführen. Wenn dabei ein Fehler auftritt (z.B. wenn die `feedback.json`Datei nicht existiert oder beschädigt ist), springt die Ausführung zum `catch`Block.
2. Lies die bestehenden Daten aus der Datei:
    
    ```
            const data = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
    
    ```
    
    - `fs.readFileSync(FEEDBACK_FILE, 'utf-8')`: Liest den gesamten Inhalt der `feedback.json`Datei synchron. Der Parameter `'utf-8'` gibt an, dass der Inhalt als Text im UTF-8-Format gelesen werden soll.
3. Parse die Daten in ein JavaScript-Array:
    
    ```
            const feedback = JSON.parse(data);
    
    ```
    
    - `const feedback = JSON.parse(data)`: Konvertiert den JSON-Text (`data`), den wir aus der Datei gelesen haben, in ein JavaScript-Array von Objekten (`feedback`), mit dem wir in unserem Code arbeiten können.
4. Füge das neue Feedback zum Array hinzu:
    
    ```
            feedback.push(newFeedback);
    
    ```
    
    - `feedback.push(newFeedback)`: Dies ist eine Standardmethode für JavaScript-Arrays. Sie fügt das `newFeedback`Objekt, das wir in Schritt 6 erstellt haben, am Ende des `feedback`Arrays hinzu.
5. Konvertiere das aktualisierte Array zurück in einen JSON-String:
    
    ```
            const newFeedbackData = JSON.stringify(feedback, null, 2);
    
    ```
    
    - `JSON.stringify(...)`: Konvertiert ein JavaScript-Objekt (in diesem Fall unser aktualisiertes `feedback`Array) zurück in einen JSON-String.
    - `null, 2`: Diese beiden optionalen Argumente dienen dem **"Pretty Printing"**. Sie sorgen dafür, dass der JSON-String mit einer Einrückung von 2 Leerzeichen formatiert wird, sodass die `feedback.json`Datei im Dateisystem leicht lesbar bleibt.
6. Schreibe den aktualisierten JSON-String in die Datei:
    
    ```
            fs.writeFileSync(FEEDBACK_FILE, newFeedbackData, 'utf-8');
    
    ```
    
    - `fs.writeFileSync(...)`: Schreibt den übergebenen String (`newFeedbackData`) synchron in die angegebene Datei (`FEEDBACK_FILE`). Dies überschreibt den gesamten alten Inhalt der Datei.

### Schritt 8: Sende eine Erfolgsantwort und füge den `catch`Block hinzu

Nachdem die Bewertung erfolgreich gespeichert wurde, senden wir eine Bestätigung an den Client.

1. Füge die Erfolgsantwort hinzu:
    
    ```
            res.status(201).json(newFeedback);
    
    ```
    
    - `res.status(201)`: Setzt den HTTP-Statuscode der Antwort auf **201 Created**. Dieser Code ist die korrekte semantische Antwort, um zu signalisieren, dass eine neue Ressource (in diesem Fall ein Feedback-Eintrag) erfolgreich erstellt wurde.
    - `.json(newFeedback)`: Sendet das neu erstellte Feedback-Objekt als JSON-Antwort zurück an den Client. Es ist gute Praxis, die erstellte Ressource (einschließlich ihrer neuen ID und des Zeitstempels) zurückzusenden.
2. Schließe den `try`Block und füge den `catch`Block hinzu:
    
    ```
        } catch (error) {
            console.error('Fehler beim Schreiben des Feedbacks in die Datei:', error);
            next(error); // Leite den Fehler an die zentrale Fehler-Middleware weiter
        }
    });
    
    ```
    
    - `catch (error)`: Dieser Block wird ausgeführt, wenn im `try`Block ein Fehler auftritt (z.B. wenn die Datei nicht gefunden wird oder ein Schreibfehler auftritt).
    - `console.error(...)`: Gibt eine Fehlermeldung (einschließlich des Fehler-Stacks) in der Serverkonsole aus. Dies ist sehr hilfreich für die Fehlersuche während der Entwicklung.
    - `next(error)`: Dies ist entscheidend für unsere **zentrale Fehlerbehandlung**. Anstatt den Fehler hier direkt zu behandeln, rufen wir `next(error)` auf. Dadurch wird der Fehler an die globale Fehler-Middleware weitergeleitet, die wir in Tag 4 implementiert haben. Diese Middleware sendet dann eine konsistente `500 Internal Server Error`Antwort an den Client.

**Manuelle Tests für Ticket RC-016**

1. **Stoppe den Server und starte ihn neu:**
    
    ```
    node server.js
    
    ```
    
2. **Sende eine erfolgreiche `POST`Anfrage mit `curl`:**
    - **Feedback für Ressource 1 (mit userId):**
        
        ```
        curl -X POST -H "Content-Type: application/json" -d '{"feedbackText": "Dieser Kurs ist sehr informativ und gut strukturiert!", "userId": "user_alice"}' http://localhost:5002/resources/1/feedback
        
        ```
        
        - **Erwartete Antwort:** Ein JSON-Objekt der neuen Bewertung mit einer generierten `id`, `resourceId: "1"`, dem `feedbackText`, `userId: "user_alice"` und einem `timestamp`. Der HTTP-Statuscode sollte **`201 Created`** sein.
        - **Überprüfung der Datei:** Öffne die Datei `data/feedback.json`. Die neue Bewertung sollte hinzugefügt worden sein.
    - **Feedback für Ressource 2 (anonym):**
        
        ```
        curl -X POST -H "Content-Type: application/json" -d '{"feedbackText": "Das Video-Tutorial war sehr hilfreich und leicht verständlich."}' http://localhost:5002/resources/2/feedback
        
        ```
        
        - **Erwartete Antwort:** Ein JSON-Objekt der neuen Bewertung mit `userId: "anonymous"`. Statuscode **`201 Created`**.
3. **Sende eine fehlerhafte `POST`Anfrage mit ungültigem `feedbackText`:**
    - **Zu kurzer Text:**
        
        ```
        curl -X POST -H "Content-Type: application/json" -d '{"feedbackText": "Kurz.", "userId": "test"}' http://localhost:5002/resources/1/feedback
        
        ```
        
    - **Leerer Text:**
        
        ```
        curl -X POST -H "Content-Type: application/json" -d '{"feedbackText": "   ", "userId": "test"}' http://localhost:5002/resources/1/feedback
        
        ```
        
    - **Text fehlt:**
        
        ```
        curl -X POST -H "Content-Type: application/json" -d '{"userId": "test"}' http://localhost:5002/resources/1/feedback
        
        ```
        
    - **Erwartete Antwort für alle fehlerhaften Anfragen:** `{"error": "Feedback-Text muss zwischen 10 und 500 Zeichen lang sein."}` und Statuscode **`400 Bad Request`**.
4. **Führe den nächsten Git-Commit aus.**
    
    ```
    git add .
    git commit -m "feat(feedback): Implement POST /resources/:resourceId/feedback endpoint"
    
    ```
    

### Ticket RC-017: Text-Feedback ändern

Das Ziel dieses Tickets ist es, einen Endpunkt zu implementieren, der es Nutzern ermöglicht, ein bereits abgegebenes Text-Feedback für eine spezifische Ressource zu aktualisieren.

### Konzept: `PUT` für verschachtelte Ressourcen

- Die **HTTP-Methode `PUT`** wird verwendet, um eine **vollständige Aktualisierung** einer bestehenden Ressource durchzuführen. In diesem Fall aktualisieren wir einen spezifischen Feedback-Eintrag.
- Die URL wird `/resources/:resourceId/feedback/:feedbackId` lauten, um sowohl die Ressource als auch den spezifischen Feedback-Eintrag zu identifizieren.

### Schritt 1: Erstelle den `PUT`Endpunkt für Feedback

1. Öffne die Datei **`routes/resources.js`**.
2. Füge den folgenden Codeblock unter dem `router.post('/:resourceId/ratings', ...)`Endpunkt (oder dem zuletzt hinzugefügten Endpunkt) hinzu:
    
    ```
    router.put('/:resourceId/feedback/:feedbackId', (req, res, next) => {
        // Hier kommt die Logik für diesen Endpunkt
    });
    
    ```
    
    - `router.put(...)`: Wir verwenden die **HTTP-Methode `PUT`**, da wir eine bestehende Ressource (einen Feedback-Eintrag) aktualisieren.
    - `'/:resourceId/feedback/:feedbackId'`: Dies ist der Pfad für unseren neuen Endpunkt. Er enthält zwei URL-Parameter, um den spezifischen Feedback-Eintrag zu identifizieren.

### Schritt 2: Lese die IDs und den aktualisierten Text aus der Anfrage

1. Füge die folgenden Zeilen in den `router.put('/:resourceId/feedback/:feedbackId', ...)`Block ein:
    
    ```
        const resourceId = req.params.resourceId;
        const feedbackId = req.params.feedbackId;
        const { feedbackText } = req.body;
    
    ```
    
    - `resourceId` und `feedbackId`: Werden aus `req.params` gelesen.
    - `feedbackText`: Wird aus `req.body` gelesen.

### Schritt 3: Validiere den aktualisierten Feedback-Text

Die Validierung ist dieselbe wie beim Erstellen von Feedback.

1. Füge die Validierungslogik hinzu:
    
    ```
        if (!feedbackText || feedbackText.trim().length < 10 || feedbackText.trim().length > 500) {
            return res.status(400).json({ error: 'Aktualisierter Feedback-Text muss zwischen 10 und 500 Zeichen lang sein.' });
        }
    
    ```
    

### Schritt 4: Implementiere die Logik zum Aktualisieren des Feedbacks

Wir laden die Feedback-Daten, suchen den spezifischen Eintrag, aktualisieren ihn und schreiben die Datei zurück.

1. Füge einen `try`Block hinzu:
    
    ```
        try {
            const data = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
            let feedback = JSON.parse(data);
    
    ```
    
    - `let feedback = JSON.parse(data)`: Wir verwenden `let`, da wir das Array später möglicherweise modifizieren müssen.
2. Finde den Index des zu aktualisierenden Feedbacks:
    
    ```
            const feedbackIndex = feedback.findIndex(f => f.id === feedbackId && f.resourceId === resourceId);
    
    ```
    
    - `feedback.findIndex(...)`: Diese Array-Methode gibt den **Index** des ersten Elements zurück, das die angegebene Bedingung erfüllt. Wenn kein Element gefunden wird, gibt sie `1` zurück.
    - `f.id === feedbackId && f.resourceId === resourceId`: Die Bedingung prüft, ob sowohl die Feedback-ID als auch die Ressourcen-ID übereinstimmen, um sicherzustellen, dass wir das richtige Feedback aktualisieren.
3. Behandle den Fall, dass das Feedback nicht gefunden wurde:
    
    ```
            if (feedbackIndex === -1) {
                return res.status(404).json({ error: `Feedback mit ID ${feedbackId} für Ressource ${resourceId} nicht gefunden.` });
            }
    
    ```
    
    - `feedbackIndex === -1`: Wenn der Index `1` ist, wurde kein passendes Feedback gefunden.
    - `return res.status(404).json(...)`: Senden den HTTP-Statuscode **404 Not Found**.
4. Aktualisiere das Feedback-Objekt:
    
    ```
            feedback[feedbackIndex] = {
                ...feedback[feedbackIndex], // Kopiert alle bestehenden Eigenschaften des Feedbacks
                feedbackText: feedbackText.trim(), // Überschreibt den feedbackText mit dem neuen Wert
                timestamp: new Date().toISOString() // Aktualisiere den Zeitstempel
            };
    
    ```
    
    - `feedback[feedbackIndex] = { ... }`: Greift auf das spezifische Feedback-Objekt im Array zu.
    - `...feedback[feedbackIndex]`: Verwendet den Spread-Operator, um alle bestehenden Eigenschaften des Feedback-Objekts zu kopieren.
    - `feedbackText: feedbackText.trim()`: Überschreibt nur die `feedbackText`Eigenschaft mit dem neuen, bereinigten Text.
    - `timestamp: new Date().toISOString()`: Aktualisiert den Zeitstempel, um anzuzeigen, wann die letzte Änderung vorgenommen wurde.
5. Schreibe die aktualisierten Daten zurück in die Datei:
    
    ```
            const newFeedbackData = JSON.stringify(feedback, null, 2);
            fs.writeFileSync(FEEDBACK_FILE, newFeedbackData, 'utf-8');
    
    ```
    
6. Sende eine Erfolgsantwort:
    
    ```
            res.status(200).json(feedback[feedbackIndex]);
    
    ```
    
    - `res.status(200)`: Setzt den HTTP-Statuscode auf **200 OK**, um einen erfolgreichen Update zu signalisieren.
    - `.json(...)`: Sendet das aktualisierte Feedback-Objekt zurück.

### Schritt 5: Füge den `catch`Block hinzu

```
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Feedbacks:', error);
        next(error);
    }
});

```

**Manuelle Tests für Ticket RC-017**

1. **Stelle sicher, dass du ein Feedback in `data/feedback.json` hast**, das du aktualisieren kannst (z.B. eines, das du mit RC-016 erstellt hast). Notiere dir seine `id` und `resourceId`.
2. **Stoppe den Server und starte ihn neu:**
    
    ```
    node server.js
    
    ```
    
3. **Sende eine erfolgreiche `PUT`Anfrage mit `curl`:**
    
    ```
    # Ersetze <FEEDBACK_ID> und <RESOURCE_ID> durch tatsächliche IDs
    curl -X PUT -H "Content-Type: application/json" -d '{"feedbackText": "Dieser Kurs ist nach der Aktualisierung noch besser geworden!"}' http://localhost:5002/resources/<RESOURCE_ID>/feedback/<FEEDBACK_ID>
    
    ```
    
    - **Erwartete Antwort:** Das JSON-Objekt des aktualisierten Feedbacks sollte zurückgegeben werden, mit dem neuen `feedbackText` und einem aktualisierten `timestamp`. Statuscode **`200 OK`**.
    - **Überprüfung der Datei:** Öffne die Datei `data/feedback.json` und verifiziere, dass der Text des entsprechenden Feedbacks geändert wurde.
4. **Sende eine `PUT`Anfrage mit einer nicht existierenden `feedbackId`:**
    
    ```
    curl -X PUT -H "Content-Type: application/json" -d '{"feedbackText": "Dieser Text sollte nicht gespeichert werden."}' http://localhost:5002/resources/1/feedback/nicht_existierende_id
    
    ```
    
    - **Erwartete Antwort:** `{"error": "Feedback mit ID nicht_existierende_id für Ressource 1 nicht gefunden."}` und Statuscode **`404 Not Found`**.
5. **Sende eine `PUT`Anfrage mit ungültigem `feedbackText` (z.B. zu kurz):**
    
    ```
    curl -X PUT -H "Content-Type: application/json" -d '{"feedbackText": "Kurz."}' http://localhost:5002/resources/<RESOURCE_ID>/feedback/<FEEDBACK_ID>
    
    ```
    
    - **Erwartete Antwort:** `{"error": "Aktualisierter Feedback-Text muss zwischen 10 und 500 Zeichen lang sein."}` und Statuscode **`400 Bad Request`**.
6. **Führe den nächsten Git-Commit aus.**
    
    ```
    git add .
    git commit -m "feat(feedback): Implement PUT /resources/:resourceId/feedback/:feedbackId endpoint"
    
    ```
    

### Ticket RC-018: Text-Feedback löschen

Das Ziel dieses Tickets ist es, einen Endpunkt zu implementieren, der es Nutzern ermöglicht, ein bereits abgegebenes Text-Feedback für eine spezifische Ressource zu löschen.

### Konzept: `DELETE` für verschachtelte Ressourcen

- Die **HTTP-Methode `DELETE`** wird verwendet, um eine Ressource zu entfernen.
- Die URL wird `/resources/:resourceId/feedback/:feedbackId` lauten, um das spezifische Feedback zu identifizieren, das gelöscht werden soll.

### Schritt 1: Erstelle den `DELETE`Endpunkt für Feedback

1. Öffne die Datei **`routes/resources.js`**.
2. Füge den folgenden Codeblock unter dem `router.put('/:resourceId/feedback/:feedbackId', ...)`Endpunkt hinzu:
    
    ```
    router.delete('/:resourceId/feedback/:feedbackId', (req, res, next) => {
        // Hier kommt die Logik für diesen Endpunkt
    });
    
    ```
    
    - `router.delete(...)`: Wir verwenden die **HTTP-Methode `DELETE`**, da wir eine bestehende Ressource (einen Feedback-Eintrag) entfernen.

### Schritt 2: Lese die IDs aus der Anfrage

1. Füge die folgenden Zeilen in den `router.delete('/:resourceId/feedback/:feedbackId', ...)`Block ein:
    
    ```
        const resourceId = req.params.resourceId;
        const feedbackId = req.params.feedbackId;
    
    ```
    

### Schritt 3: Implementiere die Logik zum Löschen des Feedbacks

Wir laden die Feedback-Daten, filtern den spezifischen Eintrag heraus und schreiben die Datei zurück.

1. Füge einen `try`Block hinzu:
    
    ```
        try {
            const data = fs.readFileSync(FEEDBACK_FILE, 'utf-8');
            let feedback = JSON.parse(data);
    
    ```
    
    - `let feedback = JSON.parse(data)`: Wir verwenden `let`, da wir das Array später filtern werden.
2. Speichere die ursprüngliche Länge des Arrays:
    
    ```
            const initialLength = feedback.length;
    
    ```
    
    - `const initialLength = feedback.length`: Wir speichern die Anzahl der Feedback-Einträge, bevor wir filtern. Dies hilft uns später zu überprüfen, ob tatsächlich ein Eintrag gelöscht wurde.
3. Filtere das zu löschende Feedback heraus:
    
    ```
            feedback = feedback.filter(f => !(f.id === feedbackId && f.resourceId === resourceId));
    
    ```
    
    - `feedback.filter(...)`: Diese Array-Methode erstellt ein **neues Array**, das nur die Elemente enthält, für die die Bedingung `true` ist.
    - `!(f.id === feedbackId && f.resourceId === resourceId)`: Dies ist die Bedingung. Wir filtern alle Feedback-Einträge heraus, deren `id` und `resourceId` **nicht** mit den angefragten IDs übereinstimmen. Das bedeutet, dass der passende Eintrag aus dem neuen Array entfernt wird.
4. Überprüfe, ob ein Feedback tatsächlich gelöscht wurde:
    
    ```
            if (feedback.length === initialLength) {
                return res.status(404).json({ error: `Feedback mit ID ${feedbackId} für Ressource ${resourceId} nicht gefunden.` });
            }
    
    ```
    
    - `feedback.length === initialLength`: Wenn die Länge des Arrays nach dem Filtern gleich der ursprünglichen Länge ist, wurde kein passendes Feedback gefunden und somit auch keines gelöscht.
    - `return res.status(404).json(...)`: Sende den HTTP-Statuscode **404 Not Found**.
5. Schreibe die aktualisierten Daten zurück in die Datei:
    
    ```
            const newFeedbackData = JSON.stringify(feedback, null, 2);
            fs.writeFileSync(FEEDBACK_FILE, newFeedbackData, 'utf-8');
    
    ```
    
6. Sende eine Erfolgsantwort:
    
    ```
            res.status(204).end();
    
    ```
    
    - `res.status(204)`: Setzt den HTTP-Statuscode auf **204 No Content**. Dieser Statuscode wird verwendet, wenn die Anfrage erfolgreich war, aber keine Antwortdaten zurückgesendet werden müssen.
    - `.end()`: Beendet die Antwort, ohne einen Body zu senden.

### Schritt 4: Füge den `catch`Block hinzu

```
    } catch (error) {
        console.error('Fehler beim Löschen des Feedbacks:', error);
        next(error);
    }
});

```

**Manuelle Tests für Ticket RC-018**

1. **Stelle sicher, dass du Feedback-Einträge in `data/feedback.json` hast** (z.B. die, die du mit RC-016 erstellt hast). Notiere dir die `id` und `resourceId` eines Eintrags, den du löschen möchtest.
2. **Stoppe den Server und starte ihn neu:**
    
    ```
    node server.js
    
    ```
    
3. **Sende eine erfolgreiche `DELETE`Anfrage mit `curl`:**
    
    ```
    # Ersetze <FEEDBACK_ID> und <RESOURCE_ID> durch tatsächliche IDs
    curl -X DELETE http://localhost:5002/resources/<RESOURCE_ID>/feedback/<FEEDBACK_ID>
    
    ```
    
    - **Erwartete Antwort:** Der Body sollte leer sein und der Statuscode **`204 No Content`** zurückgegeben werden.
    - **Überprüfung der Datei:** Öffne `data/feedback.json`. Das Feedback mit der angegebenen ID sollte aus dem Array entfernt worden sein.
    - **Zusätzliche Überprüfung:** Versuche, das soeben gelöschte Feedback erneut zu löschen (oder versuche es mit `PUT` zu aktualisieren). Du solltest einen **`404 Not Found`** erhalten.
4. **Sende eine `DELETE`Anfrage mit einer nicht existierenden `feedbackId`:**
    
    ```
    curl -X DELETE http://localhost:5002/resources/1/feedback/nicht_existierende_id
    
    ```
    
    - **Erwartete Antwort:** `{"error": "Feedback mit ID nicht_existierende_id für Ressource 1 nicht gefunden."}` und Statuscode **`404 Not Found`**.
5. **Führe den nächsten Git-Commit aus.**
    
    ```
    git add .
    git commit -m "feat(feedback): Implement DELETE /resources/:resourceId/feedback/:feedbackId endpoint"
    
    ```