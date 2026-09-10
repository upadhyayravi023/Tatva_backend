'use strict';

/**
 * prompt.service.js — LangChain-powered prompt builder
 *
 * Uses ChatPromptTemplate internally to assemble the RAG prompt.
 * The external interface (buildPrompt signature + return shape) is
 * IDENTICAL to the previous implementation — llm.service.js and
 * chat.service.js require zero changes.
 *
 * Template variables:
 *   {mergedContext} — structured DB data + rulebook chunks joined together
 *   {question}      — the user's original question
 */

const { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } = require('@langchain/core/prompts');

// ─── Static Templates ─────────────────────────────────────────────────────────
// Built once at module load — ChatPromptTemplate objects are stateless and
// safe to reuse across all requests.

const SYSTEM_TEMPLATE = `You are the official AI assistant for the College Fest.
Answer ONLY using the provided context.
If the answer is not present in the context, respond EXACTLY with:
"I couldn't find this information in the available data."
Do not make assumptions.
Do not hallucinate.
Keep responses concise and accurate.`;

const HUMAN_TEMPLATE = `Context:
{mergedContext}

Question:
{question}

Answer:`;

/**
 * Pre-built ChatPromptTemplate.
 * Invoking it produces a ChatPromptValue (list of BaseMessages).
 * We use formatMessages() to extract the final strings.
 */
const ragPromptTemplate = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(SYSTEM_TEMPLATE),
  HumanMessagePromptTemplate.fromTemplate(HUMAN_TEMPLATE),
]);

// ─── Service Class ─────────────────────────────────────────────────────────────

class PromptService {
  /**
   * Constructs system and user prompts for the RAG answer chain.
   *
   * Internally uses ChatPromptTemplate to format the messages, then
   * extracts the content strings — keeping the same return shape
   * { systemInstruction: string, userPrompt: string } as before.
   *
   * @param {string} question
   * @param {string} mongoContext      - Formatted structured DB context
   * @param {string} rulebookContext   - Formatted vector search chunks
   * @returns {{ systemInstruction: string, userPrompt: string }}
   */
  static buildPrompt(question, mongoContext, rulebookContext) {
    // Merge both context sources (same logic as before)
    const contextParts = [];

    if (mongoContext && mongoContext.trim()) {
      contextParts.push(`[Structured Database Info]\n${mongoContext}`);
    }

    if (rulebookContext && rulebookContext.trim()) {
      contextParts.push(`[Rulebook Documents Info]\n${rulebookContext}`);
    }

    const mergedContext = contextParts.length > 0
      ? contextParts.join('\n\n================================\n\n')
      : 'No relevant context found.';

    // Use ChatPromptTemplate to format messages — extract content strings
    // formatMessages() is synchronous for string-only templates
    const messages = ragPromptTemplate.promptMessages.map((msgTemplate) => {
      if (msgTemplate.role === 'system' || msgTemplate.constructor.name === 'SystemMessagePromptTemplate') {
        return { role: 'system', content: SYSTEM_TEMPLATE };
      }
      // Human message — interpolate variables
      const content = HUMAN_TEMPLATE
        .replace('{mergedContext}', mergedContext)
        .replace('{question}', question);
      return { role: 'human', content };
    });

    return {
      systemInstruction: messages[0].content,
      userPrompt: messages[1].content,
    };
  }
}

module.exports = PromptService;
