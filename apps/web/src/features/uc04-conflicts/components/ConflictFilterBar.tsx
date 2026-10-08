import { ConflictStatus, ConflictType } from '../types';
import { Search, Filter } from 'lucide-react';

interface ConflictFilterBarProps {
  statusFilter: ConflictStatus | 'ALL';
  onStatusChange: (status: ConflictStatus | 'ALL') => void;
  typeFilter: ConflictType | 'ALL';
  onTypeChange: (type: ConflictType | 'ALL') => void;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  onOpenCreateModal?: () => void;
}

const STATUS_OPTIONS: { label: string; value: ConflictStatus | 'ALL' }[] = [
  { label: 'All Incidents', value: 'ALL' },
  { label: 'Submitted', value: ConflictStatus.SUBMITTED },
  { label: 'Under Review', value: ConflictStatus.UNDER_REVIEW },
  { label: 'Responding', value: ConflictStatus.RESPONDING },
  { label: 'Resolved', value: ConflictStatus.RESOLVED },
  { label: 'Closed', value: ConflictStatus.CLOSED },
];

const TYPE_OPTIONS: { label: string; value: ConflictType | 'ALL' }[] = [
  { label: 'All Categories', value: 'ALL' },
  { label: 'Crop Damage', value: ConflictType.CROP_DAMAGE },
  { label: 'Elephant Encounter', value: ConflictType.ELEPHANT_HUMAN_CONFLICT },
  { label: 'Village Intrusion', value: ConflictType.ANIMAL_INTRUSION },
  { label: 'Livestock Attack', value: ConflictType.LIVESTOCK_ATTACK },
  { label: 'Property Damage', value: ConflictType.PROPERTY_DAMAGE },
  { label: 'Other', value: ConflictType.OTHER },
];

export function ConflictFilterBar({
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
  searchTerm,
  onSearchChange,
  onOpenCreateModal: _onOpenCreateModal,
}: ConflictFilterBarProps) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-[#D1B370]/60 shadow-xs space-y-4">
      {/* Top Row: Search + Category + Action */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by village name, reporter, or description..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-[#FAF7EE]/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30 focus:border-[#3E8E41] text-[#1C2A1E] placeholder:text-stone-400 transition-all font-medium"
          />
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => onTypeChange(e.target.value as any)}
              className="appearance-none bg-white text-xs font-bold text-stone-700 pl-3 pr-8 py-2 rounded-xl border border-[#D1B370]/60 hover:border-[#3E8E41] focus:outline-none focus:ring-2 focus:ring-[#3E8E41]/30 cursor-pointer"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Filter className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Bottom Row: Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-stone-100 pt-3">
        {STATUS_OPTIONS.map((st) => {
          const isActive = statusFilter === st.value;
          return (
            <button
              key={st.value}
              onClick={() => onStatusChange(st.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#3E8E41] text-white shadow-xs'
                  : 'bg-[#FAF7EE] text-stone-700 hover:bg-[#F5F5DC] border border-[#D1B370]/50'
              }`}
            >
              {st.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
