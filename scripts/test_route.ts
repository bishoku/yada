import { findAutoRoute } from '../../../src/components/canvas/utils/autoRouting';

const source = { x: 100, y: 100 };
const target = { x: 500, y: 100 };
const obstacles = [
  { x: 250, y: 50, w: 100, h: 100 }
];

console.log("Finding path...");
const result = findAutoRoute(source, target, obstacles);
console.log("Result:", result);
