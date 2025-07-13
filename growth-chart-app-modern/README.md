# Modern Growth Chart Application

## Overview

This project is a modern web application for tracking and visualizing pediatric growth data. It allows users to input patient measurements, view them on various growth charts (including customizable centile sets for different populations or conditions), and access data in table and simplified parental views.

This application is a rebuild of an older concept, focusing on a modern technology stack and enhanced features.

## Technology Stack

*   **Frontend Framework:** React (v18) with TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS
*   **State Management:** Zustand (planned, basic setup for client-side persistence)
*   **Routing:** React Router DOM
*   **Charting Library:** Chart.js with `react-chartjs-2`
*   **Testing:** Jest with React Testing Library

## Features

*   **Patient Data Management:** (Conceptual) Input and manage patient demographic and growth data.
*   **Growth Chart Visualization:** Display patient data on growth charts.
    *   **Customizable Centiles:** Select from various centile sets (e.g., WHO, CDC, condition-specific) loaded from JSON data.
*   **Multiple Views:**
    *   **Dashboard:** Welcome page and app overview.
    *   **Patient Selection:** Interface for selecting/managing patients (mock).
    *   **Chart View:** Interactive growth charts.
    *   **Table View:** Tabular display of growth data (mock).
    *   **Parental View:** Simplified summary for parents/guardians (mock).
*   **Settings:** (Conceptual) Application settings like default units, chart types.
*   **Client-Side Persistence:** (Planned) Using Zustand and `localStorage` for storing data locally.
*   **SMART on FHIR Integration:** (Conceptual Future Enhancement) Potential to connect to FHIR-compliant EHRs.

## Project Structure

```
growth-chart-app-modern/
├── public/                 # Static assets, including centile data JSON
│   └── data/
│       └── centiles/       # Centile JSON files
│       └── centile_manifest.json # Manifest for available centiles
├── src/
│   ├── components/         # Reusable UI components (if any created later)
│   ├── pages/              # Main page components for each view/route
│   │   └── __tests__/      # Tests for page components
│   ├── services/           # (Conceptual) For API calls, FHIR integration
│   ├── store/              # (Conceptual) For Zustand state management
│   ├── styles/             # (If global CSS beyond index.css is needed)
│   ├── utils/              # Utility functions
│   ├── App.tsx             # Main application component with routing
│   ├── main.tsx            # React entry point
│   ├── index.css           # Global styles and Tailwind directives
│   └── setupTests.ts       # Jest setup
├── jest.config.js          # Jest configuration
├── package.json            # Project dependencies and scripts
├── postcss.config.js       # PostCSS configuration (for Tailwind)
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
├── tsconfig.node.json      # TypeScript Node configuration (for Vite)
└── vite.config.ts          # Vite configuration
```

## Available Scripts

In the project directory, you can run:

### `npm install`

Installs all the necessary dependencies for the project. You might need to use the `--legacy-peer-deps` flag if you encounter peer dependency conflicts during a fresh setup:
`npm install --legacy-peer-deps`

### `npm run dev`

Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) (or the port specified in `vite.config.ts`) to view it in your browser. The page will reload if you make edits.

### `npm run build`

Builds the app for production to the `dist` folder. It correctly bundles React in production mode and optimizes the build for the best performance.

### `npm run preview`

Serves the production build locally from the `dist` folder. This is useful for verifying the build before deployment.

### `npm test`

Launches the test runner.
You can also use `npm run test:watch` (or `jest --watch`) for interactive watch mode.

### `npm run lint`

Lints the codebase using ESLint to check for code quality and style issues.

## Deployment Strategy (Outline)

This is a static single-page application (SPA) after the build process (`npm run build`). It can be deployed to any static site hosting provider. Common choices include:

*   **Vercel:** Offers seamless deployment for Vite/React projects with Git integration, custom domains, and HTTPS.
*   **Netlify:** Similar to Vercel, providing continuous deployment, serverless functions (if needed later), and robust hosting for SPAs.
*   **GitHub Pages:** A good option for open-source projects directly from a GitHub repository.
*   **AWS S3 + CloudFront:** For more traditional cloud hosting, S3 can store the static files, and CloudFront can serve as a CDN.
*   **Docker:** The application can be containerized. A simple `Dockerfile` using a static web server like Nginx can serve the `dist` folder contents.

Example `Dockerfile` (conceptual):

```dockerfile
# Stage 1: Build the application
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Use --legacy-peer-deps if needed for your project's dependencies
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Optional: Add a custom nginx.conf if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
