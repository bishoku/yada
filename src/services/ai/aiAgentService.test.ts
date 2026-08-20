import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getChatMemoryPath,
  resolveActiveProfile,
  chatWithAgent,
} from './aiAgentService';
import { LlmPreferences, LogicalDiagram, VisualDiagram } from '../../types';

describe('aiAgentService', () => {
  const dummyLogical: LogicalDiagram = {
    schemaVersion: 2,
    nodes: [{ id: 'n1', type: 'server', name: 'Order Service' }],
    edges: [],
    sequences: [],
  };

  const dummyVisual: VisualDiagram = {
    canvas: { zoom: 1, pan: { x: 0, y: 0 } },
    layoutNodes: { n1: { id: 'n1', x: 100, y: 100, width: 224, height: 52 } },
    layoutEdges: {},
    timelines: {},
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate the correct chat memory path', () => {
    const p1 = getChatMemoryPath('/my/workspace', 'diag-123');
    expect(p1).toBe('/my/workspace/diagrams/diag-123_chat_memory.json');

    const p2 = getChatMemoryPath('/trailing/slash/', 'diag-456');
    expect(p2).toBe('/trailing/slash/diagrams/diag-456_chat_memory.json');
  });

  it('should resolve active profile correctly', () => {
    const prefs: LlmPreferences = {
      activeProfileId: 'p2',
      profiles: [
        { id: 'p1', name: 'OpenAI', provider: 'openai', apiUrl: 'https://api.openai.com/v1', apiKey: 'key1', model: 'gpt-4o' },
        { id: 'p2', name: 'Gemini', provider: 'gemini', apiUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKey: 'key2', model: 'gemini-1.5-pro' },
      ],
      provider: 'openrouter',
      apiUrl: 'https://openrouter.ai/api/v1',
      apiKey: 'key0',
      model: 'anthropic/claude-3.5-sonnet',
    };

    const resolved = resolveActiveProfile(prefs);
    expect(resolved.provider).toBe('gemini');
    expect(resolved.apiKey).toBe('key2');
    expect(resolved.model).toBe('gemini-1.5-pro');
  });

  it('should execute OpenRouter chat request and parse JSON response correctly', async () => {
    const mockResponsePayload = {
      message: 'Added Redis Cache to the architecture.',
      updatedLogical: {
        schemaVersion: 2,
        nodes: [
          { id: 'n1', type: 'server', name: 'Order Service' },
          { id: 'n2', type: 'cache', name: 'Redis Cache' },
        ],
        edges: [
          { id: 'e1', sourceId: 'n1', targetId: 'n2', isAsync: false, protocol: 'TCP' },
        ],
        sequences: [
          { id: 's1', stepNumber: 1, edgeId: 'e1', isAsync: false },
        ],
      },
      updatedVisual: {
        canvas: { zoom: 1, pan: { x: 0, y: 0 } },
        layoutNodes: {
          n1: { id: 'n1', x: 100, y: 100, width: 224, height: 52 },
          n2: { id: 'n2', x: 400, y: 100, width: 224, height: 52, theme: 'cyan' },
        },
        layoutEdges: {},
        timelines: {},
      },
      summary: 'Order service connected to Redis cache.',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: `\`\`\`json\n${JSON.stringify(mockResponsePayload)}\n\`\`\``,
            },
          },
        ],
      }),
    });

    const prefs: LlmPreferences = {
      provider: 'openrouter',
      apiUrl: 'https://openrouter.ai/api/v1',
      apiKey: 'sk-or-test-key',
      model: 'anthropic/claude-3.5-sonnet',
    };

    const result = await chatWithAgent({
      preferences: prefs,
      workspacePath: 'memory://test',
      diagramId: 'test-diagram',
      currentLogical: dummyLogical,
      currentVisual: dummyVisual,
      userMessage: 'Redis cache ekle',
    });

    expect(result.patchResponse.message).toBe('Added Redis Cache to the architecture.');
    expect(result.patchResponse.updatedLogical?.nodes.length).toBe(2);
    expect(result.patchResponse.summary).toBe('Order service connected to Redis cache.');
    expect(result.memory.shortTermMessages.length).toBe(2); // 1 user + 1 assistant
  });

  it('should gracefully fallback when model outputs plain conversational text without JSON', async () => {
    const conversationalText = 'Bu mimaride 1 adet Order Service microservisi bulunmaktadır.';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: conversationalText,
            },
          },
        ],
      }),
    });

    const prefs: LlmPreferences = {
      provider: 'openai',
      apiUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test-key',
      model: 'gpt-4o',
    };

    const result = await chatWithAgent({
      preferences: prefs,
      workspacePath: 'memory://test',
      diagramId: 'test-diagram',
      currentLogical: dummyLogical,
      currentVisual: dummyVisual,
      userMessage: 'Mimaride hangi servisler var?',
    });

    expect(result.patchResponse.message).toBe(conversationalText);
    expect(result.patchResponse.updatedLogical).toBeNull();
    expect(result.patchResponse.updatedVisual).toBeNull();
  });
});
