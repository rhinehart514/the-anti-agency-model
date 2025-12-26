'use client';

import { useState, useCallback } from 'react';
import { Settings, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getComponent, type PageSection, type EditableFieldDefinition } from '@/lib/components';

interface PropertiesPanelProps {
  selectedSection: PageSection | null;
  onUpdateProps: (sectionId: string, props: Record<string, unknown>) => void;
  onClose: () => void;
}

// Helper to get nested value from object using dot notation path
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc: unknown, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

// Helper to set nested value in object using dot notation path
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const result = { ...obj };
  const parts = path.split('.');
  let current: Record<string, unknown> = result;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    } else {
      current[part] = { ...(current[part] as Record<string, unknown>) };
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
  return result;
}

interface FieldEditorProps {
  field: EditableFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}

function FieldEditor({ field, value, onChange }: FieldEditorProps) {
  switch (field.type) {
    case 'text':
      return (
        <Input
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      );

    case 'richtext':
      return (
        <textarea
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full min-h-[100px] px-3 py-2 border rounded-md text-sm resize-y"
        />
      );

    case 'url':
      return (
        <Input
          type="url"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'https://...'}
        />
      );

    case 'email':
      return (
        <Input
          type="email"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || 'email@example.com'}
        />
      );

    case 'color':
      return (
        <div className="flex gap-2">
          <input
            type="color"
            value={(value as string) || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded border cursor-pointer"
          />
          <Input
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="flex-1"
          />
        </div>
      );

    case 'select':
      return (
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-md text-sm bg-white"
        >
          <option value="">Select...</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );

    case 'boolean':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded border"
          />
          <span className="text-sm">{field.label}</span>
        </label>
      );

    case 'number':
      return (
        <Input
          type="number"
          value={(value as number) || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={field.validation?.min}
          max={field.validation?.max}
        />
      );

    case 'image':
      return (
        <div className="space-y-2">
          <Input
            type="url"
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Image URL..."
          />
          {typeof value === 'string' && value && (
            <div className="aspect-video bg-gray-100 rounded overflow-hidden">
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      );

    default:
      return (
        <Input
          value={String(value || '')}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

function FieldGroup({
  field,
  props,
  onUpdateProps,
}: {
  field: EditableFieldDefinition;
  props: Record<string, unknown>;
  onUpdateProps: (newProps: Record<string, unknown>) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const value = getNestedValue(props, field.path);

  const handleChange = useCallback(
    (newValue: unknown) => {
      const updated = setNestedValue(props, field.path, newValue);
      onUpdateProps(updated);
    },
    [props, field.path, onUpdateProps]
  );

  // For array fields, render differently
  if (field.type === 'array' && field.itemFields) {
    const items = (value as unknown[]) || [];
    return (
      <div className="space-y-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 w-full text-left font-medium text-sm"
        >
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          {field.label} ({items.length})
        </button>
        {isOpen && (
          <div className="pl-4 space-y-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 rounded border space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">
                    Item {index + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newItems = items.filter((_, i) => i !== index);
                      handleChange(newItems);
                    }}
                    className="h-6 px-2 text-red-500 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
                {field.itemFields?.map((itemField) => (
                  <div key={itemField.path} className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">
                      {itemField.label}
                    </label>
                    <FieldEditor
                      field={itemField}
                      value={getNestedValue(
                        item as Record<string, unknown>,
                        itemField.path
                      )}
                      onChange={(newValue) => {
                        const newItems = [...items];
                        newItems[index] = setNestedValue(
                          item as Record<string, unknown>,
                          itemField.path,
                          newValue
                        );
                        handleChange(newItems);
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newItem: Record<string, unknown> = {};
                field.itemFields?.forEach((f) => {
                  newItem[f.path] = '';
                });
                handleChange([...items, newItem]);
              }}
              className="w-full"
            >
              Add {field.label?.replace(/s$/, '')}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">{field.label}</label>
      {field.description && (
        <p className="text-xs text-gray-500">{field.description}</p>
      )}
      <FieldEditor field={field} value={value} onChange={handleChange} />
    </div>
  );
}

export function PropertiesPanel({
  selectedSection,
  onUpdateProps,
  onClose,
}: PropertiesPanelProps) {
  if (!selectedSection) {
    return (
      <div className="h-full flex flex-col bg-gray-50 border-l">
        <div className="p-4 border-b bg-white">
          <h3 className="font-semibold text-gray-900">Properties</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-4 text-center">
          <div>
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Select a section to edit its properties</p>
          </div>
        </div>
      </div>
    );
  }

  const componentDef = getComponent(selectedSection.componentId);

  if (!componentDef) {
    return (
      <div className="h-full flex flex-col bg-gray-50 border-l">
        <div className="p-4 border-b bg-white flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">Properties</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex items-center justify-center text-red-500 text-sm p-4 text-center">
          Component "{selectedSection.componentId}" not found
        </div>
      </div>
    );
  }

  const handleUpdateProps = (newProps: Record<string, unknown>) => {
    onUpdateProps(selectedSection.id, newProps);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 border-l w-80">
      <div className="p-4 border-b bg-white flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-gray-900">{componentDef.name}</h3>
          <p className="text-xs text-gray-500">{componentDef.category}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {componentDef.editableFields.map((field) => (
            <FieldGroup
              key={field.path}
              field={field}
              props={selectedSection.props}
              onUpdateProps={handleUpdateProps}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default PropertiesPanel;
