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

Der Server läuft auf http://localhost:5002. Du kannst die Endpunkte mit Tools wie curl oder Postman testen.

### Beispiel-Endpunkte

- `GET http://localhost:5002/resources`
- `POST http://localhost:5002/resources` mit einem JSON-Body
- `GET http://localhost:5002/resources?type=Kurs`

## Daten

Die Daten werden in `data/resources.json` gespeichert.