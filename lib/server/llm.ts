export type CompletionRequest = {
  system: string;
  user: string;
  schema: Record<string, unknown>;
};
export type CompletionResponse = {
  data: unknown;
  usage?: { inputTokens: number; outputTokens: number };
};
export type Completion = (
  request: CompletionRequest,
) => Promise<CompletionResponse>;
