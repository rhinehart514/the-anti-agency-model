'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  Plus,
  GripVertical,
  Trash2,
  Settings,
  Eye,
  Save,
  Type,
  Mail,
  Phone,
  Hash,
  AlignLeft,
  List,
  CheckSquare,
  ToggleLeft,
  Calendar,
  Upload,
  Star,
  Minus,
} from 'lucide-react';
import type { FormField, FormFieldType, FormWithFields } from '@/lib/forms';

// Field type definitions with icons
const FIELD_TYPES: {
  type: FormFieldType;
  label: string;
  icon: React.ReactNode;
  category: 'input' | 'choice' | 'advanced' | 'layout';
}[] = [
  { type: 'text', label: 'Text', icon: <Type className="h-4 w-4" />, category: 'input' },
  { type: 'email', label: 'Email', icon: <Mail className="h-4 w-4" />, category: 'input' },
  { type: 'phone', label: 'Phone', icon: <Phone className="h-4 w-4" />, category: 'input' },
  { type: 'number', label: 'Number', icon: <Hash className="h-4 w-4" />, category: 'input' },
  { type: 'textarea', label: 'Long Text', icon: <AlignLeft className="h-4 w-4" />, category: 'input' },
  { type: 'select', label: 'Dropdown', icon: <List className="h-4 w-4" />, category: 'choice' },
  { type: 'radio', label: 'Radio', icon: <CheckSquare className="h-4 w-4" />, category: 'choice' },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="h-4 w-4" />, category: 'choice' },
  { type: 'toggle', label: 'Toggle', icon: <ToggleLeft className="h-4 w-4" />, category: 'choice' },
  { type: 'date', label: 'Date', icon: <Calendar className="h-4 w-4" />, category: 'advanced' },
  { type: 'file', label: 'File Upload', icon: <Upload className="h-4 w-4" />, category: 'advanced' },
  { type: 'rating', label: 'Rating', icon: <Star className="h-4 w-4" />, category: 'advanced' },
  { type: 'heading', label: 'Heading', icon: <Type className="h-4 w-4" />, category: 'layout' },
  { type: 'divider', label: 'Divider', icon: <Minus className="h-4 w-4" />, category: 'layout' },
];

interface FormBuilderProps {
  form: FormWithFields;
  onSave: (form: FormWithFields) => void;
  onPreview: () => void;
}

interface SortableFieldProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SortableField({ field, isSelected, onSelect, onDelete }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const fieldType = FIELD_TYPES.find((t) => t.type === field.type);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-3 p-4 bg-white border rounded-lg transition-all',
        isDragging && 'opacity-50 shadow-lg',
        isSelected && 'ring-2 ring-blue-500 border-blue-500'
      )}
      onClick={onSelect}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{fieldType?.icon}</span>
          <span className="font-medium">{field.label}</span>
          {field.validation?.required && (
            <span className="text-red-500 text-xs">*</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {fieldType?.label} field
          {field.placeholder && ` · "${field.placeholder}"`}
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="opacity-0 group-hover:opacity-100 text-red-600"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function FormBuilder({ form, onSave, onPreview }: FormBuilderProps) {
  const [fields, setFields] = useState<FormField[]>(form.fields);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setFields((prev) => {
      const oldIndex = prev.findIndex((f) => f.id === active.id);
      const newIndex = prev.findIndex((f) => f.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      return reordered.map((f, i) => ({ ...f, orderIndex: i }));
    });
    setHasChanges(true);
  };

  const handleAddField = (type: FormFieldType) => {
    const fieldType = FIELD_TYPES.find((t) => t.type === type);
    const newField: FormField = {
      id: `field-${Date.now()}`,
      formId: form.id,
      name: `field_${fields.length + 1}`,
      slug: `field_${fields.length + 1}`,
      type,
      label: fieldType?.label || 'New Field',
      orderIndex: fields.length,
      config: {},
      validation: {},
    };

    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setHasChanges(true);
  };

  const handleUpdateField = (fieldId: string, updates: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
    setHasChanges(true);
  };

  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave({ ...form, fields });
    setHasChanges(false);
  };

  return (
    <div className="h-full flex bg-gray-100">
      {/* Field Palette */}
      <div className="w-64 bg-white border-r p-4 overflow-auto">
        <h3 className="font-semibold text-sm text-gray-700 mb-3">Add Fields</h3>

        {['input', 'choice', 'advanced', 'layout'].map((category) => (
          <div key={category} className="mb-4">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
              {category}
            </h4>
            <div className="space-y-1">
              {FIELD_TYPES.filter((t) => t.category === category).map((fieldType) => (
                <button
                  key={fieldType.type}
                  onClick={() => handleAddField(fieldType.type)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <span className="text-gray-400">{fieldType.icon}</span>
                  {fieldType.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Form Canvas */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl mx-auto">
          {/* Form Header */}
          <div className="mb-6">
            <Input
              value={form.name}
              className="text-2xl font-bold border-none bg-transparent px-0 focus-visible:ring-0"
              placeholder="Form Name"
            />
            <Input
              value={form.description || ''}
              className="text-gray-500 border-none bg-transparent px-0 focus-visible:ring-0 mt-1"
              placeholder="Add a description..."
            />
          </div>

          {/* Fields */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {fields.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg text-gray-400">
                    <Plus className="h-8 w-8 mx-auto mb-2" />
                    <p>Add fields from the left panel</p>
                  </div>
                ) : (
                  fields.map((field) => (
                    <SortableField
                      key={field.id}
                      field={field}
                      isSelected={selectedFieldId === field.id}
                      onSelect={() => setSelectedFieldId(field.id)}
                      onDelete={() => handleDeleteField(field.id)}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>

          {/* Submit Button Preview */}
          <div className="mt-6 pt-6 border-t">
            <Button className="w-full" disabled>
              {form.settings.submitButtonText || 'Submit'}
            </Button>
          </div>
        </div>
      </div>

      {/* Field Properties */}
      <div className="w-80 bg-white border-l p-4 overflow-auto">
        {selectedField ? (
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-gray-700">Field Settings</h3>

            <div className="space-y-3">
              <div>
                <Label>Label</Label>
                <Input
                  value={selectedField.label}
                  onChange={(e) =>
                    handleUpdateField(selectedField.id, { label: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Placeholder</Label>
                <Input
                  value={selectedField.placeholder || ''}
                  onChange={(e) =>
                    handleUpdateField(selectedField.id, {
                      placeholder: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>Help Text</Label>
                <Input
                  value={selectedField.helpText || ''}
                  onChange={(e) =>
                    handleUpdateField(selectedField.id, {
                      helpText: e.target.value,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Required</Label>
                <Switch
                  checked={selectedField.validation?.required || false}
                  onCheckedChange={(checked) =>
                    handleUpdateField(selectedField.id, {
                      validation: {
                        ...selectedField.validation,
                        required: checked,
                      },
                    })
                  }
                />
              </div>

              {(selectedField.type === 'select' ||
                selectedField.type === 'radio' ||
                selectedField.type === 'multiselect') && (
                <div>
                  <Label>Options</Label>
                  <p className="text-xs text-gray-500 mt-1">
                    One option per line
                  </p>
                  <textarea
                    className="w-full mt-2 p-2 border rounded-md text-sm"
                    rows={4}
                    value={
                      (selectedField.config?.options as { value: string; label: string }[])
                        ?.map((o) => o.label)
                        .join('\n') || ''
                    }
                    onChange={(e) => {
                      const options = e.target.value.split('\n').map((label) => ({
                        value: label.toLowerCase().replace(/\s+/g, '_'),
                        label,
                      }));
                      handleUpdateField(selectedField.id, {
                        config: { ...selectedField.config, options },
                      });
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <Settings className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Select a field to edit</p>
          </div>
        )}

        {/* Form Settings */}
        <div className="mt-8 pt-4 border-t">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">Form Settings</h3>

          <div className="space-y-3">
            <div>
              <Label>Submit Button Text</Label>
              <Input
                value={form.settings.submitButtonText || 'Submit'}
                placeholder="Submit"
              />
            </div>

            <div>
              <Label>Success Message</Label>
              <Input
                value={form.settings.successMessage || ''}
                placeholder="Thank you for your submission!"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Actions */}
      <div className="fixed bottom-6 right-6 flex items-center gap-2">
        <Button variant="outline" onClick={onPreview}>
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <Button onClick={handleSave} disabled={!hasChanges}>
          <Save className="h-4 w-4 mr-2" />
          Save Form
        </Button>
      </div>
    </div>
  );
}

export default FormBuilder;
