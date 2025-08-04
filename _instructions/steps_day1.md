# Resource Catalog with Express.js: Detaillierter Walkthrough Tag 1

Willkommen bei deinem ersten Backend-Projekt! Heute legen wir das Fundament für unseren Server und erstellen die Endpunkte zum Abrufen von Daten.

### Ticket RC-001: Projekt-Setup mit Git und ES Modules

Das Ziel dieses Tickets ist es, die grundlegende Projektstruktur zu erstellen, die notwendigen Tools zu installieren und die Versionskontrolle mit Git einzurichten.

### Schritt 1: Erstelle das Projektverzeichnis

Öffne dein **Terminal** und gib den folgenden Befehl ein:

```bash
mkdir resource-catalog-service

```

- `mkdir`: Dies steht für "make directory" und ist ein standardmäßiger Befehl, um einen neuen Ordner mit dem Namen **`resource-catalog-service`** zu erstellen.

### Schritt 2: Wechsle in das neue Verzeichnis

Navigiere in den soeben erstellten Ordner:

```bash
cd resource-catalog-service

```

- `cd`: Dieser Befehl steht für "change directory". Ab jetzt werden alle folgenden Befehle innerhalb dieses Ordners ausgeführt.

### Schritt 3: Initialisiere ein Node.js-Projekt

Führe den folgenden Befehl aus, um dein Projekt als Node.js-Projekt zu initialisieren:

```bash
npm init -y

```

- `npm init`: Dieser Befehl startet den Initialisierungsprozess für ein neues Node.js-Paket.
- `y`: Diese Option steht für "yes". Sie weist **npm** (Node Package Manager) an, alle Standardeinstellungen automatisch zu akzeptieren, wodurch eine `package.json`Datei mit Standardwerten erstellt wird. Diese Datei ist das Manifest deines Projekts.

### Schritt 4: Initialisiere ein Git-Repository

Um die Versionskontrolle zu starten, initialisiere ein Git-Repository:

```bash
git init

```

- `git init`: Dieser Befehl initialisiert ein Git-Repository. Das bedeutet, dass in deinem Ordner ein unsichtbarer **`.git`**Ordner erstellt wird, der alle notwendigen Informationen enthält, um die Änderungen an deinen Dateien zu verfolgen.

### Schritt 5: Erstelle die `.gitignore`Datei

Einige Dateien, wie der `node_modules`-Ordner, sollten nicht in der Versionskontrolle gespeichert werden.

1. Öffne deinen Code-Editor.
2. Erstelle im Stammverzeichnis eine neue Datei mit dem Namen **`.gitignore`**.
3. Füge die folgende Zeile in die Datei ein:
    
    ```bash
    node_modules/
    
    ```
    
- `node_modules/`: Diese Zeile weist **Git** an, den gesamten `node_modules`Ordner zu ignorieren. Das ist wichtig, weil dieser Ordner sehr groß werden kann und sein Inhalt jederzeit mit `npm install` neu erzeugt werden kann.

### Schritt 6: Installiere Express.js

Wir installieren Express.js, das Framework, das uns hilft, unseren Server zu erstellen.

```bash
npm install express

```

- `npm install express`: Dieser Befehl lädt das **Express.js**Paket herunter und speichert es im Ordner `node_modules`. Er fügt auch einen Eintrag in der `package.json`Datei unter `"dependencies"` hinzu.

### Schritt 7: Führe den ersten Git-Commit aus

Nun, da die grundlegende Struktur steht, speichern wir den aktuellen Stand.

```bash
git add .

```

- `git add .`: Dieser Befehl fügt alle neuen oder geänderten Dateien (der Punkt `.` steht für "alle Dateien im aktuellen Verzeichnis") dem "Staging-Bereich" von Git hinzu.

```bash
git commit -m "Initial project setup"

```

- `git commit -m "..."`: Dieser Befehl erstellt einen "Speicherpunkt" oder "Commit" in der Versionsgeschichte. Der Text in den Anführungszeichen ist die Commit-Nachricht, die beschreibt, was in diesem Commit getan wurde.

### Schritt 8: Konfiguriere ES Modules in der `package.json`

Damit wir die moderne `import`/`export`-Syntax in unserem Code verwenden können, müssen wir eine Einstellung vornehmen.

1. Öffne die Datei **`package.json`**.
2. Füge die folgende Zeile direkt unter der Zeile `"main": "index.js",` hinzu:
    
    ```json
    "type": "module"
    
    ```
    
- `"type": "module"`: Diese Einstellung teilt Node.js mit, dass die Dateien in diesem Projekt das **ES Module-System** verwenden, das die Verwendung von `import` und `export` ermöglicht.

**Manuelle Tests für Ticket RC-001**

1. **Dateistruktur überprüfen**: Überprüfe in deinem Dateibrowser, ob die folgenden Dateien und Ordner existieren: `node_modules/`, `package.json`, `package-lock.json`, `.gitignore`, und der versteckte `.git/`Ordner.
2. **`package.json` überprüfen**: Öffne die `package.json`Datei und verifiziere, dass sie die Zeile `"type": "module"`und unter `"dependencies"` den Eintrag `"express"` enthält.

### Ticket RC-002: Erster `GET` Endpunkt (`/resources`)

Jetzt erstellen wir die Endpunkte, um die Ressourcen in unserem Katalog anzuzeigen.

### Schritt 1: Erstelle die Mock-Daten

Wir benötigen Daten, die unser Server zurückgeben kann.

1. Erstelle einen neuen Ordner namens **`data`** im Stammverzeichnis deines Projekts.
2. Erstelle im `data`Ordner eine neue Datei mit dem Namen **`resources.json`**.
3. Füge den folgenden JSON-Inhalt ein:
    
    ```json
    [
        {
            "id": "1",
            "title": "Einführung in die Webentwicklung",
            "type": "Kurs",
            "authorId": "a1b2c3d4",
            "url": "http://example.com/webdev"
        },
        {
            "id": "2",
            "title": "Express.js-Tutorial",
            "type": "Video",
            "authorId": "a1b2c3d4",
            "url": "http://example.com/expressjs"
        }
    ]
    
    ```
    
- Dies ist ein **JSON-Array** mit zwei Beispielobjekten, die als unsere Datenbank dienen.

### Schritt 2: Erstelle die Datei `server.js`

Jetzt erstellen wir die Hauptdatei unseres Servers.

1. Erstelle im Stammverzeichnis eine neue Datei namens **`server.js`**.

### Schritt 3: Importiere die notwendigen Module

In `server.js` fügst du die Module hinzu, die wir für unseren Server benötigen.

```jsx
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

```

- `import express from 'express'`: Importiert das **Express.js-Framework**.
- `import fs from 'fs'`: Importiert das eingebaute **File System (fs)-Modul** von Node.js, das wir zum Lesen unserer `resources.json`Datei verwenden werden.
- `import path from 'path'`: Importiert das **Path-Modul**, um plattformunabhängige Dateipfade zu erstellen.
- `import { fileURLToPath } from 'url'`: Dies ist ein notwendiger Helfer, um mit ES Modules den Pfad zum aktuellen Skript zu ermitteln.

### Schritt 4: Definiere Konstanten und die Express-Anwendung

Füge die folgenden Zeilen hinzu, um Variablen und eine Express-Instanz zu erstellen.

```jsx
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 5002;
const DATA_FILE = path.join(__dirname, 'data', 'resources.json');

```

- `__filename`/`__dirname`: Mit diesen Konstanten ermitteln wir den Pfad zur aktuellen Datei und ihrem Verzeichnis, was für den Zugriff auf `resources.json` wichtig ist.
- `const app = express()`: Dies ist die zentrale Zeile, die eine Instanz der **Express-Anwendung** erstellt. Dieses `app`Objekt ist der Startpunkt für die Konfiguration unserer Routen und des Servers.
- `const PORT = 5002`: Definiert den Port, auf dem unser Server lauschen wird.
- `const DATA_FILE = path.join(...)`: Erstellt einen plattformunabhängigen Pfad zu deiner `resources.json`Datei.

### Schritt 5: Erstelle den Root-Endpunkt (`/`)

Dieser Endpunkt gibt eine einfache Willkommensnachricht zurück.

```
app.get('/', (req, res) => {
    res.send('Willkommen beim Resource Catalog Service!');
});

```

- **`app.get(...)`**: Dies ist die Methode, um eine Route für **HTTP-`GET`Anfragen** zu definieren. `GET` ist die HTTP-Methode, die typischerweise zum Abrufen von Daten verwendet wird.
- `'/'`: Dies ist der Pfad, auf den diese Route reagiert (die Startseite unserer API).
- `(req, res) => { ... }`: Dies ist der sogenannte **Route-Handler**, eine Funktion, die Express aufruft, wenn eine passende Anfrage eingeht.
- `req`: Das "Request"-Objekt, das Informationen über die eingehende Anfrage enthält.
- `res`: Das "Response"-Objekt, mit dem du eine Antwort an den Client senden kannst.
- `res.send(...)`: Sendet eine einfache Textantwort an den Client.

### Schritt 6: Erstelle den Endpunkt für alle Ressourcen (`/resources`)

Dieser Endpunkt liest die `resources.json`-Datei und gibt ihren Inhalt als JSON zurück.

```jsx
app.get('/resources', (req, res) => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        const resources = JSON.parse(data);
        res.json(resources);
    } catch (error) {
        res.status(500).json({ error: 'Interner Serverfehler beim Laden der Daten' });
    }
});

```

- `app.get('/resources', ...)`: Definiert eine Route, die auf `GET`Anfragen an den Pfad `/resources` reagiert.
- `try...catch`: Dieser Block ist wichtig für die **Fehlerbehandlung**. Er fängt Fehler ab, die beim Lesen der Datei auftreten könnten.
- `const data = fs.readFileSync(...)`: Liest den Inhalt der `resources.json`Datei **synchron**.
- `const resources = JSON.parse(data)`: Konvertiert den JSON-String (`data`) in ein JavaScript-Array (`resources`).
- `res.json(resources)`: Sendet das JavaScript-Array als **JSON-Antwort** an den Client. Express setzt automatisch den richtigen `Content-Type`Header (`application/json`).
- `res.status(500).json(...)`: Im Fehlerfall setzen wir den HTTP-Statuscode auf **500 Internal Server Error**und senden eine JSON-Fehlermeldung zurück.

### Schritt 7: Erstelle den Endpunkt für eine einzelne Ressource (`/resources/:id`)

Dieser Endpunkt verwendet einen dynamischen Parameter, um eine bestimmte Ressource abzurufen.

```jsx
app.get('/resources/:id', (req, res) => {
    try {
        const resourceId = req.params.id;
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        const resources = JSON.parse(data);
        const resource = resources.find(r => r.id === resourceId);

        if (resource) {
            res.json(resource);
        } else {
            res.status(404).json({ error: `Ressource mit ID ${resourceId} nicht gefunden.` });
        }
    } catch (error) {
        res.status(500).json({ error: 'Interner Serverfehler beim Laden der Daten' });
    }
});

```

- `app.get('/resources/:id', ...)`: Der Doppelpunkt (`:`) vor `id` kennzeichnet `id` als einen **URL-Parameter**. Express erfasst den Wert an dieser Stelle in der URL.
- `req.params.id`: So greifst du auf den Wert des Parameters zu. Das `req.params`Objekt enthält alle URL-Parameter.
- `resources.find(...)`: Dies ist eine Array-Methode, die das erste Element zurückgibt, für das die gegebene Bedingung wahr ist.
- `if (resource)`: Die `find()`Methode gibt `undefined` zurück, wenn kein Element gefunden wird. `undefined` ist ein "falsy" Wert, daher ist dies eine effiziente Prüfung.
- `res.status(404)`: Wenn die Ressource nicht gefunden wurde, senden wir den HTTP-Statuscode **404 Not Found**.

### Schritt 8: Starte den Server

Dieser Codeblock lässt den Server auf Anfragen warten.

```jsx
app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});

```

- `app.listen(...)`: Startet den Server und lässt ihn auf dem konfigurierten Port (`5002`) auf eingehende Anfragen warten.
- `() => { ... }`: Eine Callback-Funktion, die ausgeführt wird, sobald der Server erfolgreich gestartet ist.

**Manuelle Tests für Ticket RC-002 und RC-003**

1. **Starte den Server:**
    
    ```bash
    node server.js
    
    ```
    
2. **Öffne deinen Webbrowser oder `curl` im Terminal und teste die Endpunkte:**
    - Navigiere zu `http://localhost:5002/`. Du solltest die Nachricht `Willkommen beim Resource Catalog Service!` sehen.
    - Navigiere zu `http://localhost:5002/resources`. Du solltest das JSON-Array mit den beiden Ressourcen sehen.
    - Navigiere zu `http://localhost:5002/resources/1`. Du solltest die JSON-Daten der ersten Ressource sehen.
    - Navigiere zu `http://localhost:5002/resources/999`. Du solltest eine JSON-Fehlermeldung mit dem Status **`404 Not Found`** sehen.
3. **Führe den nächsten Git-Commit aus.**
    
    ```bash
    git add .
    git commit -m "feat(resources): Add GET / and /resources/:id endpoints"
    
    ```