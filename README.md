# Forgot My Secret Santa

A Node.js + Express web app that helps a Secret Santa organizer recover their own assignment after everyone else submits theirs.


## What it does

- Lets organizers create and manage Secret Santa groups
- Generates a shareable signup link for participants
- Allows each participant to choose their own giftee (with self-selection blocked)
- Automatically infers the organizer's missing assignment once all participants submit
- Protects member names at rest using AES-256-GCM encryption

## Tech stack

- Node.js
- Express
- EJS templates
- MongoDB + Mongoose
- express-session + connect-mongo
- bcrypt (password hashing)

## Getting started

### 1) Install dependencies

```bash
npm install
```

### 2) Create `.env`

Create a `.env` file in the project root:

```env
MONGO_URI=mongodb://localhost:27017/forgot-my-secret-santa
SESSION_SECRET=replace-with-a-strong-random-secret
ENCRYPTION_KEY=64-char-hex-string-32-bytes
PORT=8080
```

> `ENCRYPTION_KEY` must be exactly 64 hex characters.

### 3) Run the app

```bash
npm start
```

The server starts at `http://localhost:8080` unless `PORT` is set.

## App flow

1. Register or log in.
2. Create a group and add your own display name as the owner.
3. Share the generated signup link with participants.
4. Participants submit who they are and who they are buying for.
5. When all non-owner participants submit, the app auto-completes the last missing assignment for the owner and marks the group as completed.

## Project structure

```text
server.js                # App bootstrap, middleware, session config
server/database/         # MongoDB connection
server/model/            # Mongoose models (User, Group, Member)
server/routes/router.js  # Route handlers and core app logic
views/                   # EJS templates
assets/                  # Static CSS/assets
```
