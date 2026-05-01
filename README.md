# Collaborative Team Hub

A full-stack team collaboration platform built for the FredoCloud intern assignment.

Users can create teams, manage shared goals, post announcements, track action items, upload avatars and attachments, and receive real-time updates through Socket.io.

## Tech Stack

### Monorepo
- Turborepo
- pnpm workspace

### Frontend
- Next.js App Router
- JavaScript
- Tailwind CSS
- Zustand
- Axios
- Socket.io Client

### Backend
- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- JWT authentication
- httpOnly cookies
- Socket.io
- Cloudinary
- Multer

### Deployment
- Railway
- Frontend and backend deployed as separate services

## Features

- User registration and login
- JWT access and refresh tokens in httpOnly cookies
- Protected routes
- Team creation and member listing
- Shared goals
- Team announcements
- Action items with assignee, due date, and status
- Avatar upload with Cloudinary
- Announcement and action item attachments
- Real-time team updates with Socket.io
- PostgreSQL database with Prisma migrations

## Project Structure

```txt
collaborative-team-hub/
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   └── src/
│   └── web/
│       └── src/
├── packages/
├── pnpm-workspace.yaml
├── turbo.json
└── package.json

Local Setup
1. Clone the repository
git clone https://github.com/masudrana430/FredoCloud.git
cd FredoCloud
2. Install dependencies
pnpm install
3. Configure backend environment

Copy:

apps/api/.env.example

to:

apps/api/.env

Then add real values for:

DATABASE_URL
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
4. Configure frontend environment

Copy:

apps/web/.env.example

to:

apps/web/.env.local
5. Run Prisma migrations
cd apps/api
pnpm prisma migrate dev
pnpm prisma generate
6. Run the project

From the root:

pnpm dev

Frontend:

http://localhost:3000

Backend health check:

http://localhost:5000/health
API Routes
Auth
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
PATCH /api/auth/avatar
Teams
POST   /api/teams
GET    /api/teams
GET    /api/teams/:teamId
POST   /api/teams/:teamId/members
DELETE /api/teams/:teamId/members/:userId
Goals
POST   /api/goals
GET    /api/goals/team/:teamId
PATCH  /api/goals/:goalId
DELETE /api/goals/:goalId
Announcements
POST   /api/announcements
GET    /api/announcements/team/:teamId
PATCH  /api/announcements/:announcementId
DELETE /api/announcements/:announcementId
Action Items
POST   /api/action-items
GET    /api/action-items/team/:teamId
PATCH  /api/action-items/:itemId
DELETE /api/action-items/:itemId
Deployment Notes

The project is deployed on Railway as two separate services:

apps/api  -> backend service
apps/web  -> frontend service

The backend uses Railway PostgreSQL and Cloudinary.

For production database migrations, use:

pnpm prisma migrate deploy
Git Convention

This project uses conventional commit messages, for example:

feat(api): add authentication endpoints
feat(api): add team endpoints
feat(api): add cloudinary file uploads
feat(web): add team workspace interactions
docs: add project setup instructions

Then commit:

```powershell
git add README.md apps/api/.env.example apps/web/.env.example .gitignore
git commit -m "docs: add setup and deployment instructions"
git push