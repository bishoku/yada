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
 * Universal client-side AI agent orchestrator.
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
  memory.shortTermMessages.push(userMsgStruct);

  // Build context payload
  const historyStr = memory.shortTermMessages
    .map((m) => `${m.sender}: ${m.text}`)
    .join('\n');

  const promptPayload = `${SYSTEM_PROMPT}

CURRENT DIAGRAM SUMMARY:
${memory.diagramSummary || 'Empty diagram'}

CURRENT LOGICAL DATA:
${JSON.stringify(currentLogical)}

CURRENT VISUAL DATA:
${JSON.stringify(currentVisual)}

CONVERSATION HISTORY:
${historyStr}

USER PROMPT:
${userMessage}`;

  let rawText = '';

  switch (provider) {
    case 'anthropic': {
      const baseUrl = apiUrl || 'https://api.anthropic.com/v1';
      const endpoint = baseUrl.endsWith('/messages') ? baseUrl : `${baseUrl.replace(/\/+$/, '')}/messages`;

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
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: promptPayload }],
        }),
        signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Anthropic Provider Error (${response.status}): ${errText}`);
      }

      const resJson = await response.json();
      rawText = resJson.content?.[0]?.text || '';
      break;
    }

    case 'gemini': {
      const modelName = model || 'gemini-1.5-pro';
      const baseUrl = apiUrl || 'https://generativelanguage.googleapis.com/v1beta';
      const endpoint = `${baseUrl.replace(/\/+$/, '')}/models/${modelName}:generateContent?key=${decryptedKey}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${SYSTEM_PROMPT}\n\n${promptPayload}` }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
        signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Gemini Provider Error (${response.status}): ${errText}`);
      }

      const resJson = await response.json();
      rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
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

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model || 'llama3.2',
          format: 'json',
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
      rawText = resJson.choices?.[0]?.message?.content || '';
      break;
    }

    case 'openai':
    case 'openrouter':
    case 'custom':
    default: {
      const isOai = provider === 'openai';
      const defaultUrl = isOai
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://openrouter.ai/api/v1/chat/completions';

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

      const defaultModel = isOai ? 'gpt-4o' : 'anthropic/claude-3.5-sonnet';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: model || defaultModel,
          response_format: { type: 'json_object' },
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
      rawText = resJson.choices?.[0]?.message?.content || '';
      break;
    }
  }

  // Clean markdown block wrappers if present
  let cleanContent = rawText.trim();
  if (cleanContent.startsWith('```json')) {
    cleanContent = cleanContent.slice(7);
  } else if (cleanContent.startsWith('```')) {
    cleanContent = cleanContent.slice(3);
  }
  if (cleanContent.endsWith('```')) {
    cleanContent = cleanContent.slice(0, -3);
  }
  cleanContent = cleanContent.trim();

  let patchResponse: DiagramPatchResponse;

  try {
    const parsed = JSON.parse(cleanContent);
    patchResponse = {
      message: parsed.message || cleanContent,
      updatedLogical: parsed.updatedLogical || null,
      updatedVisual: parsed.updatedVisual || null,
      summary: parsed.summary || null,
    };
  } catch {
    // If the model responded with conversational text instead of strict JSON,
    // graceful fallback to text message without failing.
    patchResponse = {
      message: rawText.trim(),
      updatedLogical: null,
      updatedVisual: null,
      summary: null,
    };
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
