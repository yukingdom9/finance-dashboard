import type { ReactNode } from 'react';

export interface StoryProps {
  borderColor?: string;
  children: ReactNode;
}

/** 要約文カード（ui-spec.md V-01 ZONE2 他）。左端に3pxの縦罫。 */
export function Story({ borderColor, children }: StoryProps) {
  return (
    <div className="story" style={borderColor ? { borderLeftColor: borderColor } : undefined}>
      {children}
    </div>
  );
}
