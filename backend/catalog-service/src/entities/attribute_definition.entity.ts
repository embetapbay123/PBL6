// GENERATED baseline entity; register only in its owner service. BIGINT values stay strings.
import { Entity, Column, PrimaryColumn } from 'typeorm';
@Entity('attribute_definition')
export class AttributeDefinition {
  @PrimaryColumn({"type": "uuid", "nullable": false})
  id!: string;
  @Column({"type": "uuid", "nullable": false})
  product_type_id!: string;
  @Column({"type": "varchar", "nullable": false})
  code!: string;
  @Column({"type": "varchar", "nullable": false})
  name!: string;
  @Column({"type": "varchar", "nullable": false})
  data_type!: string;
  @Column({"type": "boolean", "nullable": false})
  required!: boolean;
  @Column({"type": "boolean", "nullable": false})
  variant_factor!: boolean;
  @Column({"type": "jsonb", "nullable": true})
  allowed_values!: Record<string, unknown> | null;
  @Column({"type": "varchar", "nullable": true})
  unit!: string | null;
}
