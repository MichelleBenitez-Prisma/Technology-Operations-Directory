# Phase Three Core User Interface

Phase three introduces the main dashboard that Technology Department employees use to understand the directory at a glance.

## Main Dashboard

Location:

```text
client/src/DashboardApp.tsx
```

The dashboard is designed for quick operational scanning. It includes:

- Total systems
- Active systems
- Systems being replaced
- Retired systems
- Systems missing documentation
- Systems without a technical owner
- Upcoming renewals
- Recently updated records
- Records needing attention
- Quick directory search

Dashboard items link to related API record lists or individual records when practical.

## Data Sources

The UI uses these backend endpoints:

- `GET /api/system-records/dashboard-totals`
- `GET /api/system-records?limit=100&sortBy=updatedAt&sortDirection=desc`
- `GET /api/system-records/:id`

The dashboard totals endpoint returns exact counts and focused lists for:

- Missing documentation
- Systems without technical owner
- Upcoming renewals
- Recently updated records

## Local Development

Run the backend API:

```bash
npm run dev:api
```

Run the dashboard:

```bash
npm run dev:client
```

Open:

```text
http://127.0.0.1:5173
```

## Production Build

Build both backend and frontend:

```bash
npm run build
```

Start the Express server:

```bash
npm start
```

After a production build, Express serves the dashboard from `dist/client`.

