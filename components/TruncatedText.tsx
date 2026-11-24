'use client';

import { useRef, useState } from 'react';

/**
 * 長いテキストを省略表示し、省略されているときだけ
 * カーソルを当てると全文を吹き出しで表示するコンポーネント。
 *
 * lines = 1 : 1行で「…」省略（案1）
 * lines = 2 : 2行まで折り返して、それ以上は「…」省略（案2）
 */
export default function TruncatedText({
  text,
  lines,
  as = 'p',
  className = '',
  isLight,
  onClick,
}: {
  text: string;
  lines: 1 | 2;
  as?: 'p' | 'h3';
  className?: string;
  isLight: boolean;
  onClick?: () => void;
}) {
  const textRef = useRef<HTMLElement | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // 実際に省略されているかを判定（省略されていなければ吹き出しは出さない）
  const handleMouseEnter = () => {
    const el = textRef.current;
    if (!el) return;
    const isTruncated = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
    setShowTooltip(isTruncated);
  };

  const handleMouseLeave = () => setShowTooltip(false);

  const clampClass = lines === 1 ? 'truncate' : 'line-clamp-2 [overflow-wrap:anywhere]';
  const textClass = `${clampClass} ${className}`;

  const tooltipStyle = isLight
    ? 'bg-slate-900 text-white'
    : 'bg-neutral-100 text-neutral-900';

  return (
    <div className="relative min-w-0" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {as === 'h3' ? (
        <h3
          ref={(el) => {
            textRef.current = el;
          }}
          className={textClass}
          onClick={onClick}
        >
          {text}
        </h3>
      ) : (
        <p
          ref={(el) => {
            textRef.current = el;
          }}
          className={textClass}
          onClick={onClick}
        >
          {text}
        </p>
      )}

      {showTooltip && (
        <div
          role="tooltip"
          className={`pointer-events-none absolute left-0 top-full z-30 mt-1 w-max max-w-[15rem] whitespace-normal rounded-md px-2.5 py-1.5 text-xs font-bold leading-relaxed shadow-lg [overflow-wrap:anywhere] ${tooltipStyle}`}
        >
          {text}
        </div>
      )}
    </div>
  );
}
