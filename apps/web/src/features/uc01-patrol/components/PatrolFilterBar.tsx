import { X, Filter } from 'lucide-react';
import { PatrolStatus } from '@wildlife/shared';
import {
  PatrolFilterState,
  DEFAULT_PATROL_FILTERS,
  ParkOption,
  RangerOption,
  RouteOption,
  areFiltersDefault,
} from '../utils/patrolFilters';

interface PatrolFilterBarProps {
  filters: PatrolFilterState;
  parkOptions: ParkOption[];
  rangerOptions: RangerOption[];
  routeOptions: RouteOption[];
  onFiltersChange: (filters: PatrolFilterState) => void;
  onReset: () => void;
}

const STATUS_OPTIONS: Array<{ value: PatrolStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: PatrolStatus.ACTIVE, label: 'Active' },
  { value: PatrolStatus.PLANNED, label: 'Planned' },
  { value: PatrolStatus.COMPLETED, label: 'Completed' },
  { value: PatrolStatus.CANCELLED, label: 'Cancelled' },
];

const SELECT_CLASS =
  'h-8 pl-2.5 pr-7 text-xs font-medium rounded-lg border border-[#D1B370]/60 bg-white text-stone-700 ' +
  'appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30 ' +
  'hover:border-[#3E8E41]/50 transition-colors duration-150';

export function PatrolFilterBar({
  filters,
  parkOptions,
  rangerOptions,
  routeOptions,
  onFiltersChange,
  onReset,
}: PatrolFilterBarProps) {
  const isDefault = areFiltersDefault(filters);

  function handleStatusChange(value: string) {
    const status = value === 'ALL' ? 'ALL' : (value as PatrolStatus);
    onFiltersChange({ ...filters, status });
  }

  function handleParkChange(value: string) {
    onFiltersChange({ ...filters, parkId: value });
  }

  function handleRangerChange(value: string) {
    onFiltersChange({ ...filters, rangerId: value });
  }

  function handleRouteChange(value: string) {
    onFiltersChange({ ...filters, routeId: value });
  }

  return (
    <div
      data-testid="patrol-filter-bar"
      className="p-4 bg-white border border-[#D1B370]/60 rounded-2xl shadow-xs"
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* Label */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-wider shrink-0">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters</span>
        </div>

        {/* Status — pill buttons (reuses existing visual pattern) */}
        <div className="flex items-center gap-1.5 flex-wrap" aria-label="Status filter">
          {STATUS_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleStatusChange(value)}
              aria-pressed={filters.status === value}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-150 ${
                filters.status === value
                  ? 'bg-[#3E8E41] text-white shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-[#F5F5DC] border border-[#D1B370]/60'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-stone-200 shrink-0" />

        {/* Park dropdown */}
        {parkOptions.length > 0 && (
          <div className="relative shrink-0">
            <label htmlFor="filter-park" className="sr-only">
              Filter by park
            </label>
            <select
              id="filter-park"
              value={filters.parkId}
              onChange={(e) => handleParkChange(e.target.value)}
              className={SELECT_CLASS}
              style={{ minWidth: '130px' }}
            >
              <option value="ALL">All Parks</option>
              {parkOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400">
              ▾
            </span>
          </div>
        )}

        {/* Ranger dropdown */}
        {rangerOptions.length > 0 && (
          <div className="relative shrink-0">
            <label htmlFor="filter-ranger" className="sr-only">
              Filter by ranger
            </label>
            <select
              id="filter-ranger"
              value={filters.rangerId}
              onChange={(e) => handleRangerChange(e.target.value)}
              className={SELECT_CLASS}
              style={{ minWidth: '140px' }}
            >
              <option value="ALL">All Rangers</option>
              {rangerOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400">
              ▾
            </span>
          </div>
        )}

        {/* Route dropdown */}
        {routeOptions.length > 0 && (
          <div className="relative shrink-0">
            <label htmlFor="filter-route" className="sr-only">
              Filter by route
            </label>
            <select
              id="filter-route"
              value={filters.routeId}
              onChange={(e) => handleRouteChange(e.target.value)}
              className={SELECT_CLASS}
              style={{ minWidth: '160px' }}
            >
              <option value="ALL">All Routes</option>
              {routeOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-stone-400">
              ▾
            </span>
          </div>
        )}

        {/* Reset button — only shown when filters are not default */}
        {!isDefault && (
          <button
            onClick={onReset}
            aria-label="Clear all filters"
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-600
              bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-lg
              transition-colors duration-150 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Active filter summary chips */}
      {!isDefault && (
        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-stone-100">
          {filters.status !== DEFAULT_PATROL_FILTERS.status && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#3E8E41]/10 text-[#2E6B31] border border-[#3E8E41]/25">
              Status: {filters.status}
            </span>
          )}
          {filters.parkId !== DEFAULT_PATROL_FILTERS.parkId && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#3E8E41]/10 text-[#2E6B31] border border-[#3E8E41]/25">
              Park:{' '}
              {parkOptions.find((p) => p.id === filters.parkId)?.name ?? filters.parkId}
            </span>
          )}
          {filters.rangerId !== DEFAULT_PATROL_FILTERS.rangerId && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#3E8E41]/10 text-[#2E6B31] border border-[#3E8E41]/25">
              Ranger:{' '}
              {rangerOptions.find((r) => r.id === filters.rangerId)?.name ?? filters.rangerId}
            </span>
          )}
          {filters.routeId !== DEFAULT_PATROL_FILTERS.routeId && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#3E8E41]/10 text-[#2E6B31] border border-[#3E8E41]/25">
              Route:{' '}
              {routeOptions.find((r) => r.id === filters.routeId)?.name ?? filters.routeId}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
