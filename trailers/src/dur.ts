import { createContext, useContext } from 'react';
// Duración (en fotogramas) del plano actual, para animar en función del progreso del plano.
export const DurPlano = createContext(90);
export const useDur = () => useContext(DurPlano);
