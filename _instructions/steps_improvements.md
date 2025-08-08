# RC-020: Asynchroner Datenmanager – Detaillierter Walkthrough (Resource Catalog Service)

**Titel:** Asynchroner Datenmanager für Dateizugriffe im Resource Catalog Service

**Ziel:** Die Lese- und Schreiboperationen auf JSON-Dateien sollen asynchron erfolgen und in dedizierten Helferfunktionen gekapselt werden, um die API reaktionsfähiger zu machen und den Code modularer zu gestalten.

### Das Problem: Synchrones I/O blockiert den Node.js Event Loop

Bisher haben wir für den Dateizugriff in unserem Express.js-Service Funktionen wie `fs.readFileSync()` und `fs.writeFileSync()` verwendet. Diese Funktionen sind **synchron** (oder "blockierend"). Um zu verstehen, warum das ein Problem ist, müssen wir uns das Herzstück von Node.js ansehen: den **Event Loop**.

Stell dir den **Node.js Event Loop** wie einen sehr effizienten Einzelkoch in einem belebten Restaurant vor. Dieser Koch ist dafür zuständig, alle eingehenden Bestellungen (HTTP-Anfragen, Timer, Datenbankzugriffe usw.) der Reihe nach zu bearbeiten.

- **Synchroner Koch (wie `fs.readFileSync`):** Wenn eine Bestellung eingeht, die viel Zeit in Anspruch nimmt (z.B. "Lies eine sehr große Datei von der Festplatte"), muss der Koch diese Bestellung **komplett abschließen**, bevor er überhaupt die nächste Bestellung ansehen kann. Während er auf die Festplatte wartet, steht er untätig da, und die Schlange der wartenden Kunden (andere eingehende HTTP-Anfragen) wird immer länger. Das Restaurant wird unresponsiv. Wenn viele Kunden gleichzeitig kommen, bricht der Service zusammen, weil der Koch blockiert ist.
- **Asynchroner Koch (wie `fs.promises.readFile`):** Wenn eine langwierige Bestellung (z.B. "Lies eine Datei") eingeht, gibt der Koch sie sofort an einen Gehilfen (einen "Worker-Thread" im Hintergrund) weiter und sagt: "Bitte lies diese Datei. Sag mir Bescheid, wenn du fertig bist, dann verarbeite ich das Ergebnis." Der Koch kann dann sofort die nächste Bestellung entgegennehmen und mit der Zubereitung beginnen. Sobald der Gehilfe fertig ist, meldet er sich beim Koch, der dann das Ergebnis verarbeitet und die Antwort an den Kunden sendet. Das Restaurant bleibt **reaktionsfähig** und kann viele Kunden gleichzeitig bedienen, da der Hauptkoch (der Event Loop) nie blockiert wird.

**Im Kontext von Node.js:**

- **Synchrones I/O (`fs.readFileSync`, `fs.writeFileSync`)**: Blockiert den **Event Loop**. Solange die Datei gelesen oder geschrieben wird, kann Node.js keine anderen HTTP-Anfragen verarbeiten, keine Timer ausführen oder keine anderen Aufgaben erledigen. Dies führt zu einer schlechten Performance und Skalierbarkeit für Webserver, da sie nicht viele gleichzeitige Anfragen effizient bearbeiten können.
- **Asynchrones I/O (`fs.promises.readFile`, `fs.promises.writeFile`)**: Nutzt den Event Loop effizient. Die I/O-Operationen werden an das Betriebssystem delegiert und im Hintergrund ausgeführt. Sobald sie abgeschlossen sind, wird ein **Promise** aufgelöst, und Node.js kann das Ergebnis verarbeiten, ohne den Event Loop blockiert zu haben. Dies ist entscheidend für die Skalierbarkeit von Node.js-Anwendungen.

### Die Lösung: Asynchrone Dateisystemoperationen mit Promises und `async`/`await`

Um unseren Server reaktionsfähiger und skalierbarer zu machen, stellen wir unsere Dateizugriffe auf asynchrone Operationen um.

- **`fs.promises`**: Dies ist die moderne, Promise-basierte API des Node.js-Dateisystemmoduls. Sie bietet asynchrone Versionen von Funktionen wie `readFile` und `writeFile`, die Promises zurückgeben.
- **`async`/`await`**: Schlüsselwörter in JavaScript, die das Schreiben von asynchronem Code, der Promises verwendet, erheblich vereinfachen und ihn so aussehen lassen, als wäre er synchron, ohne den Event Loop zu blockieren.
    - Eine Funktion, die mit `async` deklariert ist, gibt immer ein Promise zurück.
    - `await` kann nur innerhalb einer `async`Funktion verwendet werden. Es "pausiert" die Ausführung der `async`Funktion, bis das Promise, auf das gewartet wird, aufgelöst (erfolgreich abgeschlossen) oder abgelehnt (Fehler aufgetreten) ist. Der Wert des aufgelösten Promises wird dann zurückgegeben.

### Schritt 1: Erstelle den `helpers`Ordner und die `data_manager.js`Datei

Zuerst schaffen wir den neuen Ordner und die Datei, die unsere zentralisierten Datenzugriffsfunktionen enthalten werden.

1. Öffne dein **Terminal** oder deine **Eingabeaufforderung**.
2. Navigiere zum Stammverzeichnis deines **Resource Catalog Service**.
    - **Beispiel:** Wenn du im Ordner `Projekte` bist und dein Service `resource_catalog_service` heißt, dann gib `cd resource_catalog_service` ein.
3. Erstelle den neuen Ordner namens `helpers`:
    
    ```bash
    mkdir helpers
    
    ```
    
    - `mkdir helpers`: Dieser Befehl erstellt einen neuen Ordner mit dem Namen `helpers`. Dies ist eine gängige Konvention, um kleine, wiederverwendbare Hilfsfunktionen zu gruppieren, die keine direkten Routen oder Middleware sind.
4. Erstelle im neu erstellten Ordner `helpers` eine neue Datei mit dem Namen **`data_manager.js`**:
    
    ```bash
    touch helpers/data_manager.js
    
    ```
    
    - `touch helpers/data_manager.js`: Dieser Befehl erstellt eine leere Datei namens `data_manager.js` im `helpers`Ordner.

### Schritt 2: Implementiere den asynchronen Datenmanager in `helpers/data_manager.js`

Jetzt schreiben wir den Code für unsere asynchronen Lese- und Schreibfunktionen in der neu erstellten Datei. Ich werde jede Zeile einzeln eingeben und erklären.

1. Öffne die Datei **`helpers/data_manager.js`** in deinem Code-Editor.
2. Beginne mit den Import-Anweisungen:
    
    ```jsx
    import * as fs from 'fs';
    
    ```
    
    - `import * as fs from 'fs';`: Diese Zeile importiert das gesamte eingebaute **File System (fs)**Modul von Node.js. Wir benötigen es für synchrone Hilfsfunktionen wie `fs.existsSync` und `fs.mkdirSync`. Diese spezifischen Funktionen sind keine blockierenden I/O-Operationen und können daher synchron verwendet werden, ohne den Event Loop zu beeinträchtigen.
    
    ```jsx
    import fsp from 'fs/promises';
    
    ```
    
    - `import fsp from 'fs/promises';`: Diese Zeile importiert die **Promise-basierte API** des `fs`Moduls. Wir geben ihr den Alias `fsp` (kurz für "File System Promises"), um sie von der synchronen `fs`API zu unterscheiden. `fsp` enthält die asynchronen Versionen der Dateisystemfunktionen, die Promises zurückgeben.
    
    ```jsx
    import path from 'path';
    
    ```
    
    - `import path from 'path';`: Diese Zeile importiert das eingebaute **Path-Modul**. Es stellt Dienstprogramme für die Arbeit mit Datei- und Verzeichnispfaden bereit, was plattformunabhängige Pfade ermöglicht (z.B. `/` auf Linux/macOS und `\` auf Windows).
    
    ```jsx
    import { fileURLToPath } from 'url';
    
    ```
    
    - `import { fileURLToPath } from 'url';`: Diese Zeile importiert eine spezifische Hilfsfunktion aus dem `url`Modul. In ES Modules (`import`/`export`) sind die globalen Variablen `__filename` und `__dirname` (die in CommonJS-Modulen verfügbar sind) nicht direkt verfügbar. Diese Funktion hilft uns, den Dateipfad und das Verzeichnis des aktuellen Moduls zu ermitteln.
3. Füge die Helfervariablen für Pfade hinzu:
    
    ```jsx
    const __filename = fileURLToPath(import.meta.url);
    
    ```
    
    - `const __filename = fileURLToPath(import.meta.url);`: Diese Zeile ermittelt den vollständigen Dateipfad des aktuellen Moduls (`data_manager.js`). `import.meta.url` gibt die URL des aktuellen Moduls zurück (z.B. `file:///path/to/your/project/helpers/data_manager.js`), und `fileURLToPath`konvertiert diese URL in einen plattformspezifischen Dateipfad.
    
    ```jsx
    const __dirname = path.dirname(__filename);
    
    ```
    
    - `const __dirname = path.dirname(__filename);`: Diese Zeile ermittelt den Verzeichnispfad, in dem sich die aktuelle Datei (`data_manager.js`) befindet. Wenn `__filename` z.B. `/path/to/your/project/helpers/data_manager.js` ist, dann ist `__dirname/path/to/your/project/helpers`.
4. Beginne mit der Definition der `readData`Funktion:
    
    ```jsx
    export const readData = async (fileName) => {
    
    ```
    
    - `export const readData = async (fileName) => { ... }`: Diese Zeile definiert eine neue Funktion namens `readData`.
        - `export`: Macht diese Funktion außerhalb dieses Moduls verfügbar, sodass andere Dateien sie importieren können.
        - `async`: Das Schlüsselwort `async` vor der Funktion bedeutet, dass diese Funktion immer ein Promise zurückgibt. Es erlaubt uns auch, das `await`Schlüsselwort innerhalb dieser Funktion zu verwenden.
        - `fileName`: Dies ist der Parameter, der den Namen der JSON-Datei (z.B. `'resources.json'`) entgegennimmt, die gelesen werden soll.
5. Füge die Logik zum Konstruieren des Dateipfads und Prüfen der Existenz hinzu:
    
    ```jsx
        const filePath = path.join(__dirname, '../data', fileName);
    
    ```
    
    - `const filePath = path.join(__dirname, '../data', fileName);`: Diese Zeile konstruiert den vollständigen, plattformunabhängigen Pfad zur Zieldatei.
        - `__dirname`: Ist der Pfad zum `helpers/`Ordner (z.B. `/path/to/your/project/helpers`).
        - `'../data'`: `..` navigiert eine Ebene nach oben (zum Service-Stammverzeichnis, z.B. `/path/to/your/project/`). Dann wird der `data/`Ordner angehängt (z.B. `/path/to/your/project/data/`).
        - `fileName`: Wird angehängt (z.B. `resources.json`), um den vollständigen Pfad zu bilden (z.B. `/path/to/your/project/data/resources.json`).
    
    ```jsx
        if (!fs.existsSync(filePath)) {
    
    ```
    
    - `if (!fs.existsSync(filePath)) { ... }`: Diese Zeile prüft synchron, ob die Datei unter dem konstruierten `filePath` existiert.
        - `fs.existsSync()`: Ist eine synchrone Funktion. In diesem spezifischen Fall ist es jedoch akzeptabel, sie synchron zu verwenden, da das Prüfen der Dateiexistenz eine sehr schnelle Operation ist und den Event Loop nicht merklich blockiert.
    
    ```jsx
            return [];
    
    ```
    
    - `return [];`: Wenn die Datei nicht existiert, geben wir ein leeres Array zurück. Dies ist eine sichere Standardeinstellung, die verhindert, dass der Code abstürzt, wenn die Daten-JSON-Datei noch nicht erstellt wurde.
    
    ```jsx
        }
    
    ```
    
6. Füge die Logik zum asynchronen Lesen und Parsen der Daten hinzu:
    
    ```jsx
        const data = await fsp.readFile(filePath, 'utf-8');
    
    ```
    
    - `const data = await fsp.readFile(filePath, 'utf-8');`: Dies ist der Kern der asynchronen Leseoperation.
        - `fsp.readFile()`: Ruft die Promise-basierte Funktion zum Lesen des gesamten Inhalts einer Datei auf.
            - `filePath`: Der Pfad zur Datei.
            - `'utf-8'`: Gibt die Zeichenkodierung an, in der die Datei gelesen werden soll.
        - `await`: Dieses Schlüsselwort ist entscheidend. Es bewirkt, dass die Ausführung der `readData`Funktion **pausiert**, bis das Promise, das von `fsp.readFile()` zurückgegeben wird, aufgelöst (d.h., der Lesevorgang ist abgeschlossen) ist. Während diese Funktion pausiert, bleibt der Node.js Event Loop frei, um andere Aufgaben (wie die Bearbeitung anderer HTTP-Anfragen) zu erledigen. Sobald die Datei gelesen wurde, wird der Inhalt dem `data`Konstanten zugewiesen.
    
    ```jsx
        return JSON.parse(data);
    };
    
    ```
    
    - `return JSON.parse(data);`: Diese Zeile konvertiert den JSON-String (den wir aus der Datei gelesen haben) in ein JavaScript-Objekt (typischerweise ein Array von Objekten oder ein einzelnes Objekt), mit dem wir in unserem Code arbeiten können.
7. Beginne mit der Definition der `writeData`Funktion:
    
    ```jsx
    export const writeData = async (fileName, data) => {
    
    ```
    
    - `export const writeData = async (fileName, data) => { ... }`: Definiert eine neue asynchrone Funktion namens `writeData`, die exportiert wird.
        - `fileName`: Der Name der JSON-Datei, in die geschrieben werden soll.
        - `data`: Das JavaScript-Array oder -Objekt, das in die JSON-Datei geschrieben werden soll.
8. Füge die Logik zum Konstruieren des Dateipfads und Sicherstellen des Verzeichnisses hinzu:
    
    ```jsx
        const filePath = path.join(__dirname, '../data', fileName);
    
    ```
    
    - `const filePath = path.join(__dirname, '../data', fileName);`: Konstruiert den vollständigen Pfad zur Zieldatei, genau wie in `readData`.
    
    ```jsx
        const dir = path.dirname(filePath);
    
    ```
    
    - `const dir = path.dirname(filePath);`: Ermittelt den Verzeichnispfad, in dem die Datei abgelegt werden soll (z.B. `/path/to/your/project/data`).
    
    ```jsx
        if (!fs.existsSync(dir)) {
    
    ```
    
    - `if (!fs.existsSync(dir)) { ... }`: Prüft synchron, ob dieses Verzeichnis existiert.
    
    ```jsx
            fs.mkdirSync(dir, { recursive: true });
    
    ```
    
    - `fs.mkdirSync(dir, { recursive: true });`: Wenn das Verzeichnis nicht existiert, erstellt diese synchrone Funktion es.
        - `recursive: true`: Stellt sicher, dass auch übergeordnete, nicht existierende Verzeichnisse erstellt werden, falls sie noch nicht vorhanden sind.
        - Auch diese Operation ist in Ordnung, synchron zu sein, da Verzeichnisse in der Regel nur einmal erstellt werden müssen und diese Operation sehr schnell ist.
    
    ```jsx
        }
    
    ```
    
9. Füge die Logik zum Konvertieren der Daten in JSON und asynchronen Schreiben hinzu:
    
    ```jsx
        const jsonData = JSON.stringify(data, null, 2);
    
    ```
    
    - `const jsonData = JSON.stringify(data, null, 2);`: Konvertiert das JavaScript-Objekt (`data`) in einen JSON-String.
        - `null, 2`: Diese optionalen Argumente von `JSON.stringify()` sind für das "Pretty Printing". Sie sorgen dafür, dass der JSON-String mit einer Einrückung von 2 Leerzeichen formatiert wird. Dies macht die `.json`Dateien im Dateisystem viel lesbarer und einfacher zu debuggen.
    
    ```jsx
        await fsp.writeFile(filePath, jsonData, 'utf-8');
    };
    
    ```
    
    - `await fsp.writeFile(filePath, jsonData, 'utf-8');`: Dies ist der Kern der asynchronen Schreiboperation.
        - `fsp.writeFile()`: Ruft die Promise-basierte Funktion zum Schreiben von Daten in eine Datei auf.
            - `filePath`: Der Pfad zur Zieldatei.
            - `jsonData`: Der zu schreibende JSON-String.
            - `'utf-8'`: Die Zeichenkodierung.
        - `await`: Pausiert die Ausführung dieser `async` Funktion, bis das Promise von `fsp.writeFile`aufgelöst ist. Der Event Loop bleibt währenddessen frei.

### Schritt 3: Passe `routes/resources_bp.js` an (Resource Catalog Service)

Jetzt werden wir die `routes/resources_bp.js`-Datei so anpassen, dass sie unseren neuen asynchronen Datenmanager verwendet. Das bedeutet, dass wir alte Imports und Pfadkonstanten entfernen und stattdessen die neuen asynchronen Funktionen mit `await` verwenden.

1. Öffne die Datei **`routes/resources_bp.js`** in deinem Code-Editor.
2. **Entferne die alten `fs`, `path` und `fileURLToPath` Imports:**
    - Lösche die folgenden Zeilen ganz oben in der Datei:
        
        ```jsx
        // import fs from 'fs';
        // import path from 'path';
        // import { fileURLToPath } from 'url';
        
        ```
        
        - **Erklärung:** Diese Module werden nicht mehr direkt in dieser Datei benötigt, da der `data_manager.js` nun alle Dateisystemoperationen kapselt.
3. **Entferne die alten Pfadkonstanten und Helfervariablen:**
    - Lösche die folgenden Zeilen (oder ähnliche, die Pfade zu JSON-Dateien definieren) nach den Imports:
        
        ```jsx
        // const __filename = fileURLToPath(import.meta.url);
        // const __dirname = path.dirname(__filename);
        // const DATA_FILE = path.join(__dirname, '../data', 'resources.json');
        // const RATINGS_FILE = path.join(__dirname, '../data', 'ratings.json');
        // const FEEDBACK_FILE = path.join(__dirname, '../data', 'feedback.json');
        
        ```
        
        - **Erklärung:** Diese Pfadkonstanten sind nun im `data_manager.js` zentralisiert oder werden direkt als Dateinamen an die `readData`/`writeData`Funktionen übergeben.
4. **Importiere die neuen asynchronen Datenmanager-Funktionen:**
    - Füge die folgende Zeile ganz oben in der Datei hinzu (direkt unter den anderen Imports, z.B. `uuid` und `date-fns`):
        
        ```jsx
        import { readData, writeData } from '../helpers/data_manager.js';
        
        ```
        
        - **Erklärung:** Wir importieren die beiden Funktionen `readData` und `writeData` aus unserem `data_manager.js`Modul. Da `resources_bp.js` im Ordner `routes/` liegt und `data_manager.js` im Ordner `helpers/`, müssen wir mit `../` (eine Ebene nach oben) navigieren und dann in den `helpers/`Ordner.
5. **Definiere die Dateinamen-Konstanten:**
    - Füge die folgenden Zeilen hinzu, um die Dateinamen zu definieren, die an `readData`/`writeData` übergeben werden:
        
        ```jsx
        const RESOURCES_FILE_NAME = 'resources.json';
        const RATINGS_FILE_NAME = 'ratings.json';
        const FEEDBACK_FILE_NAME = 'feedback.json';
        
        ```
        
        - **Erklärung:** Diese Konstanten speichern nur den Namen der JSON-Datei (z.B. `'resources.json'`), nicht den vollständigen Pfad. Der vollständige Pfad wird vom `data_manager.js` intern konstruiert.
6. **Konvertiere alle Route-Handler zu `async` und verwende `await`:**
    - Gehe jeden Endpunkt in `routes/resources_bp.js` durch und passe ihn an. Achte darauf, das Schlüsselwort `async` zur Funktionsdefinition hinzuzufügen und `await` vor jeden Aufruf von `readData` und `writeData` zu setzen.
    - **Wichtiger Hinweis:** In den vorherigen Versionen wurde fälschlicherweise `notificationsRouter`verwendet. Der korrekte Router für den Resource Catalog Service ist in der Regel `resourcesRouter` oder einfach `router` innerhalb der `resources_bp.js` Datei, je nachdem, wie er in `app.js` importiert wird. Ich werde hier `resourcesRouter` als Platzhalter verwenden, der dem üblichen Schema für einen Ressourcen-Router entspricht. **Stelle sicher, dass du den Namen deines Routers (z.B. `router` oder `resourcesRouter`) in deiner Datei `resources_bp.js` entsprechend anpasst.**
    - **`GET /` Endpunkt (Alle Ressourcen abrufen):**
        
        ```jsx
        // Angenommen, der Router ist in dieser Datei als 'resourcesRouter' exportiert oder direkt 'router'
        router.get('/', async (req, res, next) => {
            try {
                const resources = await readData(RESOURCES_FILE_NAME);
                const { type, authorId } } = req.query;
        
                let filteredResources = resources;
        
                if (type) {
                    filteredResources = filteredResources.filter(r => String(r.type) === String(type));
                }
                if (authorId) {
                    filteredResources = filteredResources.filter(r => String(r.authorId) === String(authorId));
                }
        
                res.status(200).json(filteredResources);
            } catch (error) {
                console.error('Fehler beim Abrufen der Ressourcen:', error);
                next(error);
            }
        });
        
        ```
        
        - **Erklärung:**
            - `async (req, res, next) => { ... }`: Der Route-Handler wird als `async`Funktion deklariert. Dies ist notwendig, weil wir innerhalb dieser Funktion das `await`Schlüsselwort verwenden werden.
            - `const resources = await readData(RESOURCES_FILE_NAME);`: Hier rufen wir unsere neue `readData`Funktion auf. Das `await` bewirkt, dass die Ausführung dieses Handlers pausiert, bis das Promise von `readData` aufgelöst ist (d.h., die Daten wurden erfolgreich aus der Datei gelesen). Während dieser Pause kann der Node.js Event Loop andere Anfragen bearbeiten.
    - **`GET /:id` Endpunkt (Einzelne Ressource abrufen):**
        
        ```jsx
        router.get('/:id', async (req, res, next) => {
            try {
                const resourceId = String(req.params.id);
                const resources = await readData(RESOURCES_FILE_NAME);
        
                const ratings = await readData(RATINGS_FILE_NAME);
                const resourceRatings = ratings.filter(rating => String(rating.resourceId) === resourceId);
        
                let averageRating = 0;
                if (resourceRatings.length > 0) {
                    const sumOfRatings = resourceRatings.reduce((sum, rating) => sum + Number(rating.ratingValue), 0);
                    averageRating = sumOfRatings / resourceRatings.length;
                }
        
                const resource = resources.find(r => String(r.id) === resourceId);
        
                if (resource) {
                    resource.averageRating = averageRating;
                    res.status(200).json(resource);
                } else {
                    res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.` });
                }
            } catch (error) {
                console.error('Fehler beim Abrufen der Ressource:', error);
                next(error);
            }
        });
        
        ```
        
        - **Erklärung:** Auch hier wird der Handler `async` gemacht, und `await` wird für `readData()` für beide Dateizugriffe verwendet (`RESOURCES_FILE_NAME` und `RATINGS_FILE_NAME`).
    - **`POST /` Endpunkt (Ressource erstellen):**
        
        ```jsx
        import { validateResource } from '../middleware/validation.js'; // Import für validateResource
        // ... andere Imports ...
        
        router.post('/', validateResource, async (req, res, next) => {
            const newResourceData = req.body;
        
            const newResource = {
                id: uuidv4(),
                ...newResourceData,
                createdAt: formatISO(new Date())
            };
        
            try {
                const resources = await readData(RESOURCES_FILE_NAME);
                resources.push(newResource);
                await writeData(RESOURCES_FILE_NAME, resources);
        
                res.status(201).json(newResource);
            } catch (error) {
                console.error('Fehler beim Erstellen der Ressource:', error);
                next(error);
            }
        });
        
        ```
        
        - **Erklärung:** Der Handler wird `async` gemacht. `await readData()` wird verwendet, um die bestehenden Ressourcen zu laden, und `await writeData()` wird verwendet, um die aktualisierte Liste zurückzuschreiben. Beachte den zusätzlichen Import für `validateResource` (wird in RC-022 detaillierter behandelt).
    - **`POST /:resourceId/ratings` Endpunkt (Ressource bewerten):**
        
        ```jsx
        import { validateRating } from '../middleware/validation.js'; // Import für validateRating
        // ... andere Imports ...
        
        router.post('/:resourceId/ratings', validateRating, async (req, res, next) => {
            const resourceId = String(req.params.resourceId);
            const { ratingValue, userId } = req.body;
        
            const newRating = {
                id: uuidv4(),
                resourceId: resourceId,
                ratingValue: ratingValue,
                userId: userId ? String(userId) : 'anonymous',
                timestamp: formatISO(new Date())
            };
        
            try {
                const ratings = await readData(RATINGS_FILE_NAME);
                ratings.push(newRating);
                await writeData(RATINGS_FILE_NAME, ratings);
        
                res.status(201).json(newRating);
            } catch (error) {
                console.error('Fehler beim Schreiben der Bewertung in die Datei:', error);
                next(error);
            }
        });
        
        ```
        
        - **Erklärung:** Der Handler wird `async` gemacht. `await readData()` und `await writeData()` werden für die Bewertungsdatei verwendet. Beachte den zusätzlichen Import für `validateRating`.
    - **`POST /:resourceId/feedback` Endpunkt (Text-Feedback hinzufügen):**
        
        ```jsx
        import { validateFeedback } from '../middleware/validation.js'; // Import für validateFeedback
        // ... andere Imports ...
        
        router.post('/:resourceId/feedback', validateFeedback, async (req, res, next) => {
            const resourceId = String(req.params.resourceId);
            const { feedbackText, userId } = req.body;
        
            const newFeedback = {
                id: uuidv4(),
                resourceId: resourceId,
                feedbackText: feedbackText.trim(),
                userId: userId ? String(userId) : 'anonymous',
                timestamp: formatISO(new Date())
            };
        
            try {
                const feedback = await readData(FEEDBACK_FILE_NAME);
                feedback.push(newFeedback);
                await writeData(FEEDBACK_FILE_NAME, feedback);
        
                res.status(201).json(newFeedback);
            } catch (error) {
                console.error('Fehler beim Schreiben des Feedbacks in die Datei:', error);
                next(error);
            }
        });
        
        ```
        
        - **Erklärung:** Der Handler wird `async` gemacht. `await readData()` und `await writeData()` werden für die Feedback-Datei verwendet. Beachte den zusätzlichen Import für `validateFeedback`.
    - **`PUT /:resourceId/feedback/:feedbackId` Endpunkt (Text-Feedback ändern):**
        
        ```jsx
        import { validateFeedback } from '../middleware/validation.js'; // Import für validateFeedback
        // ... andere Imports ...
        
        router.put('/:resourceId/feedback/:feedbackId', validateFeedback, async (req, res, next) => {
            const resourceId = String(req.params.resourceId);
            const feedbackId = String(req.params.feedbackId);
            const { feedbackText } = req.body;
        
            try {
                let feedback = await readData(FEEDBACK_FILE_NAME);
        
                const feedbackIndex = feedback.findIndex(f => String(f.id) === feedbackId && String(f.resourceId) === resourceId);
        
                if (feedbackIndex === -1) {
                    return res.status(404).json({ error: `Feedback mit ID ${feedbackId} für Ressource ${resourceId} nicht gefunden.` });
                }
        
                const currentFeedback = feedback[feedbackIndex];
                currentFeedback.feedbackText = feedbackText.trim();
                currentFeedback.timestamp = formatISO(new Date());
        
                feedback[feedbackIndex] = currentFeedback;
                await writeData(FEEDBACK_FILE_NAME, feedback);
        
                res.status(200).json(currentFeedback);
            } catch (error) {
                console.error('Fehler beim Aktualisieren des Feedbacks:', error);
                next(error);
            }
        });
        
        ```
        
        - **Erklärung:** Der Handler wird `async` gemacht. `await readData()` und `await writeData()` werden für die Feedback-Datei verwendet. Beachte den zusätzlichen Import für `validateFeedback`.
    - **`DELETE /resources/:resourceId/feedback/:feedbackId` Endpunkt (Text-Feedback löschen):**
        
        ```jsx
        router.delete('/:resourceId/feedback/:feedbackId', async (req, res, next) => {
            const resourceId = String(req.params.resourceId);
            const feedbackId = String(req.params.feedbackId);
        
            try {
                let feedback = await readData(FEEDBACK_FILE_NAME);
                const initialLength = feedback.length;
        
                feedback = feedback.filter(f => !(String(f.id) === feedbackId && String(f.resourceId) === resourceId));
        
                if (feedback.length === initialLength) {
                    return res.status(404).json({ error: `Feedback mit ID ${feedbackId} für Ressource ${resourceId} nicht gefunden.` });
                }
        
                await writeData(FEEDBACK_FILE_NAME, feedback);
        
                res.status(204).end();
            } catch (error) {
                console.error('Fehler beim Löschen des Feedbacks:', error);
                next(error);
            }
        });
        
        ```
        
        - **Erklärung:** Der Handler wird `async` gemacht. `await readData()` und `await writeData()` werden für die Feedback-Datei verwendet.

**Manuelle Tests für Ticket RC-020**

1. **Stelle sicher, dass du dich im Stammverzeichnis des Resource Catalog Service befindest.**
2. **Stoppe den Server und starte ihn neu:**
    
    ```bash
    node app.js
    
    ```
    
    - Du solltest die Startmeldung des Servers sehen.
3. **Führe alle bestehenden manuellen Tests für alle Endpunkte des Resource Catalog Service durch.**
    - Alle `GET`, `POST`, `PUT`, `DELETE` Operationen sollten weiterhin wie erwartet funktionieren. Die Umstellung auf asynchrone Dateizugriffe ändert das äußere Verhalten der API nicht, verbessert aber die interne Performance und Wartbarkeit.
    - Besonders wichtig ist, dass keine Fehler auftreten und die Daten korrekt gelesen und geschrieben werden.
4. **Führe den nächsten Git-Commit aus.**
    
    ```bash
    git add .
    git commit -m "refactor(data): Implement async data manager in helpers/ for Resource Catalog Service"
    
    ```
    

# RC-021: Logging-Middleware – Detaillierter Walkthrough (Resource Catalog Service)

**Titel:** Implementierung einer Logging-Middleware im Resource Catalog Service

**Ziel:** Alle eingehenden API-Anfragen und deren Antworten im Resource Catalog Service sollen automatisch geloggt werden, damit du das Verhalten des Services überwachen und Fehler effizienter diagnostizieren kannst.

### Konzept: Logging-Middleware

Eine **Logging-Middleware** ist eine spezielle Art von Express-Middleware, die dazu dient, Informationen über jede eingehende HTTP-Anfrage und die entsprechende Antwort zu protokollieren. Dies ist extrem nützlich für:

- **Überwachung**: Verstehen, welche Anfragen an den Server gesendet werden und wie oft.
- **Debugging**: Nachvollziehen des Ablaufs einer Anfrage, Identifizieren von Engpässen und Erkennen von Problemen.
- **Performance-Analyse**: Messen der Antwortzeiten für verschiedene Endpunkte (unsere Implementierung wird dies tun).

Eine Middleware-Funktion in Express hat die Signatur `(req, res, next)`. Für das Logging müssen wir jedoch auch wissen, wann die Antwort gesendet wird und welchen Statuscode sie hat. Dies erfordert einen kleinen Trick, indem wir einen Listener für das `finish`-Ereignis des `res`-Objekts hinzufügen. Das `finish`-Ereignis wird ausgelöst, wenn die Antwort vollständig an den Client gesendet wurde.

### Schritt 1: Erstelle den `middleware`Ordner und die `logger.js`Datei

1. Stelle sicher, dass du dich im Stammverzeichnis deines **Resource Catalog Service** befindest.
2. Erstelle den `middleware`Ordner, falls er noch nicht existiert:
    
    ```bash
    mkdir middleware
    
    ```
    
    - `mkdir middleware`: Erstellt den Ordner `middleware`. Dies ist ein Standardort für Express-Middleware-Funktionen.
3. Erstelle im `middleware`Ordner eine neue Datei mit dem Namen **`logger.js`**:
    
    ```bash
    touch middleware/logger.js
    
    ```
    
    - `touch middleware/logger.js`: Erstellt die leere Datei `logger.js`.

### Schritt 2: Implementiere die Logging-Middleware in `middleware/logger.js`

Jetzt schreiben wir den Code für unsere Logging-Middleware. Ich werde jede Zeile einzeln eingeben und erklären.

1. Öffne die neue Datei **`middleware/logger.js`** in deinem Code-Editor.
2. Füge den Code für die Middleware-Funktion hinzu:
    
    ```jsx
    export const logger = (req, res, next) => {
    
    ```
    
    - `export const logger = (req, res, next) => { ... }`: Definiert eine neue Funktion namens `logger`und exportiert sie.
        - `req`: Das Request-Objekt, das Informationen über die eingehende HTTP-Anfrage enthält.
        - `res`: Das Response-Objekt, mit dem wir eine Antwort an den Client senden.
        - `next`: Eine Funktion, die aufgerufen werden muss, um die Kontrolle an die nächste Middleware im Express-Stack weiterzugeben.
    
    ```jsx
        const start = process.hrtime();
    
    ```
    
    - `const start = process.hrtime();`: Diese Zeile verwendet `process.hrtime()` (High-Resolution Real Time) von Node.js, um die genaue Startzeit der Anfrage zu messen. Dies ist präziser als `Date.now()` für die Messung von Dauern. `process.hrtime()` gibt ein Array `[seconds, nanoseconds]` zurück.
    
    ```jsx
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    ```
    
    - `console.log(...)`: Diese Zeile gibt eine Log-Nachricht in der Serverkonsole aus, sobald die Anfrage empfangen wird.
        - `new Date().toISOString()`: Erstellt den aktuellen Zeitstempel im ISO 8601-Format (z.B. `2023-10-27T10:30:00.000Z`), was gut für die Protokollierung ist.
        - `${req.method}`: Die HTTP-Methode der Anfrage (z.B. `GET`, `POST`, `PUT`).
        - `${req.url}`: Der vollständige URL-Pfad der Anfrage (z.B. `/resources`, `/resources/1/ratings`).
    
    ```jsx
        res.on('finish', () => {
    
    ```
    
    - `res.on('finish', () => { ... });`: Diese Zeile registriert einen **Event-Listener** für das `res`Objekt (Response). Das `finish`Ereignis wird von Express ausgelöst, wenn die Antwort vollständig an den Client gesendet wurde. Der Code innerhalb dieser Callback-Funktion wird dann ausgeführt. Dies ist der ideale Zeitpunkt, um die Dauer der Anfrage zu messen und den Statuscode der Antwort zu protokollieren.
    
    ```jsx
            const end = process.hrtime(start);
    
    ```
    
    - `const end = process.hrtime(start);`: Misst die Endzeit der Anfrage. Wenn `process.hrtime()` mit einem vorherigen `hrtime`Array aufgerufen wird (`start` in diesem Fall), gibt es die Differenz zwischen der aktuellen Zeit und der `start`Zeit zurück.
    
    ```jsx
            const durationInMilliseconds = (end[0] * 1000) + (end[1] / 1_000_000);
    
    ```
    
    - `const durationInMilliseconds = ...`: Berechnet die Dauer der Anfrage in Millisekunden. `end[0]` sind Sekunden, `end[1]` sind Nanosekunden. Wir konvertieren beides in Millisekunden und addieren sie.
    
    ```jsx
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Status: ${res.statusCode} - Dauer: ${durationInMilliseconds.toFixed(2)}ms`);
    
    ```
    
    - `console.log(...)`: Diese Zeile gibt eine zweite Log-Nachricht aus, wenn die Antwort abgeschlossen ist.
        - `${res.statusCode}`: Der HTTP-Statuscode der gesendeten Antwort (z.B. `200 OK`, `404 Not Found`, `500 Internal Server Error`).
        - `${durationInMilliseconds.toFixed(2)}ms`: Die berechnete Dauer der Anfrage, auf zwei Dezimalstellen gerundet.
    
    ```jsx
        });
    
        next();
    };
    
    ```
    
    - `next();`: **Gibt die Kontrolle an die nächste Middleware** oder den eigentlichen Route-Handler im Express-Stack weiter. Dies ist ein entscheidender Schritt. Wenn `next()` nicht aufgerufen wird, bleibt der Request "stecken", und der Server würde keine Antwort senden.

### Schritt 3: Wende die Logging-Middleware in `app.js` an

Die Logging-Middleware sollte als eine der ersten Middleware-Funktionen in `app.js` registriert werden, damit sie jede Anfrage abfängt, bevor andere Middleware oder Routen sie verarbeiten.

1. Öffne die Datei **`app.js`** in deinem Code-Editor (im Stammverzeichnis des Resource Catalog Service).
2. Importiere die neue Middleware ganz oben, direkt nach den anderen Imports:
    
    ```jsx
    import express from 'express';
    import { logger } from './middleware/logger.js'; // Importiere die Logging-Middleware
    import resourcesRouter from './routes/resources_bp.js'; // Korrekter Import für den Ressourcen-Router
    import { errorHandler } from './middleware/error-handler.js'; // Beispiel-Import für Error Handler
    
    ```
    
    - `import { logger } from './middleware/logger.js';`: Importiert unsere soeben erstellte `logger`Middleware. Beachte den relativen Pfad `./middleware/logger.js`.
    - `import resourcesRouter from './routes/resources_bp.js';`: **Dies ist der korrigierte Import.**Stellen Sie sicher, dass Ihr Router in `resources_bp.js` auch als `export default router;` oder `export default resourcesRouter;` exportiert wird, damit dieser Import funktioniert.
3. Füge die Middleware zu deiner Anwendung hinzu. Sie sollte **vor** `app.use(express.json());` und **vor** der Registrierung aller Router platziert werden.
    
    ```jsx
    const app = express();
    const PORT = process.env.PORT || 5002; // Standard-Port für Resource Catalog Service
    
    // Globale Middleware
    app.use(logger); // Registriere die Logging-Middleware hier
    app.use(express.json()); // Middleware, um JSON-Anfragen zu parsen
    
    // Dummy-Route für den Root-Pfad zur Überprüfung der Service-Erreichbarkeit
    app.get('/', (req, res) => {
        res.send('Hello from Resource Catalog Service!');
    });
    
    // Registrierung des Ressourcen-Routers
    app.use('/resources', resourcesRouter); // RC-009: Bindet den Ressourcen-Router an den Pfad '/resources'
    
    // Globale Fehler-Handling-Middleware (muss zuletzt registriert werden)
    app.use(errorHandler);
    
    // Starte den Server
    app.listen(PORT, () => {
        console.log(`Resource Catalog Service läuft auf http://localhost:${PORT}`);
    });
    
    ```
    
    - `app.use(logger);`: Registriert unsere `logger`Middleware. Da sie hier platziert ist, wird sie für jede eingehende Anfrage ausgeführt, bevor die Anfrage von anderen Teilen der Anwendung verarbeitet wird.
    - `app.use('/resources', resourcesRouter);`: **Dies ist die korrigierte Registrierung.** Es bindet den `resourcesRouter` an alle Pfade, die mit `/resources` beginnen. Das bedeutet, dass `GET /` in `resources_bp.js` zu `GET /resources` wird, `GET /:id` zu `GET /resources/:id` usw.

**Manuelle Tests für Ticket RC-021**

1. **Stelle sicher, dass du dich im Stammverzeichnis des Resource Catalog Service befindest.**
2. **Stoppe den Server und starte ihn neu:**
    
    ```bash
    node app.js
    
    ```
    
    - Du solltest die Startmeldung des Servers sehen.
3. **Sende verschiedene Anfragen mit `curl` oder im Browser:**
    - `curl http://localhost:5002/`
    - `curl http://localhost:5002/resources` (Beachte den `/resources`Pfad!)
    - `curl -X POST -H "Content-Type: application/json" -d '{"title": "Neuer Kurs", "type": "Kurs"}' http://localhost:5002/resources`
    - `curl http://localhost:5002/resources/non_existent_id` (dies sollte einen 404 Fehler erzeugen)
4. **Beobachte das Terminal, in dem dein Server läuft.**
    - Für jede gesendete Anfrage solltest du zwei Log-Nachrichten sehen:
        - Eine, die die eingehende Anfrage (`[timestamp] GET /` oder `[timestamp] POST /resources`) anzeigt.
        - Eine zweite, die die abgeschlossene Antwort (`[timestamp] GET / - Status: 200 - Dauer: XX.XXms`) anzeigt.
    - Dies bestätigt, dass die Logging-Middleware korrekt funktioniert und Anfragen sowie Antworten protokolliert.
5. **Führe den nächsten Git-Commit aus.**
    
    ```bash
    git add .
    git commit -m "feat(logging): Add global logging middleware to Resource Catalog Service"
    
    ```
    

# RC-022: Validierungslogik in Middleware auslagern – Walkthrough (Resource Catalog Service)

**Titel:** Auslagerung der Validierungslogik für Ressourcen, Bewertungen und Feedback im Resource Catalog Service

**Ziel:** Die Validierungslogik für Ressourcen, Bewertungen und Feedback soll in wiederverwendbare Middleware-Funktionen ausgelagert werden, damit die Route-Handler schlanker und die Validierung konsistent ist.

### Konzept: Dedizierte Validierungs-Middleware

Im Kontext einer Express.js-Anwendung sind **Middleware-Funktionen** das Herzstück der Verarbeitungskette für eingehende HTTP-Anfragen. Sie sind Funktionen, die Zugriff auf das **Anfrageobjekt (`req`)**, das **Antwortobjekt (`res`)**und die **nächste Middleware-Funktion im Anforderungs-Antwort-Zyklus (`next`)** haben.

Für die Validierung von Daten, die von einem Client an unseren Server gesendet werden, ist die Implementierung von dedizierten Validierungs-Middleware-Funktionen eine **Best Practice**. Das Konzept dahinter ist einfach, aber wirkungsvoll:

1. **Trennung der Verantwortlichkeiten:** Anstatt die Validierungslogik direkt in den Route-Handlern (den Funktionen, die auf eine bestimmte URL reagieren) zu platzieren, lagern wir sie in separate Funktionen aus. Der Route-Handler kann sich dann ausschließlich auf die Geschäftslogik konzentrieren (z.B. eine Ressource erstellen, Daten speichern). Die Validierungs-Middleware übernimmt die Aufgabe, sicherzustellen, dass die Daten gültig und korrekt formatiert sind, *bevor* sie den Route-Handler erreichen.
2. **Wiederverwendbarkeit:** Wenn dieselbe Validierungslogik an mehreren Stellen in Ihrer API benötigt wird (z.B. wenn Sie sowohl `POST` als auch `PUT` für Feedback-Endpunkte haben, die denselben `feedbackText` validieren müssen), können Sie dieselbe Middleware-Funktion einfach wiederverwenden. Das reduziert Code-Duplizierung und sorgt für Konsistenz.
3. **Konsistenz:** Da die Validierung zentralisiert ist, wird sichergestellt, dass alle Endpunkte, die bestimmte Daten verarbeiten, diese Daten auf die gleiche Weise validieren. Dies vermeidet Inkonsistenzen in der API und vereinfacht das Testen.
4. **Frühes Fehlschlagen ("Fail Fast"):** Wenn die Validierung fehlschlägt, kann die Middleware sofort eine Fehlerantwort (z.B. `400 Bad Request`) an den Client senden und die Verarbeitung des Requests beenden (`return res.status(400).json(...)`). Der eigentliche Route-Handler wird in diesem Fall gar nicht erst aufgerufen, was Ressourcen spart und die Fehlerbehandlung vereinfacht. Wenn die Validierung erfolgreich ist, ruft die Middleware `next()` auf, um die Kontrolle an die nächste Middleware oder den Route-Handler zu übergeben.

### Schritt 1: Erstelle oder aktualisiere `middleware/validation.js`

Wir werden Funktionen für die Validierung von Ressourcen, Bewertungen und Feedback hinzufügen. Diese Datei befindet sich im Ordner `middleware` in Ihrem **Resource Catalog Service**.

1. Stelle sicher, dass du dich im Stammverzeichnis deines **Resource Catalog Service** befindest.
2. Öffne die Datei **`middleware/validation.js`**. (Diese Datei sollte bereits existieren oder du erstellst sie, falls nicht.)
3. Wir werden die Validierungsfunktionen nun Zeile für Zeile aufbauen.

### Funktion: `validateResource`

Diese Funktion wird sicherstellen, dass beim Erstellen einer neuen Ressource (über `POST /resources`) sowohl ein `title` als auch ein `type` im Request-Body vorhanden sind.

- **Füge die Definition der Funktion hinzu:**
    
    ```jsx
    export const validateResource = (req, res, next) => {
    
    };
    
    ```
    
    - **Erklärung:**
        - `export`: Macht diese Funktion außerhalb dieser Datei verfügbar, sodass wir sie in `resources_bp.js`importieren können.
        - `const validateResource`: Definiert eine Konstante namens `validateResource` und weist ihr eine Funktion zu.
        - `(req, res, next) => { ... }`: Dies ist die Standard-Signatur einer Express-Middleware-Funktion.
            - `req`: Das Request-Objekt, das alle Details der eingehenden HTTP-Anfrage enthält (z.B. Request-Body, Header, URL-Parameter).
            - `res`: Das Response-Objekt, mit dem wir eine Antwort an den Client senden (z.B. Statuscodes, JSON-Daten).
            - `next`: Eine Funktion, die aufgerufen werden muss, um die Verarbeitung an die nächste Middleware im Stapel oder an den eigentlichen Route-Handler zu übergeben.
- **Extrahiere `title` und `type` aus dem Request-Body:**
    
    ```jsx
    export const validateResource = (req, res, next) => {
        const { title, type } = req.body;
    };
    
    ```
    
    - **Erklärung:**
        - `req.body`: Dieses Objekt enthält die Daten, die im Body einer `POST`oder `PUT`Anfrage gesendet werden (vorausgesetzt, `express.json()` wurde in `app.js` korrekt konfiguriert, um JSON-Bodies zu parsen).
        - `const { title, type } = req.body;`: Dies ist eine **Objekt-Destrukturierung** in JavaScript. Sie ist eine Kurzschreibweise, um die Eigenschaften `title` und `type` direkt aus dem `req.body`Objekt zu extrahieren und sie als separate Konstanten zu deklarieren.
- **Füge die Validierungsprüfung hinzu:**
    
    ```jsx
    export const validateResource = (req, res, next) => {
        const { title, type } = req.body;
        if (!title || !type) {
    
        }
    };
    
    ```
    
    - **Erklärung:**
        - `if (!title || !type)`: Diese Bedingung prüft, ob `title` **oder** `type` fehlt oder einen "falsy" Wert hat. In JavaScript sind `undefined`, `null`, `0`, `false`, `NaN` und der leere String `""` "falsy" Werte. Wenn der Client zum Beispiel keinen `title` sendet, ist `req.body.title` `undefined`, und `!undefined` ist `true`. Wenn ein leerer String gesendet wird (z.B. `"title": ""`), dann ist `!""` ebenfalls `true`. Diese Prüfung stellt sicher, dass beide Felder vorhanden und nicht leer sind.
- **Sende eine Fehlermeldung, wenn die Validierung fehlschlägt:**
    
    ```jsx
    export const validateResource = (req, res, next) => {
        const { title, type } = req.body;
        if (!title || !type) {
            return res.status(400).json({ error: 'Titel und Typ der Ressource sind erforderlich.' });
        }
    };
    
    ```
    
    - **Erklärung:**
        - `return res.status(400)`: Wenn die Validierung fehlschlägt (die `if`Bedingung ist wahr), setzen wir den HTTP-Statuscode der Antwort auf `400 Bad Request`. Dieser Statuscode ist die Standardkonvention, um anzuzeigen, dass der Client eine ungültige Anfrage gesendet hat.
        - `.json({ error: '...' })`: Wir senden eine JSON-Antwort an den Client, die eine aussagekräftige Fehlermeldung enthält.
        - `return`: Das Schlüsselwort `return` ist hier **entscheidend**. Es beendet die Ausführung dieser Middleware-Funktion sofort. Wenn wir `return` nicht verwenden würden, würde der Code nach dem `if`Block (insbesondere der `next()`Aufruf) trotzdem ausgeführt, was zu unerwartetem Verhalten führen könnte. Das ist das "Fail Fast"-Prinzip.
- **Rufe `next()` auf, wenn die Validierung erfolgreich ist:**
    
    ```jsx
    export const validateResource = (req, res, next) => {
        const { title, type } = req.body;
        if (!title || !type) {
            return res.status(400).json({ error: 'Titel und Typ der Ressource sind erforderlich.' });
        }
        next();
    };
    
    ```
    
    - **Erklärung:**
        - `next();`: Wenn die Ausführung bis zu dieser Zeile gelangt ist, bedeutet das, dass die `if`Bedingung **nicht** erfüllt war; `title` und `type` sind also vorhanden und gültig. Der Aufruf von `next()` teilt Express mit, dass diese Middleware ihre Arbeit erfolgreich abgeschlossen hat und die Kontrolle an die nächste Middleware im Stapel oder an den eigentlichen Route-Handler für diesen Endpunkt übergeben werden soll.

### Funktion: `validateRating`

Diese Funktion wird die `ratingValue` für Bewertungen validieren. Sie muss sicherstellen, dass es sich um eine ganze Zahl zwischen 1 und 5 handelt und den Wert gegebenenfalls parsen.

- **Füge die Definition der Funktion hinzu:**
    
    ```jsx
    export const validateRating = (req, res, next) => {
    
    };
    
    ```
    
    - **Erklärung:** Eine weitere exportierbare Middleware-Funktion mit der Standard-Signatur.
- **Extrahiere und parse `ratingValue`:**
    
    ```jsx
    export const validateRating = (req, res, next) => {
        let { ratingValue } = req.body;
        ratingValue = parseInt(ratingValue, 10);
    };
    
    ```
    
    - **Erklärung:**
        - `let { ratingValue } = req.body;`: Wir verwenden `let` hier, weil wir den Wert von `ratingValue`gleich ändern werden (parsen und überschreiben).
        - `ratingValue = parseInt(ratingValue, 10);`: Die Funktion `parseInt()` versucht, einen String in eine ganze Zahl umzuwandeln. Das zweite Argument `10` gibt die Basis des Zahlensystems an (Dezimal). Wenn `req.body.ratingValue` z.B. `"4"` ist, wird es zu der Zahl `4`. Wenn es nicht in eine Zahl umgewandelt werden kann (z.B. `"abc"`), gibt `parseInt()` `NaN` (Not-a-Number) zurück.
- **Prüfe, ob der Wert eine gültige Ganzzahl ist:**
    
    ```jsx
    export const validateRating = (req, res, next) => {
        let { ratingValue } = req.body;
        ratingValue = parseInt(ratingValue, 10);
        if (isNaN(ratingValue) || !Number.isInteger(ratingValue)) {
            return res.status(400).json({ error: 'Bewertung muss eine ganze Zahl sein.' });
        }
    };
    
    ```
    
    - **Erklärung:**
        - `isNaN(ratingValue)`: Prüft, ob der Wert `NaN` ist (d.h., `parseInt` konnte den Wert nicht in eine Zahl umwandeln).
        - `!Number.isInteger(ratingValue)`: Prüft, ob der Wert keine ganze Zahl ist (z.B. 3.5). Bewertungen sollten ganze Zahlen sein.
        - Wenn eine dieser Bedingungen zutrifft, ist die Bewertung ungültig, und wir senden einen `400 Bad Request`.
- **Prüfe den Wertebereich (1 bis 5):**
    
    ```jsx
    export const validateRating = (req, res, next) => {
        let { ratingValue } = req.body;
        ratingValue = parseInt(ratingValue, 10);
        if (isNaN(ratingValue) || !Number.isInteger(ratingValue)) {
            return res.status(400).json({ error: 'Bewertung muss eine ganze Zahl sein.' });
        }
        if (ratingValue < 1 || ratingValue > 5) {
            return res.status(400).json({ error: 'Bewertung muss zwischen 1 und 5 liegen.' });
        }
    };
    
    ```
    
    - **Erklärung:**
        - `if (ratingValue < 1 || ratingValue > 5)`: Nachdem wir sichergestellt haben, dass es eine ganze Zahl ist, prüfen wir nun, ob der Wert innerhalb des erwarteten Bereichs (von 1 bis 5) liegt.
- **Aktualisiere den Request-Body mit dem geparsten Wert und rufe `next()` auf:**
    
    ```jsx
    export const validateRating = (req, res, next) => {
        let { ratingValue } = req.body;
        ratingValue = parseInt(ratingValue, 10);
        if (isNaN(ratingValue) || !Number.isInteger(ratingValue)) {
            return res.status(400).json({ error: 'Bewertung muss eine ganze Zahl sein.' });
        }
        if (ratingValue < 1 || ratingValue > 5) {
            return res.status(400).json({ error: 'Bewertung muss zwischen 1 und 5 liegen.' });
        }
        req.body.ratingValue = ratingValue;
        next();
    };
    
    ```
    
    - **Erklärung:**
        - `req.body.ratingValue = ratingValue;`: Dies ist wichtig. Nachdem wir `ratingValue` erfolgreich von einem String in eine Zahl umgewandelt und validiert haben, überschreiben wir den ursprünglichen Wert im `req.body`. So erhält der Route-Handler eine bereits korrekte numerische Version, ohne selbst parsen zu müssen.
        - `next();`: Übergibt die Kontrolle, da die Validierung erfolgreich war.

### Funktion: `validateFeedback`

Diese Funktion wird den `feedbackText` für Feedback-Nachrichten validieren. Sie prüft, ob der Text vorhanden ist, ein String ist und die richtige Länge hat.

- **Füge die Definition der Funktion hinzu:**
    
    ```jsx
    export const validateFeedback = (req, res, next) => {
    
    };
    
    ```
    
- **Extrahiere `feedbackText` und prüfe auf Existenz und Typ:**
    
    ```jsx
    export const validateFeedback = (req, res, next) => {
        const { feedbackText } = req.body;
        if (typeof feedbackText !== 'string' || !feedbackText.trim()) {
            return res.status(400).json({ error: 'Feedback-Text ist erforderlich und darf nicht leer sein.' });
        }
    };
    
    ```
    
    - **Erklärung:**
        - `typeof feedbackText !== 'string'`: Prüft, ob der Datentyp von `feedbackText` tatsächlich ein String ist. Dies ist eine robuste Prüfung gegen das Senden von Zahlen, Objekten etc.
        - `!feedbackText.trim()`:
            - `.trim()`: Eine String-Methode, die alle Leerzeichen (Space, Tab, Zeilenumbruch) vom Anfang und Ende eines Strings entfernt.
            - `!`: Wenn `feedbackText.trim()` dann ein leerer String `""` ist (was der Fall wäre, wenn der ursprüngliche Text leer war oder nur aus Leerzeichen bestand), wird `!""` zu `true`.
        - Diese kombinierte Bedingung fängt Fälle ab, in denen der `feedbackText` nicht existiert, kein String ist oder nur aus Leerzeichen besteht.
- **Prüfe die Länge des `feedbackText`:**
    
    ```jsx
    export const validateFeedback = (req, res, next) => {
        const { feedbackText } = req.body;
        if (typeof feedbackText !== 'string' || !feedbackText.trim()) {
            return res.status(400).json({ error: 'Feedback-Text ist erforderlich und darf nicht leer sein.' });
        }
        if (feedbackText.trim().length < 10 || feedbackText.trim().length > 500) {
            return res.status(400).json({ error: 'Feedback-Text muss zwischen 10 und 500 Zeichen lang sein.' });
        }
    };
    
    ```
    
    - **Erklärung:**
        - `feedbackText.trim().length`: Wir prüfen die Länge des bereinigten (getrimmten) Textes.
        - `if (... < 10 || ... > 500)`: Stellt sicher, dass der Text mindestens 10 Zeichen lang ist (um sinnvolles Feedback zu gewährleisten) und nicht länger als 500 Zeichen.
- **Rufe `next()` auf, wenn die Validierung erfolgreich ist:**
    
    ```jsx
    export const validateFeedback = (req, res, next) => {
        const { feedbackText } = req.body;
        if (typeof feedbackText !== 'string' || !feedbackText.trim()) {
            return res.status(400).json({ error: 'Feedback-Text ist erforderlich und darf nicht leer sein.' });
        }
        if (feedbackText.trim().length < 10 || feedbackText.trim().length > 500) {
            return res.status(400).json({ error: 'Feedback-Text muss zwischen 10 und 500 Zeichen lang sein.' });
        }
        next();
    };
    
    ```
    
    - **Erklärung:** Wenn alle Prüfungen bestanden sind, ist der Feedback-Text gültig, und die Kontrolle wird übergeben.

**Der vollständige Code für `middleware/validation.js` sollte nun so aussehen:**

```jsx
export const validateResource = (req, res, next) => {
    const { title, type } = req.body;
    if (!title || !type) {
        return res.status(400).json({ error: 'Titel und Typ der Ressource sind erforderlich.' });
    }
    next();
};

export const validateRating = (req, res, next) => {
    let { ratingValue } = req.body;
    ratingValue = parseInt(ratingValue, 10);
    if (isNaN(ratingValue) || !Number.isInteger(ratingValue)) {
        return res.status(400).json({ error: 'Bewertung muss eine ganze Zahl sein.' });
    }
    if (ratingValue < 1 || ratingValue > 5) {
        return res.status(400).json({ error: 'Bewertung muss zwischen 1 und 5 liegen.' });
    }
    req.body.ratingValue = ratingValue;
    next();
};

export const validateFeedback = (req, res, next) => {
    const { feedbackText } = req.body;
    if (typeof feedbackText !== 'string' || !feedbackText.trim()) {
        return res.status(400).json({ error: 'Feedback-Text ist erforderlich und darf nicht leer sein.' });
    }
    if (feedbackText.trim().length < 10 || feedbackText.trim().length > 500) {
        return res.status(400).json({ error: 'Feedback-Text muss zwischen 10 und 500 Zeichen lang sein.' });
    }
    next();
};

```

### Schritt 2: Wende die Validierungs-Middleware in `routes/resources_bp.js` an

Jetzt werden wir die neuen Validierungs-Middleware-Funktionen in den entsprechenden Endpunkten registrieren und die alte, redundante Validierungslogik entfernen. Dies macht die Route-Handler schlanker und sauberer.

1. Öffne die Datei **`routes/resources_bp.js`** in deinem Code-Editor. Dies ist der Router, der alle Endpunkte für Ressourcen, Bewertungen und Feedback im **Resource Catalog Service** verwaltet.
2. **Importiere die neuen Validierungs-Middleware-Funktionen:**
    - Füge die folgende Zeile ganz oben in der Datei hinzu (direkt unter den anderen Imports, wie `Router`, `readData`, `writeData`, `uuidv4`, `formatISO`):
        
        ```jsx
        import { validateResource, validateRating, validateFeedback } from '../middleware/validation.js';
        
        ```
        
        - **Erklärung:** Diese Zeile importiert die drei Validierungsfunktionen, die du gerade in `middleware/validation.js` erstellt hast. Der relative Pfad `../middleware/validation.js` ist korrekt, da sich der `routes`Ordner eine Ebene unterhalb des Stammverzeichnisses befindet und `middleware` ein Geschwisterordner ist.
3. **Passe den `router.post('/', ...)`Endpunkt (für Ressourcen-Erstellung) an:**
    - Finde den `router.post('/', ...)`Endpunkt in deiner Datei.
    - Füge `validateResource` als Middleware **vor** dem `async`Handler hinzu.
    - **Lösche** die alte, manuelle Validierungslogik (die `if (!newResourceData.title || !newResourceData.type)`Prüfung) aus dem `try`Block dieses Endpunkts.
    - **Vorheriger Code (Auszug, den du finden und ändern wirst):**
        
        ```jsx
        router.post('/', async (req, res, next) => {
            const newResourceData = req.body;
        
            // DIESE ALTE VALIDIERUNG WIRD ENTFERNT
            // if (!newResourceData.title || !newResourceData.type) {
            //     res.status(400).json({ error: 'Titel und Typ der Ressource sind erforderlich.' });
            //     return;
            // }
        
            const newResource = {
                id: uuidv4(),
                ...newResourceData,
                createdAt: formatISO(new Date())
            };
        
            try {
                const resources = await readData(RESOURCES_FILE_NAME);
                resources.push(newResource);
                await writeData(RESOURCES_FILE_NAME, resources);
        
                res.status(201).json(newResource);
            } catch (error) {
                console.error('Fehler beim Erstellen der Ressource:', error);
                next(error);
            }
        });
        
        ```
        
    - **Ändere ihn zu (Auszug):**
        
        ```jsx
        router.post('/', validateResource, async (req, res, next) => {
            const newResourceData = req.body;
        
            const newResource = {
                id: uuidv4(),
                ...newResourceData,
                createdAt: formatISO(new Date())
            };
        
            try {
                const resources = await readData(RESOURCES_FILE_NAME);
                resources.push(newResource);
                await writeData(RESOURCES_FILE_NAME, resources);
        
                res.status(201).json(newResource);
            } catch (error) {
                console.error('Fehler beim Erstellen der Ressource:', error);
                next(error);
            }
        });
        
        ```
        
        - **Erklärung der Änderung:**
            - `router.post('/', validateResource, async (req, res, next) => { ... });`: Du hast hier die `validateResource`Middleware als zweites Argument in der `router.post()`Methode eingefügt. Express wird diese Middleware nun **vor** dem `async`Handler (`async (req, res, next) => { ... }`) ausführen.
            - Wenn `validateResource` feststellt, dass die Anfrage ungültig ist, wird sie eine `400 Bad Request`Antwort senden und die Ausführung der Kette stoppen. Der `async`Handler wird in diesem Fall **niemals erreicht**.
            - Wenn `validateResource` erfolgreich ist (indem es `next()` aufruft), wird der `async`Handler ausgeführt. Dieser Handler kann nun davon ausgehen, dass `title` und `type` im `req.body`gültig und vorhanden sind, und sich vollständig auf die Geschäftslogik (Erstellen und Speichern der Ressource) konzentrieren. Die alte `if`Prüfung ist nun redundant und wurde entfernt.
4. **Passe den `router.post('/:resourceId/ratings', ...)`Endpunkt an:**
    - Finde den `router.post('/:resourceId/ratings', ...)`Endpunkt.
    - Füge `validateRating` als Middleware hinzu.
    - **Lösche** die alte, manuelle Validierungslogik aus dem `try`Block dieses Endpunkts.
    - **Vorheriger Code (Auszug):**
        
        ```jsx
        router.post('/:resourceId/ratings', async (req, res, next) => {
            const resourceId = String(req.params.resourceId);
            const { ratingValue, userId } = req.body;
        
            // DIESE ALTE VALIDIERUNG WIRD ENTFERNT
            // if (!ratingValue || ratingValue < 1 || ratingValue > 5 || !Number.isInteger(ratingValue)) {
            //     return res.status(400).json({ error: 'Bewertung muss eine ganze Zahl zwischen 1 und 5 sein.' });
            // }
        
            const newRating = {
                id: uuidv4(),
                resourceId: resourceId,
                ratingValue: ratingValue,
                userId: userId ? String(userId) : 'anonymous',
                timestamp: formatISO(new Date())
            };
        
            try {
                const ratings = await readData(RATINGS_FILE_NAME);
                ratings.push(newRating);
                await writeData(RATINGS_FILE_NAME, ratings);
        
                res.status(201).json(newRating);
            } catch (error) {
                console.error('Fehler beim Schreiben der Bewertung in die Datei:', error);
                next(error);
            }
        });
        
        ```
        
    - **Ändere ihn zu (Auszug):**
        
        ```jsx
        router.post('/:resourceId/ratings', validateRating, async (req, res, next) => {
            const resourceId = String(req.params.resourceId);
            const { ratingValue, userId } = req.body;
        
            const newRating = {
                id: uuidv4(),
                resourceId: resourceId,
                ratingValue: ratingValue, // Hier ist es bereits eine Zahl durch validateRating
                userId: userId ? String(userId) : 'anonymous',
                timestamp: formatISO(new Date())
            };
        
            try {
                const ratings = await readData(RATINGS_FILE_NAME);
                ratings.push(newRating);
                await writeData(RATINGS_FILE_NAME, ratings);
        
                res.status(201).json(newRating);
            } catch (error) {
                console.error('Fehler beim Schreiben der Bewertung in die Datei:', error);
                next(error);
            }
        });
        
        ```
        
        - **Erklärung der Änderung:**
            - `router.post('/:resourceId/ratings', validateRating, async (req, res, next) => { ... });`: Ähnlich wie zuvor wird `validateRating` jetzt ausgeführt, bevor der Haupt-Handler die Bewertung verarbeitet.
            - Wichtig ist, dass `validateRating` nicht nur validiert, sondern auch den `ratingValue` im `req.body` in eine **Zahl** umwandelt. Der Handler kann sich also darauf verlassen, dass `ratingValue` bereits der korrekte numerische Typ ist.
5. **Passe den `router.post('/:resourceId/feedback', ...)`Endpunkt an:**
    - Finde den `router.post('/:resourceId/feedback', ...)`Endpunkt.
    - Füge `validateFeedback` als Middleware hinzu.
    - **Lösche** die alte, manuelle Validierungslogik aus dem `try`Block dieses Endpunkts.
    - **Vorheriger Code (Auszug):**
        
        ```jsx
        router.post('/:resourceId/feedback', async (req, res, next) => {
            const resourceId = String(req.params.resourceId);
            const { feedbackText, userId } = req.body;
        
            // DIESE ALTE VALIDIERUNG WIRD ENTFERNT
            // if (!feedbackText || feedbackText.trim().length < 10 || feedbackText.trim().length > 500) {
            //     return res.status(400).json({ error: 'Feedback-Text muss zwischen 10 und 500 Zeichen lang sein.' });
            // }
        
            const newFeedback = {
                id: uuidv4(),
                resourceId: resourceId,
                feedbackText: feedbackText.trim(),
                userId: userId ? String(userId) : 'anonymous',
                timestamp: formatISO(new Date())
            };
        
            try {
                const feedback = await readData(FEEDBACK_FILE_NAME);
                feedback.push(newFeedback);
                await writeData(FEEDBACK_FILE_NAME, feedback);
        
                res.status(201).json(newFeedback);
            } catch (error) {
                console.error('Fehler beim Schreiben des Feedbacks in die Datei:', error);
                next(error);
            }
        });
        
        ```
        
    - **Ändere ihn zu (Auszug):**
        
        ```jsx
        router.post('/:resourceId/feedback', validateFeedback, async (req, res, next) => {
            const resourceId = String(req.params.resourceId);
            const { feedbackText, userId } = req.body;
        
            const newFeedback = {
                id: uuidv4(),
                resourceId: resourceId,
                feedbackText: feedbackText.trim(),
                userId: userId ? String(userId) : 'anonymous',
                timestamp: formatISO(new Date())
            };
        
            try {
                const feedback = await readData(FEEDBACK_FILE_NAME);
                feedback.push(newFeedback);
                await writeData(FEEDBACK_FILE_NAME, feedback);
        
                res.status(201).json(newFeedback);
            } catch (error) {
                console.error('Fehler beim Schreiben des Feedbacks in die Datei:', error);
                next(error);
            }
        });
        
        ```
        
        - **Erklärung der Änderung:**
            - `router.post('/:resourceId/feedback', validateFeedback, async (req, res, next) => { ... });`: Die `validateFeedback`Middleware wird nun zuerst ausgeführt. Sie stellt sicher, dass `feedbackText` vorhanden, ein String und innerhalb des korrekten Längenbereichs ist. Der Handler kann sich dann auf die Erstellung und Speicherung des Feedbacks konzentrieren.
6. **Passe den `router.put('/:resourceId/feedback/:feedbackId', ...)`Endpunkt an:**
    - Finde den `router.put('/:resourceId/feedback/:feedbackId', ...)`Endpunkt.
    - Füge `validateFeedback` als Middleware hinzu.
    - **Lösche** die alte, manuelle Validierungslogik aus dem `try`Block dieses Endpunkts.
    - **Vorheriger Code (Auszug):**
        
        ```jsx
        router.put('/:resourceId/feedback/:feedbackId', async (req, res, next) => {
            const resourceId = String(req.params.resourceId);
            const feedbackId = String(req.params.feedbackId);
            const { feedbackText } = req.body;
        
            // DIESE ALTE VALIDIERUNG WIRD ENTFERNT
            // if (!feedbackText || feedbackText.trim().length < 10 || feedbackText.trim().length > 500) {
            //     return res.status(400).json({ error: 'Aktualisierter Feedback-Text muss zwischen 10 und 500 Zeichen lang sein.' });
            // }
        
            try {
                let feedback = await readData(FEEDBACK_FILE_NAME);
        
                const feedbackIndex = feedback.findIndex(f => String(f.id) === feedbackId && String(f.resourceId) === resourceId);
        
                if (feedbackIndex === -1) {
                    return res.status(404).json({ error: `Feedback mit ID ${feedbackId} für Ressource ${resourceId} nicht gefunden.` });
                }
        
                const currentFeedback = feedback[feedbackIndex];
                currentFeedback.feedbackText = feedbackText.trim();
                currentFeedback.timestamp = formatISO(new Date());
        
                feedback[feedbackIndex] = currentFeedback;
                await writeData(FEEDBACK_FILE_NAME, feedback);
        
                res.status(200).json(currentFeedback);
            } catch (error) {
                console.error('Fehler beim Aktualisieren des Feedbacks:', error);
                next(error);
            }
        });
        
        ```
        
    - **Ändere ihn zu (Auszug):**
        
        ```jsx
        router.put('/:resourceId/feedback/:feedbackId', validateFeedback, async (req, res, next) => {
            const resourceId = String(req.params.resourceId);
            const feedbackId = String(req.params.feedbackId);
            const { feedbackText } = req.body;
        
            try {
                let feedback = await readData(FEEDBACK_FILE_NAME);
        
                const feedbackIndex = feedback.findIndex(f => String(f.id) === feedbackId && String(f.resourceId) === resourceId);
        
                if (feedbackIndex === -1) {
                    return res.status(404).json({ error: `Feedback mit ID ${feedbackId} für Ressource ${resourceId} nicht gefunden.` });
                }
        
                const currentFeedback = feedback[feedbackIndex];
                currentFeedback.feedbackText = feedbackText.trim();
                currentFeedback.timestamp = formatISO(new Date());
        
                feedback[feedbackIndex] = currentFeedback;
                await writeData(FEEDBACK_FILE_NAME, feedback);
        
                res.status(200).json(currentFeedback);
            } catch (error) {
                console.error('Fehler beim Aktualisieren des Feedbacks:', error);
                next(error);
            }
        });
        
        ```
        
        - **Erklärung der Änderung:**
            - `router.put('/:resourceId/feedback/:feedbackId', validateFeedback, async (req, res, next) => { ... });`: Dieselbe `validateFeedback`Middleware kann hier wiederverwendet werden, da die Validierungslogik für den `feedbackText` beim Erstellen und Aktualisieren identisch ist. Dies ist ein hervorragendes Beispiel für die **Wiederverwendbarkeit** von Middleware.

### Manuelle Tests für Ticket RC-022

Nachdem du die Änderungen vorgenommen hast, ist es entscheidend, die Funktionalität manuell zu testen, um sicherzustellen, dass die Validierung wie erwartet funktioniert und keine unbeabsichtigten Nebenwirkungen auftreten.

1. **Stelle sicher, dass du dich im Stammverzeichnis des Resource Catalog Service befindest.**
2. **Stoppe den Server und starte ihn neu:**
    
    ```bash
    node app.js
    
    ```
    
    - Du solltest die Startmeldung des Servers sehen, die bestätigt, dass er läuft.
3. **Führe verschiedene Anfragen mit `curl` oder Postman durch, um die Validierungslogik zu testen:**
    - **Test 1: `POST /resources` (Gültige Ressource):**
        - Sende: `curl -X POST -H "Content-Type: application/json" -d '{"title": "Neues Tutorial", "type": "Video", "url": "http://example.com/video1"}' http://localhost:5002/resources`
        - Erwartet: `201 Created` und das neue Ressourcenobjekt.
    - **Test 2: `POST /resources` (Fehlender Titel):**
        - Sende: `curl -X POST -H "Content-Type: application/json" -d '{"type": "Video"}' http://localhost:5002/resources`
        - Erwartet: `400 Bad Request` mit `{ "error": "Titel und Typ der Ressource sind erforderlich." }`.
    - **Test 3: `POST /resources/:resourceId/ratings` (Gültige Bewertung):**
        - Wähle eine existierende Ressourcen-ID (z.B. `your_resource_id_here`).
        - Sende: `curl -X POST -H "Content-Type: application/json" -d '{"ratingValue": 4, "userId": "user123"}' http://localhost:5002/resources/your_resource_id_here/ratings`
        - Erwartet: `201 Created` und das neue Bewertungsobjekt.
    - **Test 4: `POST /resources/:resourceId/ratings` (Ungültige Bewertung - zu hoch):**
        - Sende: `curl -X POST -H "Content-Type: application/json" -d '{"ratingValue": 6, "userId": "user123"}' http://localhost:5002/resources/your_resource_id_here/ratings`
        - Erwartet: `400 Bad Request` mit `{ "error": "Bewertung muss zwischen 1 und 5 liegen." }`.
    - **Test 5: `POST /resources/:resourceId/ratings` (Ungültige Bewertung - kein Integer):**
        - Sende: `curl -X POST -H "Content-Type: application/json" -d '{"ratingValue": "abc", "userId": "user123"}' http://localhost:5002/resources/your_resource_id_here/ratings`
        - Erwartet: `400 Bad Request` mit `{ "error": "Bewertung muss eine ganze Zahl sein." }`.
    - **Test 6: `POST /resources/:resourceId/feedback` (Gültiges Feedback):**
        - Wähle eine existierende Ressourcen-ID.
        - Sende: `curl -X POST -H "Content-Type: application/json" -d '{"feedbackText": "Das ist ein sehr hilfreiches Feedback zu dieser Ressource. Ich habe viel gelernt!", "userId": "user456"}' http://localhost:5002/resources/your_resource_id_here/feedback`
        - Erwartet: `201 Created` und das neue Feedback-Objekt.
    - **Test 7: `POST /resources/:resourceId/feedback` (Feedback zu kurz):**
        - Sende: `curl -X POST -H "Content-Type: application/json" -d '{"feedbackText": "Kurz.", "userId": "user456"}' http://localhost:5002/resources/your_resource_id_here/feedback`
        - Erwartet: `400 Bad Request` mit `{ "error": "Feedback-Text muss zwischen 10 und 500 Zeichen lang sein." }`.
    - **Test 8: `PUT /resources/:resourceId/feedback/:feedbackId` (Gültiges Update):**
        - Wähle eine existierende Ressourcen-ID und eine existierende Feedback-ID.
        - Sende: `curl -X PUT -H "Content-Type: application/json" -d '{"feedbackText": "Aktualisiertes und sehr nützliches Feedback zu dieser Ressource. Es ist nun länger."}' http://localhost:5002/resources/your_resource_id_here/feedback/your_feedback_id_here`
        - Erwartet: `200 OK` und das aktualisierte Feedback-Objekt.
4. **Beobachte die Antworten:** Alle erfolgreichen Anfragen sollten weiterhin korrekt funktionieren. Alle fehlerhaften Anfragen sollten die erwarteten `400 Bad Request`Antworten mit den spezifischen Fehlermeldungen zurückgeben. Dies bestätigt, dass die Validierungslogik korrekt in die Middleware verschoben wurde und robuster ist.
5. **Führe den nächsten Git-Commit aus.**
    
    ```bash
    git add .
    git commit -m "refactor(validation): Move resource, rating and feedback validation to middleware in Resource Catalog Service"
    
    ```
    

# RC-023: Umfassende Code-Kommentierung – Detaillierter Walkthrough (Resource Catalog Service)

**Titel:** Umfassende Code-Kommentierung im Resource Catalog Service

**Ziel:** Der gesamte Code des Resource Catalog Service soll gut kommentiert sein, damit die Funktionalität, Parameter und Rückgabewerte von Funktionen und Endpunkten schnell verstanden werden können.

### Konzept: Doc-Kommentare und Inline-Kommentare

Guter Code ist selbsterklärend, aber selbst der beste Code profitiert von Kommentaren. Kommentare sind für Menschen gedacht, die den Code lesen und verstehen müssen, nicht für den Computer.

- **Doc-Kommentare (Dokumentationskommentare)**: Werden verwendet, um den Zweck von Funktionen, Klassen, Modulen oder ganzen Dateien zu beschreiben. Sie enthalten oft strukturierte Informationen über:
    - Den allgemeinen Zweck (`@file`, `@description`).
    - Parameter (`@param`).
    - Rückgabewerte (`@returns`).
    - Zusammenfassungen (`@summary`).
    - Sie werden oft im **JSDoc-Format** geschrieben, das von vielen IDEs (wie VS Code) und Dokumentationsgeneratoren erkannt wird.
- **Inline-Kommentare**: Werden innerhalb von Funktionen verwendet, um komplexe Logikblöcke, wichtige Entscheidungen, nicht-triviale Schritte oder temporäre Notizen zu erklären. Sie sind kürzer und spezifischer als Doc-Kommentare.

**Warum kommentieren?**

- **Verständlichkeit**: Macht den Code für andere Entwickler (und dein zukünftiges Ich!) leichter verständlich.
- **Wartbarkeit**: Hilft bei der Fehlersuche, dem Hinzufügen neuer Funktionen und dem Refactoring, da die Absicht des Codes klar ist.
- **Zusammenarbeit**: Erleichtert die Zusammenarbeit in Teams, da alle ein gemeinsames Verständnis des Codes entwickeln können.

**Wichtiger Hinweis:** In dieser Anleitung werde ich dir zeigen, **wo** du Kommentare hinzufügen solltest und **welche Art von Informationen** sie enthalten sollten. Da die Anweisung lautet, keinen Code zu kopieren, werde ich die Code-Blöcke hier **ohne die Kommentare selbst** darstellen. Deine Aufgabe ist es, die Kommentare gemäß der Beschreibung in deinen Code einzufügen.

### Schritt 1: Wende Doc-Kommentare auf `app.js` an

1. Öffne die Datei **`app.js`** in deinem Code-Editor (im Stammverzeichnis des Resource Catalog Service).
2. Füge einen **Dateikopf-Kommentar** am Anfang der Datei hinzu. Dieser sollte den Zweck der Datei beschreiben.
    - **Beispiel-Inhalt für den Dateikopf-Kommentar:**
        
        ```jsx
        /**
         * @file Dies ist die Hauptanwendungsdatei für den Resource Catalog Service.
         * @description Initialisiert die Express.js-Anwendung, registriert globale Middleware und bindet den Ressourcen-Router ein.
         */
        
        ```
        
        - **Erklärung:** `@file` gibt den Dateinamen an, `@description` eine kurze Zusammenfassung der Datei.
3. Füge einen **Doc-Kommentar** für den `app.get('/')`Endpunkt hinzu.
    - **Beispiel-Inhalt für den Doc-Kommentar:**
        
        ```jsx
        /**
         * GET /
         * @summary Basis-Endpunkt zur Überprüfung der Service-Erreichbarkeit.
         * @returns {string} Eine einfache Willkommensnachricht als Bestätigung, dass der Service läuft.
         */
        
        ```
        
        - **Erklärung:** `@summary` gibt eine kurze Zusammenfassung des Endpunkts. `@returns` beschreibt den Rückgabewert.
4. Füge einen **Doc-Kommentar** für den `app.listen()`Block hinzu.
    - **Beispiel-Inhalt für den Doc-Kommentar:**
        
        ```jsx
        /**
         * Startet den Express.js-Server auf dem konfigurierten Port.
         * @listens PORT
         */
        
        ```
        
        - **Erklärung:** `@listens` ist ein JSDoc-Tag, das angibt, auf welchem Port oder Ereignis der Server lauscht.

### Schritt 2: Wende Doc-Kommentare auf `helpers/data_manager.js` an

1. Öffne die Datei **`helpers/data_manager.js`**.
2. Füge einen **Dateikopf-Kommentar** am Anfang der Datei hinzu.
    - **Beispiel-Inhalt:**
        
        ```jsx
        /**
         * @file Dieses Modul stellt asynchrone Hilfsfunktionen zum Lesen und Schreiben von JSON-Daten bereit.
         * @description Kapselt Dateisystemoperationen, um den Datenzugriff zu standardisieren und nicht-blockierend zu gestalten.
         */
        
        ```
        
3. Füge einen **Doc-Kommentar** für die `readData`Funktion hinzu.
    - **Beispiel-Inhalt:**
        
        ```jsx
        /**
         * Liest Daten asynchron aus einer JSON-Datei im 'data'-Ordner des Service-Stammverzeichnisses.
         * @param {string} fileName - Der Name der JSON-Datei (z.B. 'resources.json', 'ratings.json', 'feedback.json').
         * @returns {Promise<Array>} Ein Promise, das das geparste Array aus der JSON-Datei auflöst.
         * Gibt ein leeres Array zurück, wenn die Datei nicht existiert.
         */
        
        ```
        
        - **Erklärung:** `@param` beschreibt die Parameter der Funktion (Typ und Beschreibung). `@returns`beschreibt den Rückgabewert, hier ein Promise, das ein Array auflöst.
4. Füge einen **Doc-Kommentar** für die `writeData`Funktion hinzu.
    - **Beispiel-Inhalt:**
        
        ```jsx
        /**
         * Schreibt Daten asynchron in eine JSON-Datei im 'data'-Ordner des Service-Stammverzeichnisses.
         * @param {string} fileName - Der Name der JSON-Datei.
         * @param {Array} data - Das Array von Daten, das in die JSON-Datei geschrieben werden soll.
         * @returns {Promise<void>} Ein Promise, das aufgelöst wird, wenn der Schreibvorgang abgeschlossen ist.
         */
        
        ```
        

### Schritt 3: Wende Doc-Kommentare auf `routes/resources_bp.js` an

1. Öffne die Datei **`routes/resources_bp.js`**.
2. Füge einen **Dateikopf-Kommentar** am Anfang der Datei hinzu.
    - **Beispiel-Inhalt:**
        
        ```jsx
        /**
         * @file Dieser Router verwaltet alle API-Endpunkte für Ressourcen, Bewertungen und Feedback im Resource Catalog Service.
         * @description Enthält Routen für CRUD-Operationen auf Ressourcen und deren zugehörigen Bewertungen/Feedback.
         */
        
        ```
        
3. Füge **Doc-Kommentare** für jeden einzelnen Endpunkt (`GET /`, `GET /:id`, `POST /`, `POST /:resourceId/ratings`, `POST /:resourceId/feedback`, `PUT /:resourceId/feedback/:feedbackId`, `DELETE /resources/:resourceId/feedback/:feedbackId`) hinzu.
    - **Beispiel-Inhalt für `GET /` (im Kontext des Routers, der in `app.js` unter `/resources` eingebunden wird):**
        
        ```jsx
        /**
         * GET /
         * @summary Ruft alle Ressourcen ab, optional gefiltert nach Typ oder Autor-ID.
         * @param {object} req.query - Query-Parameter für die Filterung.
         * @param {string} [req.query.type] - Optionaler Typ der Ressource zum Filtern.
         * @param {string} [req.query.authorId] - Optionale Autor-ID zum Filtern.
         * @returns {Array<object>} 200 - Ein Array von Ressourcenobjekten.
         * @returns {object} 500 - Interner Serverfehler.
         */
        
        ```
        
        - **Erklärung:**
            - `GET /`: Die HTTP-Methode und der Pfad *relativ zum Router-Mount-Punkt* (`/resources` in `app.js`).
            - `@summary`: Eine kurze Zusammenfassung des Endpunkts.
            - `@param {object} req.query`: Beschreibt das `req.query`Objekt.
            - `@param {string} [req.query.type]`: Beschreibt einen optionalen Query-Parameter. Die eckigen Klammern `[]` zeigen an, dass er optional ist.
            - `@returns {Array<object>} 200`: Beschreibt den Erfolgs-Rückgabewert (ein Array von Objekten mit Status 200).
            - `@returns {object} 500`: Beschreibt einen möglichen Fehler-Rückgabewert.
    - **Wiederhole dies für alle anderen Endpunkte, indem du die Parameter und Rückgabewerte entsprechend anpasst.**
4. Füge **Inline-Kommentare** für komplexe Logikblöcke oder wichtige Schritte innerhalb der Route-Handler hinzu.
    - **Beispiel-Inhalt für den `GET /:id` Endpunkt (innerhalb der Funktion):**
        
        ```jsx
        // Lade alle Ressourcen aus der JSON-Datei
        const resources = await readData(RESOURCES_FILE_NAME);
        
        // Lade alle Bewertungen, um den Durchschnitt für diese Ressource zu berechnen
        const ratings = await readData(RATINGS_FILE_NAME);
        // Filtere nur die Bewertungen, die zu dieser spezifischen Ressource gehören
        const resourceRatings = ratings.filter(rating => String(rating.resourceId) === resourceId);
        
        // Berechne die durchschnittliche Bewertung
        let averageRating = 0;
        if (resourceRatings.length > 0) {
            // Summiere alle Bewertungswerte
            const sumOfRatings = resourceRatings.reduce((sum, rating) => sum + Number(rating.ratingValue), 0);
            averageRating = sumOfRatings / resourceRatings.length;
        }
        
        // Finde die spezifische Ressource nach ihrer ID
        const resource = resources.find(r => String(r.id) === resourceId);
        
        // Überprüfe, ob die Ressource gefunden wurde
        if (resource) {
            // Füge die berechnete durchschnittliche Bewertung zum Ressourcenobjekt hinzu
            resource.averageRating = averageRating;
            // Sende die Ressource als JSON-Antwort
            res.status(200).json(resource);
        } else {
            // Sende 404 Not Found, wenn die Ressource nicht existiert
            res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.` });
        }
        
        ```
        
        - **Erklärung:** Diese Kommentare erklären die einzelnen Schritte der Logik innerhalb der Funktion.

### Schritt 4: Wende Doc-Kommentare auf Middleware-Dateien an (`middleware/logger.js`, `middleware/validation.js`, `middleware/error-handler.js`)

1. Öffne die Datei **`middleware/logger.js`**.
2. Füge einen **Dateikopf-Kommentar** und einen **Doc-Kommentar** für die `logger`Funktion hinzu (siehe Beispiel in RC-021 Walkthrough, Schritt 2).
    - **Beispiel-Inhalt für `logger.js`:**
        
        ```jsx
        /**
         * @file Dieses Modul stellt eine Middleware zur Protokollierung von HTTP-Anfragen und -Antworten bereit.
         * @description Protokolliert eingehende Anfragen und ausgehende Antworten mit Zeitstempeln, Methoden, URLs, Statuscodes und Dauern.
         */
        
        // ... (Imports) ...
        
        /**
         * Middleware-Funktion zur Protokollierung von HTTP-Anfragen und -Antworten.
         * Loggt die eingehende Anfrage (Methode, URL) und die ausgehende Antwort (Statuscode, Antwortzeit).
         * @param {object} req - Das Request-Objekt von Express.
         * @param {object} res - Das Response-Objekt von Express.
         * @param {function} next - Die Callback-Funktion zum Aufrufen der nächsten Middleware.
         */
        export const logger = (req, res, next) => {
            // ... (Implementierung wie in RC-021) ...
        };
        
        ```
        
3. Öffne die Datei **`middleware/validation.js`**.
4. Füge einen **Dateikopf-Kommentar** und **Doc-Kommentare** für jede Validierungsfunktion (`validateResource`, `validateRating`, `validateFeedback`) hinzu (siehe Beispiel in RC-022 Walkthrough, Schritt 1).
    - **Beispiel-Inhalt für `validation.js`:**
        
        ```jsx
        /**
         * @file Dieses Modul stellt Validierungs-Middleware-Funktionen für den Resource Catalog Service bereit.
         * @description Enthält Middleware zur Validierung von Ressourcendaten, Bewertungen und Feedback.
         */
        
        // ... (Imports) ...
        
        /**
         * Middleware zur Validierung der Daten für eine neue Ressource (POST /resources).
         * Stellt sicher, dass 'title' und 'type' im Request-Body vorhanden sind.
         * @param {object} req - Das Request-Objekt von Express.
         * @param {object} res - Das Response-Objekt von Express.
         * @param {function} next - Die Callback-Funktion zum Aufrufen der nächsten Middleware.
         */
        export const validateResource = (req, res, next) => {
            // ... (Implementierung wie in RC-022) ...
        };
        
        /**
         * Middleware zur Validierung der Daten für eine Bewertung (POST /resources/:id/ratings).
         * Stellt sicher, dass 'ratingValue' eine ganze Zahl zwischen 1 und 5 ist.
         * Wandelt 'ratingValue' in eine Ganzzahl um.
         * @param {object} req - Das Request-Objekt von Express.
         * @param {object} res - Das Response-Objekt von Express.
         * @param {function} next - Die Callback-Funktion zum Aufrufen der nächsten Middleware.
         */
        export const validateRating = (req, res, next) => {
            // ... (Implementierung wie in RC-022) ...
        };
        
        /**
         * Middleware zur Validierung der Daten für Feedback (POST/PUT /resources/:id/feedback).
         * Stellt sicher, dass 'feedbackText' vorhanden und zwischen 10 und 500 Zeichen lang ist.
         * @param {object} req - Das Request-Objekt von Express.
         * @param {object} res - Das Response-Objekt von Express.
         * @param {function} next - Die Callback-Funktion zum Aufrufen der nächsten Middleware.
         */
        export const validateFeedback = (req, res, next) => {
            // ... (Implementierung wie in RC-022) ...
        };
        
        ```
        
5. Öffne die Datei **`middleware/error-handler.js`**.
6. Füge einen **Dateikopf-Kommentar** und einen **Doc-Kommentar** für die `errorHandler`Funktion hinzu.
    - **Beispiel-Inhalt für `error-handler.js`:**
        
        ```jsx
        /**
         * @file Dieses Modul stellt eine globale Fehler-Handling-Middleware für Express.js bereit.
         * @description Fängt Fehler im Request-Response-Zyklus ab und sendet eine konsistente Fehlerantwort.
         */
        
        /**
         * Globale Fehler-Handling-Middleware.
         * Diese Middleware wird aufgerufen, wenn ein Fehler in einem der vorhergehenden Schritte auftritt (z.B. durch next(error)).
         * Protokolliert den Fehler auf der Konsole des Servers und sendet eine generische 500er-Antwort an den Client.
         * @param {Error} err - Das Fehlerobjekt, das von der vorherigen Middleware/Route übergeben wurde.
         * @param {object} req - Das Request-Objekt von Express.
         * @param {object} res - Das Response-Objekt von Express.
         * @param {function} next - Die Callback-Funktion zum Aufrufen der nächsten Middleware (hier nicht immer nötig, da die Antwort gesendet wird).
         */
        export const errorHandler = (err, req, res, next) => {
            // ... (Implementierung wie in früheren Tickets) ...
        };
        
        ```
        

**Manuelle Tests für Ticket RC-023**

1. **Stelle sicher, dass du dich im Stammverzeichnis des Resource Catalog Service befindest.**
2. **Überprüfe den Code manuell.** Gehe jede Datei durch, die du bearbeitet hast (`app.js`, `helpers/data_manager.js`, `routes/resources_bp.js`, `middleware/logger.js`, `middleware/validation.js`, `middleware/error-handler.js`).
3. **Verifiziere, dass:**
    - Jede Funktion und Methode einen Doc-Kommentar hat, der ihren Zweck, Parameter und Rückgabewerte beschreibt.
    - Komplexe Logikblöcke mit Inline-Kommentaren versehen sind.
    - Die Kommentierung klar, prägnant und korrekt ist und dem JSDoc-Format folgt.
    - Die Kommentare konsistent den **Resource Catalog Service** und den **`resourcesRouter`** (oder `router`innerhalb `resources_bp.js`) erwähnen.
4. **Starte den Server**, um sicherzustellen, dass die Kommentare keine Syntaxfehler verursacht haben.
    
    ```bash
    node app.js
    
    ```
    
5. **Führe den nächsten Git-Commit aus.**
    
    ```bash
    git add .
    git commit -m "feat(docs): Add comprehensive code comments to Resource Catalog Service"
    
    ```
    

# RC-024: Robuste Datenvergleiche und Typumwandlung – Detaillierter Walkthrough (Resource Catalog Service)

**Titel:** Robuste Datenvergleiche und Typumwandlung im Resource Catalog Service

**Ziel:** Datenvergleiche und -zuweisungen im Resource Catalog Service sollen sicher sein und unerwartete Datentypen korrekt behandeln, damit die API stabiler ist und unerwartetes Verhalten vermieden wird.

### Konzept: Typ-Koersion und Sicherheit

In JavaScript können Vergleiche (`==` oder `===`) und Operationen manchmal zu unerwarteten Ergebnissen führen, wenn die Datentypen nicht übereinstimmen.

- **Loose Equality (`==`)**: Führt Typumwandlungen (Type Coercion) durch, bevor verglichen wird. Dies kann zu schwer nachvollziehbaren Fehlern führen (z.B. `0 == false` ist `true`, `"1" == 1` ist `true`). Dies ist in der Regel zu vermeiden.
- **Strict Equality (`===`)**: Vergleicht Werte **und** Typen. Dies ist im Allgemeinen sicherer und die bevorzugte Vergleichsoperation in JavaScript (z.B. `"1" === 1` ist `false`).
- **Explizite Typumwandlung**: Es ist oft am besten, eingehende Daten (insbesondere aus URL-Parametern oder Request-Bodies, die immer Strings sein können) explizit in den erwarteten Typ umzuwandeln, bevor sie verglichen oder verwendet werden.
    - `String(value)`: Konvertiert einen Wert explizit in einen String.
    - `parseInt(value, 10)`: Konvertiert einen Wert in eine Ganzzahl (Basis 10).
    - `Number(value)`: Konvertiert einen Wert in eine Zahl (kann auch Dezimalzahlen verarbeiten).
    - `isNaN(value)`: Prüft, ob ein Wert "Not-a-Number" ist (nach einer fehlgeschlagenen numerischen Umwandlung).
    - `Number.isInteger(value)`: Prüft, ob ein Wert eine ganze Zahl ist.

**Warum ist das wichtig?**

- **Robustheit**: Die API funktioniert zuverlässig, auch wenn Clients Daten in leicht unterschiedlichen Formaten senden (z.B. eine ID als String statt als Zahl).
- **Sicherheit**: Verhindert potenzielle Schwachstellen, die durch unerwartete Typen in Vergleichen entstehen könnten (z.B. wenn eine unsichere Typumwandlung zu unerwarteten Übereinstimmungen führt).
- **Konsistenz**: Stellt sicher, dass Daten in den JSON-Dateien immer den erwarteten Typ haben und Vergleiche immer mit den korrekten Typen durchgeführt werden.

### Schritt 1: Passe `routes/resources.js` an

Wir werden Vergleiche und Zuweisungen für IDs und numerische Werte robuster machen, indem wir explizite Typumwandlungen hinzufügen.

1. Öffne die Datei **`routes/resources.js`** in deinem Code-Editor.
2. **`GET /` Endpunkt (Alle Ressourcen abrufen):**
    - Passe die Filterlogik an, um Typen explizit zu Strings zu konvertieren, bevor sie verglichen werden.
    
    ```jsx
    // Angenommen, der Router ist in dieser Datei als 'router' exportiert
    router.get('/', async (req, res, next) => {
        try {
            const resources = await readData(RESOURCES_FILE_NAME);
            const { type, authorId } } = req.query;
    
            let filteredResources = resources;
    
            if (type) {
                // Konvertiere beide Seiten des Vergleichs explizit zu Strings
                filteredResources = filteredResources.filter(r => String(r.type) === String(type));
            }
            if (authorId) {
                // Konvertiere beide Seiten des Vergleichs explizit zu Strings
                filteredResources = filteredResources.filter(r => String(r.authorId) === String(authorId));
            }
    
            res.status(200).json(filteredResources);
        } catch (error) {
            console.error('Fehler beim Abrufen der Ressourcen:', error);
            next(error);
        }
    });
    
    ```
    
    - **Erklärung:**
        - `String(r.type) === String(type)`: Hier verwenden wir `String()` um sicherzustellen, dass sowohl der `type` aus den Ressourcendaten als auch der `type` aus den Query-Parametern explizit in Strings umgewandelt werden, bevor der strenge Vergleich (`===`) durchgeführt wird. Dies verhindert Probleme, wenn `type` in der JSON-Datei z.B. als Zahl gespeichert wäre.
3. **`GET /:id` Endpunkt (Einzelne Ressource abrufen):**
    - Stelle sicher, dass alle ID-Vergleiche und die Umwandlung von `ratingValue` robust sind.
    
    ```jsx
    router.get('/:id', async (req, res, next) => {
        try {
            // Konvertiere URL-Parameter explizit zu String, da sie immer Strings sind
            const resourceId = String(req.params.id);
            const resources = await readData(RESOURCES_FILE_NAME);
    
            const ratings = await readData(RATINGS_FILE_NAME);
            // Filtere Bewertungen, indem beide IDs zu Strings konvertiert werden
            const resourceRatings = ratings.filter(rating => String(rating.resourceId) === resourceId);
    
            let averageRating = 0;
            if (resourceRatings.length > 0) {
                // Stelle sicher, dass ratingValue eine Zahl ist, bevor addiert wird
                const sumOfRatings = resourceRatings.reduce((sum, rating) => sum + Number(rating.ratingValue), 0);
                averageRating = sumOfRatings / resourceRatings.length;
            }
    
            // Finde die Ressource, indem beide IDs zu Strings konvertiert werden
            const resource = resources.find(r => String(r.id) === resourceId);
    
            if (resource) {
                resource.averageRating = averageRating;
                res.status(200).json(resource);
            } else {
                res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.` });
            }
        } catch (error) {
            console.error('Fehler beim Abrufen der Ressource:', error);
            next(error);
        }
    });
    
    ```
    
    - **Erklärung:**
        - `const resourceId = String(req.params.id);`: Der URL-Parameter `id` ist immer ein String. Wir machen es explizit, um Konsistenz zu gewährleisten.
        - `String(rating.resourceId) === resourceId`: Stellt sicher, dass der Vergleich von `resourceId`s immer zwischen Strings erfolgt, um potenzielle Typ-Mismatch-Probleme zu vermeiden.
        - `Number(rating.ratingValue)`: Obwohl `validateRating` (aus RC-022) bereits `ratingValue` in eine Zahl umwandelt, ist es hier eine zusätzliche Absicherung, um sicherzustellen, dass die Addition korrekt erfolgt, falls `ratingValue` aus irgendeinem Grund doch kein reiner numerischer Typ im Array sein sollte (z.B. durch manuelle Bearbeitung der JSON-Datei).
4. **`POST /:resourceId/ratings` Endpunkt (Ressource bewerten):**
    - Stelle sicher, dass `userId` explizit als String gespeichert wird.
    
    ```jsx
    router.post('/:resourceId/ratings', validateRating, async (req, res, next) => {
        const resourceId = String(req.params.resourceId);
        const { ratingValue, userId } = req.body;
    
        const newRating = {
            id: uuidv4(),
            resourceId: resourceId,
            ratingValue: ratingValue,
            userId: userId ? String(userId) : 'anonymous', // Konvertiere userId explizit zu String oder 'anonymous'
            timestamp: formatISO(new Date())
        };
    
        try {
            const ratings = await readData(RATINGS_FILE_NAME);
            ratings.push(newRating);
            await writeData(RATINGS_FILE_NAME, ratings);
    
            res.status(201).json(newRating);
        } catch (error) {
            console.error('Fehler beim Schreiben der Bewertung in die Datei:', error);
            next(error);
        }
    });
    
    ```
    
    - **Erklärung:**
        - `userId ? String(userId) : 'anonymous'`: Der `userId` aus dem Request-Body könnte ein String oder `undefined` sein. Wir stellen sicher, dass er immer ein String ist (entweder der übergebene Wert oder `'anonymous'`).
5. **`POST /:resourceId/feedback` Endpunkt (Text-Feedback hinzufügen):**
    - Stelle sicher, dass `userId` explizit als String gespeichert wird.
    
    ```jsx
    router.post('/:resourceId/feedback', validateFeedback, async (req, res, next) => {
        const resourceId = String(req.params.resourceId);
        const { feedbackText, userId } = req.body;
    
        const newFeedback = {
            id: uuidv4(),
            resourceId: resourceId,
            feedbackText: feedbackText.trim(),
            userId: userId ? String(userId) : 'anonymous', // Konvertiere userId explizit zu String oder 'anonymous'
            timestamp: formatISO(new Date())
        };
    
        try {
            const feedback = await readData(FEEDBACK_FILE_NAME);
            feedback.push(newFeedback);
            await writeData(FEEDBACK_FILE_NAME, feedback);
    
            res.status(201).json(newFeedback);
        } catch (error) {
            console.error('Fehler beim Schreiben des Feedbacks in die Datei:', error);
            next(error);
        }
    });
    
    ```
    
    - **Erklärung:**
        - `userId ? String(userId) : 'anonymous'`: Auch hier stellen wir sicher, dass `userId` immer ein String ist.
6. **`PUT /:resourceId/feedback/:feedbackId` Endpunkt (Text-Feedback ändern):**
    - Stelle sicher, dass alle ID-Vergleiche robust sind.
    
    ```jsx
    router.put('/:resourceId/feedback/:feedbackId', validateFeedback, async (req, res, next) => {
        const resourceId = String(req.params.resourceId);
        const feedbackId = String(req.params.feedbackId);
        const { feedbackText } = req.body;
    
        try {
            let feedback = await readData(FEEDBACK_FILE_NAME);
    
            // Finde Feedback, indem beide IDs zu Strings konvertiert werden
            const feedbackIndex = feedback.findIndex(f => String(f.id) === feedbackId && String(f.resourceId) === resourceId);
    
            if (feedbackIndex === -1) {
                return res.status(404).json({ error: `Feedback mit ID ${feedbackId} für Ressource ${resourceId} nicht gefunden.` });
            }
    
            const currentFeedback = feedback[feedbackIndex];
            currentFeedback.feedbackText = feedbackText.trim();
            currentFeedback.timestamp = formatISO(new Date());
    
            feedback[feedbackIndex] = currentFeedback;
            await writeData(FEEDBACK_FILE_NAME, feedback);
    
            res.status(200).json(currentFeedback);
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Feedbacks:', error);
            next(error);
        }
    });
    
    ```
    
    - **Erklärung:**
        - `String(f.id) === feedbackId && String(f.resourceId) === resourceId`: Stellt sicher, dass alle ID-Vergleiche in der `findIndex`Methode zwischen Strings erfolgen.
7. **`DELETE /resources/:resourceId/feedback/:feedbackId` Endpunkt (Text-Feedback löschen):**
    - Stelle sicher, dass alle ID-Vergleiche robust sind.
    
    ```jsx
    router.delete('/:resourceId/feedback/:feedbackId', async (req, res, next) => {
        const resourceId = String(req.params.resourceId);
        const feedbackId = String(req.params.feedbackId);
    
        try {
            let feedback = await readData(FEEDBACK_FILE_NAME);
            const initialLength = feedback.length;
    
            // Filtere Feedback, indem beide IDs zu Strings konvertiert werden
            feedback = feedback.filter(f => !(String(f.id) === feedbackId && String(f.resourceId) === resourceId));
    
            if (feedback.length === initialLength) {
                return res.status(404).json({ error: `Feedback mit ID ${feedbackId} für Ressource ${resourceId} nicht gefunden.` });
            }
    
            await writeData(FEEDBACK_FILE_NAME, feedback);
    
            res.status(204).end();
        } catch (error) {
            console.error('Fehler beim Löschen des Feedbacks:', error);
            next(error);
        }
    });
    
    ```
    
    - **Erklärung:**
        - `String(f.id) === feedbackId && String(f.resourceId) === resourceId`: Stellt sicher, dass alle ID-Vergleiche in der `filter`Methode zwischen Strings erfolgen.

### Schritt 2: Passe `middleware/validation.js` an

Die Anpassung der `validateRating` Middleware wurde bereits in Ticket RC-022 vorgenommen, um die Typumwandlung und Validierung für `ratingValue` zu handhaben. Dies ist der Hauptpunkt für dieses Ticket in der Validierungs-Middleware.

**Manuelle Tests für Ticket RC-024**

1. **Stelle sicher, dass du dich im Stammverzeichnis des Resource Catalog Service befindest.**
2. **Stoppe den Server und starte ihn neu:**
    
    ```bash
    node app.js
    
    ```
    
3. **Führe alle bestehenden manuellen Tests für alle Endpunkte des Resource Catalog Service durch.**
    - Alle Operationen sollten weiterhin wie erwartet funktionieren.
    - Teste insbesondere Szenarien, in denen IDs oder numerische Werte möglicherweise als Strings gesendet werden, aber in der JSON-Datei als Zahlen (oder umgekehrt) gespeichert sind (obwohl unsere Mock-Daten dies nicht direkt zeigen, macht diese Änderung den Code robuster).
    - Stelle sicher, dass die `validateRating` Middleware weiterhin korrekt funktioniert, wenn du z.B. `{"ratingValue": "3"}` oder `{"ratingValue": 3}` sendest, aber auch `{"ratingValue": "abc"}` oder `{"ratingValue": 3.5}` korrekt ablehnt.
4. **Führe den nächsten Git-Commit aus.**
    
    ```bash
    git add .
    git commit -m "refactor(types): Ensure robust data comparisons and type conversions in Resource Catalog Service"
    
    ```