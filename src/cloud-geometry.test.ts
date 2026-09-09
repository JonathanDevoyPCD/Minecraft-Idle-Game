import { describe, expect, it } from 'vitest';
import { createCloudGeometry } from './cloud-geometry';

describe('cloud geometry', () => {
  it('omits faces between touching cloud cells', () => {
    const geometry = createCloudGeometry([[-1, 0, 0], [0, 0, 0], [1, 0, 0]], 1, 1);

    expect(geometry.getAttribute('position').count).toBe(14 * 4);
    expect(geometry.getIndex()?.count).toBe(14 * 6);
    geometry.dispose();
  });
});
