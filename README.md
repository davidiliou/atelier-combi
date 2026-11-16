# Atelier Combi

Application web pour entraîneurs de rugby : créer des combinaisons sur un terrain, étape par étape, avec preview animée et export vidéo WebM.

## Démarrage

```bash
export PATH="$HOME/.local/node/bin:$PATH"   # si besoin
npm install
npm run dev
```

Ouvrir [http://localhost:8087](http://localhost:8087).

- Frontend Vite : port **8087**
- API Express + SQLite : port **3087** (proxifiée via `/api`)

## Scripts

| Commande | Description |
|----------|-------------|
| `npm run dev` | Dev client + serveur |
| `npm run build` | Build production du client |
| `npm start` | Sert l’API + le client buildé sur **8087** |

## Docker

```bash
docker compose up -d --build
```

App : [http://localhost:8087](http://localhost:8087)  
Données SQLite persistées dans le volume `atelier-combi-data`.

```bash
docker compose logs -f    # logs
docker compose down       # stop
```

## Stack

- React + TypeScript (Vite)
- Express + SQLite (`node:sqlite`)
- Export vidéo : Canvas + `MediaRecorder` (WebM)
