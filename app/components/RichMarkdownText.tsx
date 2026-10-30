'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, ExternalLink } from 'lucide-react';

interface RichMarkdownTextProps {
  content: string;
  className?: string;
}

/**
 * Copy button with a 2-second copied state feedback
 */
function CodeCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
      className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded border border-white/10 transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

/**
 * Parses inline formatting:
 * - Bold: **text**
 * - Italic: *text* or _text_
 * - Inline code: `code`
 * - Links: [label](url)
 */
function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Regex matches:
  // 1: `code`
  // 2: **bold**
  // 3: *italic*
  // 4: [link text](url)
  const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)]+\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      nodes.push(text.substring(lastIndex, matchIndex));
    }

    const matchedStr = match[0];

    if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
      const code = matchedStr.slice(1, -1);
      nodes.push(
        <code
          key={`code-${matchIndex}`}
          className="px-1.5 py-0.5 mx-0.5 text-xs font-mono bg-white/10 text-indigo-300 rounded border border-white/10"
        >
          {code}
        </code>
      );
    } else if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
      const boldText = matchedStr.slice(2, -2);
      nodes.push(
        <strong key={`bold-${matchIndex}`} className="font-semibold text-white">
          {parseInline(boldText)}
        </strong>
      );
    } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
      const italicText = matchedStr.slice(1, -1);
      nodes.push(
        <em key={`italic-${matchIndex}`} className="italic text-white/90">
          {parseInline(italicText)}
        </em>
      );
    } else if (matchedStr.startsWith('[') && matchedStr.includes('](')) {
      const linkMatch = matchedStr.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (linkMatch) {
        const [, label, url] = linkMatch;
        const isExternal = url.startsWith('http://') || url.startsWith('https://');

        if (isExternal) {
          nodes.push(
            <a
              key={`link-${matchIndex}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors font-medium"
            >
              <span>{label}</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          );
        } else {
          nodes.push(
            <Link
              key={`link-${matchIndex}`}
              href={url}
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors font-medium"
            >
              <span>{label}</span>
            </Link>
          );
        }
      } else {
        nodes.push(matchedStr);
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }

  return nodes;
}

export function RichMarkdownText({ content, className = '' }: RichMarkdownTextProps) {
  if (!content) return null;

  // Split into tokens handling code blocks first
  // Matches ```lang\ncode\n```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\s*\n([\s\S]*?)```/g;
  const blocks: Array<
    | { type: 'code'; language: string; code: string }
    | { type: 'text'; text: string }
  > = [];

  let lastIndex = 0;
  let codeMatch: RegExpExecArray | null;

  while ((codeMatch = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, codeMatch.index);
    if (textBefore.trim().length > 0) {
      blocks.push({ type: 'text', text: textBefore });
    }

    blocks.push({
      type: 'code',
      language: codeMatch[1]?.trim() || 'code',
      code: codeMatch[2].replace(/\n$/, ''),
    });

    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    const remainingText = content.substring(lastIndex);
    if (remainingText.length > 0) {
      blocks.push({ type: 'text', text: remainingText });
    }
  }

  return (
    <div className={`rich-markdown space-y-3 leading-relaxed ${className}`}>
      {blocks.map((block, blockIdx) => {
        if (block.type === 'code') {
          return (
            <div
              key={`block-code-${blockIdx}`}
              className="my-3 rounded-xl overflow-hidden border border-white/15 bg-neutral-950/90 shadow-lg text-left"
            >
              {/* Code block header bar */}
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-white/[0.04] border-b border-white/10 text-xs">
                <span className="font-mono text-indigo-300 uppercase tracking-wider text-[11px] font-semibold">
                  {block.language}
                </span>
                <CodeCopyButton text={block.code} />
              </div>
              {/* Code content */}
              <pre className="p-3.5 overflow-x-auto text-xs sm:text-sm font-mono text-emerald-300 leading-normal selection:bg-indigo-500/30">
                <code>{block.code}</code>
              </pre>
            </div>
          );
        }

        // Parse regular lines in text block
        const lines = block.text.split('\n');
        const renderedElements: React.ReactNode[] = [];
        let listItems: React.ReactNode[] = [];
        let listType: 'ul' | 'ol' | null = null;

        const flushList = () => {
          if (listItems.length > 0 && listType) {
            if (listType === 'ul') {
              renderedElements.push(
                <ul
                  key={`ul-${renderedElements.length}`}
                  className="space-y-1.5 my-2 pl-2"
                >
                  {listItems}
                </ul>
              );
            } else {
              renderedElements.push(
                <ol
                  key={`ol-${renderedElements.length}`}
                  className="space-y-1.5 my-2 pl-2"
                >
                  {listItems}
                </ol>
              );
            }
            listItems = [];
            listType = null;
          }
        };

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmed = line.trim();

          // Empty line
          if (!trimmed) {
            flushList();
            continue;
          }

          // Horizontal rule
          if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
            flushList();
            renderedElements.push(
              <hr key={`hr-${i}`} className="border-t border-white/10 my-3" />
            );
            continue;
          }

          // Heading 1 (# ...)
          if (trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
            flushList();
            const text = trimmed.slice(2).trim();
            renderedElements.push(
              <h1
                key={`h1-${i}`}
                className="text-lg sm:text-xl font-bold text-white mt-4 mb-2 pb-1 border-b border-white/10 tracking-tight"
              >
                {parseInline(text)}
              </h1>
            );
            continue;
          }

          // Heading 2 (## ...)
          if (trimmed.startsWith('## ') && !trimmed.startsWith('### ')) {
            flushList();
            const text = trimmed.slice(3).trim();
            renderedElements.push(
              <h2
                key={`h2-${i}`}
                className="text-base sm:text-lg font-semibold text-white/95 mt-3.5 mb-1.5 flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                <span>{parseInline(text)}</span>
              </h2>
            );
            continue;
          }

          // Heading 3 (### ...)
          if (trimmed.startsWith('### ')) {
            flushList();
            const text = trimmed.slice(4).trim();
            renderedElements.push(
              <h3
                key={`h3-${i}`}
                className="text-sm sm:text-base font-semibold text-indigo-300 mt-2.5 mb-1"
              >
                {parseInline(text)}
              </h3>
            );
            continue;
          }

          // Blockquote (> ...)
          if (trimmed.startsWith('>')) {
            flushList();
            const text = trimmed.replace(/^>\s*/, '');
            renderedElements.push(
              <blockquote
                key={`quote-${i}`}
                className="border-l-2 border-indigo-400/80 bg-indigo-500/10 px-3 py-1.5 my-2 rounded-r text-xs sm:text-sm text-white/80 italic"
              >
                {parseInline(text)}
              </blockquote>
            );
            continue;
          }

          // Bullet list (* or -)
          const bulletMatch = line.match(/^(\s*)([-*])\s+(.+)$/);
          if (bulletMatch) {
            if (listType !== 'ul') {
              flushList();
              listType = 'ul';
            }
            const [, indent, , itemContent] = bulletMatch;
            const indentLevel = Math.floor(indent.length / 2);
            listItems.push(
              <li
                key={`li-ul-${i}`}
                className="flex items-start gap-2 text-xs sm:text-sm text-white/90"
                style={{ marginLeft: `${indentLevel * 12}px` }}
              >
                <span className="text-indigo-400 mt-1 select-none text-xs leading-none">•</span>
                <span className="flex-1">{parseInline(itemContent)}</span>
              </li>
            );
            continue;
          }

          // Numbered list (1. 2. etc.)
          const numMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/);
          if (numMatch) {
            if (listType !== 'ol') {
              flushList();
              listType = 'ol';
            }
            const [, indent, num, itemContent] = numMatch;
            const indentLevel = Math.floor(indent.length / 2);
            listItems.push(
              <li
                key={`li-ol-${i}`}
                className="flex items-start gap-2 text-xs sm:text-sm text-white/90"
                style={{ marginLeft: `${indentLevel * 12}px` }}
              >
                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[11px] font-semibold select-none mt-0.5">
                  {num}
                </span>
                <span className="flex-1">{parseInline(itemContent)}</span>
              </li>
            );
            continue;
          }

          // Regular paragraph line
          flushList();
          renderedElements.push(
            <p key={`p-${i}`} className="text-xs sm:text-sm text-white/90 leading-relaxed">
              {parseInline(line)}
            </p>
          );
        }

        flushList();

        return (
          <div key={`block-text-${blockIdx}`} className="space-y-1.5">
            {renderedElements}
          </div>
        );
      })}
    </div>
  );
}
