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

  it('sorts catalog options alphabetically in Portuguese within each area', () => {
    const { result } = renderHook(
      () =>
        useOrderForm({
          catalogProducts: [
            { id: '3', category: 'Padaria', name: 'Zebra' },
            { id: '1', category: 'Padaria', name: 'Água' },
            { id: '2', category: 'Padaria', name: 'Bola' },
            { id: '4', category: 'Pastelaria', name: 'Tarte' },
          ],
          setAppError: vi.fn(),
          setAppSuccess: vi.fn(),
        }),
      { wrapper: createWrapper() },
    );
    expect(
      result.current.catalogProductsByCategory.get('Padaria')?.map((item) => item.name),
    ).toEqual(['Água', 'Bola', 'Zebra']);
    expect(
      result.current.catalogProductsByCategory.get('Pastelaria')?.map((item) => item.name),
    ).toEqual(['Tarte']);
  });
});
