# Collaborative Team Hub

A full-stack collaborative workspace platform built for the FredoCloud technical assessment.

Live Frontend: https://web-production-ef8eb.up.railway.app  
API Health Check: https://api-production-e292.up.railway.app/health

## Demo Account

Email: demo@fredocloud.app  
Password: Demo@123456

The demo account includes a sample workspace with goals, milestones, announcements, action items, analytics, and audit log data.

## Tech Stack

### Monorepo
- Turborepo
- pnpm workspaces

### Frontend
- Next.js App Router
- JavaScript
- Tailwind CSS
- Zustand
- Axios
- Socket.io Client
- Recharts

### Backend
- Node.js
- Express.js
- PostgreSQL
- Prisma ORM
- JWT access and refresh tokens
- httpOnly cookies
- Socket.io
- Cloudinary
- Multer

### Deployment
- Railway frontend service
- Railway backend service
- Railway PostgreSQL database
- Cloudinary for media uploads

## Features

### Authentication
- Email/password registration and login
- Protected dashboard route
- Logout
- Token refresh with httpOnly cookies
- User avatar upload through Cloudinary

### Workspaces
- Create and switch between multiple workspaces
- Workspace name, description, and accent colour
- Invite members by email
- Assign Owner, Admin, and Member roles

### Goals and Milestones
- Create goals with title, owner, due date, and status
- Add nested milestones under goals
- Track milestone progress percentage
- Post progress updates to a goal activity feed

### Announcements
- Admins and owners can publish workspace-wide announcements
- Rich-text-style multiline announcement content
- Pin important announcements
- Emoji reactions
- Comments
- @mention teammates in comments

### Action Items
- Create action items with assignee, priority, due date, and status
- Link action items to a parent goal
- Kanban board view
- List view toggle
- Attachment upload

### Real-time Features
- Socket.io live updates for workspace activity
- Online member presence
- Live updates for goals, milestones, announcements, comments, reactions, action item status changes, and audit logs

### Notifications
- In-app notifications
- @mention notifications
- Mark all notifications as read

### Analytics
- Total goals
- Items completed this week
- Overdue count
- Goal completion chart using Recharts
- Export workspace data as CSV

## Advanced Features Chosen

### 1. Advanced RBAC

The app includes role-based access control for Owner, Admin, and Member roles.

Examples:
- Owners can manage workspace settings, invite members, remove members, and change roles.
- Admins can manage workspace content and invite/remove members.
- Members can create and update goals and action items but cannot manage workspace settings or publish announcements.

### 2. Audit Log

The app includes an immutable audit log for workspace changes.

Tracked actions include:
- Workspace creation and updates
- Member invites
- Role changes
- Goal creation and updates
- Announcement creation and updates
- Action item creation and status changes

The audit log can be filtered and exported as CSV.

## Environment Variables

### Backend

```env
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLIENT_URL=https://your-web-service.up.railway.app