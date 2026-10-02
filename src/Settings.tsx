import { useEffect, useRef } from 'react';
import { THEMES } from './themes';

/**
 * Design picker. Sits over the timer, which re-themes live as the wheel
 * moves, so the screen behind is the preview.
 */
export default function Settings({
  picked,
  current,
  onPick,
}: {
  picked: number;
  current: string;
  onPick: (index: number) => void;
}) {
  // The list is taller than the screen: keep the picked row in view as the knob turns.
  const list = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const row = list.current?.children.item(picked) as HTMLElement | null;
    row?.scrollIntoView({ block: 'nearest' });
  }, [picked]);

  return (
    <div className="settings">
      <div className="settings-card">
        <div className="settings-title">Design</div>
        <ul ref={list}>
          {THEMES.map((t, i) => (
            <li
              key={t.id}
              className={i === picked ? 'picked' : ''}
              onPointerDown={e => e.stopPropagation()}
              onClick={() => onPick(i)}
            >
              <span className="swatch" style={{ background: t.swatch[0], color: t.swatch[1] }}>
                Aa
              </span>
              <span className="label">
                <b>
                  {t.name}
                  {t.id === current && <em> · current</em>}
                </b>
                <small>{t.blurb}</small>
              </span>
            </li>
          ))}
        </ul>
        <div className="settings-hint">Turn to preview · Press to keep · Back to cancel</div>
      </div>
    </div>
  );
}
