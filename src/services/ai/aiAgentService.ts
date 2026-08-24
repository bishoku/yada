import {
  ChatMessage,
  ChatMemory,
  DiagramPatchResponse,
  LlmPreferences,
  LlmProfile,
  LogicalDiagram,
  VisualDiagram,
} from '../../types';
import { SYSTEM_PROMPT } from './systemPrompt';
import { decryptCredential } from './cryptoVault';
import { StorageService } from '../storage';

export interface ChatWithAgentParams {
  preferences: LlmPreferences;
  workspacePath: string;
  diagramId: string;
  currentLogical: LogicalDiagram;
  currentVisual: VisualDiagram;
  userMessage: string;
  signal?: AbortSignal;
}

export const UPDATE_DIAGRAM_TOOL_NAME = 'update_diagram';
export const UPDATE_DIAGRAM_TOOL_DESC =
  'Call this tool ONLY when the user explicitly requests creating, adding, modifying, deleting, or generating diagram nodes, edges, layouts, or flow simulation. Do not call this tool for general questions or explanations.';

export const UPDATE_DIAGRAM_PARAMETERS = {
  type: 'object',
  properties: {
    message: {
      type: 'string',
      description: 'Conversational response to the user explaining what changes were made in markdown format.',
    },
    updatedLogical: {
      type: 'object',
      description: 'Complete updated logical architecture topology. Must include: schemaVersion (always 2), nodes (array of {id, type, name, parentId?}), edges (array of {id, sourceId, targetId, isAsync, protocol?, description?}), sequences (array of {id, stepNumber, edgeId, isAsync, isRoundTrip?}). Return ALL existing items plus modifications.',
    },
    updatedVisual: {
      type: 'object',
      description: 'Complete updated visual layout. Must include: canvas ({zoom, pan:{x,y}}), layoutNodes (object keyed by node ID with {id, x, y, width, height, theme?, zIndex?, customStyles?}), layoutEdges (object keyed by edge ID with {id, sourceHandle, targetHandle, particleType?, showArrow?}), timelines (object keyed by sequence ID with {sequenceId, duration, delay}), annotations (object, can be empty {}).',
    },
    summary: {
      type: 'string',
      description: '1-2 sentence high-level summary of what this diagram architecture does.',
    },
  },
  required: ['message', 'updatedLogical', 'updatedVisual'],
};

/**
 * Strips reasoning tokens (e.g. <think>...</think>) from text content.
 */
export function cleanReasoningContent(text: string): string {
  if (!text) return '';
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/**
 * Robustly extracts diagram patch JSON from text content.
 * Handles markdown codeblocks, XML tool call tags, and raw JSON objects even when surrounded by reasoning text.
 */
export function extractDiagramJsonFromText(rawText: string): {
  message: string;
  updatedLogical: LogicalDiagram | null;
  updatedVisual: VisualDiagram | null;
  summary: string | null;
} | null {
  if (!rawText || !rawText.trim()) return null;

  // 1. Strip reasoning / thinking blocks
  const cleanText = cleanReasoningContent(rawText);

  // 2. Check for XML tool call wrappers: <tool_call>...</tool_call> or <function_call>...</function_call>
  const toolCallMatch = cleanText.match(/<(?:tool_call|function_call)>([\s\S]*?)<\/(?:tool_call|function_call)>/i);
  if (toolCallMatch) {
    try {
      const parsedTool = JSON.parse(toolCallMatch[1].trim());
      const args = parsedTool.arguments || parsedTool.args || parsedTool;
      if (args && (args.updatedLogical || args.updatedVisual || args.message)) {
        return {
          message: args.message || 'Diyagram güncellendi.',
          updatedLogical: args.updatedLogical || null,
          updatedVisual: args.updatedVisual || null,
          summary: args.summary || null,
        };
      }
    } catch {
      // Continue to next check
    }
  }

  // 3. Check for Markdown codeblocks: ```json ... ``` or ``` ... ```
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let match;
  while ((match = codeBlockRegex.exec(cleanText)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed && typeof parsed === 'object' && (parsed.updatedLogical || parsed.updatedVisual)) {
        return {
          message: parsed.message || 'Diyagram güncellendi.',
          updatedLogical: parsed.updatedLogical || null,
          updatedVisual: parsed.updatedVisual || null,
          summary: parsed.summary || null,
        };
      }
    } catch {
      // Not valid JSON inside this code block, continue
    }
  }

  // 4. Try parsing the whole cleaned text as JSON
  try {
    const parsed = JSON.parse(cleanText);
    if (parsed && typeof parsed === 'object') {
      if (parsed.updatedLogical || parsed.updatedVisual) {
        return {
          message: parsed.message || 'Diyagram güncellendi.',
          updatedLogical: parsed.updatedLogical || null,
          updatedVisual: parsed.updatedVisual || null,
          summary: parsed.summary || null,
        };
      }
      if (parsed.message) {
        return {
          message: parsed.message,
          updatedLogical: null,
          updatedVisual: null,
          summary: parsed.summary || null,
        };
      }
    }
  } catch {
    // Continue
  }

  // 5. Try finding the outermost JSON object substring: { ... }
  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidateJson = cleanText.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(candidateJson);
      if (parsed && typeof parsed === 'object' && (parsed.updatedLogical || parsed.updatedVisual)) {
        return {
          message: parsed.message || cleanText.slice(0, firstBrace).trim() || 'Diyagram güncellendi.',
          updatedLogical: parsed.updatedLogical || null,
          updatedVisual: parsed.updatedVisual || null,
          summary: parsed.summary || null,
        };
      }
    } catch {
      // Not a valid JSON object
    }
  }

  return null;
}

/**
 * Returns the storage path for a diagram's chat memory.
 */
export function getChatMemoryPath(workspacePath: string, diagramId: string): string {
  const cleanWs = workspacePath.replace(/\/+$/, '');
  return `${cleanWs}/diagrams/${diagramId}_chat_memory.json`;
}

/**
 * Loads chat memory from storage.
 */
export async function loadChatMemory(workspacePath: string, diagramId: string): Promise<ChatMemory> {
  const memoryPath = getChatMemoryPath(workspacePath, diagramId);
  try {
    const rawContent = await StorageService.read_text_file(memoryPath);
    if (rawContent && rawContent.trim()) {
      const parsed = JSON.parse(rawContent);
      return {
        diagramSummary: parsed.diagramSummary || '',
        shortTermMessages: Array.isArray(parsed.shortTermMessages) ? parsed.shortTermMessages : [],
      };
    }
  } catch {
    // Memory file doesn't exist yet or failed to read
  }

  return {
    diagramSummary: '',
    shortTermMessages: [],
  };
}

/**
 * Saves chat memory to storage.
 */
export async function saveChatMemory(workspacePath: string, diagramId: string, memory: ChatMemory): Promise<void> {
  const memoryPath = getChatMemoryPath(workspacePath, diagramId);
  try {
    const content = JSON.stringify(memory, null, 2);
    await StorageService.save_text_file(memoryPath, content);
  } catch (err) {
    console.warn('[AiAgentService] Failed to save chat memory:', err);
  }
}

/**
 * Clears chat memory for a diagram.
 */
export async function clearChatMemory(workspacePath: string, diagramId: string): Promise<void> {
  const memoryPath = getChatMemoryPath(workspacePath, diagramId);
  try {
    await StorageService.delete_file(memoryPath);
  } catch {
    // Already deleted or not supported
  }
}

/**
 * Resolves active profile or fallback preferences.
 */
export function resolveActiveProfile(prefs: LlmPreferences): {
  provider: string;
  apiUrl: string;
  apiKey: string;
  model: string;
} {
  const activeProfile = prefs.profiles?.find((p: LlmProfile) => p.id === prefs.activeProfileId) || prefs.profiles?.[0];

  const provider = (activeProfile?.provider || prefs.provider || 'openrouter').toLowerCase();
  const apiUrl = (activeProfile?.apiUrl || prefs.apiUrl || '').trim();
  const apiKey = (activeProfile?.apiKey || prefs.apiKey || '').trim();
  const model = (activeProfile?.model || prefs.model || '').trim();

  return { provider, apiUrl, apiKey, model };
}

/**
 * Universal client-side AI agent orchestrator using Tool Calling and Fast Fallback.
 * Sends prompt to the configured LLM provider and returns patched diagram data.
 */
export async function chatWithAgent(params: ChatWithAgentParams): Promise<{
  patchResponse: DiagramPatchResponse;
  memory: ChatMemory;
}> {
  const { preferences, workspacePath, diagramId, currentLogical, currentVisual, userMessage, signal } = params;

  const { provider, apiUrl, apiKey: rawApiKey, model } = resolveActiveProfile(preferences);

  // Decrypt API key if encrypted
  const decryptedKey = await decryptCredential(rawApiKey);

  // Ollama and local providers don't strictly require an API key
  const isLocalProvider = provider === 'ollama' || apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1');
  if (!decryptedKey && !isLocalProvider) {
    throw new Error('API key is not configured. Please set your API key in Preferences.');
  }

  // Load chat memory
  const memory = await loadChatMemory(workspacePath, diagramId);

  // Add user message to history
  const userMsgStruct: ChatMessage = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sender: 'user',
    text: userMessage,
    timestamp: new Date().toISOString(),
  };
  // Build context payload (exclude current message from history to avoid duplication)
  const historyStr = memory.shortTermMessages
    .map((m) => `${m.sender}: ${m.text}`)
    .join('\n');

  memory.shortTermMessages.push(userMsgStruct);

  const promptPayload = `CURRENT DIAGRAM SUMMARY:
${memory.diagramSummary || 'Empty diagram'}

CURRENT LOGICAL DATA:
${JSON.stringify(currentLogical)}

CURRENT VISUAL DATA:
${JSON.stringify(currentVisual)}

CONVERSATION HISTORY:
${historyStr}

USER PROMPT:
${userMessage}`;

  // Shared Tool schema definitions
  const openAiTools = [
    {
      type: 'function',
      function: {
        name: UPDATE_DIAGRAM_TOOL_NAME,
        description: UPDATE_DIAGRAM_TOOL_DESC,
        parameters: UPDATE_DIAGRAM_PARAMETERS,
      },
    },
  ];

  let rawTextContent = '';
  let toolCallArgs: any = null;

  switch (provider) {
    case 'anthropic': {
      const baseUrl = apiUrl || 'https://api.anthropic.com/v1';
      const endpoint = baseUrl.endsWith('/messages') ? baseUrl : `${baseUrl.replace(/\/+$/, '')}/messages`;

      const anthropicTools = [
        {
          name: UPDATE_DIAGRAM_TOOL_NAME,
          description: UPDATE_DIAGRAM_TOOL_DESC,
          input_schema: UPDATE_DIAGRAM_PARAMETERS,
        },
      ];

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': decryptedKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: 16384,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: promptPayload }],
          tools: anthropicTools,
          tool_choice: { type: 'auto' },
        }),
        signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Anthropic Provider Error (${response.status}): ${errText}`);
      }

      const resJson = await response.json();
      if (Array.isArray(resJson.content)) {
        for (const block of resJson.content) {
          if (block.type === 'text' && typeof block.text === 'string') {
            rawTextContent += (rawTextContent ? '\n\n' : '') + block.text;
          } else if (block.type === 'tool_use' && block.name === UPDATE_DIAGRAM_TOOL_NAME) {
            toolCallArgs = block.input;
          }
        }
      }
      break;
    }

    case 'gemini': {
      const modelName = model || 'gemini-1.5-pro';
      const baseUrl = apiUrl || 'https://generativelanguage.googleapis.com/v1beta';
      const endpoint = `${baseUrl.replace(/\/+$/, '')}/models/${modelName}:generateContent?key=${decryptedKey}`;

      const geminiTools = [
        {
          functionDeclarations: [
            {
              name: UPDATE_DIAGRAM_TOOL_NAME,
              description: UPDATE_DIAGRAM_TOOL_DESC,
              parameters: {
                type: 'OBJECT',
                properties: {
                  message: { type: 'STRING', description: 'Conversational response in markdown.' },
                  updatedLogical: { type: 'OBJECT', description: 'Complete updated logical architecture topology.' },
                  updatedVisual: { type: 'OBJECT', description: 'Complete updated visual layout.' },
                  summary: { type: 'STRING', description: '1-2 sentence high-level summary.' },
                },
                required: ['message', 'updatedLogical', 'updatedVisual'],
              },
            },
          ],
        },
      ];

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          contents: [
            {
              parts: [{ text: promptPayload }],
            },
          ],
          tools: geminiTools,
          generationConfig: {
            maxOutputTokens: 16384,
          },
        }),
        signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Gemini Provider Error (${response.status}): ${errText}`);
      }

      const resJson = await response.json();
      const parts = resJson.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.text) {
          rawTextContent += (rawTextContent ? '\n\n' : '') + part.text;
        }
        if (part.functionCall && part.functionCall.name === UPDATE_DIAGRAM_TOOL_NAME) {
          toolCallArgs = part.functionCall.args;
        }
      }
      break;
    }

    case 'ollama': {
      const baseUrl = apiUrl || 'http://localhost:11434/v1';
      const endpoint = baseUrl.endsWith('/chat/completions')
        ? baseUrl
        : `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (decryptedKey) {
        headers['Authorization'] = `Bearer ${decryptedKey}`;
      }

      // Ollama: Do NOT send tools — local models rarely support native tool calling.
      // Rely on system prompt JSON instructions + extractDiagramJsonFromText() fallback.
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model || 'llama3.2',
          max_tokens: 16384,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: promptPayload },
          ],
        }),
        signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Ollama Provider Error (${response.status}): ${errText}`);
      }

      const resJson = await response.json();
      const choiceMsg = resJson.choices?.[0]?.message;
      rawTextContent = typeof choiceMsg?.content === 'string' ? choiceMsg.content : '';
      break;
    }

    case 'openai': {
      // OpenAI direct: native tool calling support — send tools for structured output
      const endpoint = apiUrl || 'https://api.openai.com/v1/chat/completions';
      const finalEndpoint = endpoint.endsWith('/chat/completions')
        ? endpoint
        : `${endpoint.replace(/\/+$/, '')}/chat/completions`;

      const response = await fetch(finalEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${decryptedKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          max_tokens: 16384,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: promptPayload },
          ],
          tools: openAiTools,
          tool_choice: 'auto',
        }),
        signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`OpenAI Provider Error (${response.status}): ${errText}`);
      }

      const resJson = await response.json();
      const choiceMsg = resJson.choices?.[0]?.message;
      rawTextContent = typeof choiceMsg?.content === 'string' ? choiceMsg.content : '';

      if (Array.isArray(choiceMsg?.tool_calls)) {
        const match = choiceMsg.tool_calls.find(
          (tc: any) => tc.function?.name === UPDATE_DIAGRAM_TOOL_NAME || tc.name === UPDATE_DIAGRAM_TOOL_NAME
        );
        if (match) {
          const rawArgs = match.function?.arguments || match.arguments;
          if (typeof rawArgs === 'string') {
            try {
              toolCallArgs = JSON.parse(rawArgs);
            } catch (err) {
              console.warn('[AiAgentService] Failed to parse tool_calls arguments JSON:', err);
            }
          } else if (typeof rawArgs === 'object' && rawArgs !== null) {
            toolCallArgs = rawArgs;
          }
        }
      }
      break;
    }

    case 'openrouter':
    case 'custom':
    default: {
      // OpenRouter / Custom: Do NOT send tools.
      // OpenRouter's tool emulation layer causes massive overhead and token waste
      // with thinking models (Gemini 3.7 Flash, DeepSeek-R1, Qwen, etc.).
      // Instead, rely on system prompt JSON instructions + extractDiagramJsonFromText().
      const defaultUrl = 'https://openrouter.ai/api/v1/chat/completions';

      let endpoint = apiUrl;
      if (!endpoint) {
        endpoint = defaultUrl;
      } else if (!endpoint.endsWith('/chat/completions')) {
        endpoint = `${endpoint.replace(/\/+$/, '')}/chat/completions`;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${decryptedKey}`,
      };

      if (provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://yada.dev';
        headers['X-Title'] = 'YADA Diagramer';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model || 'anthropic/claude-3.5-sonnet',
          max_tokens: 16384,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: promptPayload },
          ],
        }),
        signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`LLM Provider Error (${response.status}): ${errText}`);
      }

      const resJson = await response.json();
      const choice = resJson.choices?.[0];
      const choiceMsg = choice?.message;

      // Detect thinking models that exhausted token budget on reasoning
      const finishReason = choice?.finish_reason || choice?.native_finish_reason || '';
      if (
        (!choiceMsg?.content && finishReason === 'length') ||
        finishReason === 'MAX_TOKENS'
      ) {
        throw new Error(
          'Model used all available tokens for reasoning/thinking and could not produce a response. ' +
          'This typically happens with thinking models (e.g., Gemini 3.7 Flash, DeepSeek-R1). ' +
          'Try a simpler prompt or a non-thinking model variant.'
        );
      }

      rawTextContent = typeof choiceMsg?.content === 'string' ? choiceMsg.content : '';
      break;
    }
  }

  // Clean any reasoning / thinking tokens that may have leaked into raw text
  const cleanedTextContent = cleanReasoningContent(rawTextContent);

  let patchResponse: DiagramPatchResponse;

  if (toolCallArgs && typeof toolCallArgs === 'object') {
    // 1. LLM explicitly called update_diagram tool
    patchResponse = {
      message: toolCallArgs.message || cleanedTextContent || 'Diyagram güncellendi.',
      updatedLogical: toolCallArgs.updatedLogical || null,
      updatedVisual: toolCallArgs.updatedVisual || null,
      summary: toolCallArgs.summary || null,
    };
  } else {
    // 2. No native tool call returned. Use robust text extractor to check for JSON/tool XML/codeblocks
    const extracted = extractDiagramJsonFromText(rawTextContent);
    if (extracted && (extracted.updatedLogical || extracted.updatedVisual)) {
      patchResponse = {
        message: extracted.message || 'Diyagram güncellendi.',
        updatedLogical: extracted.updatedLogical,
        updatedVisual: extracted.updatedVisual,
        summary: extracted.summary,
      };
    } else if (extracted && extracted.message && !extracted.updatedLogical && !extracted.updatedVisual) {
      patchResponse = {
        message: extracted.message,
        updatedLogical: null,
        updatedVisual: null,
        summary: extracted.summary,
      };
    } else {
      // 3. Natural conversational response (e.g. questions, explanations)
      patchResponse = {
        message: cleanedTextContent || rawTextContent.trim(),
        updatedLogical: null,
        updatedVisual: null,
        summary: null,
      };
    }
  }

  // Add assistant message to memory
  const assistantMsgStruct: ChatMessage = {
    id: `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sender: 'assistant',
    text: patchResponse.message,
    timestamp: new Date().toISOString(),
  };
  memory.shortTermMessages.push(assistantMsgStruct);

  if (patchResponse.summary) {
    memory.diagramSummary = patchResponse.summary;
  }

  // Trim memory if limit is reached
  const memoryLimit = preferences.shortTermMemoryLimit || 20;
  if (memory.shortTermMessages.length > memoryLimit) {
    const truncateAt = memory.shortTermMessages.length - Math.floor(memoryLimit / 2);
    memory.shortTermMessages = memory.shortTermMessages.slice(truncateAt);
  }

  // Save updated memory
  await saveChatMemory(workspacePath, diagramId, memory);

  return { patchResponse, memory };
}
