import { Transform } from 'class-transformer';

/**
 * Normaliza o e-mail para minúsculas e sem espaços nas pontas antes da
 * validação. Sem isso, "Foo@Example.com" e "foo@example.com" seriam
 * tratados como e-mails diferentes tanto na checagem de duplicidade
 * quanto no login.
 */
export function NormalizeEmail() {
  return Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}
