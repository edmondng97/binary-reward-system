import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ZoomControls } from './ZoomControls';

describe('ZoomControls', () => {
  it('fires the matching handler for each control', () => {
    const onZoomIn = vi.fn(), onZoomOut = vi.fn(), onFit = vi.fn();
    const { container } = render(<ZoomControls onZoomIn={onZoomIn} onZoomOut={onZoomOut} onFit={onFit} />);
    fireEvent.click(container.querySelector('[data-zoom="in"]')!);
    fireEvent.click(container.querySelector('[data-zoom="out"]')!);
    fireEvent.click(container.querySelector('[data-zoom="fit"]')!);
    expect(onZoomIn).toHaveBeenCalled();
    expect(onZoomOut).toHaveBeenCalled();
    expect(onFit).toHaveBeenCalled();
  });
});
