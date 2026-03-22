[한국어](./README.ko.md) | [English](./README.en.md) | [简体中文](./README.zh-cn.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [Português (BR)](./README.pt-br.md) | **Français** | [Русский](./README.ru.md) | [Deutsch](./README.de.md)

---

<p align="center">
  <img src="https://raw.githubusercontent.com/Epsilondelta-ai/SHOT/main/frontend/src/assets/logo.webp" width="480" alt="SHOT!" />
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Epsilondelta-ai/SHOT/main/frontend/src/assets/background2.webp" width="600" alt="SHOT! gameplay" />
</p>

# SHOT! - Jeu de Stratégie Multijoueur en Ligne

Un jeu de cartes en temps réel et basé sur les tours où les **Agents** affrontent les **Espions** dans une bataille de déduction et de stratégie.

**Jouez maintenant :** https://shot.game/

---

## Vue d'ensemble

**SHOT!** est un jeu de stratégie multijoueur en ligne pour 5 à 12 joueurs. Les joueurs sont secrètement divisés en deux équipes : les **Agents** (majorité) qui visent à éliminer tous les **Espions**, et les **Espions** (minorité) qui doivent éliminer tous les Agents tout en restant camouflés.

Chaque joueur commence avec 3 points de vie et 2 cartes. Jouez des cartes Attack, Heal, Jail et Inspect pour surpasser vos adversaires. L'équipe qui élimine tous les membres de l'équipe adverse remporte la victoire.

---

## Caractéristiques principales

- **Jusqu'à 12 joueurs** : Humains et bots IA compatibles dans le même jeu
- **Bots IA intégrés** : Supportez Claude, GPT et DeepSeek comme adversaires
- **9 langues** : Coréen, Anglais, Chinois, Japonais, Espagnol, Portugais, Français, Russe, Allemand
- **Système de relecture** : Rejouez tous les coups et enregistrez vos parties préférées
- **Authentification sociale** : Connexion Google OAuth + JWT
- **Application Web Progressive (PWA)** : Installez sur votre appareil comme une application native
- **Synchronisation en temps réel** : SSE avec Redis Pub/Sub pour des mises à jour instantanées
- **Classement et statistiques** : Suivez votre progression et vos victoires

---

## Règles du jeu

### Composition des équipes

| Joueurs | Espions | Agents | Notes              |
| ------- | ------- | ------ | ------------------ |
| 5       | 1       | 4      | Désavantage Espion |
| 6       | 2       | 4      |                    |
| 7       | 2       | 5      |                    |
| 8       | 3       | 5      |                    |
| 9       | 3       | 6      | Recommandé         |
| 10      | 3       | 7      |                    |
| 11      | 4       | 7      |                    |
| 12      | 4       | 8      |                    |

### Types de cartes

| Carte       | Effet                                            | Limite de possession |
| ----------- | ------------------------------------------------ | -------------------- |
| **Attack**  | Inflige 1 dégât à la cible                       | 6 cartes max         |
| **Heal**    | Restaure 1 PV à la cible (ne dépasse pas le max) | 2 cartes max         |
| **Jail**    | Neutralise l'attaque de la cible pendant 1 tour  | 1 carte max          |
| **Inspect** | Révèle le rôle secret de la cible                | Illimité             |

### Conditions de victoire

- **Agents gagnent** : Tous les Espions sont éliminés
- **Espions gagnent** : Tous les Agents (non-Espions) sont éliminés
- **Égalité** : Le nombre de tours dépasse Nombre_de_joueurs × 3

### Progression du jeu

1. **Phase de pioche** : Piochez 2 cartes
2. **Phase d'action** : Jouez au moins 1 carte Attack (sauf si neutralisé)
3. **Fin du tour** : Les effets des cartes sont appliqués

---

## Stack technologique

### Frontend

| Composant               | Technologie                |
| ----------------------- | -------------------------- |
| Framework               | Astro 5.0                  |
| Langage                 | TypeScript 5.0             |
| Styles                  | Tailwind CSS 3.4           |
| Gestionnaire de paquets | Bun                        |
| i18n                    | Paraglide (inlang)         |
| Serveur web             | Nginx (fichiers statiques) |

### Backend

| Composant        | Technologie            |
| ---------------- | ---------------------- |
| Langage          | Go 1.25                |
| Framework web    | Fiber v2               |
| Base de données  | PostgreSQL 17          |
| Cache/Pub-Sub    | Redis 7                |
| Authentification | JWT + Google OAuth 2.0 |
| ORM              | GORM                   |

### Infrastructure

| Composant                | Technologie              |
| ------------------------ | ------------------------ |
| Conteneurisation         | Docker Compose           |
| Reverse Proxy            | Nginx                    |
| SSL/TLS                  | Let's Encrypt + Certbot  |
| Outils de build          | Makefile                 |
| Communication temps réel | SSE (Server-Sent Events) |

---

## Démarrage rapide

### Prérequis

- Docker et Docker Compose
- Make (optionnel, mais recommandé)
- (Développement) Node.js 18+, Bun, Go 1.25+, PostgreSQL, Redis

### Environnement de développement

1. **Clonez le dépôt**

```bash
git clone https://github.com/epsilondelta/shot.git
cd shot
```

2. **Configurez les variables d'environnement**

```bash
cp .env.example .env
```

Modifiez `.env` selon vos besoins (JWT_SECRET, Google OAuth, URL, etc.).

3. **Démarrez les services**

```bash
docker-compose up -d
```

Cela lance :

- PostgreSQL sur le port 5432
- Redis sur le port 6379
- Backend Go sur le port 3000
- Frontend Astro sur le port 80

4. **Accédez à l'application**

- Frontend : http://localhost
- API Backend : http://localhost/api

5. **Arrêtez les services**

```bash
docker-compose down
```

### Production avec HTTPS

Pour déployer en production avec un domaine personnalisé et SSL automatique :

1. **Configurez les variables d'environnement**

```bash
cp .env.example .env
# Modifiez .env pour production
DOMAIN=votre-domaine.com
CERTBOT_EMAIL=admin@votre-domaine.com
```

2. **Initialisez les certificats Let's Encrypt**

```bash
./init-letsencrypt.sh
```

3. **Démarrez avec la configuration production**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

4. **Le certificat SSL se renouvellera automatiquement**

---

## Variables d'environnement

### Base de données

```env
DB_USER=shot              # Utilisateur PostgreSQL
DB_PASSWORD=shot          # Mot de passe PostgreSQL
DB_NAME=shot              # Nom de la base de données
```

### Authentification

```env
JWT_SECRET=<clé_secrète>  # Clé pour signer les JWT (générer avec: openssl rand -hex 32)
GOOGLE_CLIENT_ID=         # (Optionnel) ID client Google OAuth
GOOGLE_CLIENT_SECRET=     # (Optionnel) Secret client Google OAuth
```

### URLs

```env
FRONTEND_URL=http://localhost        # URL publique du frontend
BACKEND_URL=http://localhost         # URL publique du backend
PUBLIC_API_URL=                       # (Optionnel) URL de l'API (laissez vide pour chemins relatifs)
```

### Production

```env
DOMAIN=votre-domaine.com             # Nom de domaine pour le certificat SSL
CERTBOT_EMAIL=admin@votre-domaine.com # Email pour les notifications Let's Encrypt
STAGING=0                             # 0 pour production, 1 pour tests (staging)
```

---

## Architecture générale

```
Internet
  │
  ▼
[Nginx] ← Terminaison SSL, Rate Limiting, Headers de sécurité
  ├─ HTTPS :443 → Frontend (Astro)
  └─ HTTPS :443/api → Backend (Go/Fiber)
      │
      ├─ PostgreSQL (Données de jeu)
      ├─ Redis (Cache, Pub/Sub temps réel)
      └─ Bots IA (Claude, GPT, DeepSeek via API)
```

### Communication en temps réel

- **Frontend vers Backend** : Requêtes HTTP + SSE (Server-Sent Events)
- **Backend** : Redis Pub/Sub pour la diffusion des événements de jeu
- **Bots externes** : RESTful API + SSE pour rejoindre et participer aux jeux

---

## Système de bots IA

SHOT! supporte l'intégration de bots IA via une API RESTful. Les bots peuvent :

- Se connecter et rejoindre des parties
- Recevoir les mises à jour d'état en temps réel via SSE
- Jouer des cartes et interagir avec le jeu
- Être développés dans n'importe quel langage de programmation

**Fournisseurs supportés :**

- Claude (Anthropic)
- GPT (OpenAI)
- DeepSeek

---

## Système de relecture

Toutes les actions du jeu sont enregistrées et peuvent être rejouées :

- **Rejouez les parties** : Revoyez chaque coup étape par étape
- **Marquez comme favori** : Sauvegardez vos parties préférées
- **Aimez les parties** : Notez les parties intéressantes
- **Historique complet** : Accédez à toutes les parties joués

---

## Authentification et autorisation

- **Google OAuth 2.0** : Connectez-vous avec votre compte Google
- **JWT (JSON Web Tokens)** : Authentification sans état pour l'API
- **Sessions persistantes** : Restez connecté entre les sessions

---

## Support multilingue (i18n)

SHOT! supporte 9 langues :

- Coréen (한국어)
- Anglais (English)
- Chinois simplifié (简体中文)
- Japonais (日本語)
- Espagnol (Español)
- Portugais brésilien (Português)
- Français (Français)
- Russe (Русский)
- Allemand (Deutsch)

Les sélecteurs de langue sont disponibles dans l'interface utilisateur pour changer de langue à tout moment.

---

## Développement

### Structure du projet

```
shot/
├── frontend/          # Application Astro (TypeScript, Tailwind)
├── backend/           # Serveur Go (Fiber, GORM)
├── docs/              # Documentation et specifications
├── e2e/               # Tests end-to-end
├── docker-compose.yml # Configuration développement
└── Makefile           # Commandes de build et déploiement
```

### Commandes de build

```bash
# Build et démarrer tout
make up

# Arrêter tous les services
make down

# Voir les logs
make logs

# Reconstruire les images
make rebuild
```

### Exécuter les tests

```bash
# Backend Go
cd backend
go test -race ./...

# Frontend (Astro)
cd frontend
bun test
```

---

## Licence

SHOT! est publié sous la licence MIT. Voir le fichier [LICENSE](./LICENSE) pour plus de détails.

---

## Contribuer

Les contributions sont bienvenues ! Pour signaler des bugs ou proposer des améliorations :

1. Ouvrez une issue sur GitHub
2. Créez une branche pour votre correction ou fonctionnalité
3. Soumettez une pull request

Veuillez suivre les conventions de code existantes et inclure des tests pour les nouvelles fonctionnalités.

---

## Liens utiles

- **Site officiel** : https://shot.game/
- **Code source** : https://github.com/epsilondelta/shot
- **Règles du jeu** : Voir [rulebook.md](./docs/rulebook.md)
- **Spécifications techniques** : Voir [SPEC.md](./docs/SPEC.md)

---

## Support

Avez-vous des questions ou besoin d'aide ? :

- Consultez la [documentation complète](./docs/SPEC.md)
- Lire les [règles du jeu détaillées](./docs/rulebook.md)
- Ouvrir une issue sur GitHub
- Nous contacter via le site officiel

---

**Version** : 0.0.2-alpha
**Dernière mise à jour** : 21 mars 2026
