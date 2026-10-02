// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('category')
export class Category {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": true})
  parent_id!: string | null;
  @Column({"type": "varchar", "nullable": false})
  name!: string;
  @Column({"type": "varchar", "nullable": false})
  slug!: string;
  @Column({"type": "varchar", "nullable": false})
  status!: string;
}
