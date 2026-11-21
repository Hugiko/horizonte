import React from 'react';
import { Composition } from 'remotion';
import '@fontsource/orbitron/500.css';
import '@fontsource/orbitron/700.css';
import '@fontsource/orbitron/900.css';
import '@fontsource/exo-2/400.css';
import '@fontsource/exo-2/600.css';
import '@fontsource/exo-2/800.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import { Trailer } from './Trailer';
import { calcularLinea } from './timeline';
import type { Guion } from './tipos';

// Cada guiones/<ID>.json se convierte automáticamente en una composición "<ID con guiones>" (p. ej. F1.1 → F1-1).
declare const require: { context: (d: string, r: boolean, re: RegExp) => { keys(): string[]; (k: string): unknown } };
const ctx = require.context('../guiones', false, /\.json$/);
const archivos = ctx.keys().filter((k) => !k.endsWith('.voz.json') && !k.includes('ejemplo'));

export const RemotionRoot: React.FC = () => (
  <>
    {archivos.map((k) => {
      const g = ctx(k) as Guion;
      let voz: Record<string, number> = {};
      const kv = k.replace(/\.json$/, '.voz.json');
      if (ctx.keys().includes(kv)) voz = ctx(kv) as Record<string, number>;
      const linea = calcularLinea(g, voz);
      return (
        <Composition
          key={k}
          id={linea.id}
          component={Trailer}
          durationInFrames={linea.total}
          fps={linea.fps}
          width={1280}
          height={720}
          defaultProps={{ linea }}
        />
      );
    })}
  </>
);
