# Xiandan Kanban

A modern, lightweight web-based Kanban board management application built with React, TypeScript, Tailwind CSS, and Zustand.

## Features

### Core Features
- **User Authentication** - Independent client session management and user switching
- **Collaborative Workspaces** - Multi-user shared workspaces with dynamic capacity (2 to 50 members)
- **Shareable Invitation Links** - 16-byte cryptographically secure invitation tokens with 7-day expiration and LAN IP auto-formatting
- **Multi-Board Management** - Create and manage personal and collaborative Kanban boards
- **Flexible Task Management** - Create, edit, and organize tasks across customizable columns
- **Drag & Drop** - Intuitive drag-and-drop interface powered by `@dnd-kit`
- **Real-Time Synchronization** - Multi-tab synchronization via `BroadcastChannel` and local network sync via Server-Sent Events (SSE)
- **Document & File Sharing** - Upload, preview, and download shared workspace documents
- **Activity Feed & Audit Log** - Complete activity history for all workspace actions
- **Task Deadlines & Priorities** - Priority levels (Low, Medium, High, Urgent), due date tracking, and overdue indicators
- **Statistics Dashboard** - Visual insights into task completion and priority distribution with Recharts

### User Experience
- Modern, responsive UI built with Tailwind CSS and Radix UI primitives
- Clean, intuitive interface with zero external service requirements
- Mobile-friendly design

## Tech Stack

### Frontend
- **React 18** - UI library with modern concurrent rendering
- **TypeScript 5.6** - Type-safe code across the application
- **Vite 6** - Lightning-fast build tool and development server
- **Tailwind CSS** - Utility-first styling framework
- **@dnd-kit** - Accessible drag-and-drop toolkit
- **Zustand** - Lightweight state management stores
- **React Router v6** - Client-side SPA routing
- **Recharts** - Data visualization charts
- **Lucide React** - Icon library

### Data & Real-Time Sync
- **Local Storage Engine** - High-performance structured client-side data layer (`src/lib/storage.ts`)
- **BroadcastChannel API** - Multi-tab real-time communication
- **Vite Sync Plugin** - Embedded SSE server middleware (`/api/sync`, `/api/events`, `/api/network-ip`) persisting to `.data/db.json`

## Getting Started

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **npm** or **pnpm**

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd kanban-task-manage

# Install dependencies
npm --prefix Task-manager-app install

# Start development server
npm run dev
```

The application will be available at:
- **Local**: `http://localhost:5173/`
- **Network**: `http://<your-lan-ip>:5173/`

### Running Tests

```bash
# Run unit and component test suite
npm run test:run

# Build production bundle
npm run build
```

## License

MIT License.
