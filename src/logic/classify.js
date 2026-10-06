// Rangos de referencia de la American Heart Association.
export const CATEGORIES = ['Normal', 'Elevada', 'Alta etapa 1', 'Alta etapa 2', 'Crisis'];

export const CRISIS_MESSAGE = 'Si tiene síntomas, busque atención médica de inmediato.';

// Devuelve el índice en CATEGORIES. El orden de las comparaciones importa.
export function classify(sys, dia) {
  if (sys > 180 || dia > 120) return 4;
  if (sys >= 140 || dia >= 90) return 3;
  if (sys >= 130 || dia >= 80) return 2;
  if (sys >= 120) return 1;
  return 0;
}
