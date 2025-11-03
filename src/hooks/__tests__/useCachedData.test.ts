/**
 * Unit tests for useCachedData hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useCachedData, createCachedHook } from '../useCachedData';

// Mock data
interface TestData {
  id: string;
  value: number;
}

describe('useCachedData', () => {
  beforeEach(() => {
    // Clear console.error mock
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('basic functionality', () => {
    it('should fetch data on mount', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({ id: '1', value: 100 });

      const { result } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-1',
          fetcher: mockFetcher,
        })
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({ id: '1', value: 100 });
      expect(result.current.error).toBe(null);
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch errors', async () => {
      const mockFetcher = jest.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-error',
          fetcher: mockFetcher,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe('Network error');
    });

    it('should use initial data', () => {
      const mockFetcher = jest.fn().mockResolvedValue({ id: '1', value: 100 });
      const initialData = { id: '0', value: 0 };

      const { result } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-initial',
          fetcher: mockFetcher,
          initialData,
        })
      );

      expect(result.current.data).toEqual(initialData);
    });

    it('should respect enabled flag', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({ id: '1', value: 100 });

      const { result } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-disabled',
          fetcher: mockFetcher,
          enabled: false,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetcher).not.toHaveBeenCalled();
      expect(result.current.data).toBe(null);
    });
  });

  describe('caching behavior', () => {
    it('should return cached data on second call', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({ id: '1', value: 100 });

      // First render
      const { result: result1 } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-cache-1',
          fetcher: mockFetcher,
          namespace: 'test-cache',
        })
      );

      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
      });

      expect(mockFetcher).toHaveBeenCalledTimes(1);

      // Second render with same cache key
      const { result: result2 } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-cache-1',
          fetcher: mockFetcher,
          namespace: 'test-cache',
        })
      );

      await waitFor(() => {
        expect(result2.current.loading).toBe(false);
      });

      // Fetcher should not be called again
      expect(mockFetcher).toHaveBeenCalledTimes(1);
      expect(result2.current.data).toEqual({ id: '1', value: 100 });
    });

    it('should respect TTL and refetch expired data', async () => {
      jest.useFakeTimers();
      const mockFetcher = jest.fn()
        .mockResolvedValueOnce({ id: '1', value: 100 })
        .mockResolvedValueOnce({ id: '1', value: 200 });

      // First render with 1 second TTL
      const { result: result1, unmount } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-ttl',
          fetcher: mockFetcher,
          ttl: 1000,
          namespace: 'test-ttl',
        })
      );

      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
      });

      expect(result1.current.data).toEqual({ id: '1', value: 100 });
      expect(mockFetcher).toHaveBeenCalledTimes(1);

      // Unmount first hook
      unmount();

      // Advance time by 2 seconds (beyond TTL)
      jest.advanceTimersByTime(2000);

      // Second render should trigger new fetch
      const { result: result2 } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-ttl',
          fetcher: mockFetcher,
          ttl: 1000,
          namespace: 'test-ttl',
        })
      );

      await waitFor(() => {
        expect(result2.current.loading).toBe(false);
      });

      expect(mockFetcher).toHaveBeenCalledTimes(2);
      expect(result2.current.data).toEqual({ id: '1', value: 200 });

      jest.useRealTimers();
    });

    it('should cache permanently when no TTL specified', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({ id: '1', value: 100 });

      // First render
      const { result: result1, unmount } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-permanent',
          fetcher: mockFetcher,
          namespace: 'test-permanent',
        })
      );

      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
      });

      unmount();

      // Wait and render again
      await new Promise((resolve) => setTimeout(resolve, 100));

      const { result: result2 } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-permanent',
          fetcher: mockFetcher,
          namespace: 'test-permanent',
        })
      );

      await waitFor(() => {
        expect(result2.current.loading).toBe(false);
      });

      // Should still use cached data
      expect(mockFetcher).toHaveBeenCalledTimes(1);
    });

    it('should use different cache for different keys', async () => {
      const mockFetcher1 = jest.fn().mockResolvedValue({ id: '1', value: 100 });
      const mockFetcher2 = jest.fn().mockResolvedValue({ id: '2', value: 200 });

      const { result: result1 } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-key-1',
          fetcher: mockFetcher1,
          namespace: 'test-keys',
        })
      );

      const { result: result2 } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-key-2',
          fetcher: mockFetcher2,
          namespace: 'test-keys',
        })
      );

      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
        expect(result2.current.loading).toBe(false);
      });

      expect(mockFetcher1).toHaveBeenCalledTimes(1);
      expect(mockFetcher2).toHaveBeenCalledTimes(1);
      expect(result1.current.data).toEqual({ id: '1', value: 100 });
      expect(result2.current.data).toEqual({ id: '2', value: 200 });
    });
  });

  describe('promise deduplication', () => {
    it('should deduplicate concurrent requests', async () => {
      const mockFetcher = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ id: '1', value: 100 }), 100);
        });
      });

      // Render two hooks simultaneously with same cache key
      const { result: result1 } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-dedup',
          fetcher: mockFetcher,
          namespace: 'test-dedup',
        })
      );

      const { result: result2 } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-dedup',
          fetcher: mockFetcher,
          namespace: 'test-dedup',
        })
      );

      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
        expect(result2.current.loading).toBe(false);
      });

      // Fetcher should only be called once
      expect(mockFetcher).toHaveBeenCalledTimes(1);
      expect(result1.current.data).toEqual({ id: '1', value: 100 });
      expect(result2.current.data).toEqual({ id: '1', value: 100 });
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate specific cache key', async () => {
      const mockFetcher = jest.fn()
        .mockResolvedValueOnce({ id: '1', value: 100 })
        .mockResolvedValueOnce({ id: '1', value: 200 });

      const { result, unmount } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-invalidate',
          fetcher: mockFetcher,
          namespace: 'test-invalidate',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({ id: '1', value: 100 });

      // Invalidate cache
      result.current.invalidate();
      
      // Unmount to ensure cleanup
      unmount();

      // Create new hook instance to trigger fetch
      const { result: result2 } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-invalidate',
          fetcher: mockFetcher,
          namespace: 'test-invalidate',
        })
      );

      await waitFor(() => {
        expect(result2.current.loading).toBe(false);
      });

      expect(mockFetcher).toHaveBeenCalledTimes(2);
      expect(result2.current.data).toEqual({ id: '1', value: 200 });
    });

    it('should invalidate all cache in namespace', async () => {
      const mockFetcher = jest.fn().mockResolvedValue({ id: '1', value: 100 });

      const { result } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-invalidate-all',
          fetcher: mockFetcher,
          namespace: 'test-invalidate-all',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Invalidate all
      result.current.invalidateAll();

      // Create new hook with same key
      const { result: result2 } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-invalidate-all',
          fetcher: mockFetcher,
          namespace: 'test-invalidate-all',
        })
      );

      await waitFor(() => {
        expect(result2.current.loading).toBe(false);
      });

      // Should have called fetcher twice (once for each render)
      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });
  });

  describe('manual refetch', () => {
    it('should refetch data bypassing cache', async () => {
      const mockData = { value: 100 };
      const mockFetcher = jest.fn().mockResolvedValue(mockData);

      const { result } = renderHook(() =>
        useCachedData({
          cacheKey: 'test-refetch',
          fetcher: mockFetcher,
          namespace: 'test-refetch',
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({ value: 100 });
      expect(mockFetcher).toHaveBeenCalledTimes(1);

      // Change mock to return different data
      mockData.value = 200;

      // Manual refetch
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetcher).toHaveBeenCalledTimes(2);
      expect(result.current.data).toEqual({ value: 200 });
    });
  });

  describe('createCachedHook', () => {
    it('should create a typed hook with namespace', async () => {
      const useTestCache = createCachedHook<TestData>('test-typed');
      const mockFetcher = jest.fn().mockResolvedValue({ id: '1', value: 100 });

      const { result } = renderHook(() =>
        useTestCache({
          cacheKey: 'typed-1',
          fetcher: mockFetcher,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({ id: '1', value: 100 });
    });
  });
});
