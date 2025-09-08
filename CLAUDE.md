# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `pnpm run dev` - Start development server with hot reload
- `pnpm run build` - Build for production (includes TypeScript compilation)
- `pnpm run preview` - Preview production build locally

### Code Quality
- `pnpm run lint` - Run ESLint for code analysis
- `pnpm run format` - Format code with Prettier
- `pnpm run format:check` - Check code formatting without modifying files

### Utilities
- `pnpm run knip` - Analyze unused dependencies and exports

## Architecture Overview

This is a React admin dashboard built with modern tooling and feature-based architecture:

### Core Stack
- **Frontend**: React 19 with TypeScript
- **Build Tool**: Vite with SWC for fast compilation
- **Routing**: TanStack Router with file-based routing and type safety
- **UI Framework**: Shadcn/ui components (RadixUI + TailwindCSS)
- **State Management**: Zustand for client state, TanStack Query for server state
- **Authentication**: Clerk (partial implementation)
- **Styling**: TailwindCSS v4 with custom component system

### Project Structure

#### Features-Based Organization
- `src/features/` - Feature modules organized by domain:
  - `auth/` - Authentication components and logic
  - `dashboard/` - Dashboard views and widgets
  - `users/`, `tasks/`, `chats/`, `apps/` - Domain-specific features
  - `settings/` - Application configuration and preferences
  - `errors/` - Error boundary components and error pages

#### Route Structure
- File-based routing with TanStack Router
- `src/routes/(auth)/` - Authentication routes (sign-in, sign-up)
- `src/routes/(errors)/` - Error pages (404, 500, etc.)
- `src/routes/_authenticated/` - Protected routes requiring authentication
- `src/routes/clerk/` - Clerk-specific authentication flows

#### Core Directories
- `src/components/` - Reusable UI components
  - `ui/` - Shadcn/ui components (some customized for RTL support)
  - `layout/` - Layout components (sidebar, header, etc.)
  - `data-table/` - Reusable data table components
- `src/stores/` - Zustand stores for global state
- `src/lib/` - Utility functions and configurations
- `src/hooks/` - Custom React hooks
- `src/context/` - React context providers (theme, direction, font)

### Key Architectural Patterns

#### State Management
- **Server State**: TanStack Query handles all server-side data with caching, error handling, and retry logic
- **Client State**: Zustand stores for authentication state and UI preferences
- **Query Client**: Configured with global error handling for 401/403/500 responses

#### Error Handling
- Global error boundaries for React errors
- Axios interceptors for HTTP error handling
- Automatic redirection on authentication failures
- Toast notifications for user feedback

#### Type Safety
- Strict TypeScript configuration with path aliases (`@/*` → `src/*`)
- Type-only imports enforced via ESLint
- TanStack Router provides end-to-end type safety for routes

#### Theming & Internationalization
- Multi-theme support (light/dark mode)
- RTL language support with customized components
- Font customization through context providers

## Development Guidelines

### Component Guidelines
- UI components in `src/components/ui/` are Shadcn/ui based
- Some components have been customized for RTL support - avoid overwriting with CLI
- Use the established import order defined in `.prettierrc`
- Follow the feature-based organization for new functionality

### Code Quality Standards
- ESLint enforces no-console errors and unused variable detection
- Prettier handles code formatting with specific import ordering
- TypeScript strict mode with consistent type imports

### Testing & Building
- Always run `pnpm run lint` before committing
- Use `pnpm run format` to ensure consistent code style
- Production builds require both TypeScript compilation and Vite bundling

### Authentication Flow
- Custom JWT-based authentication with YBook API
- Auth state managed through Zustand store (`src/stores/auth-store.ts`) with persistent storage
- Protected routes automatically redirect to sign-in on 401 responses
- Session management integrated with TanStack Query error handling
- User information fetched from `/api/auth/profile` endpoint and stored persistently
- **AuthInitializer component is integrated in main.tsx** and handles authentication state restoration on app startup

### Authentication Components
- **Auth Store**: `src/stores/auth-store.ts` - Manages authentication state with cookie persistence
- **Auth API**: `src/features/auth/api.ts` - API service functions for authentication
- **AuthInitializer**: `src/components/auth-initializer.tsx` - **Already integrated in main.tsx** - Initializes auth state on app startup

## API Documentation

### Base Configuration
- **Base URL**: `http://localhost:8080`
- **Authentication**: Bearer JWT token in Authorization header
- **API Version**: v1

### Authentication Endpoints

#### User Registration
- **Endpoint**: `POST /api/auth/register`
- **Description**: Create new user account
- **Request Body**:
  ```typescript
  interface UserCreateDTO {
    username: string; // 2-50 characters
    email: string; // valid email format, max 100 characters
    password: string; // 6-20 characters
    avatar?: string; // optional, max 255 characters
    gender?: string; // optional, "0" (unknown), "1" (male), "2" (female)
    phone?: string; // optional, max 20 characters
  }
  ```
- **Success Response (200)**:
  ```typescript
  interface ApiResult {
    code: 0;
    message: "OK";
    data: {
      id: number;
      username: string;
      email: string;
      status: string;
    };
    timestamp: number;
  }
  ```
- **Error Response (422)**: Validation error

#### User Login
- **Endpoint**: `POST /api/auth/login`
- **Description**: Authenticate user and receive JWT token
- **Request Body**:
  ```typescript
  interface LoginRequestDTO {
    username: string; // username (not email)
    password: string;
  }
  ```
- **Success Response (200)**:
  ```typescript
  interface ApiResult {
    code: 0;
    message: "OK";
    data: {
      token: string; // JWT token for authentication
    };
    timestamp: number;
  }
  ```
- **Error Response (400)**: Invalid username or password

#### Change Password
- **Endpoint**: `POST /api/auth/change-password`
- **Description**: Change current user's password (requires authentication)
- **Headers**: `Authorization: Bearer {token}`
- **Request Body**:
  ```typescript
  interface ChangePasswordRequestDTO {
    oldPassword: string;
    newPassword: string;
  }
  ```
- **Success Response (200)**: Standard API success response
- **Error Responses**:
  - 400: Incorrect old password
  - 401: Unauthorized/invalid token

#### Get User Profile
- **Endpoint**: `GET /api/auth/profile`
- **Description**: Get current logged-in user's profile information (requires authentication)
- **Headers**: `Authorization: Bearer {token}`
- **Success Response (200)**:
  ```typescript
  interface ApiResult {
    code: 0;
    message: "OK";
    data: {
      id: number;
      username: string;
      email: string;
      avatar?: string;
      gender?: string;
      phone?: string;
      status: string;
      createTime: string;
      updateTime: string;
    };
    timestamp: number;
  }
  ```
- **Error Response (401)**: Unauthorized/invalid token

### Error Response Format
All API endpoints return errors in this format:
```typescript
interface ApiError {
  code: number; // Error code (40000, 40100, 42200, etc.)
  message: string; // Error description
  timestamp: number; // Unix timestamp in milliseconds
}
```

### Common Status Codes
- **401**: Unauthorized - token invalid or expired
- **403**: Forbidden - insufficient permissions
- **422**: Validation failed - request parameters invalid
- **400**: Bad request - general client error
- **500**: Internal server error