import { autoUpdateSafety } from './auto-update-safety';

/** Hold the update boundary through all awaits, including failure cleanup. */
export async function runWithUpdateProtection<T>(
  reason: string,
  operation: () => Promise<T>,
  options: { allowDuringDrain?: boolean } = {}
): Promise<T> {
  const finish = autoUpdateSafety.beginOperation(reason, options);
  try {
    return await operation();
  } finally {
    finish();
  }
}
