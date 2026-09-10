'use strict';

/**
 * text-chunker.js  —  LangChain-powered PDF chunking
 *
 * Replaces the previous manual paragraph/sentence/word-boundary chunker with
 * LangChain's RecursiveCharacterTextSplitter, which cascades through a
 * separator hierarchy that matches the PDF structure:
 *
 *   paragraph (\n\n) → line (\n) → sentence endings (. ! ?) → word boundary
 *
 * Target PDF profile:
 *   - 2–3 pages, text-only (no images / tables to handle)
 *   - Structure: Heading → Sub-heading → bullet points / short paragraphs
 *
 * Output shape is 100% backward-compatible with the old Chunk typedef so
 * pdfIndexing.service.js requires zero changes.
 */

const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const env = require('../config/env');

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * Converts word-based chunk config (from env) to character-based values
 * required by LangChain's splitter.
 *
 * Heuristic: ~5 characters per word (English average including spaces).
 * CHUNK_SIZE  = 400 words  → 2000 chars  (≈ 500–650 tokens, safe for Gemini)
 * CHUNK_OVERLAP = 40 words → 200  chars
 */
const CHARS_PER_WORD = 5;

function getChunkConfig() {
  const chunkSize = env.CHUNK_SIZE;
  const chunkOverlap = env.CHUNK_OVERLAP;

  if (!Number.isFinite(chunkSize) || chunkSize <= 0) {
    throw new Error(`CHUNK_SIZE must be a positive number. Got: ${chunkSize}`);
  }
  if (chunkOverlap >= chunkSize) {
    throw new Error(
      `CHUNK_OVERLAP (${chunkOverlap}) must be less than CHUNK_SIZE (${chunkSize}).`
    );
  }

  return {
    chunkSizeChars: chunkSize * CHARS_PER_WORD,
    chunkOverlapChars: Math.max(0, chunkOverlap) * CHARS_PER_WORD,
  };
}

// ─── Heading Detection ────────────────────────────────────────────────────────

/**
 * Determines the heading level of a line (1 = top-level, 4 = low-level, 0 = body).
 *
 * Covers the typical structured PDF heading styles:
 *   Level 1: "Chapter N", "PART N"
 *   Level 2: "Section N", "Article N", "1. Title"
 *   Level 3: "1.1 Sub-title", Title Case short lines
 *   Level 4: ALL-CAPS short lines
 *
 * @param {string} line
 * @returns {number} 0–4
 */
function getHeadingLevel(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 100) return 0;

  const words = trimmed.split(/\s+/);
  if (words.length < 2 || words.length > 12) return 0;

  // Lines ending with sentence punctuation are body text
  if (/[.!?;]$/.test(trimmed)) return 0;

  // Level 1: Chapter / Part
  if (/^(Chapter|CHAPTER|Part|PART)\s+(\d+|[IVXLC]+)/i.test(trimmed)) return 1;

  // Level 2: Section / Article / top-level numbered ("1. Title")
  if (/^Section\s+\d+/i.test(trimmed)) return 2;
  if (/^Article\s+(\d+|[IVXLivxl]+)/i.test(trimmed)) return 2;
  if (/^\d{1,3}\.\s+[A-Z]/.test(trimmed) && !/^\d+\.\d+/.test(trimmed)) return 2;

  // Level 3: Sub-numbered ("1.1", "3.2.1")
  if (/^\d+\.\d+(\.\d+)*\.?\s+/.test(trimmed)) return 3;

  // Level 4: ALL-CAPS short lines
  if (trimmed === trimmed.toUpperCase() && /[A-Z]{2,}/.test(trimmed) && words.length <= 8) {
    return 4;
  }

  // Level 3: Title Case lines (≥70% of words are Title-Cased)
  const titleCaseWords = words.filter(
    (w) => /^[A-Z][a-z]/.test(w) || /^(a|an|the|and|or|of|in|to|for|on|at|by|with|is|are)$/i.test(w)
  );
  if (titleCaseWords.length >= Math.ceil(words.length * 0.7) && words.length <= 10) {
    return 3;
  }

  return 0;
}

// ─── Heading Context Extraction ───────────────────────────────────────────────

/**
 * Scans the full document text and builds a map of approximate character
 * offsets → heading context (path + innermost section name).
 *
 * Used later to annotate each LangChain-produced chunk with the correct
 * headingPath / section.
 *
 * @param {string} fullText  - Entire document text (pages joined)
 * @returns {{ offsets: number[], contexts: { headingPath: string[], section: string }[] }}
 */
function buildHeadingContextMap(fullText) {
  const lines = fullText.split('\n');
  /** @type {{ text: string, level: number }[]} */
  let stack = [];

  const offsets = [];
  const contexts = [];

  let charOffset = 0;
  for (const line of lines) {
    const level = getHeadingLevel(line);
    if (level > 0) {
      // Pop stack entries at this level or deeper
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      const headingText = line.trim().replace(/[:.]$/, '').trim();
      stack.push({ text: headingText, level });

      offsets.push(charOffset);
      contexts.push({
        headingPath: stack.map((h) => h.text),
        section: stack[stack.length - 1].text,
      });
    }
    charOffset += line.length + 1; // +1 for the \n
  }

  return { offsets, contexts };
}

/**
 * Given a character offset within the full document, returns the heading
 * context that was active at that position.
 *
 * @param {number} offset
 * @param {{ offsets: number[], contexts: { headingPath: string[], section: string }[] }} map
 * @returns {{ headingPath: string[], section: string }}
 */
function getContextAtOffset(offset, map) {
  const { offsets, contexts } = map;
  if (offsets.length === 0) return { headingPath: [], section: 'General' };

  // Binary-search for the last heading that starts at or before `offset`
  let lo = 0;
  let hi = offsets.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (offsets[mid] <= offset) {
      result = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (result === -1) return { headingPath: [], section: 'General' };
  return contexts[result];
}

// ─── Page Metadata ────────────────────────────────────────────────────────────

/**
 * Builds a character-offset → page-number lookup from the per-page texts.
 *
 * @param {string[]} pageTexts
 * @returns {{ pageOffsets: number[], pageLengths: number[] }}
 */
function buildPageOffsetMap(pageTexts) {
  const pageOffsets = [];
  let cumulative = 0;
  for (const text of pageTexts) {
    pageOffsets.push(cumulative);
    cumulative += text.length + 2; // +2 for the '\n\n' separator between pages
  }
  return pageOffsets;
}

/**
 * Returns the 1-indexed page number for a given character offset.
 *
 * @param {number} offset
 * @param {number[]} pageOffsets
 * @returns {number}
 */
function getPageAtOffset(offset, pageOffsets) {
  let page = 1;
  for (let i = 0; i < pageOffsets.length; i++) {
    if (pageOffsets[i] <= offset) page = i + 1;
    else break;
  }
  return page;
}

// ─── Heading Prefix Builder ───────────────────────────────────────────────────

/**
 * Builds a context prefix string prepended to embeddingText.
 * E.g. "Chapter 3 > Section 3.1\n\n"
 *
 * @param {string[]} headingPath
 * @returns {string}
 */
function buildHeadingPrefix(headingPath) {
  if (!headingPath || headingPath.length === 0) return '';
  return headingPath.join(' > ') + '\n\n';
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * @typedef {Object} Chunk
 * @property {string}   text          - Clean chunk text (for storage/display)
 * @property {string}   embeddingText - Heading-enriched text for embedding generation
 * @property {number}   chunkIndex    - Global zero-based index
 * @property {number}   pageNumber    - Start page (backward compat)
 * @property {number}   startPage     - First page this chunk comes from
 * @property {number}   endPage       - Last page this chunk comes from
 * @property {string}   section       - Innermost heading name
 * @property {string[]} headingPath   - Full heading hierarchy
 */

/**
 * Chunks PDF page texts using LangChain's RecursiveCharacterTextSplitter.
 *
 * Strategy:
 *   1. Join all page texts with '\n\n' (pages are NOT hard boundaries for chunking)
 *   2. Build a heading-context map and page-offset map over the joined text
 *   3. Split with RecursiveCharacterTextSplitter using a separator hierarchy
 *      matched to the PDF's structure (paragraph → line → sentence → word)
 *   4. For each produced chunk, resolve its start page, end page, heading path,
 *      and section from the offset maps
 *   5. Build embeddingText by prepending the heading path as context prefix
 *
 * @param {string[]} pageTexts - One string per page, paragraphs separated by \n\n
 * @returns {Promise<Chunk[]>}
 */
async function chunkPdfPages(pageTexts) {
  const { chunkSizeChars, chunkOverlapChars } = getChunkConfig();

  // Step 1: Join pages — page boundaries are metadata, not split boundaries
  const pageOffsets = buildPageOffsetMap(pageTexts);
  const fullText = pageTexts.join('\n\n');

  if (!fullText.trim()) return [];

  // Step 2: Build contextual maps over the joined text
  const headingMap = buildHeadingContextMap(fullText);

  // Step 3: Split with LangChain
  // Separator hierarchy tuned for: heading → paragraph → line → sentence → word
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: chunkSizeChars,
    chunkOverlap: chunkOverlapChars,
    separators: [
      '\n\n',   // paragraph boundary (highest priority)
      '\n',     // line boundary
      '. ',     // sentence ending (period + space)
      '! ',     // sentence ending (exclamation)
      '? ',     // sentence ending (question)
      '; ',     // clause boundary
      ', ',     // phrase boundary
      ' ',      // word boundary
      '',       // character boundary (last resort)
    ],
  });

  // splitText returns string[] with character offsets not available directly.
  // We use createDocuments to get Document objects with loc metadata.
  const docs = await splitter.createDocuments([fullText]);

  if (!docs || docs.length === 0) return [];

  // Step 4 & 5: Annotate each chunk with page + heading context
  const chunks = [];
  let runningOffset = 0; // approximate offset tracker

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const chunkText = doc.pageContent.trim();
    if (!chunkText) continue;

    // LangChain's loc metadata gives us the character range within the source
    // document. Use it if available, else fall back to running offset.
    const startChar =
      doc.metadata?.loc?.lines?.from != null
        ? doc.metadata.loc.lines.from
        : runningOffset;

    // Resolve page numbers from character offset
    const startPage = getPageAtOffset(startChar, pageOffsets);
    // Approximate end offset: start + length of chunk text
    const endChar = startChar + chunkText.length;
    const endPage = getPageAtOffset(endChar, pageOffsets);

    // Resolve heading context at this offset
    const { headingPath, section } = getContextAtOffset(startChar, headingMap);

    // Build embedding text (heading path as context prefix + raw chunk text)
    const prefix = buildHeadingPrefix(headingPath);
    const embeddingText = prefix + chunkText;

    chunks.push({
      text: chunkText,
      embeddingText,
      chunkIndex: chunks.length,
      pageNumber: startPage,   // backward compat
      startPage,
      endPage,
      section,
      headingPath,
    });

    runningOffset += chunkText.length;
  }

  return chunks;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // Main API (used by pdfIndexing.service.js)
  chunkPdfPages,

  // Exported for backward compat / testing
  getHeadingLevel,
  isHeading: (line) => getHeadingLevel(line) > 0,
  buildHeadingPrefix,
  detectCurrentSection: function detectCurrentSection(lines) {
    let section = 'General';
    for (const line of lines) {
      if (getHeadingLevel(line) > 0) {
        section = line.trim().replace(/[:.]$/, '').trim();
      }
    }
    return section;
  },
};
