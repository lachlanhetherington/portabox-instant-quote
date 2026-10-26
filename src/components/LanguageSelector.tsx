import React, { useState, useEffect, useRef } from 'react';
import { Globe, Check, Search, ChevronDown } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  getSavedLanguage,
  applyLanguageToDOM,
} from '../services/translationService';

interface LanguageSelectorProps {
  currentStep?: number;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentStep }) => {
  const [selectedLangCode, setSelectedLangCode] = useState<string>(() => getSavedLanguage());
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang: SupportedLanguage =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedLangCode) || SUPPORTED_LANGUAGES[0];

  // Re-apply language whenever selectedLangCode or currentStep changes
  useEffect(() => {
    const timer = setTimeout(() => {
      applyLanguageToDOM(selectedLangCode);
    }, 30);
    return () => clearTimeout(timer);
  }, [selectedLangCode, currentStep]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLanguage = (code: string) => {
    setSelectedLangCode(code);
    setIsOpen(false);
    setSearchQuery('');
    applyLanguageToDOM(code);
  };

  const filteredLanguages = SUPPORTED_LANGUAGES.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q) ||
      l.region.toLowerCase().includes(q)
    );
  });

  const regions: SupportedLanguage['region'][] = [
    'Popular in Australia',
    'Asia & Pacific',
    'Middle East & South Asia',
    'Europe',
    'Global',
  ];

  return (
    <div className="relative" ref={dropdownRef} data-no-translate="true">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-semibold rounded-full border transition-all cursor-pointer shadow-2xs ${
          selectedLangCode !== 'en'
            ? 'bg-[#0b2942] text-white border-[#0b2942]'
            : 'bg-white text-[#0b2942] border-slate-200 hover:bg-sky-50'
        }`}
        title="Select language"
      >
        <Globe className="w-3.5 h-3.5 shrink-0 text-[#00c0f3]" />
        <span className="text-xs leading-none">{currentLang.flag}</span>
        <span className="hidden lg:inline font-bold truncate max-w-[95px]">
          {currentLang.nativeName}
        </span>
        <span className="lg:hidden font-bold uppercase text-[11px]">
          {currentLang.code.split('-')[0]}
        </span>
        <ChevronDown className="w-3 h-3 opacity-70 shrink-0" />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-[#0b2942] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#00c0f3]" />
              <div className="text-xs font-extrabold tracking-wide">
                Select Language ({SUPPORTED_LANGUAGES.length} Languages)
              </div>
            </div>
            {selectedLangCode !== 'en' && (
              <button
                type="button"
                onClick={() => handleSelectLanguage('en')}
                className="text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Reset to English
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search languages (e.g. 中文, Tiếng Việt, العربية, Hindi)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00c0f3] text-slate-800"
              />
            </div>
          </div>

          {/* Languages List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 p-1.5">
            {regions.map((region) => {
              const items = filteredLanguages.filter((l) => l.region === region);
              if (items.length === 0) return null;
              return (
                <div key={region} className="py-1.5 first:pt-0 last:pb-0">
                  <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {region}
                  </div>
                  <div className="grid grid-cols-1 gap-0.5 mt-0.5">
                    {items.map((lang) => {
                      const isSelected = lang.code === selectedLangCode;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => handleSelectLanguage(lang.code)}
                          className={`w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-sky-50 text-[#0b2942] font-bold border border-sky-200/80'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base leading-none shrink-0">{lang.flag}</span>
                            <div className="truncate">
                              <div className="text-xs font-bold text-[#0b2942] flex items-center gap-1.5">
                                <span>{lang.nativeName}</span>
                                <span className="text-[11px] font-normal text-slate-400">
                                  ({lang.name})
                                </span>
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="flex items-center shrink-0">
                              <Check className="w-3.5 h-3.5 text-[#00c0f3] stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredLanguages.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-400">
                No matching language found for "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
