import { yen } from '../format/number';

export interface TreemapItem {
  k: string;
  v: number;
  col: string;
}
interface LaidOutNode extends TreemapItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

function squarify(items: TreemapItem[], x: number, y: number, w: number, h: number, out: LaidOutNode[]): LaidOutNode[] {
  if (!items.length) return out;
  if (items.length === 1) {
    out.push({ ...items[0], x, y, w, h });
    return out;
  }
  const total = items.reduce((s, i) => s + i.v, 0);
  let best = Infinity;
  let split = 1;
  let acc = 0;
  for (let i = 1; i < items.length; i++) {
    acc += items[i - 1].v;
    const r = Math.abs(acc / total - 0.5);
    if (r < best) {
      best = r;
      split = i;
    }
  }
  const a = items.slice(0, split);
  const b = items.slice(split);
  const av = a.reduce((s, i) => s + i.v, 0) / total;
  if (w >= h) {
    squarify(a, x, y, w * av, h, out);
    squarify(b, x + w * av, y, w * (1 - av), h, out);
  } else {
    squarify(a, x, y, w, h * av, out);
    squarify(b, x, y + h * av, w, h * (1 - av), out);
  }
  return out;
}

export interface TreemapProps {
  items: TreemapItem[];
  w?: number;
  h?: number;
  onSelect?: (key: string) => void;
}

/**
 * 支出の内訳（面積表示）。features.md F-15。
 * 金額が0以下のカテゴリーは描画対象から除外する（呼び出し側で除外し、注記を出すこと）。
 * クリックで遷移する区画には tabindex/role=button と Enter/Space を与える（ui-spec.md 第7部）。
 */
export function Treemap({ items, w = 760, h = 330, onSelect }: TreemapProps) {
  const list = items.filter((i) => i.v > 0).sort((a, b) => b.v - a.v);
  const nodes = squarify(list, 0, 0, w, h, []);
  const total = list.reduce((s, i) => s + i.v, 0) || 1;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="支出の内訳（面積表示）">
      {nodes.map((n) => {
        const share = (n.v / total) * 100;
        const showText = n.w > 62 && n.h > 32;
        const showAmt = n.w > 62 && n.h > 52;
        return (
          <g
            key={n.k}
            className="tmnode"
            tabIndex={onSelect ? 0 : undefined}
            role={onSelect ? 'button' : undefined}
            aria-label={onSelect ? `${n.k} ${yen(n.v)}（${share.toFixed(1)}%）` : undefined}
            style={onSelect ? { cursor: 'pointer' } : undefined}
            onClick={onSelect ? () => onSelect(n.k) : undefined}
            onKeyDown={
              onSelect
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(n.k);
                    }
                  }
                : undefined
            }
          >
            <rect x={n.x + 1} y={n.y + 1} width={Math.max(0, n.w - 2)} height={Math.max(0, n.h - 2)} fill={n.col} rx={2}>
              <title>
                {n.k} {yen(n.v)}（{share.toFixed(1)}%）
              </title>
            </rect>
            {showText && (
              <text x={n.x + 10} y={n.y + 20} fontSize={12} fill="#fff" fontWeight={500}>
                {n.k}
              </text>
            )}
            {showAmt && (
              <text x={n.x + 10} y={n.y + 37} fontSize={11.5} fill="rgba(255,255,255,.8)" className="num">
                {yen(n.v)} · {share.toFixed(1)}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
