export type RecoveryResource = 'order' | 'catalog-product' | 'responsible';
export type RecoveryAction = 'created' | 'updated' | 'deleted' | 'completed';

export type RecoveryEvent = {
  id: string;
  occurredAt: string;
  resource: RecoveryResource;
  action: RecoveryAction;
  resourceId: string;
  before?: unknown;
  after?: unknown;
};

export type RecoveryArchive = {
  format: 'order-manager-local-recovery';
  formatVersion: 1;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  events: RecoveryEvent[];
  latestOperationalSnapshot?: Record<string, unknown>;
  latestOperationalSnapshotAt?: string;
  latestServerSnapshot?: Record<string, unknown>;
  latestServerSnapshotAt?: string;
};

type RecoveryEventInput = Omit<RecoveryEvent, 'id' | 'occurredAt'> & {
  occurredAt?: string;
};

const databaseName = 'order-manager-recovery';
const databaseVersion = 1;
const storeName = 'archives';
let databasePromise: Promise<IDBDatabase> | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('Não foi possível aceder ao arquivo local.')),
      { once: true },
    );
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true });
    transaction.addEventListener(
      'abort',
      () => reject(transaction.error ?? new Error('A escrita no arquivo local foi cancelada.')),
      { once: true },
    );
    transaction.addEventListener(
      'error',
      () => reject(transaction.error ?? new Error('Não foi possível guardar o arquivo local.')),
      { once: true },
    );
  });
}

function openDatabase() {
  if (!('indexedDB' in globalThis)) {
    return Promise.reject(
      new Error('Este navegador não disponibiliza armazenamento local seguro.'),
    );
  }
  if (databasePromise) return databasePromise;

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    request.addEventListener(
      'upgradeneeded',
      () => {
        if (!request.result.objectStoreNames.contains(storeName)) {
          request.result.createObjectStore(storeName, { keyPath: 'tenantId' });
        }
      },
      { once: true },
    );
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener(
      'error',
      () => reject(request.error ?? new Error('Não foi possível abrir o arquivo local.')),
      { once: true },
    );
  });

  return databasePromise;
}

export function createRecoveryArchive(tenantId: string, now = new Date()): RecoveryArchive {
  const timestamp = now.toISOString();
  return {
    format: 'order-manager-local-recovery',
    formatVersion: 1,
    tenantId,
    createdAt: timestamp,
    updatedAt: timestamp,
    events: [],
  };
}

export function appendRecoveryEvent(
  archive: RecoveryArchive,
  input: RecoveryEventInput,
  now = new Date(),
): RecoveryArchive {
  const occurredAt = input.occurredAt ?? now.toISOString();
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${occurredAt}-${archive.events.length + 1}`;

  return {
    ...archive,
    updatedAt: occurredAt,
    events: [
      ...archive.events,
      {
        ...input,
        id,
        occurredAt,
      },
    ],
  };
}

export async function readRecoveryArchive(tenantId: string) {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, 'readonly');
  const result = await requestResult<RecoveryArchive | undefined>(
    transaction.objectStore(storeName).get(tenantId),
  );
  await transactionDone(transaction);
  return result ?? null;
}

async function writeRecoveryArchive(archive: RecoveryArchive) {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, 'readwrite');
  transaction.objectStore(storeName).put(archive);
  await transactionDone(transaction);
}

function enqueueWrite<T>(operation: () => Promise<T>) {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.catch(() => undefined);
  return next;
}

export function recordRecoveryEvent(tenantId: string, input: RecoveryEventInput) {
  return enqueueWrite(async () => {
    const current = (await readRecoveryArchive(tenantId)) ?? createRecoveryArchive(tenantId);
    const next = appendRecoveryEvent(current, input);
    await writeRecoveryArchive(next);
    return next;
  });
}

export function saveRecoverySnapshot(tenantId: string, snapshot: Record<string, unknown>) {
  return enqueueWrite(async () => {
    const current = (await readRecoveryArchive(tenantId)) ?? createRecoveryArchive(tenantId);
    const now = new Date().toISOString();
    const next: RecoveryArchive = {
      ...current,
      updatedAt: now,
      latestServerSnapshot: snapshot,
      latestServerSnapshotAt: now,
    };
    await writeRecoveryArchive(next);
    return next;
  });
}

export function saveRecoveryOperationalSnapshot(
  tenantId: string,
  snapshot: Record<string, unknown>,
) {
  return enqueueWrite(async () => {
    const current = (await readRecoveryArchive(tenantId)) ?? createRecoveryArchive(tenantId);
    const now = new Date().toISOString();
    const next: RecoveryArchive = {
      ...current,
      updatedAt: now,
      latestOperationalSnapshot: snapshot,
      latestOperationalSnapshotAt: now,
    };
    await writeRecoveryArchive(next);
    return next;
  });
}
