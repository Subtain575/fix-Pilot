import { QueryRunner } from 'typeorm';

export type QueryResultRow = Record<string, unknown>;

const toRecordArray = (result: unknown): QueryResultRow[] => {
  if (!Array.isArray(result)) {
    return [];
  }

  return result.filter(
    (row): row is QueryResultRow =>
      typeof row === 'object' && row !== null && !Array.isArray(row),
  );
};

export const fetchRows = async (
  queryRunner: QueryRunner,
  sql: string,
  parameters: unknown[] = [],
): Promise<QueryResultRow[]> => {
  const rawResult: unknown = await queryRunner.query(sql, parameters);
  return toRecordArray(rawResult);
};

export const getNumberValue = (
  row: QueryResultRow | undefined,
  key: string,
): number => {
  if (!row) {
    return 0;
  }

  const value = row[key];

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  return 0;
};

export const getStringValue = (
  row: QueryResultRow | undefined,
  key: string,
): string | undefined => {
  if (!row) {
    return undefined;
  }

  const value = row[key];

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  return undefined;
};
