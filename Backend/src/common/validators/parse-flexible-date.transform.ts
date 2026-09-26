import { Transform } from 'class-transformer';

const BR_DATE_PATTERN = /^(\d{2})[/-](\d{2})[/-](\d{4})(T.*)?$/;

/**
 * Aceita datas em ISO 8601 (formato exigido pelo restante da API) e
 * também em DD-MM-YYYY ou DD/MM/YYYY, normalizando para ISO antes da
 * validação de @IsDateString. Valores que não casam com o padrão
 * brasileiro são repassados sem alteração, para que @IsDateString
 * gere a mensagem de erro apropriada.
 */
export function ParseFlexibleDate() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }

    const match = value.match(BR_DATE_PATTERN);
    if (!match) {
      return value;
    }

    const [, day, month, year, time] = match;

    if (time) {
      return `${year}-${month}-${day}${time}`;
    }

    const now = new Date();
    const currentTime = now.toISOString().split('T')[1];
    return `${year}-${month}-${day}T${currentTime}`;
  });
}
