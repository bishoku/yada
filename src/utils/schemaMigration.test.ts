import { describe, it, expect } from 'vitest';
import { migrateToSchemaV2 } from './schemaMigration';
import { LogicalDiagram, VisualDiagram } from '../types';

describe('schemaMigration (V1 -> V2)', () => {
  it('should migrate animationMode and repeatParticleCount from sequences to timelines', () => {
    const v1Logical: any = {
      schemaVersion: 1,
      nodes: [
        { id: 'n1', type: 'client', name: 'Client' },
        { id: 'n2', type: 'server', name: 'Server' }
      ],
      edges: [
        { id: 'e1', sourceId: 'n1', targetId: 'n2', isAsync: false }
      ],
      sequences: [
        {
          id: 'seq-1',
          stepNumber: 1,
          edgeId: 'e1',
          isAsync: false,
          isRoundTrip: true,
          animationMode: 'repeat',
          repeatParticleCount: 5
        }
      ]
    };

    const v1Visual: VisualDiagram = {
      canvas: { zoom: 1, pan: { x: 0, y: 0 } },
      layoutNodes: {},
      layoutEdges: {},
      timelines: {
        'seq-1': { sequenceId: 'seq-1', duration: 2000, delay: 100 }
      }
    };

    const { logicalData, visualData } = migrateToSchemaV2(v1Logical, v1Visual);

    expect(logicalData.schemaVersion).toBe(2);
    // Check that animation fields were removed from logical sequence
    expect((logicalData.sequences[0] as any).animationMode).toBeUndefined();
    expect((logicalData.sequences[0] as any).repeatParticleCount).toBeUndefined();
    expect(logicalData.sequences[0].isRoundTrip).toBe(true);

    // Check that animation fields were migrated into visual timelines
    expect(visualData.timelines['seq-1']).toBeDefined();
    expect(visualData.timelines['seq-1'].duration).toBe(2000);
    expect(visualData.timelines['seq-1'].delay).toBe(100);
    expect(visualData.timelines['seq-1'].animationMode).toBe('repeat');
    expect(visualData.timelines['seq-1'].repeatParticleCount).toBe(5);
  });

  it('should purge sticky_note and _visualOnly nodes from LogicalDiagram.nodes', () => {
    const v1Logical: any = {
      schemaVersion: 1,
      nodes: [
        { id: 'n1', type: 'server', name: 'API Gateway' },
        { id: 'sn-1', type: 'sticky_note', name: 'Note 1', properties: { _visualOnly: true } }
      ],
      edges: [],
      sequences: []
    };

    const v1Visual: VisualDiagram = {
      canvas: { zoom: 1, pan: { x: 0, y: 0 } },
      layoutNodes: {
        'n1': { id: 'n1', x: 0, y: 0 },
        'sn-1': { id: 'sn-1', x: 100, y: 100 }
      },
      layoutEdges: {},
      timelines: {},
      annotations: {
        'sn-1': {
          id: 'sn-1',
          header: 'Note 1',
          body: 'Hello',
          style: { backgroundColor: '#fff', borderColor: '#000', textColor: '#000', fontFamily: 'Inter', fontSize: 12, borderRadius: 4, opacity: 1 },
          startTime: 0,
          endTime: 1000
        }
      }
    };

    const { logicalData, visualData } = migrateToSchemaV2(v1Logical, v1Visual);

    expect(logicalData.schemaVersion).toBe(2);
    expect(logicalData.nodes.length).toBe(1);
    expect(logicalData.nodes[0].id).toBe('n1');

    // Visual annotations remain intact
    expect(visualData.annotations?.['sn-1']).toBeDefined();
    expect(visualData.layoutNodes['sn-1']).toBeDefined();
  });

  it('should bypass migration if schemaVersion is already 2 or higher', () => {
    const v2Logical: LogicalDiagram = {
      schemaVersion: 2,
      nodes: [{ id: 'n1', type: 'server', name: 'Server' }],
      edges: [],
      sequences: []
    };

    const v2Visual: VisualDiagram = {
      canvas: { zoom: 1, pan: { x: 0, y: 0 } },
      layoutNodes: {},
      layoutEdges: {},
      timelines: {}
    };

    const result = migrateToSchemaV2(v2Logical, v2Visual);
    expect(result.logicalData).toBe(v2Logical);
    expect(result.visualData).toBe(v2Visual);
  });
});
