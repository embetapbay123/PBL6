import { IsInt, ValidateIf, IsString, Min, MaxLength, MinLength } from 'class-validator';
// Starter mutation implements title/description only; other ProductUpdate fields remain member tasks.
export class ProductUpdateSample {
  @IsInt() @Min(0) expected_version!: number;
  @ValidateIf((_,value)=>value!==undefined) @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @ValidateIf((_,value)=>value!==undefined) @IsString() @MaxLength(10000) description?: string;
}
