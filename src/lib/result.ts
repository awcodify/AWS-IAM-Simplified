export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export const Ok = <T, E = Error>(data: T): Result<T, E> => ({ success: true, data });
export const Err = <E = Error>(error: E): Result<never, E> => ({ success: false, error });

export async function safeAsync<T>(
  promise: Promise<T>
): Promise<Result<T, Error>> {
  return promise.then(
    (data) => Ok(data),
    (error) => Err(error instanceof Error ? error : new Error(String(error)))
  );
}

export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  return result.success ? Ok(fn(result.data)) : result as Result<U, E>;
}

export async function mapResultAsync<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Promise<U>
): Promise<Result<U, E | Error>> {
  if (!result.success) return result;
  return safeAsync(fn(result.data));
}

/**
 * Safe synchronous operation handler that avoids try-catch
 * Note: Returns a Promise to enable error handling without try-catch
 */
export async function safeSync<T>(
  operation: () => T
): Promise<Result<T, Error>> {
  return Promise.resolve()
    .then(() => operation())
    .then(
      (data) => Ok(data),
      (error) => Err(error instanceof Error ? error : new Error(String(error)))
    );
}
