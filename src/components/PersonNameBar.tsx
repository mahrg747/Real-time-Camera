import React, { useState } from 'react';
import { User, Eye, EyeOff, BookmarkPlus, ChevronDown, ChevronUp, Check, Plus, Tag } from 'lucide-react';
import { SavedPerson } from '../types';

interface PersonNameBarProps {
  personName: string;
  onPersonNameChange: (name: string) => void;
  designation: string;
  onDesignationChange: (designation: string) => void;
  isNameVisible: boolean;
  onToggleNameVisibility: (visible: boolean) => void;
  savedPersons: SavedPerson[];
  onAddSavedPerson: (person: { name: string; designation?: string }) => void;
}

export const PersonNameBar: React.FC<PersonNameBarProps> = ({
  personName,
  onPersonNameChange,
  designation,
  onDesignationChange,
  isNameVisible,
  onToggleNameVisibility,
  savedPersons,
  onAddSavedPerson,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);

  const handleSaveCurrent = () => {
    if (!personName.trim()) return;
    onAddSavedPerson({
      name: personName.trim(),
      designation: designation.trim() || undefined,
    });
    setShowSaveFeedback(true);
    setTimeout(() => setShowSaveFeedback(false), 2000);
  };

  const handleSelectSaved = (saved: SavedPerson) => {
    onPersonNameChange(saved.name);
    if (saved.designation) {
      onDesignationChange(saved.designation);
    }
    if (!isNameVisible) {
      onToggleNameVisibility(true);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3 shadow-xl transition-all">
      {/* Primary Row: Label & Main Input */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-sky-400" />
          <span>Person Name / Photo Kis Ki Hai?</span>
        </label>

        <div className="flex items-center gap-2">
          {/* Visibility toggle */}
          <button
            type="button"
            onClick={() => onToggleNameVisibility(!isNameVisible)}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
              isNameVisible
                ? 'text-sky-400 hover:text-sky-300 bg-sky-950/40 border border-sky-800/40'
                : 'text-slate-400 hover:text-slate-300 bg-slate-800/60 border border-slate-700/40'
            }`}
            title={isNameVisible ? 'Name will appear on watermark' : 'Name hidden from watermark'}
          >
            {isNameVisible ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">Visible</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span className="text-[11px] hidden sm:inline">Hidden</span>
              </>
            )}
          </button>

          {/* Expand designation & saved names */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800"
            title="Additional details and saved names"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Input */}
      <div className="relative flex items-center">
        <input
          type="text"
          value={personName}
          onChange={(e) => onPersonNameChange(e.target.value)}
          placeholder="e.g. John Doe, Inspector Ali, Site Member..."
          className={`w-full bg-slate-950/80 border text-slate-100 placeholder:text-slate-500 rounded-xl px-3.5 py-2 text-sm focus:outline-none transition-colors ${
            isNameVisible
              ? 'border-slate-700 focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
              : 'border-slate-800 text-slate-400 line-through'
          }`}
        />
        {personName && (
          <button
            type="button"
            onClick={() => onPersonNameChange('')}
            className="absolute right-3 text-slate-400 hover:text-slate-200 text-xs px-1 rounded"
          >
            Clear
          </button>
        )}
      </div>

      {/* Saved Names Chips (Quick Pick) */}
      {savedPersons.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-[11px] text-slate-400 shrink-0">Quick:</span>
          {savedPersons.map((person) => {
            const isSelected = personName.trim() === person.name;
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => handleSelectSaved(person)}
                className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/50'
                }`}
              >
                <span>{person.name}</span>
                {person.designation && (
                  <span className="text-[10px] opacity-70">({person.designation})</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Collapsible Section: Designation / Short Note & Save Name Action */}
      {isExpanded && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-2">
          <div>
            <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mb-1">
              <Tag className="w-3 h-3 text-sky-400" />
              <span>Designation / Note (Optional)</span>
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => onDesignationChange(e.target.value)}
              placeholder="e.g. Field Inspector, Site Auditor, Client Rep..."
              className="w-full bg-slate-950/80 border border-slate-800 text-slate-100 placeholder:text-slate-500 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              Save this name for one-tap reuse on future photos
            </span>
            <button
              type="button"
              onClick={handleSaveCurrent}
              disabled={!personName.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900 border border-sky-700/60 text-sky-300 text-xs font-medium disabled:opacity-40 transition-colors"
            >
              {showSaveFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Save Name</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
