import { supabase } from './supabase'

export async function callEdgeFunction<T>(
  functionName: string,
  body?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: body ?? undefined,
  })

  if (error) {
    throw new Error(error.message || `Edge function "${functionName}" failed`)
  }

  return data as T
}
