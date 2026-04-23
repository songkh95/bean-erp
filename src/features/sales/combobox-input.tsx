"use client";

import { cn } from "@/lib/utils";

type ComboboxOption = {
  id: string;
  label: string;
  subLabel?: string | null;
};

type ComboboxInputProps = {
  id: string;
  value: string;
  placeholder: string;
  isOpen: boolean;
  options: ComboboxOption[];
  onOpen: () => void;
  onClose: () => void;
  onChangeValue: (next: string) => void;
  onSelect: (option: ComboboxOption) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

export function ComboboxInput({
  id,
  value,
  placeholder,
  isOpen,
  options,
  onOpen,
  onClose,
  onChangeValue,
  onSelect,
  onKeyDown,
  inputRef,
}: ComboboxInputProps) {
  return (
    <div className="relative">
      <input
        id={id}
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:ring-[3px] focus-visible:ring-slate-200/60 md:text-sm"
        onFocus={onOpen}
        onBlur={() => {
          window.setTimeout(onClose, 120);
        }}
        onChange={(event) => {
          onChangeValue(event.target.value);
          onOpen();
        }}
        onKeyDown={onKeyDown}
      />
      {isOpen && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-white p-1 shadow-md">
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-slate-500">검색 결과가 없습니다.</p>
          ) : (
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                className={cn("w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-slate-100")}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(option);
                  onClose();
                }}
              >
                <div>{option.label}</div>
                {option.subLabel ? <div className="text-xs text-slate-500">{option.subLabel}</div> : null}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
