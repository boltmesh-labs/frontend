import { renderHook, act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useForm } from './useForm';

describe('useForm', () => {
  it('initialises with the provided values', () => {
    const { result } = renderHook(() => useForm({ username: 'ada' }));
    expect(result.current.values).toEqual({ username: 'ada' });
  });

  it('updates a field by name from a change event', () => {
    const { result } = renderHook(() => useForm({ username: '' }));
    act(() =>
      result.current.handleChange({ target: { name: 'username', value: 'ada', type: 'text' } })
    );
    expect(result.current.values.username).toBe('ada');
  });

  it('falls back to the element id when no name is present', () => {
    const { result } = renderHook(() => useForm({ email: '' }));
    act(() =>
      result.current.handleChange({
        target: { id: 'email', value: 'ada@example.com', type: 'text' },
      })
    );
    expect(result.current.values.email).toBe('ada@example.com');
  });

  it('ignores events without a name or id', () => {
    const { result } = renderHook(() => useForm({ a: 1 }));
    act(() => result.current.handleChange({ target: { value: 'x', type: 'text' } }));
    expect(result.current.values).toEqual({ a: 1 });
  });

  it('stores checkbox checked state', () => {
    const { result } = renderHook(() => useForm({ accept: false }));
    act(() =>
      result.current.handleChange({ target: { name: 'accept', type: 'checkbox', checked: true } })
    );
    expect(result.current.values.accept).toBe(true);
  });

  it('trims leading whitespace when trimStart is enabled', () => {
    const { result } = renderHook(() => useForm({ username: '' }, { trimStart: true }));
    act(() =>
      result.current.handleChange({ target: { name: 'username', value: '  ada', type: 'text' } })
    );
    expect(result.current.values.username).toBe('ada');
  });

  it('trims both ends when trim is enabled', () => {
    const { result } = renderHook(() => useForm({ email: '' }, { trim: true }));
    act(() =>
      result.current.handleChange({
        target: { name: 'email', value: '  ada@example.com  ', type: 'text' },
      })
    );
    expect(result.current.values.email).toBe('ada@example.com');
  });

  it('supports setting a value directly', () => {
    const { result } = renderHook(() => useForm({ username: '' }));
    act(() => result.current.setValue('username', 'grace'));
    expect(result.current.values.username).toBe('grace');
  });

  it('resets to the initial values', () => {
    const { result } = renderHook(() => useForm({ username: 'initial' }));
    act(() =>
      result.current.handleChange({ target: { name: 'username', value: 'changed', type: 'text' } })
    );
    act(() => result.current.reset());
    expect(result.current.values.username).toBe('initial');
  });
});
