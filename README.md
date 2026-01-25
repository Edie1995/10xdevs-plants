# Greenie

![License](https://img.shields.io/badge/license-MIT-green.svg)

## Project name

Greenie

## Project description

Greenie is a responsive, login-only web utility for private management of home and garden plant care. Users create their own plant database from scratch, store care instructions, log actions, and receive information about upcoming watering and fertilizing dates based on actual activity.

## Table of contents

- [Project name](#project-name)
- [Project description](#project-description)
- [Tech stack](#tech-stack)
- [Getting started locally](#getting-started-locally)
- [Available scripts](#available-scripts)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

## Tech stack

Frontend
- [Astro](https://astro.build/) 5
- [React](https://react.dev/) 19
- [TypeScript](https://www.typescriptlang.org/) 5
- [Tailwind CSS](https://tailwindcss.com/) 4
- [shadcn/ui](https://ui.shadcn.com/)

Backend
- [Supabase](https://supabase.com/) (PostgreSQL + Auth + SDK)

CI/CD and hosting
- GitHub Actions
- DigitalOcean (Docker-based deployment)

Tooling
- ESLint
- Prettier
- Husky + lint-staged

## Getting started locally

Prerequisites
- Node.js `22.14.0` (from `.nvmrc`)
- npm

Setup
```bash
git clone <repo-url>
cd 10xdevs-plants
nvm use
npm install
```

Run the dev server
```bash
npm run dev
```

Build for production
```bash
npm run build
```

Preview the production build
```bash
npm run preview
```

## Available scripts

- `npm run dev` - Start Astro dev server
- `npm run build` - Build the production bundle
- `npm run preview` - Preview the production build locally
- `npm run astro` - Run Astro CLI
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format files with Prettier

## Project scope

Core functionality
- Authentication: email/password, Google login, password recovery, profile updates
- Plant cards (CRUD) with structured care instructions and disease entries
- Seasonal watering and fertilizing schedules with backdating and recalculation
- Dashboard with urgency grouping, status colors, sorting, search, and pagination
- UX essentials: empty states, success/error toasts, delete confirmations, mobile card menu, legal footer

Out of scope for MVP
- Social features or shared content
- Guest mode or access without login
- Public knowledge base or external note editing
- Push/email notifications for care actions
- Mobile app
- Photo uploads or advanced media
- Seeded plant lists or starter content

Additional documentation
- `./.ai/prd.md`
- `./.ai/tech-stack.md`

## Project status

MVP scope defined in the PRD and ready for implementation.

## License

MIT
