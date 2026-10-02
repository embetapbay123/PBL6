// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('permission')
export class Permission {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "varchar", "nullable": false})
  code!: string;
  @Column({"type": "varchar", "nullable": false})
  resource!: string;
  @Column({"type": "varchar", "nullable": false})
  action!: string;
}
