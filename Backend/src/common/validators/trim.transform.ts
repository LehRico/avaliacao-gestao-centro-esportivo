import { Transform } from 'class-transformer';

/** Remove espaços nas pontas antes da validação. */
export function Trim() {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}
