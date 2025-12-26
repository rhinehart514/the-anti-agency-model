'use client';

import { useState } from 'react';
import { Theme, themePresets, generateThemeVars } from '@/lib/themes';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Paintbrush, Check } from 'lucide-react';

interface ThemeSelectorProps {
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export function ThemeSelector({ currentTheme, onThemeChange }: ThemeSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Paintbrush className="h-4 w-4" />
          <span className="hidden sm:inline">{currentTheme.name}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-1">Theme</h4>
            <p className="text-sm text-muted-foreground">
              Choose a color scheme for your site
            </p>
          </div>
          <div className="grid gap-2">
            {themePresets.map((theme) => (
              <ThemePreviewCard
                key={theme.id}
                theme={theme}
                isSelected={currentTheme.id === theme.id}
                onClick={() => {
                  onThemeChange(theme);
                  setOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ThemePreviewCardProps {
  theme: Theme;
  isSelected: boolean;
  onClick: () => void;
}

function ThemePreviewCard({ theme, isSelected, onClick }: ThemePreviewCardProps) {
  const colors = theme.colors;

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full p-3 rounded-lg border transition-colors text-left',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      {/* Color preview */}
      <div className="flex gap-1 shrink-0">
        <div
          className="w-5 h-5 rounded-full border border-white/20"
          style={{ backgroundColor: colors.primary[500] }}
        />
        <div
          className="w-5 h-5 rounded-full border border-white/20"
          style={{ backgroundColor: colors.secondary[500] }}
        />
        <div
          className="w-5 h-5 rounded-full border border-white/20"
          style={{ backgroundColor: colors.accent[500] }}
        />
        <div
          className="w-5 h-5 rounded-full border"
          style={{
            backgroundColor: colors.background,
            borderColor: colors.border || '#e2e8f0',
          }}
        />
      </div>

      {/* Theme info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{theme.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {theme.typography.fontFamily.heading.split(',')[0]}
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <Check className="h-4 w-4 text-primary shrink-0" />
      )}
    </button>
  );
}

// Theme preview component for showing a mini preview of how content looks
interface ThemePreviewProps {
  theme: Theme;
  className?: string;
}

export function ThemePreview({ theme, className }: ThemePreviewProps) {
  const cssVars = generateThemeVars(theme);
  const style: Record<string, string> = {};
  Object.entries(cssVars).forEach(([key, value]) => {
    style[key] = value;
  });

  return (
    <div
      style={style}
      className={cn(
        'rounded-lg overflow-hidden border',
        className
      )}
    >
      {/* Mini hero preview */}
      <div
        className="p-4"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div
          className="h-2 w-24 rounded mb-2"
          style={{ backgroundColor: 'var(--color-primary-500)' }}
        />
        <div
          className="h-1.5 w-32 rounded mb-1"
          style={{ backgroundColor: 'var(--color-foreground)', opacity: 0.2 }}
        />
        <div
          className="h-1.5 w-28 rounded"
          style={{ backgroundColor: 'var(--color-foreground)', opacity: 0.1 }}
        />
      </div>

      {/* Mini content preview */}
      <div
        className="p-4 flex gap-2"
        style={{ backgroundColor: 'var(--color-muted, var(--color-background))' }}
      >
        <div
          className="h-8 w-8 rounded"
          style={{ backgroundColor: 'var(--color-accent-500)' }}
        />
        <div className="flex-1">
          <div
            className="h-1.5 w-16 rounded mb-1"
            style={{ backgroundColor: 'var(--color-foreground)', opacity: 0.2 }}
          />
          <div
            className="h-1 w-24 rounded"
            style={{ backgroundColor: 'var(--color-foreground)', opacity: 0.1 }}
          />
        </div>
      </div>
    </div>
  );
}
