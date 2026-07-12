"use client";

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, parseISO, isBefore, isAfter, startOfDay } from 'date-fns';

interface CustomCalendarProps {
  selectedDate: string;
  onSelect: (date: string) => void;
  availableDays: string[];
  activeDays: string[];
}

export function CustomCalendar({ selectedDate, onSelect, availableDays, activeDays }: CustomCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const defaultDateStr = (selectedDate && selectedDate !== 'all') ? selectedDate : (availableDays[0] || new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState<Date>(parseISO(defaultDateStr));

  // Keep month in sync if selectedDate changes externally
  // Suppressed because setting state in response to props change is a known pattern here, though generally discouraged.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedDate && selectedDate !== 'all') {
      setCurrentMonth(parseISO(selectedDate));
    }
  }, [selectedDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const minDate = availableDays.length > 0 ? parseISO(availableDays[availableDays.length - 1]) : new Date();
  const maxDate = availableDays.length > 0 ? parseISO(availableDays[0]) : new Date();

  return (
    <div 
      className="relative" 
      ref={dropdownRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-transparent hover:bg-secondary/50 border border-border/60 text-foreground text-sm rounded-md px-3 py-1.5 transition-colors focus:ring-2 focus:ring-ring outline-none"
      >
        <span>
          {selectedDate === 'all' || !selectedDate
            ? 'All Time'
            : format(parseISO(selectedDate), 'MMM d, yyyy')}
        </span>
        <CalendarIcon className="w-4 h-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full pt-2 z-50">
          <div className="w-72 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl p-3">
            <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-secondary rounded-md text-muted-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-semibold text-sm">
              {format(currentMonth, 'MMMM yyyy')}
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-secondary rounded-md text-muted-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-[10px] font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isSelected = selectedDate === dayStr;
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isAvailable = availableDays.includes(dayStr);
              const isActive = activeDays.includes(dayStr);
              
              const isOutOfBounds = isBefore(startOfDay(day), startOfDay(minDate)) || isAfter(startOfDay(day), startOfDay(maxDate));

              return (
                <button
                  key={day.toISOString()}
                  disabled={isOutOfBounds}
                  onClick={() => {
                    onSelect(dayStr);
                    setIsOpen(false);
                  }}
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors mx-auto
                    ${!isCurrentMonth ? 'text-muted-foreground/30' : ''}
                    ${isOutOfBounds ? 'opacity-30 cursor-not-allowed' : 'hover:bg-secondary cursor-pointer'}
                    ${isSelected ? 'bg-primary text-primary-foreground hover:bg-primary/90 font-bold' : ''}
                    ${!isSelected && isActive ? 'text-primary font-semibold bg-primary/10' : ''}
                    ${!isSelected && isAvailable && !isActive ? 'text-foreground font-medium' : ''}
                    ${!isSelected && !isAvailable && !isActive && !isOutOfBounds && isCurrentMonth ? 'text-muted-foreground' : ''}
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
