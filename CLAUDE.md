# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Xiandan Kanban is a modern web-based Kanban task management application built with React, TypeScript, Tailwind CSS, and Zustand. The application features collaborative workspaces, task organization, drag-and-drop interactions, deadline tracking, and local real-time synchronization.

**Working Directory**: The main application is located in `Task-manager-app/`

## Development Commands

All commands should be run from the `Task-manager-app/` directory (or via root package.json npm scripts):

```bash
# From repository root:
npm run dev
npm run build
npm run test:run

# Or from Task-manager-app/:
cd Task-manager-app
npm run dev
npm run build
npm run test:run
npm run lint
```

## Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript 5.6
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS with Radix UI primitives and Lucide icons
- **State Management**: Zustand stores (`authStore`, `boardStore`, `taskStore`, `workspaceStore`)
- **Drag & Drop**: `@dnd-kit/core` & `@dnd-kit/sortable`
- **Charts**: Recharts for dashboard analytics
- **Routing**: React Router v6

### Data & Synchronization Layer
- **Local Storage Engine**: `src/lib/storage.ts` provides complete CRUD operations and relational data modeling.
- **Real-Time Synchronization**: `src/lib/realtime.ts` (BroadcastChannel) and `src/lib/serverSync.ts` (Vite SSE server plugin).
- **Network Sync**: `vite.config.ts` includes an embedded synchronization server plugin (`/api/sync`, `/api/events`, `/api/network-ip`) persisting to `.data/db.json`.

## Architecture

### Frontend Structure

```
src/
├── components/
│   ├── Auth/          # LoginPage, RegisterPage
│   ├── Board/         # BoardView, TaskCard, Column, CreateTaskModal, TaskDetailModal, TaskAttachments
│   ├── Dashboard/     # Dashboard, CreateBoardModal, StatsPanel
│   └── Workspace/     # WorkspaceView, InviteMemberModal, JoinWorkspacePage, SharedDocuments, DeadlinesPanel, ActivityFeed
├── stores/            # Zustand stores
│   ├── authStore.ts   # User authentication state
│   ├── boardStore.ts  # Boards and columns CRUD + realtime
│   ├── taskStore.ts   # Tasks CRUD + realtime
│   └── workspaceStore.ts # Workspaces, members, documents, activities
├── lib/
│   ├── storage.ts     # In-memory and localStorage CRUD operations
│   ├── realtime.ts    # BroadcastChannel & event dispatcher
│   ├── serverSync.ts  # Client sync engine
│   └── types.ts       # Domain TypeScript interfaces
└── hooks/             # Custom React hooks
```

### State Management Pattern

**Zustand Stores** handle application state:
1. **authStore**: User session, profile, and registration
2. **boardStore**: Boards and columns management
3. **taskStore**: Tasks CRUD and task detail modals
4. **workspaceStore**: Collaborative workspaces, member invitations, documents, and activity logging
