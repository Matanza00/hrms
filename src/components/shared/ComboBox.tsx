import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * A select-or-add combobox. Shows existing `options`, and when the typed text
 * doesn't match any of them, offers an "Add …" item that commits the new value.
 * Used for Client and Source so admins reuse past entries but can add a new one
 * inline (payments for the same client often come in under the same source).
 */
export function ComboBox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search or type to add…",
  addLabel = "Add",
  emptyText = "Nothing yet — type to add.",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  addLabel?: string;
  emptyText?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const exists = options.some((o) => o.toLowerCase() === trimmed.toLowerCase());

  function pick(v: string) {
    onChange(v);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {options.length === 0 && !trimmed && (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}

            {options.length > 0 && (
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem key={o} value={o} onSelect={() => pick(o)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === o ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {o}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {trimmed && !exists && (
              <CommandGroup>
                <CommandItem
                  value={`__add__:${trimmed}`}
                  onSelect={() => pick(trimmed)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {addLabel} “{trimmed}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
