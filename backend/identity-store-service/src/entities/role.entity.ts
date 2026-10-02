// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('role')
export class Role {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "varchar", "nullable": false})
  code!: string;
  @Column({"type": "varchar", "nullable": false})
  scope!: string;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
}
