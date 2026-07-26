import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useOrderForm } from './useOrderForm';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useOrderForm picker coordination', () => {
  function renderOrderFormHook() {
    return renderHook(
      () =>
        useOrderForm({
          catalogProducts: [],
          setAppError: vi.fn(),
          setAppSuccess: vi.fn(),
        }),
      { wrapper: createWrapper() },
    );
  }

  it('keeps only one form picker open at a time', () => {
    const { result } = renderOrderFormHook();
    const itemId = result.current.methods.getValues('items.0.id');

    act(() => result.current.setIsResponsiblePickerOpen(true));
    expect(result.current.isResponsiblePickerOpen).toBe(true);

    act(() => result.current.setOpenProductPickerId(itemId));
    expect(result.current.isResponsiblePickerOpen).toBe(false);
    expect(result.current.openProductPickerId).toBe(itemId);

    act(() => result.current.setOpenCategoryPickerId(itemId));
    expect(result.current.openProductPickerId).toBeNull();
    expect(result.current.openCategoryPickerId).toBe(itemId);

    act(() => result.current.setOpenUnitPickerId(itemId));
    expect(result.current.openCategoryPickerId).toBeNull();
    expect(result.current.openUnitPickerId).toBe(itemId);
  });

  it('adds a product without leaving its product picker open', () => {
    const { result } = renderOrderFormHook();
    const itemId = result.current.methods.getValues('items.0.id');

    act(() => result.current.setOpenProductPickerId(itemId));
    expect(result.current.openProductPickerId).toBe(itemId);

    act(() => result.current.addProductLine());

    expect(result.current.itemFields).toHaveLength(2);
    expect(result.current.openProductPickerId).toBeNull();
    expect(result.current.openCategoryPickerId).toBeNull();
    expect(result.current.openUnitPickerId).toBeNull();
    expect(result.current.isResponsiblePickerOpen).toBe(false);
  });
});
