# TaskFlow - Smart Todo Management Application

## Overview

TaskFlow is a modern web application for task management and collaboration built with a full-stack architecture. The application enables users to create, manage, and share tasks with team members, featuring real-time collaboration capabilities and comprehensive task organization features.

The system uses a monorepo structure with separate client and server directories, shared schema definitions, and a PostgreSQL database with Drizzle ORM for data persistence.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Firebase Authentication for user management
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Authentication**: Firebase Authentication integration
- **API Design**: RESTful API with structured error handling

### Project Structure
```
├── client/          # Frontend React application
├── server/          # Backend Express.js server
├── shared/          # Shared TypeScript definitions and schemas
├── migrations/      # Database migration files
└── dist/           # Production build output
```

## Key Components

### Database Schema
The application uses a normalized relational database with the following core entities:

- **Users**: Store user authentication and profile information
- **Tasks**: Main task entities with status, priority, and assignment
- **Task Shares**: Many-to-many relationship for task collaboration
- **Teams**: Organization units for task grouping
- **Team Members**: User membership in teams with role-based access

### Authentication System
- Firebase Authentication handles user authentication with Google OAuth
- Server-side validation of Firebase tokens
- User session management with automatic user creation/updates
- Secure API endpoints protected by authentication middleware

### Task Management Features
- Create, read, update, and delete tasks
- Task status tracking (todo, in-progress, completed)
- Priority levels (low, medium, high)
- Due date management
- Task sharing with permission levels (view, edit, admin)
- Team-based task organization
- Search and filtering capabilities

### Real-time Collaboration
- Task sharing between users
- Permission-based access control
- Team-based task visibility
- Activity tracking and notifications

## Data Flow

### Client-Server Communication
1. Client makes authenticated API requests using Firebase tokens
2. Server validates tokens and extracts user information
3. Database operations are performed through Drizzle ORM
4. Responses are formatted and returned to the client
5. Client updates UI using TanStack Query's caching and synchronization

### Authentication Flow
1. User initiates Google OAuth through Firebase
2. Firebase handles authentication and returns user tokens
3. Client sends token to server for user creation/validation
4. Server creates or updates user records in PostgreSQL
5. Subsequent API calls include authentication headers

### Task Operations
1. User actions trigger API calls with proper authentication
2. Server validates permissions and processes requests
3. Database operations are executed with transaction safety
4. Client state is updated and UI reflects changes
5. Optimistic updates provide immediate feedback

## External Dependencies

### Core Dependencies
- **Firebase**: Authentication and user management
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database operations
- **TanStack Query**: Server state management
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first styling framework

### Development Dependencies
- **Vite**: Development server and build tool
- **TypeScript**: Type safety and development experience
- **ESBuild**: Fast JavaScript bundling
- **Replit Integration**: Development environment support

## Deployment Strategy

### Build Process
- Frontend: Vite builds optimized React application to `dist/public`
- Backend: ESBuild bundles server code to `dist/index.js`
- Database: Drizzle generates and applies migrations

### Environment Configuration
- Firebase configuration through environment variables
- Database connection via `DATABASE_URL` environment variable
- Development vs production environment detection

### Production Deployment
- Single-command build process (`npm run build`)
- Optimized bundle sizes with tree-shaking
- Static asset optimization and caching
- Environment-specific configuration management

The application is designed for deployment on platforms like Replit, Vercel, Railway, or similar services that support Node.js applications with PostgreSQL databases.

## Changelog

```
Changelog:
- July 01, 2025. Initial setup
```

## User Preferences

Preferred communication style: Simple, everyday language.