// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('membership_permission')
export class MembershipPermission {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  membership_id!: string;
  @PrimaryColumn({"type": "uuid", "nullable": false})
  permission_id!: string;
  @Column({"type": "timestamptz", "nullable": false})
  granted_at!: Date;
  @Column({"type": "integer", "nullable": false})
  version!: number;
}
