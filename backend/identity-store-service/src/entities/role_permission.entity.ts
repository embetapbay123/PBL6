// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('role_permission')
export class RolePermission {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  role_id!: string;
  @PrimaryColumn({"type": "uuid", "nullable": false})
  permission_id!: string;
}
