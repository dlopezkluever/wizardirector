/**
 * Lightweight Supabase client mock for route-level Jest tests.
 *
 * The real client's query builder is chainable AND awaitable (calling
 * `.eq(...)` without `.single()`/`.maybeSingle()` resolves directly, e.g.
 * `await supabase.from('projects').update({...}).eq('id', id)`). This mock
 * mirrors that: every chain method returns the same thenable builder, and
 * `.single()`/`.maybeSingle()` resolve the configured result explicitly.
 *
 * Each call to `.from(table)` consumes the next queued result for that call
 * site — tests queue results in the exact order the route under test makes
 * its Supabase calls.
 */

export interface MockResult {
  data: unknown;
  error: unknown;
}

function makeQueryBuilder(result: MockResult) {
  const resolved = Promise.resolve(result);

  const builder: Record<string, unknown> = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    gt: jest.fn(() => builder),
    lte: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    single: jest.fn(() => resolved),
    maybeSingle: jest.fn(() => resolved),
    then: resolved.then.bind(resolved),
    catch: resolved.catch.bind(resolved),
  };

  return builder;
}

/**
 * A single stable object that the mocked `../config/supabase.js` module
 * exports (via `jest.mock('../config/supabase.js', () => ({ supabase: mockSupabaseTarget }))`
 * in the consuming test file). Tests mutate this object's properties (via
 * `configureSupabaseMock`) rather than reassigning the export itself.
 *
 * Named with a `mock` prefix — Jest's module-factory hoisting only allows
 * out-of-scope variable references whose identifier starts with "mock".
 */
export const mockSupabaseTarget: {
  from: jest.Mock;
  auth: { getUser: jest.Mock };
  rpc: jest.Mock;
} = {
  from: jest.fn(),
  auth: { getUser: jest.fn() },
  rpc: jest.fn(),
};

export function configureSupabaseMock(
  fromResults: MockResult[],
  authUser: { id: string; email?: string } = { id: 'test-user-id' }
) {
  const queue = [...fromResults];

  mockSupabaseTarget.from.mockImplementation(() => {
    const next = queue.shift();
    if (!next) {
      throw new Error('configureSupabaseMock: ran out of queued .from() results — queue more or check call count');
    }
    return makeQueryBuilder(next);
  });

  mockSupabaseTarget.auth.getUser.mockImplementation(async () => ({ data: { user: authUser }, error: null }));
  mockSupabaseTarget.rpc.mockImplementation(async () => ({ data: { success: true }, error: null }));
}
