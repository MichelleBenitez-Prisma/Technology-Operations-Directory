# Repository Guidelines

## Project Structure & Module Organization

This repository contains the Technology Operations Directory, an internal React, Express, TypeScript, and SQLite application.

- `src/`: Express API source, including routes, database repositories, middleware, validation, and server startup.
- `client/src/`: React dashboard UI, API client helpers, shared types, and CSS.
- `database/`: SQLite schema, seed data, and numbered migrations in `database/migrations/`.
- `scripts/`: database initialization and migration scripts.
- `test/`: Node test files for API behavior.
- `docs/`: requirements, API notes, task lists, diagrams, and phase documentation.
- `data/`, `dist/`, `logs/`, and `node_modules/` are local/generated and should not be committed.

## Build, Test, and Development Commands

- `npm run db:init`: create and seed the local SQLite database.
- `npm run db:migrate`: apply pending migrations.
- `npm run dev:api`: run the Express API in watch mode.
- `npm run dev:client`: run the Vite React client at `127.0.0.1:5173`.
- `npm run build`: type-check API/client code and build the production client.
- `npm start`: run the built Express server from `dist/server.js`.
- `npm test`: run API tests with Node’s test runner.
- `npm run lint:api`: lint API, scripts, and tests.

## Coding Style & Naming Conventions

Use TypeScript ES modules. Prefer small route handlers backed by repository helpers in `src/db/`. Keep validation in `src/validation/` with Zod. Use camelCase for TypeScript variables and request fields, and snake_case only for database columns and API rows returned from SQLite views.

Prettier is configured for API, tests, and scripts. Run `npm run format:api` before committing backend changes. Client CSS and React code should follow the existing compact style in `client/src/`.

## Testing Guidelines

Tests use `node:test`, `assert`, and `tsx`. Place focused API tests in `test/*.test.ts`. Tests should create temporary databases and avoid relying on local `data/` files. Run `npm test` after API, validation, repository, or schema changes.

## Commit & Pull Request Guidelines

Recent commits use short, plain-English messages, for example `Fix Phase 3 systems list responsive layout` or `add phase 2 migration and backend quality tooling`. Prefer imperative, specific commit messages.

Pull requests should include a short summary, verification commands run, screenshots for UI changes, and notes about schema or migration changes. Link related tasks or project-phase items when available.

## Security & Configuration Tips

Do not commit credentials, API keys, passwords, payment data, or real secrets. Store only password-vault references, never actual credentials. Keep `.env` local and update `.env.example` when required configuration changes.
