/**
 * Tipado mínimo del cliente PostgREST. Sin esto, `rpc()` queda sin Args y el
 * build falla. Para tablas/vistas usamos índices amplios; el IDE no autocompleta
 * filas hasta que se genere el esquema completo (`supabase gen types`).
 */
export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: {
      resolve_share_link_access: {
        Args: { token_input: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
