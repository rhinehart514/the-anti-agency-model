'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Send,
  Loader2,
  Sparkles,
  Check,
  X,
  AlertCircle,
  Undo2,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'pending' | 'success' | 'error';
  operations?: unknown[];
  preview?: unknown;
}

interface ChatInterfaceProps {
  siteId?: string;
  pageId?: string;
  magicToken?: string;
  onPreviewChange?: (preview: unknown) => void;
  onApplyChanges?: (operations: unknown[]) => Promise<void>;
  className?: string;
  placeholder?: string;
  suggestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  'Make the headline more compelling',
  'Add a testimonials section',
  'Change the primary color to blue',
  'Update the call-to-action button text',
  'Add a new feature to the features section',
];

export function ChatInterface({
  siteId,
  pageId,
  magicToken,
  onPreviewChange,
  onApplyChanges,
  className,
  placeholder = 'Describe what you want to change...',
  suggestions = DEFAULT_SUGGESTIONS,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    operations: unknown[];
    preview: unknown;
    messageId: string;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage.id;
  }, []);

  const updateMessage = useCallback((id: string, updates: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  }, []);

  const handleSubmit = async (text: string = input) => {
    if (!text.trim() || isLoading) return;

    const userText = text.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    addMessage({ role: 'user', content: userText });

    // Add assistant message placeholder
    const assistantId = addMessage({
      role: 'assistant',
      content: '',
      status: 'pending',
    });

    try {
      // Call the natural language edit API
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (magicToken) {
        headers['x-magic-token'] = magicToken;
      }

      const response = await fetch(`/api/sites/${siteId}/edit-natural`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          request: userText,
          pageId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process request');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to interpret request');
      }

      const { response: aiResponse, preview, diffSummary } = result;

      if (!aiResponse?.understood) {
        updateMessage(assistantId, {
          content: aiResponse?.interpretation || "I didn't understand that request. Could you try rephrasing?",
          status: 'error',
        });
        return;
      }

      // Build response message
      let responseContent = aiResponse.summary || 'I understood your request.';
      if (diffSummary && diffSummary.length > 0) {
        responseContent += '\n\nChanges:\n' + diffSummary.map((d: string) => `• ${d}`).join('\n');
      }
      if (aiResponse.riskLevel === 'high') {
        responseContent += '\n\n⚠️ This is a significant change. Please review carefully.';
      }

      updateMessage(assistantId, {
        content: responseContent,
        status: 'success',
        operations: aiResponse.operations,
        preview,
      });

      // Set pending changes for preview
      setPendingChanges({
        operations: aiResponse.operations,
        preview,
        messageId: assistantId,
      });

      // Notify parent of preview
      onPreviewChange?.(preview);

    } catch (error) {
      console.error('Chat error:', error);
      updateMessage(assistantId, {
        content: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!pendingChanges || !onApplyChanges) return;

    setIsLoading(true);
    try {
      await onApplyChanges(pendingChanges.operations);

      // Add confirmation message
      addMessage({
        role: 'system',
        content: '✓ Changes applied successfully!',
      });

      setPendingChanges(null);
    } catch (error) {
      console.error('Apply error:', error);
      addMessage({
        role: 'system',
        content: '✗ Failed to apply changes. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = () => {
    setPendingChanges(null);
    onPreviewChange?.(null); // Revert preview
    addMessage({
      role: 'system',
      content: 'Changes discarded.',
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-medium text-foreground mb-1">AI Assistant</h3>
              <p className="text-sm text-muted-foreground">
                Tell me what you want to change on your website
              </p>
            </div>

            {/* Suggestion Chips */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">Try saying:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.slice(0, 4).map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSubmit(suggestion)}
                    className="px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-full text-foreground transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' && 'justify-end'
                )}
              >
                {message.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                )}

                <div
                  className={cn(
                    'max-w-[85%] rounded-xl px-4 py-2',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.role === 'system'
                      ? 'bg-muted text-muted-foreground text-sm'
                      : 'bg-card border border-border'
                  )}
                >
                  {message.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-muted-foreground">Thinking...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="whitespace-pre-wrap text-sm">{message.content}</p>

                      {message.status === 'error' && (
                        <div className="flex items-center gap-1 text-red-400 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          <span>Could not process</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium">You</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Pending Changes Actions */}
      {pendingChanges && (
        <div className="px-4 py-3 bg-primary/5 border-t border-primary/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Preview ready</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReject}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-1" />
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Apply Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isLoading}
            className="px-3"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
