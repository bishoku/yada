import { defineConfig } from 'vitest/config';
export default defineConfig({ plugins: [{name:'legacy-history-measurement', enforce:'pre', transform(code,id) {
  if (process.env.YADA_HISTORY_BASELINE === '1' && id.endsWith('/historySlice.ts')) return code.replace("import { snapshotDocument } from '../historySnapshot';", "globalThis.__legacyHistory = true; const snapshotDocument = (logicalData: unknown, visualData: unknown) => ({logicalData:JSON.parse(JSON.stringify(logicalData)),visualData:JSON.parse(JSON.stringify(visualData))});");
}}], test: { pool:'forks', execArgv:['--expose-gc'], include: ['scripts/edit-profile.measure.ts'], fileParallelism: false, maxWorkers: 1 } });
