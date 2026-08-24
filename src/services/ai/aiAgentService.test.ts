import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getChatMemoryPath,
  resolveActiveProfile,
  chatWithAgent,
  cleanReasoningContent,
  extractDiagramJsonFromText,
  UPDATE_DIAGRAM_TOOL_NAME,
} from './aiAgentService';
import { LlmPreferences, LogicalDiagram, VisualDiagram } from '../../types';

// Mock StorageService
vi.mock('../storage', () => ({
  StorageService: {
    read_text_file: vi.fn().mockResolvedValue(''),
    save_text_file: vi.fn().mockResolvedValue(undefined),
    delete_file: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock cryptoVault - return keys as-is (no encryption)
vi.mock('./cryptoVault', () => ({
  decryptCredential: vi.fn().mockImplementation((key: string) => Promise.resolve(key)),
  isEncrypted: vi.fn().mockReturnValue(false),
  encryptCredential: vi.fn().mockImplementation((key: string) => Promise.resolve(key)),
}));

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

  it('should clean reasoning tags properly', () => {
    const raw = '<think>I should think about what to answer...\nLet us check the nodes.</think>\nHere is the answer.';
    expect(cleanReasoningContent(raw)).toBe('Here is the answer.');
    expect(cleanReasoningContent('')).toBe('');
  });

  it('should extract diagram JSON from various text formats including reasoning and tool tags', () => {
    const samplePayload = {
      message: 'Redis eklendi',
      updatedLogical: { schemaVersion: 2, nodes: [{ id: 'n1', type: 'cache' }], edges: [], sequences: [] },
      updatedVisual: { canvas: {}, layoutNodes: {}, layoutEdges: {}, timelines: {} },
      summary: 'Redis cache',
    };

    // Format 1: Thinking + Markdown codeblock
    const textWithThink = `<think>Analyzing...</think>\n\`\`\`json\n${JSON.stringify(samplePayload)}\n\`\`\``;
    const res1 = extractDiagramJsonFromText(textWithThink);
    expect(res1?.message).toBe('Redis eklendi');
    expect(res1?.updatedLogical?.nodes.length).toBe(1);

    // Format 2: Thinking + XML tool_call
    const textWithXml = `<think>Calling tool...</think>\n<tool_call>{"name":"update_diagram","arguments":${JSON.stringify(samplePayload)}}</tool_call>`;
    const res2 = extractDiagramJsonFromText(textWithXml);
    expect(res2?.message).toBe('Redis eklendi');
    expect(res2?.updatedLogical?.nodes.length).toBe(1);

    // Format 3: Raw JSON object inside text
    const textWithRaw = `Here are the changes: ${JSON.stringify(samplePayload)}`;
    const res3 = extractDiagramJsonFromText(textWithRaw);
    expect(res3?.message).toBe('Redis eklendi');
    expect(res3?.updatedLogical?.nodes.length).toBe(1);

    // Format 4: Conversational text only
    const res4 = extractDiagramJsonFromText('<think>Thinking...</think>\nJust an explanation.');
    expect(res4).toBeNull();
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

  it('should execute OpenRouter chat request with JSON content extraction (no tool calling)', async () => {
    const mockPayload = {
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

    // OpenRouter: model returns JSON in content (with possible reasoning tags), NOT tool_calls
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: `<think>User requested adding Redis cache. Let me generate the diagram.</think>\n\`\`\`json\n${JSON.stringify(mockPayload)}\n\`\`\``,
            },
          },
        ],
      }),
    });

    const prefs: LlmPreferences = {
      provider: 'openrouter',
      apiUrl: 'https://openrouter.ai/api/v1',
      apiKey: 'sk-or-test-key',
      model: 'qwen/qwen-2.5-coder-32b-instruct',
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
    expect(result.memory.shortTermMessages.length).toBe(2);

    // Verify tools were NOT sent in the request
    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    expect(requestBody.tools).toBeUndefined();
  });

  it('should execute Anthropic chat request with Tool Calling (tool_use)', async () => {
    const mockToolInput = {
      message: 'Created PostgreSQL Database connected to Order Service.',
      updatedLogical: {
        schemaVersion: 2,
        nodes: [
          { id: 'n1', type: 'server', name: 'Order Service' },
          { id: 'n2', type: 'database', name: 'PostgreSQL' },
        ],
        edges: [{ id: 'e1', sourceId: 'n1', targetId: 'n2', isAsync: false, protocol: 'TCP' }],
        sequences: [],
      },
      updatedVisual: {
        canvas: { zoom: 1, pan: { x: 0, y: 0 } },
        layoutNodes: {},
        layoutEdges: {},
        timelines: {},
      },
      summary: 'PostgreSQL DB added.',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        content: [
          { type: 'thinking', thinking: 'Evaluating architecture diagram...' },
          { type: 'tool_use', id: 'tool_1', name: UPDATE_DIAGRAM_TOOL_NAME, input: mockToolInput },
        ],
      }),
    });

    const prefs: LlmPreferences = {
      provider: 'anthropic',
      apiUrl: 'https://api.anthropic.com/v1',
      apiKey: 'sk-ant-test',
      model: 'claude-3-7-sonnet-20250219',
    };

    const result = await chatWithAgent({
      preferences: prefs,
      workspacePath: 'memory://test',
      diagramId: 'test-diagram',
      currentLogical: dummyLogical,
      currentVisual: dummyVisual,
      userMessage: 'Postgres DB bağla',
    });

    expect(result.patchResponse.message).toBe('Created PostgreSQL Database connected to Order Service.');
    expect(result.patchResponse.updatedLogical?.nodes.length).toBe(2);
    expect(result.patchResponse.summary).toBe('PostgreSQL DB added.');
  });

  it('should execute Gemini chat request with functionCall tool', async () => {
    const mockToolArgs = {
      message: 'Added Kafka Event Bus.',
      updatedLogical: {
        schemaVersion: 2,
        nodes: [
          { id: 'n1', type: 'server', name: 'Order Service' },
          { id: 'n2', type: 'queue', name: 'Kafka' },
        ],
        edges: [],
        sequences: [],
      },
      updatedVisual: {
        canvas: { zoom: 1, pan: { x: 0, y: 0 } },
        layoutNodes: {},
        layoutEdges: {},
        timelines: {},
      },
      summary: 'Kafka queue added.',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: UPDATE_DIAGRAM_TOOL_NAME,
                    args: mockToolArgs,
                  },
                },
              ],
            },
          },
        ],
      }),
    });

    const prefs: LlmPreferences = {
      provider: 'gemini',
      apiUrl: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: 'test-gemini-key',
      model: 'gemini-2.0-flash',
    };

    const result = await chatWithAgent({
      preferences: prefs,
      workspacePath: 'memory://test',
      diagramId: 'test-diagram',
      currentLogical: dummyLogical,
      currentVisual: dummyVisual,
      userMessage: 'Kafka ekle',
    });

    expect(result.patchResponse.message).toBe('Added Kafka Event Bus.');
    expect(result.patchResponse.updatedLogical?.nodes.length).toBe(2);
  });

  it('should handle pure conversational text without calling any tools (e.g. asking architectural questions)', async () => {
    const conversationalText = 'Bu mimaride 1 adet Order Service mikroservisi bulunmaktadır. Başka bir bileşen henüz eklenmemiştir.';

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: `<think>User asked a question. No diagram changes required.</think>\n${conversationalText}`,
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

  it('should gracefully fallback when non-tool model returns raw JSON in content', async () => {
    const rawJson = {
      message: 'Fallback JSON update.',
      updatedLogical: {
        schemaVersion: 2,
        nodes: [{ id: 'n1', type: 'server', name: 'Order Service' }],
        edges: [],
        sequences: [],
      },
      updatedVisual: {
        canvas: { zoom: 1, pan: { x: 0, y: 0 } },
        layoutNodes: {},
        layoutEdges: {},
        timelines: {},
      },
      summary: 'Fallback test.',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: `\`\`\`json\n${JSON.stringify(rawJson)}\n\`\`\``,
            },
          },
        ],
      }),
    });

    const prefs: LlmPreferences = {
      provider: 'ollama',
      apiUrl: 'http://localhost:11434/v1',
      apiKey: '',
      model: 'llama3.2',
    };

    const result = await chatWithAgent({
      preferences: prefs,
      workspacePath: 'memory://test',
      diagramId: 'test-diagram',
      currentLogical: dummyLogical,
      currentVisual: dummyVisual,
      userMessage: 'Test update',
    });

    expect(result.patchResponse.message).toBe('Fallback JSON update.');
    expect(result.patchResponse.updatedLogical).toBeDefined();
    expect(result.patchResponse.summary).toBe('Fallback test.');
  });
});

