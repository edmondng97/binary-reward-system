import { describe, it, expect, beforeEach } from 'vitest';
import { flowUpUplinePath } from './flowUp';

function mount(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

beforeEach(() => { document.body.innerHTML = ''; });

describe('flowUpUplinePath', () => {
  it('returns a paused empty timeline when no matching edges exist', () => {
    const root = mount('<svg></svg>');
    const tl = flowUpUplinePath(root, ['x->y']);
    expect(tl.getChildren().length).toBe(0);
  });

  it('adds a tween per matched edge in order', () => {
    const root = mount(`<svg>
      <path data-edge="root->a" d="M 0 0 L 10 10"></path>
      <path data-edge="a->b" d="M 10 10 L 20 20"></path>
    </svg>`);
    const tl = flowUpUplinePath(root, ['a->b', 'root->a']);
    // one tween per matched edge
    expect(tl.getChildren().length).toBe(2);
  });
});
