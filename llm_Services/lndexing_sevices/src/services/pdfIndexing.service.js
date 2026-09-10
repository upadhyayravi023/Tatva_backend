'use strict';

const os = require('os');
const path = require('path');
const fs = require('fs');
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const { GoogleGenAI } = require('@google/genai');
const pLimit = require('p-limit');

const { downloadPdfFromDrive } = require('../utils/drive-downloader');
const { chunkPdfPages } = require('../utils/text-chunker');
const PdfIndexingModel = require('../models/pdfIndexing.model');
const env = require('../config/env');
const logger = require('../shared/logger');
const { PdfParseError, EmbeddingError } = require('../shared/errors');

const genai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Redacts a Google Drive URL for safe logging.
 * Preserves the file ID for debugging but strips query params that could
 * contain access tokens or confirmation strings.
 *
 * @param {string} url
 * @returns {string}
 */
function redactDriveUrl(url) {
  try {
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch) return `drive://file/${fileIdMatch[1]}`;
    const paramMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (paramMatch) return `drive://file/${paramMatch[1]}`;
    return 'drive://[unparsed]';
  } catch {
    return 'drive://[redact-error]';
  }
}

// ─── Text Extraction ──────────────────────────────────────────────────────────

/**
 * Downloads a PDF from Google Drive and extracts text page-by-page using
 * LangChain's PDFLoader.
 *
 * LangChain's PDFLoader wraps pdf-parse under the hood and returns an array
 * of Document objects, one per page, each with:
 *   - pageContent: the page's text
 *   - metadata.loc.pageNumber: 1-indexed page number
 *
 * Because PDFLoader requires a file path (not a Buffer), the downloaded buffer
 * is written to a temp file which is always deleted in a finally block.
 *
 * Target PDF profile: text-only, 2–3 pages, single-column, no images/tables.
 *
 * @param {string} driveLink
 * @param {string} jobId
 * @returns {Promise<string[]>} Array of page texts (one entry per page)
 */
async function downloadAndParsePages(driveLink, jobId) {
  const safeUrl = redactDriveUrl(driveLink);
  logger.info('Downloading PDF', { service: 'PdfIndexing', jobId, driveLink: safeUrl });

  const pdfBuffer = await downloadPdfFromDrive(driveLink, jobId);

  logger.info('Parsing PDF with LangChain PDFLoader', {
    service: 'PdfIndexing',
    jobId,
    sizeBytes: pdfBuffer.length,
  });

  // PDFLoader requires a file path — write buffer to a uniquely-named temp file
  const tmpFile = path.join(os.tmpdir(), `tatva_pdf_${jobId}_${Date.now()}.pdf`);

  try {
    fs.writeFileSync(tmpFile, pdfBuffer);

    const loader = new PDFLoader(tmpFile, {
      // splitPages: true ensures one Document per page (default behaviour)
      splitPages: true,
    });

    const docs = await loader.load();

    if (!docs || docs.length === 0) {
      logger.warn('PDFLoader returned no documents', { service: 'PdfIndexing', jobId });
      return [];
    }

    // Build pageTexts array ordered by page number.
    // docs may not always be in page order, so sort defensively.
    const sorted = docs
      .slice()
      .sort((a, b) => (a.metadata?.loc?.pageNumber ?? 0) - (b.metadata?.loc?.pageNumber ?? 0));

    const pageTexts = sorted.map((doc) =>
      (doc.pageContent || '')
        .replace(/\n{3,}/g, '\n\n')  // collapse 3+ newlines → paragraph break
        .replace(/[ \t]{2,}/g, ' ')  // collapse horizontal whitespace
        .trim()
    );

    const nonBlank = pageTexts.filter((t) => t.length > 0).length;
    logger.info('PDF parsed', {
      service: 'PdfIndexing',
      jobId,
      totalPages: pageTexts.length,
      nonBlank,
    });

    if (nonBlank === 0 && pageTexts.length > 0) {
      logger.warn(
        'All pages returned empty text. This PDF may contain only images/scans. ' +
        'OCR (e.g. Tesseract) would be required for image-only PDFs.',
        { service: 'PdfIndexing', jobId }
      );
    }

    return pageTexts;
  } catch (err) {
    throw new PdfParseError(`Failed to parse PDF with LangChain PDFLoader: ${err.message}`, err);
  } finally {
    // Always clean up the temp file
    try { fs.unlinkSync(tmpFile); } catch { /* ignore cleanup errors */ }
  }
}

// ─── Embedding Generation ─────────────────────────────────────────────────────

/**
 * Generates embeddings for an array of text strings with controlled concurrency.
 *
 * The embedding input receives the chunk's `embeddingText` (which includes
 * heading context) rather than the raw `text`. This gives the embedding model
 * more semantic signal for ambiguous passages.
 *
 * @param {string[]} texts   - Array of texts to embed (should be embeddingText)
 * @param {string}   jobId
 * @returns {Promise<number[][]>} Array of embedding vectors, in input order
 */
async function generateEmbeddings(texts, jobId) {
  const total = texts.length;
  const concurrency = env.EMBEDDING_CONCURRENCY;
  const limit = pLimit(concurrency);

  let completed = 0;

  logger.info('Starting concurrent embedding generation', {
    service: 'PdfIndexing',
    jobId,
    totalChunks: total,
    concurrency,
  });

  const allEmbeddings = await Promise.all(
    texts.map((text, index) =>
      limit(async () => {
        try {
          const result = await genai.models.embedContent({
            model: env.EMBEDDING_MODEL,
            contents: text,
          });

          const values = result?.embeddings?.[0]?.values;
          if (!Array.isArray(values) || values.length === 0) {
            throw new Error('Gemini returned an empty embedding vector');
          }

          // Validate embedding dimensionality
          if (values.length !== env.EMBEDDING_DIMENSIONS) {
            throw new Error(
              `Dimension mismatch: expected ${env.EMBEDDING_DIMENSIONS}, ` +
              `got ${values.length} for chunk index ${index}`
            );
          }

          completed += 1;
          if (completed % 10 === 0 || completed === total) {
            logger.debug(`Embedding progress: ${completed}/${total}`, {
              service: 'PdfIndexing',
              jobId,
            });
          }

          return values;
        } catch (err) {
          throw new EmbeddingError(
            `Gemini embeddings API failed for chunk index ${index}: ${err.message}`,
            err
          );
        }
      })
    )
  );

  logger.info('Embeddings generated', {
    service: 'PdfIndexing',
    jobId,
    count: allEmbeddings.length,
    dimensions: allEmbeddings[0]?.length,
    concurrency,
  });

  return allEmbeddings;
}

// ─── Document Building ────────────────────────────────────────────────────────

/**
 * Builds a MongoDB document from a chunk, its embedding, and the job payload.
 *
 * Schema additions over the original:
 *   - startPage / endPage:   page range for multi-page chunks
 *   - headingPath:           full heading hierarchy for context
 *   - embeddingText:         the context-enriched text used for embedding
 *
 * Backward-compatible fields preserved:
 *   - text:       clean chunk text (for display and LLM context)
 *   - pageNumber: = startPage (chatbot retrieval reads this)
 *   - section:    innermost heading (chatbot retrieval reads this)
 *   - event, version, createdAt, metadata: unchanged
 */
function buildDocument(chunk, embedding, payload) {
  return {
    text: chunk.text,
    embeddingText: chunk.embeddingText,
    embedding,
    event: payload.event,
    pageNumber: chunk.pageNumber,     // backward compat (= startPage)
    startPage: chunk.startPage,
    endPage: chunk.endPage,
    chunkIndex: chunk.chunkIndex,
    section: chunk.section,
    headingPath: chunk.headingPath || [],
    version: payload.version,
    createdAt: new Date(),
    metadata: {
      driveLink: payload.driveLink,
      uploadedBy: payload.uploadedBy || 'unknown',
    },
  };
}

// ─── Main Pipeline ────────────────────────────────────────────────────────────

/**
 * Orchestrates the full PDF indexing pipeline.
 *
 * Critical fix: Safe re-indexing strategy.
 * Old approach:  delete old → generate embeddings → insert new
 *   Problem:     if embedding generation fails, the event has zero embeddings.
 * New approach:  generate embeddings → insert new → delete old version
 *   Guarantee:   old embeddings remain queryable until new ones are confirmed.
 *
 * @param {object}   payload             - Job payload from BullMQ
 * @param {string}   payload.event       - Event name (e.g. "Volleyball")
 * @param {string}   payload.driveLink   - Google Drive PDF URL
 * @param {number}   payload.version     - Version number for this indexing run
 * @param {string}   [payload.uploadedBy]
 * @param {function} onProgress          - Reports percentage to BullMQ
 * @param {string}   jobId               - BullMQ job ID for logging
 * @returns {Promise<object>}            - Summary of the indexing run
 */
async function indexPdf(payload, onProgress, jobId) {
  const startTime = Date.now();

  // ── Step 1: Download & Extract ────────────────────────────────────────────
  await onProgress(10);
  const pageTexts = await downloadAndParsePages(payload.driveLink, jobId);

  if (!pageTexts.length || pageTexts.every(t => !t.trim())) {
    throw new Error('PDF is empty or contains no extractable text');
  }

  // ── Step 2: Chunk ─────────────────────────────────────────────────────────
  await onProgress(25);
  const chunks = await chunkPdfPages(pageTexts);
  logger.info('Text chunked', {
    service: 'PdfIndexing',
    jobId,
    totalChunks: chunks.length,
    totalPages: pageTexts.length,
  });

  if (!chunks.length) {
    throw new Error('Chunking produced 0 results — PDF may contain only images or scans');
  }

  // ── Step 3: Generate Embeddings ───────────────────────────────────────────
  // Use embeddingText (includes heading context) instead of raw text
  await onProgress(40);
  const embeddings = await generateEmbeddings(
    chunks.map(c => c.embeddingText),
    jobId
  );

  if (embeddings.length !== chunks.length) {
    throw new Error(
      `Embedding count mismatch: expected ${chunks.length}, got ${embeddings.length}`
    );
  }

  // ── Step 4: Build Documents ───────────────────────────────────────────────
  await onProgress(70);
  const documents = chunks.map((chunk, i) =>
    buildDocument(chunk, embeddings[i], payload)
  );

  // ── Step 5: Insert New Documents ──────────────────────────────────────────
  // Insert FIRST, before deleting old ones. This ensures that if insertion
  // fails, the old embeddings remain intact and queryable.
  await onProgress(80);
  const insertedCount = await PdfIndexingModel.bulkInsert(documents, jobId);

  logger.info('New embeddings inserted successfully', {
    service: 'PdfIndexing',
    jobId,
    insertedCount,
    version: payload.version,
  });

  // ── Step 6: Delete Old Version ────────────────────────────────────────────
  // Only delete embeddings from PREVIOUS versions of this event.
  // The current version's documents were just inserted above.
  await onProgress(90);
  const deletedCount = await PdfIndexingModel.deleteByEventAndOldVersions(
    payload.event,
    payload.version,
    jobId
  );

  logger.info('Old version embeddings removed', {
    service: 'PdfIndexing',
    jobId,
    deletedCount,
    currentVersion: payload.version,
  });

  await onProgress(100);

  return {
    event: payload.event,
    totalPages: pageTexts.length,
    totalChunks: chunks.length,
    embeddingsStored: insertedCount,
    oldVersionsDeleted: deletedCount,
    durationMs: Date.now() - startTime,
  };
}

module.exports = { indexPdf, generateEmbeddings, downloadAndParsePages };
