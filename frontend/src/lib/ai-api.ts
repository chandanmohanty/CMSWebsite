import { adminFetch } from "./api";

/**
 * Thin client for the AI text endpoints, injectable so demo routes can mock it.
 * Backend tasks used by the builder: seo_copy (generate), rewrite, improve_grammar.
 */
export interface AiTextApi {
  generateText(task: string, input: string, context?: Record<string, unknown>): Promise<string>;
}

export function realAiApi(websiteId: string): AiTextApi {
  return {
    async generateText(task, input, context) {
      const res = await adminFetch<{ text: string }>("ai/generate-text", {
        method: "POST",
        body: JSON.stringify({ task, input, website_id: Number(websiteId), context }),
      });
      return res.text;
    },
  };
}
