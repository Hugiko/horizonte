export type Sfx = { nombre: string; en: number; volumen?: number };
export type Voz = { locutor: string; texto: string; inicio?: number };
export type Plano = {
  id: string;
  tipo: 'fecha' | 'alerta' | 'vera' | 'hud' | 'palabras' | 'seccion' | 'pista' | 'titulo-mision' | 'lema' | 'logo' | 'titulo';
  visual: string;
  duracion: number;
  texto?: string;
  subtexto?: string;
  etiqueta?: string;
  formula?: string;
  lineas?: string[];
  palabras?: string[];
  creditos?: string;
  voz?: Voz;
  sfx?: Sfx[];
};
export type SegmentoMusica = {
  src: string; plano: string; desde?: number; hasta: number; alinearFinal?: boolean;
  volumen?: number; fadeIn?: number; fadeOut?: number;
};
export type Guion = {
  id: string; titulo: string; capitulo?: string; fps: number;
  poster?: { plano: string; segundo: number };
  subtitulos?: boolean;
  musica: SegmentoMusica[];
  planos: Plano[];
};

export type PlanoT = Plano & { from: number; frames: number; vozFrom?: number; vozFrames?: number; flash: boolean; impacto: boolean };
export type MusicaT = { src: string; from: number; frames: number; startFrom: number; volumen: number; fadeIn: number; fadeOut: number };
export type SfxT = { src: string; from: number; volumen: number };
export type Linea = { id: string; ID: string; total: number; fps: number; planos: PlanoT[]; musica: MusicaT[]; sfx: SfxT[]; voces: { from: number; frames: number; src: string; locutor: string; texto: string }[] };
