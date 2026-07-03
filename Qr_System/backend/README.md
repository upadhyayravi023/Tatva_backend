# ByteVerse QR-Based Entry–Exit Management System

Production-ready backend for the ByteVerse hackathon, providing high-performance QR code scanning validation, robust rule-engine logic for short/sleep breaks, and comprehensive participant tracking.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Zod
- **Logging**: Winston

## Project Structure
\`\`\`
.
├── config/              # Configuration files (DB connection, Env parsing via Zod)
├── controllers/         # Extract request parameters and forward to services
├── middlewares/         # Global error handling and validation middlewares
├── models/              # Mongoose Schemas (Participant, ScanLog)
├── routes/              # Express API route definitions
├── services/            # Business Logic & Rule Engine evaluations
├── utils/               # AppError class, Winston Logger
├── validations/         # Zod API validation schemas
├── app.js               # Express application setup
└── index.js             # Server entry point
\`\`\`

## Getting Started

1. **Environment Setup**
   Copy the example environment variables:
   \`\`\`bash
   cp .env.example .env
   \`\`\`
   Fill in your specific `MONGO_URI`. 
   > Note: To mitigate race conditions, this app utilizes Mongoose **Transactions**. Ensure your MongoDB deployment is a Replica Set (e.g., MongoDB Atlas or a local replica set) for transactions to work.

2. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Start the Server**
   \`\`\`bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   \`\`\`

## API Endpoints

### Participant Management
- \`POST /api/v1/participants/register\`: Register a new participant.
- \`GET /api/v1/participants/:qrId\`: Retrieve current status, break stats, and scan history.

### Scanning Workflow
- \`POST /api/v1/scan/initial\`: Process initial entry. Must be called once before any exits.
- \`POST /api/v1/scan/exit\`: Scan user out. Requires \`qrId\` and \`breakType\` (SHORT or SLEEP).
- \`POST /api/v1/scan/entry\`: Scan user in. Requires \`qrId\`. Evaluates rule engine to detect violations (max duration, max counts).

### Admin Dashboard
- \`GET /api/v1/admin/dashboard\`: Returns total registered, currently inside, and violation counts.

## Business Rule Engine

The \`scan.service.js\` securely evaluates constraints during Entry Scans:
- **Sleep Break**: Max 1 allowed, up to 4 hours.
- **Short Break**: Max 3 allowed, up to 30 mins each, with a cumulative max duration of 90 minutes.
