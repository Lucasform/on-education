import type { TenantId, Uuid } from './tenant';

/** Colunas transversais de toda tabela de domínio (Master Spec §5). */
export interface BaseEntity {
  id: Uuid;
  tenantId: TenantId;
  createdAt: Date;
  updatedAt: Date;
  createdBy: Uuid | null;
  /** Soft delete: presente => registro logicamente removido. */
  deletedAt: Date | null;
}
