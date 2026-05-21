# Blood Bank Admin Dashboard

CloudBlood is a cloud-based blood bank management dashboard built with React, TypeScript, Vite, Tailwind CSS, and Firebase. It helps administrators monitor blood inventory, manage donors, track blood requests, find compatible donors, and broadcast emergency blood alerts in real time.

## GitHub Repository Description

CloudBlood is a React and Firebase blood bank admin dashboard for real-time inventory tracking, donor management, blood request handling, donor matching, and emergency alert broadcasting.

## Features

- Secure admin sign-in with Firebase Authentication
- Real-time Firestore dashboard for donors, inventory, requests, and alerts
- Blood inventory management by blood group
- Low-stock warnings and inventory health overview
- Donor registration, search, and availability management
- Blood request creation, tracking, and completion workflow
- Compatible donor matching based on blood group rules
- Emergency alert broadcasting to a shared Firebase project
- Responsive admin layout for desktop and mobile screens
- Dockerfile for production container builds
- Jenkins pipeline for remote Docker deployment

## Tech Stack

- React 19
- TypeScript
- Vite 6
- Tailwind CSS 4
- Firebase Authentication
- Cloud Firestore
- Recharts
- Lucide React
- date-fns
- Docker
- Jenkins

## Project Structure

```text
.
|-- src/
|   |-- components/
|   |   |-- Alerts.tsx
|   |   |-- Dashboard.tsx
|   |   |-- Donors.tsx
|   |   |-- Inventory.tsx
|   |   |-- Layout.tsx
|   |   |-- Login.tsx
|   |   `-- Requests.tsx
|   |-- lib/
|   |-- App.tsx
|   |-- firebase.ts
|   |-- index.css
|   |-- main.tsx
|   `-- types.ts
|-- firebase-applet-config.json
|-- firestore.rules
|-- Dockerfile
|-- Jenkinsfile
|-- package.json
`-- vite.config.ts
```

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- Firebase project with Authentication and Firestore enabled

### Installation

```bash
npm install
```

### Firebase Configuration

The app reads the primary Firebase project settings from:

```text
firebase-applet-config.json
```

Update this file with your Firebase web app configuration:

```json
{
  "projectId": "your-project-id",
  "appId": "your-app-id",
  "apiKey": "your-api-key",
  "authDomain": "your-project.firebaseapp.com",
  "firestoreDatabaseId": "your-firestore-database-id",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "your-sender-id",
  "measurementId": ""
}
```

The application also uses a shared Firebase app in `src/firebase.ts` for emergency alerts. Update that configuration if you want alerts to be written to a different Firebase project.

### Environment Variables

Copy the example environment file and update the values if your deployment needs them:

```bash
cp "#env.example" .env
```

Available variables:

```env
GEMINI_API_KEY="MY_GEMINI_API_KEY"
APP_URL="MY_APP_URL"
```

## Running Locally

```bash
npm run dev
```

The development server runs on:

```text
http://localhost:3000
```

## Build

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Run TypeScript validation:

```bash
npm run lint
```

## Firebase Data Collections

The dashboard expects these Firestore collections:

### `inventory`

```text
group: string
units: number
lastUpdated: timestamp
```

### `donors`

```text
fullName/name: string
bloodType/bloodGroup: string
mobileNumber/phone: string
address/location: string
lastDonationDate: string
isEligible/isAvailable: boolean
totalDonations: number
```

### `blood_requests`

```text
patientDetails/patientName: string
bloodType/bloodGroup: string
hospitalLocation/hospitalName/hospital: string
unitsRequired/unitsNeeded: number
status: pending | emergency | accepted | rejected | completed
createdAt: timestamp
requesterId: string
donorId: string
notes: string
```

### `alerts`

```text
bloodGroup: string
location: string
message: string
sentAt: timestamp
sentBy: string
```

## Authentication

The login screen is configured for Firebase email/password authentication. Create an admin user in Firebase Authentication before using the dashboard.

Default values shown in the login form:

```text
Email: admin@bloodbank.com
Password: admin123
```

Create or update this account in your Firebase project before deployment.

## Docker Deployment

Build the Docker image:

```bash
docker build -t cloudblood .
```

Run the container:

```bash
docker run -d -p 3000:3000 --name cloudblood cloudblood
```

Open:

```text
http://localhost:3000
```

## Jenkins Deployment

The included `Jenkinsfile` performs these stages:

- Clone the repository
- Copy the project to a remote server over SSH
- Build a Docker image on the remote server
- Run the app container on port `3000`
- Placeholder stage for Selenium tests
- Email notification on build success or failure

Before using the pipeline, configure:

- Jenkins SSH credential ID: `ec2-ssh-key`
- Remote host details in `Jenkinsfile`
- Email extension plugin and recipient list
- Docker installed on the remote server

## Firestore Rules

Firestore security rules are included in:

```text
firestore.rules
```

Review and deploy them with the Firebase CLI after adjusting admin emails and collection schemas for your Firebase project.

## Useful Commands

```bash
npm run dev       # Start Vite dev server on port 3000
npm run build     # Create production build in dist/
npm run preview   # Preview production build
npm run lint      # Type-check the project
```

## License

This project includes Apache-2.0 SPDX headers in source files. Update this section if your repository uses a different license.
