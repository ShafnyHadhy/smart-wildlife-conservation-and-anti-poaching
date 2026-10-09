import { describe, it, expect } from 'vitest';
import { PatrolStatus } from '@wildlife/shared';
import {
  applyPatrolFilters,
  deriveParkOptions,
  deriveRangerOptions,
  deriveRouteOptions,
  areFiltersDefault,
  DEFAULT_PATROL_FILTERS,
  PatrolFilterState,
} from './patrolFilters';

// ---------------------------------------------------------------------------
// Minimal Patrol fixture factory
// ---------------------------------------------------------------------------
function makePatrol(overrides: Partial<{
  id: string;
  patrolCode: string;
  parkId: string;
  parkName: string;
  rangerId: string;
  rangerName: string;
  patrolRouteId: string;
  routeName: string;
  status: PatrolStatus;
}> = {}) {
  return {
    id: overrides.id ?? 'patrol-1',
    patrolCode: overrides.patrolCode ?? 'PAT-001',
    parkId: overrides.parkId ?? 'park-yala',
    parkName: overrides.parkName ?? 'Yala National Park',
    rangerId: overrides.rangerId ?? 'ranger-1',
    rangerName: overrides.rangerName ?? 'Kasun Bandara',
    patrolRouteId: overrides.patrolRouteId ?? 'route-1',
    routeName: overrides.routeName ?? 'Yala Coastal Route',
    status: overrides.status ?? PatrolStatus.ACTIVE,
    startTime: '2026-10-07T09:00:00.000Z',
    coverageScore: 0,
    createdAt: '2026-10-07T09:00:00.000Z',
    updatedAt: '2026-10-07T09:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// deriveParkOptions
// ---------------------------------------------------------------------------
describe('deriveParkOptions', () => {
  it('returns unique parks derived from patrol data', () => {
    const patrols = [
      makePatrol({ parkId: 'park-yala', parkName: 'Yala National Park' }),
      makePatrol({ id: 'p2', parkId: 'park-wilpattu', parkName: 'Wilpattu National Park' }),
      makePatrol({ id: 'p3', parkId: 'park-yala', parkName: 'Yala National Park' }), // duplicate
    ];
    const options = deriveParkOptions(patrols);
    expect(options).toHaveLength(2);
    expect(options.map((o) => o.id)).toContain('park-yala');
    expect(options.map((o) => o.id)).toContain('park-wilpattu');
  });

  it('returns empty array when no patrols are given', () => {
    expect(deriveParkOptions([])).toHaveLength(0);
  });

  it('handles patrols with no parkId safely (excludes them)', () => {
    const patrols = [
      { ...makePatrol(), parkId: '' },
      makePatrol({ id: 'p2', parkId: 'park-yala' }),
    ];
    const options = deriveParkOptions(patrols);
    expect(options).toHaveLength(1);
    expect(options[0].id).toBe('park-yala');
  });

  it('falls back to short ID label when parkName is missing', () => {
    const patrol = { ...makePatrol(), parkName: undefined };
    const options = deriveParkOptions([patrol]);
    expect(options[0].name).toMatch(/Park /);
  });
});

// ---------------------------------------------------------------------------
// deriveRangerOptions
// ---------------------------------------------------------------------------
describe('deriveRangerOptions', () => {
  it('returns unique rangers from patrols', () => {
    const patrols = [
      makePatrol({ rangerId: 'r1', rangerName: 'Kasun Bandara' }),
      makePatrol({ id: 'p2', rangerId: 'r2', rangerName: 'Chaminda Silva' }),
      makePatrol({ id: 'p3', rangerId: 'r1', rangerName: 'Kasun Bandara' }), // duplicate
    ];
    const options = deriveRangerOptions(patrols);
    expect(options).toHaveLength(2);
    expect(options.map((o) => o.id)).toContain('r1');
    expect(options.map((o) => o.id)).toContain('r2');
  });

  it('returns empty array for empty patrol list', () => {
    expect(deriveRangerOptions([])).toHaveLength(0);
  });

  it('handles missing rangerId safely', () => {
    const patrol = { ...makePatrol(), rangerId: '' };
    expect(deriveRangerOptions([patrol])).toHaveLength(0);
  });

  it('falls back to short ID label when rangerName is missing', () => {
    const patrol = { ...makePatrol(), rangerName: undefined };
    const options = deriveRangerOptions([patrol]);
    expect(options[0].name).toMatch(/Ranger /);
  });
});

// ---------------------------------------------------------------------------
// deriveRouteOptions
// ---------------------------------------------------------------------------
describe('deriveRouteOptions', () => {
  it('returns unique routes from patrols', () => {
    const patrols = [
      makePatrol({ patrolRouteId: 'rt-1', routeName: 'Coastal Route' }),
      makePatrol({ id: 'p2', patrolRouteId: 'rt-2', routeName: 'Forest Route' }),
    ];
    const options = deriveRouteOptions(patrols);
    expect(options).toHaveLength(2);
    expect(options.map((o) => o.id)).toContain('rt-1');
    expect(options.map((o) => o.id)).toContain('rt-2');
  });

  it('returns empty array for empty patrol list', () => {
    expect(deriveRouteOptions([])).toHaveLength(0);
  });

  it('handles missing patrolRouteId safely', () => {
    const patrol = { ...makePatrol(), patrolRouteId: '' };
    expect(deriveRouteOptions([patrol])).toHaveLength(0);
  });

  it('falls back to short ID label when routeName is missing', () => {
    const patrol = { ...makePatrol(), routeName: undefined };
    const options = deriveRouteOptions([patrol]);
    expect(options[0].name).toMatch(/Route /);
  });
});

// ---------------------------------------------------------------------------
// areFiltersDefault
// ---------------------------------------------------------------------------
describe('areFiltersDefault', () => {
  it('returns true when all filters are ALL', () => {
    expect(areFiltersDefault(DEFAULT_PATROL_FILTERS)).toBe(true);
  });

  it('returns false when status is not ALL', () => {
    const f: PatrolFilterState = { ...DEFAULT_PATROL_FILTERS, status: PatrolStatus.ACTIVE };
    expect(areFiltersDefault(f)).toBe(false);
  });

  it('returns false when parkId is set', () => {
    const f: PatrolFilterState = { ...DEFAULT_PATROL_FILTERS, parkId: 'park-1' };
    expect(areFiltersDefault(f)).toBe(false);
  });

  it('returns false when rangerId is set', () => {
    const f: PatrolFilterState = { ...DEFAULT_PATROL_FILTERS, rangerId: 'r-1' };
    expect(areFiltersDefault(f)).toBe(false);
  });

  it('returns false when routeId is set', () => {
    const f: PatrolFilterState = { ...DEFAULT_PATROL_FILTERS, routeId: 'rt-1' };
    expect(areFiltersDefault(f)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyPatrolFilters — Status
// ---------------------------------------------------------------------------
describe('applyPatrolFilters — status filter', () => {
  const patrols = [
    makePatrol({ id: 'p-active', status: PatrolStatus.ACTIVE }),
    makePatrol({ id: 'p-planned', status: PatrolStatus.PLANNED }),
    makePatrol({ id: 'p-completed', status: PatrolStatus.COMPLETED }),
    makePatrol({ id: 'p-cancelled', status: PatrolStatus.CANCELLED }),
  ];

  it('ALL — returns every patrol', () => {
    const result = applyPatrolFilters(patrols, { ...DEFAULT_PATROL_FILTERS, status: 'ALL' });
    expect(result).toHaveLength(4);
  });

  it('ACTIVE — returns only active patrols', () => {
    const result = applyPatrolFilters(patrols, { ...DEFAULT_PATROL_FILTERS, status: PatrolStatus.ACTIVE });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p-active');
  });

  it('PLANNED — returns only planned patrols', () => {
    const result = applyPatrolFilters(patrols, { ...DEFAULT_PATROL_FILTERS, status: PatrolStatus.PLANNED });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p-planned');
  });

  it('COMPLETED — returns only completed patrols', () => {
    const result = applyPatrolFilters(patrols, { ...DEFAULT_PATROL_FILTERS, status: PatrolStatus.COMPLETED });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p-completed');
  });

  it('CANCELLED — returns only cancelled patrols', () => {
    const result = applyPatrolFilters(patrols, { ...DEFAULT_PATROL_FILTERS, status: PatrolStatus.CANCELLED });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p-cancelled');
  });
});

// ---------------------------------------------------------------------------
// applyPatrolFilters — Park
// ---------------------------------------------------------------------------
describe('applyPatrolFilters — park filter', () => {
  const patrols = [
    makePatrol({ id: 'p1', parkId: 'park-yala' }),
    makePatrol({ id: 'p2', parkId: 'park-wilpattu' }),
    makePatrol({ id: 'p3', parkId: 'park-yala' }),
    { ...makePatrol({ id: 'p-noPark' }), parkId: '' }, // no park
  ];

  it('All Parks — returns every patrol', () => {
    const result = applyPatrolFilters(patrols, { ...DEFAULT_PATROL_FILTERS, parkId: 'ALL' });
    expect(result).toHaveLength(4);
  });

  it('filter by specific park — returns only that park\'s patrols', () => {
    const result = applyPatrolFilters(patrols, { ...DEFAULT_PATROL_FILTERS, parkId: 'park-yala' });
    expect(result).toHaveLength(2);
    result.forEach((p) => expect(p.parkId).toBe('park-yala'));
  });

  it('handles patrols with missing park — excluded when park filter is active', () => {
    const result = applyPatrolFilters(patrols, { ...DEFAULT_PATROL_FILTERS, parkId: 'park-yala' });
    const ids = result.map((p) => p.id);
    expect(ids).not.toContain('p-noPark');
  });
});

// ---------------------------------------------------------------------------
// applyPatrolFilters — Ranger
// ---------------------------------------------------------------------------
describe('applyPatrolFilters — ranger filter', () => {
  const patrols = [
    makePatrol({ id: 'p1', rangerId: 'r-kasun' }),
    makePatrol({ id: 'p2', rangerId: 'r-chaminda' }),
    { ...makePatrol({ id: 'p-noRanger' }), rangerId: '' },
  ];

  it('All Rangers — returns every patrol', () => {
    const result = applyPatrolFilters(patrols, { ...DEFAULT_PATROL_FILTERS, rangerId: 'ALL' });
    expect(result).toHaveLength(3);
  });

  it('filter by ranger — returns only that ranger\'s patrols', () => {
    const result = applyPatrolFilters(patrols, { ...DEFAULT_PATROL_FILTERS, rangerId: 'r-kasun' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('handles missing rangerId — excluded when ranger filter is active', () => {
    const result = applyPatrolFilters(patrols, { ...DEFAULT_PATROL_FILTERS, rangerId: 'r-kasun' });
    const ids = result.map((p) => p.id);
    expect(ids).not.toContain('p-noRanger');
  });
});

// ---------------------------------------------------------------------------
// applyPatrolFilters — Route
// ---------------------------------------------------------------------------
describe('applyPatrolFilters — route filter', () => {
  const patrols = [
    makePatrol({ id: 'p1', patrolRouteId: 'rt-coastal' }),
    makePatrol({ id: 'p2', patrolRouteId: 'rt-forest' }),
    { ...makePatrol({ id: 'p-noRoute' }), patrolRouteId: '' },
  ];

  it('All Routes — returns every patrol', () => {
    const result = applyPatrolFilters(patrols, { ...DEFAULT_PATROL_FILTERS, routeId: 'ALL' });
    expect(result).toHaveLength(3);
  });

  it('filter by route — returns only patrols on that route', () => {
    const result = applyPatrolFilters(patrols, { ...DEFAULT_PATROL_FILTERS, routeId: 'rt-coastal' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('handles missing patrolRouteId — excluded when route filter is active', () => {
    const result = applyPatrolFilters(patrols, { ...DEFAULT_PATROL_FILTERS, routeId: 'rt-coastal' });
    expect(result.map((p) => p.id)).not.toContain('p-noRoute');
  });
});

// ---------------------------------------------------------------------------
// applyPatrolFilters — Combined filters
// ---------------------------------------------------------------------------
describe('applyPatrolFilters — combined filters', () => {
  const patrols = [
    makePatrol({
      id: 'p-yala-active-kasun-coastal',
      parkId: 'park-yala',
      rangerId: 'r-kasun',
      patrolRouteId: 'rt-coastal',
      status: PatrolStatus.ACTIVE,
    }),
    makePatrol({
      id: 'p-yala-planned-chaminda-forest',
      parkId: 'park-yala',
      rangerId: 'r-chaminda',
      patrolRouteId: 'rt-forest',
      status: PatrolStatus.PLANNED,
    }),
    makePatrol({
      id: 'p-wilpattu-active-kasun-forest',
      parkId: 'park-wilpattu',
      rangerId: 'r-kasun',
      patrolRouteId: 'rt-forest',
      status: PatrolStatus.ACTIVE,
    }),
    makePatrol({
      id: 'p-wilpattu-completed-chaminda-coastal',
      parkId: 'park-wilpattu',
      rangerId: 'r-chaminda',
      patrolRouteId: 'rt-coastal',
      status: PatrolStatus.COMPLETED,
    }),
  ];

  it('Park + Status — Yala + Active returns only Yala active patrols', () => {
    const result = applyPatrolFilters(patrols, {
      ...DEFAULT_PATROL_FILTERS,
      parkId: 'park-yala',
      status: PatrolStatus.ACTIVE,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p-yala-active-kasun-coastal');
  });

  it('Park + Ranger — Yala + Kasun returns Yala Kasun patrol', () => {
    const result = applyPatrolFilters(patrols, {
      ...DEFAULT_PATROL_FILTERS,
      parkId: 'park-yala',
      rangerId: 'r-kasun',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p-yala-active-kasun-coastal');
  });

  it('Status + Ranger + Route — Active + Kasun + Forest returns Wilpattu Kasun patrol', () => {
    const result = applyPatrolFilters(patrols, {
      status: PatrolStatus.ACTIVE,
      parkId: 'ALL',
      rangerId: 'r-kasun',
      routeId: 'rt-forest',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p-wilpattu-active-kasun-forest');
  });

  it('All four filters together — returns exact single match', () => {
    const result = applyPatrolFilters(patrols, {
      status: PatrolStatus.ACTIVE,
      parkId: 'park-yala',
      rangerId: 'r-kasun',
      routeId: 'rt-coastal',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p-yala-active-kasun-coastal');
  });

  it('No matching result returns empty array', () => {
    const result = applyPatrolFilters(patrols, {
      status: PatrolStatus.PLANNED,
      parkId: 'park-wilpattu',
      rangerId: 'r-kasun',
      routeId: 'rt-coastal',
    });
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Reset behavior
// ---------------------------------------------------------------------------
describe('reset — DEFAULT_PATROL_FILTERS restores all patrols', () => {
  const patrols = [
    makePatrol({ id: 'p1', status: PatrolStatus.ACTIVE }),
    makePatrol({ id: 'p2', status: PatrolStatus.PLANNED }),
    makePatrol({ id: 'p3', status: PatrolStatus.COMPLETED }),
    makePatrol({ id: 'p4', status: PatrolStatus.CANCELLED }),
  ];

  it('after resetting to DEFAULT_PATROL_FILTERS, all patrols are visible', () => {
    const result = applyPatrolFilters(patrols, DEFAULT_PATROL_FILTERS);
    expect(result).toHaveLength(4);
  });
});
