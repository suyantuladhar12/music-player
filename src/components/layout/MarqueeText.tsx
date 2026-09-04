import { useEffect, useRef, useState } from "react";

export default function MarqueeText({
  text,
  className,
  style,
  speed = 40,
}: {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  speed?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!container || !textEl) return;

    const checkOverflow = () => {
      const singleWidth = textEl.scrollWidth;
      const containerWidth = container.clientWidth;

      setTextWidth(singleWidth);
      setIsOverflowing(singleWidth > containerWidth);
    };

    checkOverflow();

    const observer = new ResizeObserver(checkOverflow);
    observer.observe(container);

    return () => observer.disconnect();
  }, [text]);

  const totalItemWidth = textWidth + 32;
  const duration = Math.max(3, totalItemWidth / speed);

  return (
    <div ref={containerRef} className={`marquee-container ${className ?? ""}`}>
      {!isOverflowing ? (
        <span ref={textRef} className="marquee-static" style={style}>
          {text}
        </span>
      ) : (
        <div
          className="marquee-track is-overflowing"
          style={
            {
              "--marquee-duration": `${duration}s`,
            } as React.CSSProperties
          }
        >
          <span ref={textRef} className="marquee-item" style={style}>
            {text}
          </span>
          <span className="marquee-item" style={style}>
            {text}
          </span>
        </div>
      )}
    </div>
  );
}
