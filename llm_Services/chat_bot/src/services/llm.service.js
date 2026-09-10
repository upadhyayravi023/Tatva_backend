'use strict';

/**
 * llm.service.js — LangChain-powered LLM & Embedding layer
 *
 * Replaces raw @google/genai calls with LangChain abstractions:
 *   - GoogleGenerativeAIEmbeddings  →  generateEmbedding()
 *   - ChatGoogleGenerativeAI        →  getChatResponse() + classifyQuestion()
 *   - ChatPromptTemplate            →  structured prompt assembly
 *   - StringOutputParser            →  clean text extraction
 *   - JsonOutputParser              →  structured JSON classification output
 *
 * All function signatures and return shapes are IDENTICAL to the previous
 * implementation so chat.service.js requires zero changes.
 */

const { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { JsonOutputParser } = require('@langchain/core/output_parsers');

const env = require('../config/env');
const logger = require('../shared/logger');

// ─── Model Instances ──────────────────────────────────────────────────────────
// Instantiated once at module load — LangChain model objects are stateless
// and safe to reuse across requests.

/** Embedding model — used for query vector generation */
const embeddingModel = new GoogleGenerativeAIEmbeddings({
  apiKey: env.GEMINI_API_KEY,
  model: env.EMBEDDING_MODEL,        // e.g. 'gemini-embedding-001'
});

/** Chat model for answer generation (low temperature = factual, grounded) */
const chatModel = new ChatGoogleGenerativeAI({
  apiKey: env.GEMINI_API_KEY,
  model: env.CHAT_MODEL,             // e.g. 'gemini-2.5-flash'
  temperature: 0.1,
});

/** Chat model for JSON classification (same model, same temperature) */
const classifyModel = new ChatGoogleGenerativeAI({
  apiKey: env.GEMINI_API_KEY,
  model: env.CHAT_MODEL,
  temperature: 0.1,
});

// ─── Chains ───────────────────────────────────────────────────────────────────

/**
 * RAG answer chain:
 *   ChatPromptTemplate → ChatGoogleGenerativeAI → StringOutputParser
 *
 * The template accepts two variables:
 *   {systemInstruction} — injected as SystemMessage
 *   {userPrompt}        — injected as HumanMessage
 */
const answerChain = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate('{systemInstruction}'),
  HumanMessagePromptTemplate.fromTemplate('{userPrompt}'),
]).pipe(chatModel).pipe(new StringOutputParser());

/**
 * Classification chain:
 *   ChatPromptTemplate → ChatGoogleGenerativeAI → JsonOutputParser
 *
 * The system message is a static classification instruction.
 * The human message receives {question}.
 */
const CLASSIFY_SYSTEM = `You are a classification assistant for a College Fest chatbot.
Analyze the user's question and return a JSON object with the following fields:
{
  "source": "structured" | "vector" | "both",
  "event": string | null,
  "collections": Array<"events" | "announcements" | "sports">,
  "isTimeline": boolean,
  "isLiveScore": boolean
}

Rules:
1. Use "structured" if the query is about event dates, locations, schedules, announcements, sports scores, or lists of events.
2. Use "vector" if the query is about rules, eligibility, judging criteria, team sizes, equipment, internet access, or rules of participation.
3. Use "both" if the query asks about both.`;

const classifyChain = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(CLASSIFY_SYSTEM),
  HumanMessagePromptTemplate.fromTemplate('Classify this user question: "{question}"'),
]).pipe(classifyModel).pipe(new JsonOutputParser());

// ─── Default Classification Fallback ─────────────────────────────────────────

const DEFAULT_CLASSIFICATION = {
  source: 'both',
  event: null,
  collections: ['events', 'announcements', 'sports'],
  isTimeline: false,
  isLiveScore: false,
};

// ─── Service Class ────────────────────────────────────────────────────────────

class LlmService {
  /**
   * Generates a float vector embedding for the given text.
   * Used for MongoDB Atlas Vector Search.
   *
   * @param {string} text
   * @returns {Promise<number[]>} Embedding vector
   */
  static async generateEmbedding(text) {
    logger.debug('Generating query embedding for vector search', {
      model: env.EMBEDDING_MODEL,
    });

    // embedQuery returns number[] directly — identical to previous return shape
    const vector = await embeddingModel.embedQuery(text);

    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error('Embeddings API returned empty vector');
    }

    return vector;
  }

  /**
   * Classifies a user question to identify relevant data sources,
   * event name, timeline flag, and live score flag.
   *
   * Uses JsonOutputParser to reliably extract the JSON from the model response.
   * Falls back to DEFAULT_CLASSIFICATION on any error.
   *
   * @param {string} question
   * @returns {Promise<{ source: string, event: string|null, collections: string[], isTimeline: boolean, isLiveScore: boolean }>}
   */
  static async classifyQuestion(question) {
    try {
      const classification = await classifyChain.invoke({ question });
      logger.debug('Question classified successfully', { question, classification });
      return classification;
    } catch (err) {
      logger.error('Question classification failed. Falling back to default (both).', {
        error: err.message,
      });
      return DEFAULT_CLASSIFICATION;
    }
  }

  /**
   * Generates a grounded answer using the RAG prompt chain.
   *
   * The chain:
   *   SystemMessage(systemInstruction) + HumanMessage(userPrompt)
   *   → ChatGoogleGenerativeAI
   *   → StringOutputParser (extracts .content string)
   *
   * @param {string} systemInstruction - Role + grounding rules
   * @param {string} userPrompt        - Merged context + question
   * @returns {Promise<string>} Generated answer text
   */
  static async getChatResponse(systemInstruction, userPrompt) {
    const answer = await answerChain.invoke({ systemInstruction, userPrompt });
    return answer?.trim() || "I couldn't find this information in the available data.";
  }
}

module.exports = LlmService;
