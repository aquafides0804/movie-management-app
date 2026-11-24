'use client';

import { useRef, useState } from 'react';

/**
 * 長いテキストを1行で「…」省略表示し、省略されているときだけ
 * カーソルを当てると全文を吹き出しで表示するコンポーネント。
 */
export default function TruncatedText({
  text,
  as = 'p',
  className = '',
  isLight,
  onClick,
}: {
  text: string;
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
    setShowTooltip(el.scrollWidth > el.clientWidth + 1);
  };

  const handleMouseLeave = () => setShowTooltip(false);

  const textClass = `truncate ${className}`;

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
