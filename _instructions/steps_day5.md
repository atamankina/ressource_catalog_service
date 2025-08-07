# Express.js: Walkthrough Tag 5

Willkommen zum Tag 5! Heute werden wir unser Projekt finalisieren, indem wir Best Practices für die Produktion anwenden, die Code-Qualität sicherstellen und die notwendige Dokumentation hinzufügen.

### Ticket RC-011: Environment-Variablen mit `dotenv`

Das Ziel dieses Tickets ist es, den Port unseres Servers aus der Codebasis zu entfernen und in einer separaten Datei zu speichern. Dies ist eine Standardpraxis für sensible Daten und um die Anwendung flexibler zu machen.

### Konzept: Environment-Variablen und `dotenv`

- **Environment-Variablen** sind dynamische Schlüssel-Wert-Paare, die in der Umgebung eines Programms existieren. Sie ermöglichen es, Konfigurationsdaten (wie z. B. Datenbank-Credentials, API-Schlüssel oder den Server-Port) von der Codebasis zu trennen.
- Das `dotenv`Paket ist eine einfache Möglichkeit, Umgebungsvariablen aus einer `.env`Datei in den `process.env`Objekt von Node.js zu laden.

### Schritt 1: Installiere das `dotenv`Paket

```
npm install dotenv

```

- `npm install dotenv`: Installiert das `dotenv`Paket, das wir benötigen, um unsere Umgebungsvariablen zu laden.

### Schritt 2: Erstelle die `.env`Datei

1. Erstelle im Stammverzeichnis deines Projekts eine neue Datei mit dem Namen **`.env`**.
2. Füge die folgende Zeile in die Datei ein:
    
    ```
    PORT=5002
    
    ```
    
- **Wichtig**: Die `.env`Datei enthält sensible Daten und sollte niemals in die Versionskontrolle hochgeladen werden. Stelle sicher, dass die Datei `.gitignore` bereits den Eintrag `node_modules/` hat.

### Schritt 3: Aktualisiere die `.gitignore`Datei

Um sicherzustellen, dass die `.env`-Datei nicht versehentlich in Git hochgeladen wird, fügen wir sie zu `.gitignore` hinzu.

1. Öffne die Datei **`.gitignore`**.
2. Füge die folgende Zeile am Ende der Datei hinzu:
    
    ```
    .env
    
    ```
    

### Schritt 4: Konfiguriere `dotenv` in `server.js`

1. Öffne die Datei **`server.js`**.
2. Füge ganz oben, am besten als erste Zeile, den Import und die Konfiguration hinzu:
    
    ```
    import 'dotenv/config';
    
    ```
    
- **`import 'dotenv/config'`**: Dies importiert und führt die `dotenv`Konfiguration aus, die die Schlüssel-Wert-Paare aus der `.env`Datei lädt und dem `process.env`Objekt zur Verfügung stellt.
1. Ersetze die hartcodierte `PORT`Konstante.
    
    ```
    // const PORT = 5002; // Diese Zeile löschen
    const PORT = process.env.PORT || 5002;
    
    ```
    
- `process.env.PORT`: Greift auf den Wert der Umgebungsvariable `PORT` zu, die wir in der `.env`Datei definiert haben.
- `|| 5002`: Dies ist der logische **OR-Operator**. Wenn `process.env.PORT` aus irgendeinem Grund nicht definiert ist, wird der Fallback-Wert `5002` verwendet. Das macht den Code robuster.
2. Passe den Server-Start-Code an, um die Umgebungsvariable zu benutzen (ersetze `port` mit `PORT`):
```
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
```

**Manuelle Tests für Ticket RC-011**

1. **Stoppe den Server und starte ihn neu:**
    
    ```
    node server.js
    
    ```
    
2. **Verifiziere, dass der Server auf Port `5002` läuft**, indem du `http://localhost:5002/` in deinem Browser besuchst.
3. **Führe den nächsten Git-Commit aus.**
    
    ```
    git add .
    git commit -m "feat(env): Add dotenv for environment variables"
    
    ```
    

### Ticket RC-011-1: CORS-Middleware implementieren

Das Ziel dieses Tickets ist es, eine Middleware zu implementieren, die es einem Frontend, das auf einer anderen Domain läuft, erlaubt, auf unsere API zuzugreifen.

### Konzept: CORS (Cross-Origin Resource Sharing)

- **CORS** ist ein Sicherheitsmechanismus, der von Browsern erzwungen wird, um zu verhindern, dass Webseiten Anfragen an eine andere Domain (einen "anderen Origin") senden, ohne dass diese Domain dies explizit erlaubt.
- Wenn dein Backend auf `localhost:5002` und dein Frontend auf `localhost:3000` läuft, werden die Anfragen deines Frontends standardmäßig vom Browser blockiert, da die Ursprünge nicht übereinstimmen.
- Das `cors`Paket ist eine einfache Middleware, die die notwendigen HTTP-Header hinzufügt, um diese Anfragen zu erlauben.

### Schritt 1: Installiere das `cors`Paket

```
npm install cors

```

- `npm install cors`: Installiert die offizielle CORS-Middleware für Express.

### Schritt 2: Implementiere die `cors`Middleware in `server.js`

1. Öffne die Datei **`server.js`**.
2. Importiere das `cors`Paket ganz oben, direkt unter dem `dotenv`Import:
    
    ```
    import cors from 'cors';
    
    ```
    
3. Füge die Middleware zu deiner Anwendung hinzu. Sie sollte vor allen Routen und anderen Middleware-Funktionen platziert werden.
    
    ```
    app.use(express.json());
    app.use(cors()); // Diese Zeile hinzufügen
    app.use('/resources', resourcesRouter);
    
    ```
    
- **`app.use(cors())`**: Dies fügt die `cors`Middleware zur Express-Pipeline hinzu. In ihrer Standardkonfiguration erlaubt sie Anfragen von **allen Origins ()**. Für eine Produktionsanwendung sollte man dies auf eine spezifische Liste von erlaubten Domains beschränken.

**Manuelle Tests für Ticket RC-011-1**

1. **Stoppe den Server und starte ihn neu:**
    
    ```
    node server.js
    
    ```
    
2. **Verifiziere im Terminal, dass der Server ohne Fehler startet.** Die Funktionalität von CORS ist nicht direkt über `curl` oder den Browser sichtbar, da sie die Kommunikation zwischen verschiedenen Origins regelt. Die bloße Existenz der Middleware ist die Bestätigung.
3. **Führe den nächsten Git-Commit aus.**
    
    ```
    git add .
    git commit -m "feat(cors): Add CORS middleware"
    
    ```
    

### Ticket RC-013: Finalisierung und Dokumentation

Das Ziel dieses Tickets ist es, die Entwicklung abzuschließen, die Code-Qualität zu verbessern und die Projektdokumentation zu erstellen.

### Schritt 1: Füge ein `start`Skript in `package.json` hinzu

Wir erstellen ein Skript, um das Starten des Servers zu vereinfachen.

1. Öffne die Datei **`package.json`**.
2. Füge unter dem `"scripts"`Objekt das `start`Skript hinzu:
    
    ```
    "scripts": {
      "start": "node server.js"
    },
    
    ```
    
- `"start": "node server.js"`: Dies ermöglicht es, den Server einfach mit dem Befehl `npm start` zu starten.

### Schritt 2: Erstelle eine `README.md`Datei

Jedes gute Projekt benötigt eine Dokumentation, die erklärt, wie man es installiert, startet und benutzt.

1. Erstelle im Stammverzeichnis eine neue Datei mit dem Namen **`README.md`**.
2. Füge den folgenden Inhalt ein und passe ihn bei Bedarf an.
    
    ```
    # Resource Catalog Service
    
    Ein einfacher RESTful API-Service für einen Ressourcenkatalog, der mit Express.js implementiert wurde.
    
    ---
    
    ## Merkmale
    
    * **GET /resources**: Ruft alle Ressourcen ab. Unterstützt Filterung über Query-Parameter (`type`, `authorId`).
    * **GET /resources/:id**: Ruft eine einzelne Ressource anhand ihrer ID ab.
    * **POST /resources**: Erstellt eine neue Ressource.
    * **PUT /resources/:id**: Aktualisiert eine bestehende Ressource.
    * **DELETE /resources/:id**: Löscht eine bestehende Ressource.
    * Verwendet **Middleware** für Validierung und Fehlerbehandlung.
    * Konfiguration über **Umgebungsvariablen**.
    * Unterstützt **CORS**.
    
    ---
    
    ## Voraussetzungen
    
    Stelle sicher, dass du Node.js und npm installiert hast.
    
    ## Installation
    
    1.  Klone dieses Repository (sobald es in einem Repository ist).
    2.  Navigiere in das Projektverzeichnis.
    3.  Installiere die Abhängigkeiten:
        ```sh
        npm install
        ```
    4.  Erstelle eine `.env`-Datei im Stammverzeichnis und füge den Port hinzu:
        ```
        PORT=5002
        ```
    
    ---
    
    ## Verwendung
    
    Starte den Server mit dem folgenden Befehl:
    ```sh
    npm start
    
    ```
    
    Der Server läuft auf `http://localhost:5002`. Du kannst die Endpunkte mit Tools wie `curl` oder Postman testen.
    
    ### Beispiel-Endpunkte
    
    - `GET http://localhost:5002/resources`
    - `POST http://localhost:5002/resources` mit einem JSON-Body
    - `GET http://localhost:5002/resources?type=Kurs`
    
    ## Daten
    
    Die Daten werden in `data/resources.json` gespeichert.
    
    ```
    
    

**Manuelle Tests für Ticket RC-013**

1. **Führe den finalen Commit aus.**
    
    ```
    git add .
    git commit -m "feat(docs): Finalize project with start script and README.md"
    
    ```
    
2. **Starte den Server mit dem neuen Befehl:**
    
    ```
    npm start
    
    ```
    
    Der Server sollte erfolgreich starten, und das Projekt ist nun abgeschlossen!