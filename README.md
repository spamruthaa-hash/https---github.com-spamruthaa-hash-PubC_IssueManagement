# Issue Management - Publisher Central

A comprehensive web application for managing journal issues throughout their publication lifecycle.

## Phase 1: Login Screen ✅

The login screen has been successfully implemented with:

- **Email field**: Enter email address
- **Password field**: With toggle visibility (eye icon)
- **Form validation**: Validation on submit click
- **Authentication**: Mock authentication with credentials:
  - Email: `johndoe@publisher.com`
  - Password: `admin`
- **Smooth animations**: 
  - Card slide-in animation on load
  - Error shake animation
  - Button hover effects
  - Password toggle transitions
- **Loading state**: Spinner and disabled button during authentication
- **Login button**: Always active, validation occurs on submit

## Phase 2: Header Implementation ✅

The header has been successfully implemented with:

- **Left Section**:
  - Menu collapse/expand button (hamburger icon)
  - Publisher Central logo (icon + text)
- **Right Section**:
  - Publisher icon
  - User avatar with initials (JD)
  - Dropdown menu with user info and logout
- **Features**:
  - Sticky header positioning
  - Smooth animations
  - Click outside to close dropdown
  - Responsive design
  - Clean shadow border at bottom

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173/`

### Build for Production

```bash
npm run build
```

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Date Handling**: date-fns

## Project Structure

```
src/
├── pages/
│   ├── Login.tsx         # Login screen component
│   ├── Login.css         # Login styles
│   └── Dashboard.tsx     # Placeholder dashboard
├── types/
│   └── index.ts          # TypeScript type definitions
├── App.tsx               # Main app with routing
├── main.tsx              # Entry point
└── index.css             # Global styles
```

## Next Steps

- Phase 2 (In Progress): Complete left sidebar navigation
- Phase 3: Implement Issue Creation workflow
- Phase 4: Build Issue In-Progress table
- Phase 5: Create Issue Details Page
- Phase 6: Add My Tasks page
- Phase 7: Complete Issue History and final polish

## Design System

The project uses components from a local Storybook instance running at `http://localhost:6009/`

## Figma Design

Design reference: [Issue Management Figma](https://www.figma.com/design/TE4e19cyWj1mFvJ7Ew28ic/%3C-Issue-Management-PubC%3E?node-id=304-82732&t=oj0bIS8UwkkkWQNa-4)