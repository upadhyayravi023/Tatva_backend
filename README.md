Flutter App - https://github.com/upadhyayravi023/Tatva 



﻿# Tatva Bot - LLM Services

AI-powered RAG (Retrieval-Augmented Generation) backend for the **Tatva College Fest** chatbot.
Built with **Node.js**, **LangChain**, **Google Gemini**, and **MongoDB Atlas**.

---

## Repository Structure

```
llm_Services/
├── chat_bot/              # LLM Chatbot - REST API that answers user questions
│   ├── public/            # Static frontend (HTML/CSS chat UI)
│   └── src/
│       ├── config/        # Environment & MongoDB connection
│       ├── controllers/   # Express route handlers
│       ├── middlewares/   # Rate limiter, request validator
│       ├── models/        # MongoDB vector search & structured queries
│       ├── services/      # LangChain LLM, prompt builder, orchestration
│       └── shared/        # Logger
│
└── lndexing_sevices/      # PDF Indexing Worker - background job indexes rulebook PDFs
    ├── tests/             # Unit tests (31/31 passing)
    └── src/
        ├── config/        # Environment, MongoDB, Redis
        ├── controllers/   # HTTP trigger endpoint
        ├── models/        # DB read/write logic
        ├── queues/        # BullMQ queue definition
        ├── services/      # PDF download, parse, chunk, embed, store
        ├── utils/         # LangChain text chunker, Google Drive downloader
        ├── workers/       # BullMQ worker process
        └── shared/        # Logger, error types
```

---

## Architecture Overview

```
              +-----------------------------+
              |   Tatva Admin Dashboard     |
              |  (uploads event PDF)        |
              +-------------+---------------+
                            |
                            | POST /api/index (driveLink + eventName)
                            v
+---------------------------------------------------------------+
|              PDF INDEXING SERVICE (BullMQ Worker)             |
|                                                               |
|  1. Download PDF buffer from Google Drive                     |
|  2. LangChain PDFLoader  --> extract text (1 Document/page)   |
|  3. LangChain RecursiveCharacterTextSplitter --> chunks       |
|  4. Heading detection  --> inject headingPath + embeddingText |
|  5. Gemini Embedding API --> float[3072] vector per chunk     |
|  6. Store in MongoDB Atlas pdf_embeddings collection          |
+---------------------------------------------------------------+
          ^ jobs enqueued via BullMQ (Redis)
          |
+-----------------------------+
|   tatva-backend API         |
|   (triggers indexing jobs)  |
+-----------------------------+

              +-----------------------------+
              |       User (College Fest)   |
              +-------------+---------------+
                            |
                            | POST /api/chat
                            v
+---------------------------------------------------------------+
|                LLM CHATBOT SERVICE (Express API)              |
|                                                               |
|  Step 0  LRU Cache hit? --> return instantly (< 1ms)          |
|                  | miss                                       |
|                  v                                            |
|  Step 1  [PARALLEL]                                           |
|          +--> Classify question (structured/vector/both)      |
|          +--> Embed question --> float[3072] vector           |
|                  |                                            |
|  Step 2  Structured MongoDB queries (events/sports/announce)  |
|  Step 3  Atlas $vectorSearch (top-5 PDF chunk matches)        |
|                  |                                            |
|  Step 4  ChatPromptTemplate --> merge contexts into prompt    |
|  Step 5  Gemini --> grounded answer (no hallucination)        |
|                  |                                            |
|          Cache answer --> return to user                      |
+---------------------------------------------------------------+
```

---

## PDF Indexing Service

### What it does

Listens for indexing jobs from a BullMQ queue, downloads rulebook PDFs from Google Drive,
splits them into semantically coherent chunks, embeds each chunk using Gemini Embeddings,
and stores the result in MongoDB Atlas for vector search.

### Ideal PDF Format

| Property   | Requirement                                          |
|------------|------------------------------------------------------|
| Source     | Digitally created (Word / Google Docs -> PDF)        |
| Length     | 2-10 pages (optimised for 2-3 pages)                 |
| Structure  | Headings -> Sub-headings -> Paragraphs -> Bullets    |
| Content    | Text only - no images, no tables                     |
| Language   | English                                              |

### Chunking Strategy

Uses **LangChain RecursiveCharacterTextSplitter** with separator hierarchy tuned for structured PDFs:

```
\n\n  ->  \n  ->  ". "  ->  "! "  ->  "? "  ->  "; "  ->  ", "  ->  " "  ->  ""
```

| Parameter    | Env Var          | Default    | Notes                    |
|--------------|------------------|------------|--------------------------|
| Chunk size   | `CHUNK_SIZE`     | 500 words  | x 5 chars/word = 2000 ch |
| Overlap      | `CHUNK_OVERLAP`  | 50 words   | ~10% of chunk size       |

Each chunk carries rich metadata for RAG quality:

```json
{
  "text": "Teams must have a minimum of 4 players...",
  "embeddingText": "1. Volleyball Rules > 1.1 Team Composition\n\nTeams must...",
  "section": "1.1 Team Composition",
  "headingPath": ["1. Volleyball Rules", "1.1 Team Composition"],
  "pageNumber": 2,
  "startPage": 2,
  "endPage": 2,
  "chunkIndex": 3,
  "event": "Volleyball Championship"
}
```

### Environment Variables

| Variable               | Required | Default               | Description                     |
|------------------------|----------|-----------------------|---------------------------------|
| `REDIS_URL`            | YES      | -                     | Redis connection URL (BullMQ)   |
| `MONGODB_URI`          | YES      | -                     | MongoDB Atlas connection string  |
| `GEMINI_API_KEY`       | YES      | -                     | Google Gemini API key           |
| `MONGODB_DB_NAME`      | No       | `embeddings`          | Database name                   |
| `MONGODB_COLLECTION`   | No       | `pdf_embeddings`      | Collection name                 |
| `EMBEDDING_MODEL`      | No       | `gemini-embedding-001`| Gemini embedding model          |
| `EMBEDDING_DIMENSIONS` | No       | `3072`                | Vector dimensions               |
| `EMBEDDING_CONCURRENCY`| No       | `10`                  | Parallel embedding API calls    |
| `PDF_QUEUE_NAME`       | No       | `pdf-indexing-queue`  | BullMQ queue name               |
| `WORKER_CONCURRENCY`   | No       | `2`                   | Parallel PDF jobs               |
| `CHUNK_SIZE`           | No       | `500`                 | Target chunk size in words      |
| `CHUNK_OVERLAP`        | No       | `50`                  | Overlap between chunks in words |
| `PORT`                 | No       | `10000`               | HTTP port                       |

### Running Locally

```bash
cd lndexing_sevices
cp .env.example .env
npm install
npm start
```

### Running Tests

```bash
npm test
# tests 31 | suites 5 | pass 31 | fail 0
```

---

## LLM Chatbot Service

### What it does

A Node.js/Express REST API that answers questions about the college fest using
Retrieval-Augmented Generation (RAG). Classifies each question, fetches relevant
context from MongoDB (structured data or PDF chunk embeddings), and generates a
grounded answer via Google Gemini - refusing to hallucinate if context is absent.

### Request Flow

```
POST /api/chat  { "question": "What are the volleyball rules?" }
```

| Step           | Description                                   | Technology                                        |
|----------------|-----------------------------------------------|---------------------------------------------------|
| 0. Cache       | Return instantly on repeated questions        | In-memory LRU (200 entries, 5-min TTL)            |
| 1a. Classify   | Structured DB, PDF chunks, or both?           | ChatGoogleGenerativeAI + JsonOutputParser         |
| 1b. Embed      | Question -> 3072-dim float vector             | GoogleGenerativeAIEmbeddings                      |
| 2. Structured  | Query events / announcements / sports         | Native MongoDB driver                             |
| 3. Vector      | Semantic search over indexed PDF chunks       | MongoDB Atlas $vectorSearch                       |
| 4. Prompt      | Merge contexts into grounded RAG prompt       | ChatPromptTemplate (SystemMessage + HumanMessage) |
| 5. Generate    | Send to Gemini, extract answer string         | ChatGoogleGenerativeAI + StringOutputParser       |

### Classification Output

```json
{
  "source": "structured | vector | both",
  "event": "Volleyball Championship | null",
  "collections": ["events", "announcements", "sports"],
  "isTimeline": false,
  "isLiveScore": false
}
```

| Source       | When used                                                    |
|--------------|--------------------------------------------------------------|
| `structured` | Event schedules, venues, scores, announcements               |
| `vector`     | Rules, eligibility, team sizes, equipment, judging criteria  |
| `both`       | Questions spanning both domains                              |

### Rate Limiting

- **Algorithm:** Per-IP sliding-window reset
- **Limit:** 20 requests / IP / minute
- **On breach:** `429 Too Many Requests` + `Retry-After: N` header
- **Position:** Applied BEFORE validation and any LLM/DB calls

### Capacity (Gemini Free Tier + Render Free Tier)

| Metric                              | Value                                    |
|-------------------------------------|------------------------------------------|
| Gemini 2.5 Flash RPM limit          | 10 RPM                                   |
| Gemini calls per user request       | 2 (classify + generate)                  |
| Max throughput (all cache misses)   | 5 req/min (0.083 req/sec)                |
| Simultaneous users (cold cache)     | ~1                                       |
| Simultaneous users (80% cache hit)  | ~5                                       |
| Daily unique questions              | ~500/day                                 |
| Bottleneck                          | Gemini free tier (not Node.js or MongoDB)|

> The LRU cache is the key force multiplier. If 200 users ask "where is volleyball?",
> only the FIRST request hits Gemini. The other 199 are served in < 1ms from memory.

### Environment Variables

| Variable               | Required | Default               | Description                      |
|------------------------|----------|-----------------------|----------------------------------|
| `MONGODB_URI`          | YES      | -                     | MongoDB Atlas connection string   |
| `GEMINI_API_KEY`       | YES      | -                     | Google Gemini API key            |
| `MONGODB_DB_NAME`      | No       | `embeddings`          | Database name                    |
| `MONGODB_COLLECTION`   | No       | `pdf_embeddings`      | Vector search collection         |
| `CHAT_MODEL`           | No       | `gemini-2.5-flash`    | Gemini model for chat + classify |
| `EMBEDDING_MODEL`      | No       | `gemini-embedding-001`| Gemini embedding model           |
| `EMBEDDING_DIMENSIONS` | No       | `3072`                | Vector dimensions                |
| `VECTOR_INDEX_NAME`    | No       | `vector_index`        | MongoDB Atlas vector index name  |
| `PORT`                 | No       | `3001`                | HTTP port                        |

### API Reference

#### POST /api/chat

**Request**
```json
{ "question": "What time does the volleyball match start?" }
```

**200 OK**
```json
{ "answer": "The volleyball match starts at 9:00 AM at the Main Ground." }
```

**400 Bad Request**
```json
{ "error": "question is required and must be a non-empty string" }
```

**429 Too Many Requests**
```json
{
  "error": "Too Many Requests",
  "message": "You have exceeded 20 requests per minute. Please wait 43s before retrying.",
  "retryAfterSec": 43
}
```

#### GET /health

```json
{ "status": "ok", "service": "llm-chat-service", "uptime": 3600 }
```

### Running Locally

```bash
cd chat_bot
cp .env.example .env
npm install
npm run dev
```

---

## Deployment (Render)

Both services are configured in `render.yaml` at the `bot/` root.

| Service               | Render Type        | Root Dir      |
|-----------------------|--------------------|---------------|
| `tatva-chatbot-api`   | Web Service        | `llm-chatbot/`|
| `tatva-pdf-indexer`   | Background Worker  | `indexing/`   |

Secrets to set in the Render dashboard:

| Secret           | Required By      |
|------------------|------------------|
| `GEMINI_API_KEY` | Both services    |
| `MONGODB_URI`    | Both services    |
| `REDIS_URL`      | Indexing only    |

---

## Tech Stack

| Layer             | Technology                                              |
|-------------------|---------------------------------------------------------|
| Runtime           | Node.js >= 18                                           |
| LLM               | Google Gemini 2.5 Flash                                 |
| Embeddings        | Gemini Embedding 001 (3072 dimensions)                  |
| LangChain         | @langchain/google-genai, @langchain/core, @langchain/textsplitters, @langchain/community |
| PDF Parsing       | LangChain PDFLoader (wraps pdf-parse)                   |
| Text Splitting    | LangChain RecursiveCharacterTextSplitter                |
| Vector DB         | MongoDB Atlas $vectorSearch                             |
| Job Queue         | BullMQ (Redis-backed)                                   |
| API Framework     | Express.js                                              |
| Logging           | Winston                                                 |

---

## MongoDB Collections

| Collection       | Purpose                                              |
|------------------|------------------------------------------------------|
| `pdf_embeddings` | Indexed PDF chunks with embedding float vectors      |
| `events`         | Event schedules, venues, team sizes, descriptions    |
| `announcements`  | Live announcements (sorted by recency)               |
| `sports`         | Live sports scores, match status, results            |

---

## Testing

```bash
cd lndexing_sevices
node --test tests/text-chunker.test.js

# tests 31 | suites 5 | pass 31 | fail 0
# Covers: isHeading, getHeadingLevel, detectCurrentSection,
#         buildHeadingPrefix, chunkPdfPages() integration
```

---

## License

MIT (c) Tatva College Fest Team
