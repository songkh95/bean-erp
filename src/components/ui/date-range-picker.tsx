"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DateRangePickerProps = {
  value: DateRange;
  onChange: (next: DateRange | undefined) => void;
  className?: string;
};

function formatLabel(value: DateRange) {
  if (!value.from) {
    return "기간 선택";
  }
  if (!value.to) {
    return format(value.from, "yyyy-MM-dd", { locale: ko });
  }
  return `${format(value.from, "yyyy-MM-dd", { locale: ko })} ~ ${format(value.to, "yyyy-MM-dd", { locale: ko })}`;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" className={cn("justify-start text-left font-normal", className)} />}>
        <CalendarIcon className="h-4 w-4" />
        {formatLabel(value)}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ from: today, to: today })}
          >
            오늘
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ from: monthStart, to: today })}
          >
            이번 달
          </Button>
        </div>
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={value}
          onSelect={onChange}
          defaultMonth={value.from ?? today}
        />
      </PopoverContent>
    </Popover>
  );
}
