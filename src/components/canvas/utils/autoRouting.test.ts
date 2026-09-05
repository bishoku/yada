import { describe, it, expect } from 'vitest';
import { PriorityQueue, findAutoRoute } from './autoRouting';

describe('PriorityQueue', () => {
  it('should maintain min-heap ordering', () => {
    const pq = new PriorityQueue<number>((a, b) => a - b);
    pq.push(5);
    pq.push(2);
    pq.push(8);
    pq.push(1);
    pq.push(9);

    expect(pq.size).toBe(5);
    expect(pq.isEmpty()).toBe(false);

    expect(pq.pop()).toBe(1);
    expect(pq.pop()).toBe(2);
    expect(pq.pop()).toBe(5);
    expect(pq.pop()).toBe(8);
    expect(pq.pop()).toBe(9);
    expect(pq.pop()).toBeUndefined();
    expect(pq.isEmpty()).toBe(true);
  });

  it('should handle custom object comparator', () => {
    interface Task {
      name: string;
      priority: number;
    }

    const pq = new PriorityQueue<Task>((a, b) => a.priority - b.priority);
    pq.push({ name: 'low', priority: 10 });
    pq.push({ name: 'critical', priority: 1 });
    pq.push({ name: 'medium', priority: 5 });

    expect(pq.pop()?.name).toBe('critical');
    expect(pq.pop()?.name).toBe('medium');
    expect(pq.pop()?.name).toBe('low');
  });
});

describe('findAutoRoute', () => {
  it('should find direct path when no obstacles exist', () => {
    const source = { x: 0, y: 0 };
    const target = { x: 100, y: 100 };
    const obstacles: any[] = [];

    const route = findAutoRoute(source, target, obstacles);
    expect(route).toBeDefined();
    // Since source and target differ in x and y, orthogonal routing requires 1 intermediate waypoint
    expect(route?.length).toBe(1);
    expect(route?.[0].x === 0 || route?.[0].x === 100).toBe(true);
  });

  it('should route around an obstacle placed between source and target', () => {
    const source = { x: 0, y: 50 };
    const target = { x: 200, y: 50 };
    // Obstacle blocking the direct horizontal line
    const obstacles = [{ x: 80, y: 30, w: 40, h: 40 }];

    const route = findAutoRoute(source, target, obstacles, 10);
    expect(route).toBeDefined();
    expect(route!.length).toBeGreaterThan(0);
    // Waypoints must not be inside the padded obstacle
    for (const pt of route!) {
      const inObstacle = pt.x > 70 && pt.x < 130 && pt.y > 20 && pt.y < 80;
      expect(inObstacle).toBe(false);
    }
  });
});
