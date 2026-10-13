import { useAppStore } from '../store/useAppStore';
import { StorageService } from '../services/storage';
import mermaid from 'mermaid';
import { describe, expect, it, vi } from 'vitest';
import { mermaidAdapter, MermaidImportError } from './mermaidAdapter';
import { generateMermaidSequence } from '../utils/exportMermaid';
import { buildSequenceLayout } from '../components/sequence/useSequenceLayout';
import { calculateSchedules } from '../store/scheduler';
import { repairDiagram } from '../utils/workspaceZip';
import { validateAndRepairAiPayload } from '../utils/aiValidator';
import { migrateToSchemaV2 } from '../utils/schemaMigration';
import { translations } from '../i18n/translations';

// Node validates arrow/message grammar. Full diagrams with titles and boxes
// require DOM sanitation and are checked in the browser smoke test.
mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });

const source = `sequenceDiagram
  title Order workflow
  autonumber
  actor U as Customer
  box rgb(240, 240, 255) Application Layer
    participant API as Orders API
    participant DB as Database
  end
  U->>+API: Create order
  activate DB
  alt valid
    loop each item
      API->>DB: Save item
      DB-->>API: Saved
    end
  else rejected
    API-->>U: Invalid order
  end
  Note over U,API: first line<br/>second line
  deactivate DB
  API-->>-U: Created
`;

function messages(result: Awaited<ReturnType<typeof mermaidAdapter.parse>>) {
  const nodes = new Map(result.logicalData.nodes.map(node => [node.id, node.name]));
  const edges = new Map(result.logicalData.edges.map(edge => [edge.id, edge]));
  return result.logicalData.sequences.map(step => {
    const edge = edges.get(step.edgeId)!;
    return [nodes.get(edge.sourceId), nodes.get(edge.targetId), edge.description, edge.properties?.arrowType, step.isAsync];
  });
}

describe('Mermaid import semantics', () => {
  it('keeps repeated messages, dashed messages and reverse calls separate', async () => {
    const result = await mermaidAdapter.parse('sequenceDiagram\nA->>B: One\nA->>B: Two\nB-->>A: Answer\nB->>A: Callback');
    expect(messages(result)).toEqual([
      ['A', 'B', 'One', '->>', false], ['A', 'B', 'Two', '->>', false],
      ['B', 'A', 'Answer', '-->>', false], ['B', 'A', 'Callback', '->>', false],
    ]);
    expect(result.logicalData.sequences.every(step => !step.isRoundTrip)).toBe(true);
    expect(result.logicalData.edges).toHaveLength(4);
    const schedules = calculateSchedules(result.logicalData.sequences, result.visualData.timelines, result.logicalData.edges);
    expect(Object.values(schedules).map(item => item.start)).toEqual([0, 1000, 2000, 3000]);
  });

  it('preserves actors, aliases, grouping, nested branches, activations and notes', async () => {
    const result = await mermaidAdapter.parse(source);
    const logical = result.logicalData;
    expect(logical.nodes.find(node => node.name === 'Customer')?.type).toBe('client');
    expect(logical.nodes.find(node => node.name === 'Orders API')?.parentId).toBe(logical.nodes.find(node => node.name === 'Application Layer')?.id);
    expect(JSON.stringify(logical.sequenceDiagram)).toContain('fragment');
    expect(logical.sequenceDiagram?.events.filter(event => event.type === 'activation')).toHaveLength(4);
    expect(Object.values(result.visualData.annotations!)[0].body).toBe('first line\nsecond line');
    expect(result.diagnostics?.some(item => item.code === 'activationMismatch')).toBe(false);
    const schedules = calculateSchedules(logical.sequences, result.visualData.timelines, logical.edges);
    const layout = buildSequenceLayout(logical, schedules);
    expect(layout.rfNodes.filter(node => node.type === 'seqParticipant').map(node => node.data.name)).toEqual(['Customer', 'Orders API', 'Database']);
    expect(layout.rfNodes.some(node => node.type === 'seqFragment' && node.data.fragmentType === 'alt')).toBe(true);
  });

  it('does not mistake an arbitrary box label for a color', async () => {
    const result = await mermaidAdapter.parse('sequenceDiagram\nbox Application Layer\nparticipant A\nparticipant B\nend\nA->>B: test');
    expect(result.logicalData.nodes.find(node => node.type === 'section')?.name).toBe('Application Layer');
  });

  it.each(['->>', '-->>', '->', '-->', '-x', '--x', '-)', '--)', '<<->>', '<<-->>'])('round trips arrow syntax %s without conflating style and async', async arrow => {
    const result = await mermaidAdapter.parse(`sequenceDiagram\nA${arrow}B: Text`);
    expect(result.logicalData.sequences[0].isAsync).toBe(arrow.endsWith(')'));
    const text = generateMermaidSequence(result.logicalData, result.visualData).text;
    expect(text).toContain(arrow);
    await expect(mermaid.parse(text)).resolves.toMatchObject({ diagramType: 'sequence' });
    expect(messages(await mermaidAdapter.parse(text))).toEqual(messages(result));
  });

  it('reads fenced diagrams, CRLF, semicolons and encoded labels', async () => {
    const result = await mermaidAdapter.parse('```mermaid\r\nsequenceDiagram; participant A as Alice; participant B as Bob\r\nA->>B: A#59;B #35;hash #60;tag#62;<br/>Next\r\n```');
    expect(result.logicalData.edges[0].description).toBe('A;B #hash <tag>\nNext');
    expect(result.diagnostics).toEqual([]);
  });

  it('reports unsupported statements with original line numbers instead of inventing participants', async () => {
    const result = await mermaidAdapter.parse('sequenceDiagram\n%% comment\ncreate participant B\nA->>B: Hello\nlink A: Homepage @ https://example.com');
    expect(result.diagnostics).toEqual([
      { code: 'unsupportedStatement', line: 3, source: 'create participant B' },
      { code: 'unsupportedStatement', line: 5, source: 'link A: Homepage @ https://example.com' },
    ]);
    expect(result.logicalData.nodes.filter(node => node.type !== 'section')).toHaveLength(2);
  });

  it.each([
    ['sequenceDiagram\nA->>B: hi\nend', 'unbalanced'],
    ['sequenceDiagram\nalt ok\nA->>B: hi', 'unbalanced'],
    ['sequenceDiagram\nloop each\nelse bad\nend', 'invalidBranch'],
    ['sequenceDiagram\nflowchart TD', 'empty'],
  ])('rejects malformed blocks: %s', async (text, code) => {
    await expect(mermaidAdapter.parse(text)).rejects.toMatchObject({ code });
    await expect(mermaidAdapter.parse(text)).rejects.toBeInstanceOf(MermaidImportError);
  });

  it('warns on unmatched activation and preserves finite safe defaults', async () => {
    const result = await mermaidAdapter.parse('sequenceDiagram\nparticipant A\ndeactivate A\nactivate A');
    expect(result.diagnostics?.filter(item => item.code === 'activationMismatch')).toHaveLength(2);
  });
});

describe('Mermaid export and persistence', () => {
  it('reimports supported nested semantics and exports current edits rather than original source', async () => {
    const result = await mermaidAdapter.parse(source);
    result.logicalData.edges[0].description = 'Edited; label <safe> #tag';
    result.logicalData.nodes.find(node => node.name === 'Customer')!.name = 'Renamed customer';
    const before = JSON.stringify(result);
    const exported = generateMermaidSequence(result.logicalData, result.visualData);
    expect(exported.text).toContain('else rejected');
    expect(exported.text).toContain('loop each item');
    expect(exported.text).toContain('activate');
    expect(exported.text).toContain('Note over');
    const reimported = await mermaidAdapter.parse(exported.text);
    expect(messages(reimported)).toEqual(messages(result));
    expect(Object.values(reimported.visualData.annotations!)[0].body).toBe(Object.values(result.visualData.annotations!)[0].body);
    expect(JSON.stringify(result)).toBe(before);
  });

  it('retains metadata through JSON persistence, migration, ZIP repair and AI repair', async () => {
    const result = await mermaidAdapter.parse(source);
    const loaded = JSON.parse(JSON.stringify(result));
    const migrated = migrateToSchemaV2(loaded.logicalData, loaded.visualData);
    const repaired = repairDiagram(migrated.logicalData, migrated.visualData);
    expect(repaired.logicalData.sequenceDiagram).toEqual(result.logicalData.sequenceDiagram);
    expect(validateAndRepairAiPayload(loaded.logicalData, loaded.visualData).safeLogical.sequenceDiagram).toEqual(result.logicalData.sequenceDiagram);
    expect(generateMermaidSequence(repaired.logicalData, repaired.visualData).text).toBe(generateMermaidSequence(result.logicalData, result.visualData).text);
  });

  it.each(['logicalData', 'logical'] as const)('retains source metadata through the %s workspace envelope', async envelope => {
    const result = await mermaidAdapter.parse(source);
    const previous = useAppStore.getState();
    const load = vi.spyOn(StorageService, 'load_diagram').mockResolvedValue(JSON.stringify(envelope === 'logicalData'
      ? { logicalData: result.logicalData, visualData: result.visualData }
      : { schemaVersion: 2, logical: result.logicalData, visual: result.visualData }));
    const save = vi.spyOn(StorageService, 'save_diagram').mockResolvedValue();
    try {
      useAppStore.setState({ currentWorkspace: { id: 'fixture', name: 'Fixture', path: 'virtual://fixture', description: '', createdAt: '', lastAccessed: '' }, activeDiagramId: 'other', isDirty: false, isSaving: false, isCollabActive: false });
      await useAppStore.getState().switchDiagram('existing');
      const loaded = useAppStore.getState();
      expect(loaded.logicalData.sequenceDiagram).toEqual(result.logicalData.sequenceDiagram);
      expect(generateMermaidSequence(loaded.logicalData, loaded.visualData).text).toBe(generateMermaidSequence(result.logicalData, result.visualData).text);
      useAppStore.setState({ isDirty: true });
      await useAppStore.getState().manualSave();
      expect(JSON.parse(save.mock.calls[0][2]).sequenceDiagram).toEqual(result.logicalData.sequenceDiagram);
    } finally { load.mockRestore(); save.mockRestore(); useAppStore.setState(previous, true); }
  });

  it('exports existing round-trip documents in scheduled order without mutating IDs or timing', async () => {
    const imported = await mermaidAdapter.parse('sequenceDiagram\nA->>B: Request\nB->>C: Query');
    delete imported.logicalData.sequenceDiagram;
    imported.logicalData.sequences[0].isRoundTrip = true;
    const before = JSON.stringify(imported);
    const text = generateMermaidSequence(imported.logicalData, imported.visualData).text;
    const result = await mermaidAdapter.parse(text);
    expect(messages(result).map(message => message.slice(0, 3))).toEqual([
      ['A', 'B', 'Request'], ['B', 'C', 'Query'], ['B', 'A', ''],
    ]);
    expect(JSON.stringify(imported)).toBe(before);
  });

  it('skips removed messages and appends new steps with a source-order warning', async () => {
    const result = await mermaidAdapter.parse('sequenceDiagram\nA->>B: Old\nB->>A: Reply');
    result.logicalData.sequences.shift();
    result.logicalData.sequences.push({ ...result.logicalData.sequences[0], id: 'new', stepNumber: 3 });
    const exported = generateMermaidSequence(result.logicalData, result.visualData);
    expect(exported.text).not.toContain(': Old');
    expect(exported.warnings).toContain('missingReference');
    expect((await mermaidAdapter.parse(exported.text)).logicalData.sequences).toHaveLength(2);
  });

  it('escapes labels so syntax and HTML-like content remain text', async () => {
    const result = await mermaidAdapter.parse('sequenceDiagram\nA->>B: test');
    result.logicalData.nodes[0].name = 'end; "User"\n<script>';
    result.logicalData.edges[0].description = 'end\nA->>B: injected; # & <tag>';
    const exported = generateMermaidSequence(result.logicalData, result.visualData);
    await expect(mermaid.parse(exported.text.replace(/^\s*title .+$/m, ''))).resolves.toMatchObject({ diagramType: 'sequence' });
    const reimported = await mermaidAdapter.parse(exported.text);
    expect(reimported.logicalData.nodes[0].name).toBe(result.logicalData.nodes[0].name);
    expect(reimported.logicalData.edges[0].description).toBe(result.logicalData.edges[0].description);
    expect(reimported.logicalData.sequences).toHaveLength(1);
  });

  it('keeps new UI messages consistent across English and Turkish', () => {
    expect(Object.keys(translations.tr.mermaid).sort()).toEqual(Object.keys(translations.en.mermaid).sort());
    expect(Object.keys(translations.tr.mermaid.errors).sort()).toEqual(Object.keys(translations.en.mermaid.errors).sort());
  });
});
