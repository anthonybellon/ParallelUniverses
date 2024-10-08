// src/utils/sanitizeInput.ts

export const sanitizeInput = (input: string): string => {
  return input.replace(/[<>]/g, '').trim();
};
