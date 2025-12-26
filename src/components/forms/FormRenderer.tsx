'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Loader2, CheckCircle, AlertCircle, Star } from 'lucide-react';
import type { FormWithFields, FormField } from '@/lib/forms';

interface FormRendererProps {
  form: FormWithFields;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  className?: string;
}

export function FormRenderer({ form, onSubmit, className }: FormRendererProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sortedFields = [...form.fields].sort((a, b) => a.orderIndex - b.orderIndex);

  const validateField = useCallback((field: FormField, value: unknown): string | null => {
    const { validation } = field;

    if (validation?.required && !value) {
      return `${field.label} is required`;
    }

    if (typeof value === 'string') {
      if (validation?.minLength && value.length < validation.minLength) {
        return `${field.label} must be at least ${validation.minLength} characters`;
      }
      if (validation?.maxLength && value.length > validation.maxLength) {
        return `${field.label} must be less than ${validation.maxLength} characters`;
      }
      if (validation?.pattern && !new RegExp(validation.pattern).test(value)) {
        return validation.patternMessage || `${field.label} is invalid`;
      }
      if (validation?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    if (typeof value === 'number') {
      if (validation?.min !== undefined && value < validation.min) {
        return `${field.label} must be at least ${validation.min}`;
      }
      if (validation?.max !== undefined && value > validation.max) {
        return `${field.label} must be at most ${validation.max}`;
      }
    }

    return null;
  }, []);

  const handleChange = useCallback((slug: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [slug]: value }));

    // Clear error on change
    if (errors[slug]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[slug];
        return next;
      });
    }
  }, [errors]);

  const handleBlur = useCallback((field: FormField) => {
    setTouched((prev) => ({ ...prev, [field.slug]: true }));

    const error = validateField(field, values[field.slug]);
    if (error) {
      setErrors((prev) => ({ ...prev, [field.slug]: error }));
    }
  }, [values, validateField]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: Record<string, string> = {};
    sortedFields.forEach((field) => {
      const error = validateField(field, values[field.slug]);
      if (error) {
        newErrors[field.slug] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched(
        sortedFields.reduce((acc, f) => ({ ...acc, [f.slug]: true }), {})
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setSubmitError(null);

    try {
      await onSubmit(values);
      setSubmitStatus('success');
      setValues({});
      setTouched({});
    } catch (err) {
      setSubmitStatus('error');
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = values[field.slug];
    const error = touched[field.slug] ? errors[field.slug] : null;

    switch (field.type) {
      case 'heading':
        return (
          <h3 className="text-lg font-semibold text-gray-900 pt-4">
            {field.label}
          </h3>
        );

      case 'paragraph':
        return (
          <p className="text-gray-600">{field.helpText || field.label}</p>
        );

      case 'divider':
        return <hr className="my-4" />;

      case 'textarea':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.slug}>
              {field.label}
              {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.slug}
              value={(value as string) || ''}
              onChange={(e) => handleChange(field.slug, e.target.value)}
              onBlur={() => handleBlur(field)}
              placeholder={field.placeholder}
              rows={(field.config?.rows as number) || 4}
              className={cn(error && 'border-red-500')}
            />
            {field.helpText && !error && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'select':
        const selectOptions = (field.config?.options as { value: string; label: string }[]) || [];
        return (
          <div className="space-y-2">
            <Label htmlFor={field.slug}>
              {field.label}
              {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={(value as string) || ''}
              onValueChange={(v) => handleChange(field.slug, v)}
            >
              <SelectTrigger className={cn(error && 'border-red-500')}>
                <SelectValue placeholder={field.placeholder || 'Select...'} />
              </SelectTrigger>
              <SelectContent>
                {selectOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {field.helpText && !error && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'radio':
        const radioOptions = (field.config?.options as { value: string; label: string }[]) || [];
        return (
          <div className="space-y-2">
            <Label>
              {field.label}
              {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-2">
              {radioOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={field.slug}
                    value={opt.value}
                    checked={value === opt.value}
                    onChange={(e) => handleChange(field.slug, e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={(value as boolean) || false}
              onChange={(e) => handleChange(field.slug, e.target.checked)}
              className="mt-0.5 rounded text-blue-600"
            />
            <div>
              <span className="text-sm font-medium">{field.label}</span>
              {field.helpText && (
                <p className="text-sm text-gray-500">{field.helpText}</p>
              )}
            </div>
          </label>
        );

      case 'toggle':
        return (
          <div className="flex items-center justify-between">
            <div>
              <Label>{field.label}</Label>
              {field.helpText && (
                <p className="text-sm text-gray-500">{field.helpText}</p>
              )}
            </div>
            <Switch
              checked={(value as boolean) || false}
              onCheckedChange={(checked) => handleChange(field.slug, checked)}
            />
          </div>
        );

      case 'rating':
        const maxRating = (field.config?.max as number) || 5;
        const currentRating = (value as number) || 0;
        return (
          <div className="space-y-2">
            <Label>
              {field.label}
              {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="flex gap-1">
              {Array.from({ length: maxRating }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleChange(field.slug, i + 1)}
                  className="p-1"
                >
                  <Star
                    className={cn(
                      'h-6 w-6 transition-colors',
                      i < currentRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    )}
                  />
                </button>
              ))}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case 'date':
        return (
          <div className="space-y-2">
            <Label htmlFor={field.slug}>
              {field.label}
              {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              type="date"
              id={field.slug}
              value={(value as string) || ''}
              onChange={(e) => handleChange(field.slug, e.target.value)}
              onBlur={() => handleBlur(field)}
              className={cn(error && 'border-red-500')}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      default:
        // text, email, phone, number, url
        return (
          <div className="space-y-2">
            <Label htmlFor={field.slug}>
              {field.label}
              {field.validation?.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
              id={field.slug}
              value={(value as string) || ''}
              onChange={(e) => handleChange(field.slug, field.type === 'number' ? Number(e.target.value) : e.target.value)}
              onBlur={() => handleBlur(field)}
              placeholder={field.placeholder}
              className={cn(error && 'border-red-500')}
            />
            {field.helpText && !error && (
              <p className="text-sm text-gray-500">{field.helpText}</p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
    }
  };

  if (submitStatus === 'success') {
    return (
      <div className={cn('text-center py-12', className)}>
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Thank you!</h3>
        <p className="text-gray-600">
          {form.settings.successMessage || 'Your submission has been received.'}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {submitStatus === 'error' && submitError && (
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="h-5 w-5" />
          <span>{submitError}</span>
        </div>
      )}

      {sortedFields.map((field) => (
        <div key={field.id}>{renderField(field)}</div>
      ))}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {form.settings.submitButtonText || 'Submit'}
      </Button>
    </form>
  );
}

export default FormRenderer;
