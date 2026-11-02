import { describe, expect, it } from 'vitest';
import { escapeLike, kitchenQuery, PUBLIC_COLUMNS, shapeKitchen } from '../src/lib/rules';

const query = (qs: string) => kitchenQuery(new URLSearchParams(qs));

describe('kitchenQuery', () => {
  it('only ever lists approved kitchens', () => {
    expect(query('')).toEqual({ where: [`status = 'approved'`], args: [], order: 'approved_at DESC, id DESC' });
    expect(query('type=bakery&q=x').where[0]).toBe(`status = 'approved'`);
  });

  it('adds one condition per filter, with values as bound arguments', () => {
    const { where, args } = query('type=bakery&state=Oregon&city=Portland&equipment=induction+wok');
    expect(where).toHaveLength(5);
    expect(args).toEqual(['bakery', 'Oregon', 'Portland', 'induction wok']);
  });

  it('ignores empty filters and blank searches', () => {
    expect(query('type=&state=&q=%20%20')).toEqual(query(''));
  });

  it('searches name, city and region with escaped wildcards', () => {
    const { args } = query('q=50%25_off');
    expect(args).toEqual(Array(3).fill('%50\\%\\_off%'));
  });

  it('sorts by name only when asked', () => {
    expect(query('sort=name').order).toBe('name COLLATE NOCASE ASC');
    expect(query('sort=bogus').order).toBe('approved_at DESC, id DESC');
  });
});

describe('escapeLike', () => {
  it('escapes backslash, percent and underscore', () => {
    expect(escapeLike('a\\b%c_d')).toBe('a\\\\b\\%c\\_d');
  });
});

describe('PUBLIC_COLUMNS', () => {
  it('never includes private submitter details or moderation status', () => {
    expect(PUBLIC_COLUMNS).not.toMatch(/submitter|status|relationship/);
  });
});

describe('shapeKitchen', () => {
  it('turns stored equipment JSON into a list', () => {
    expect(shapeKitchen({ id: 1, equipment: '["induction range"]' })).toEqual({ id: 1, equipment: ['induction range'] });
  });
});
