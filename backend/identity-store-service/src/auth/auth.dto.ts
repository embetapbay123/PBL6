import { IsEmail, IsIn, IsOptional, IsString, Length, ValidateBy } from 'class-validator';
export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @Length(1,72)
  @ValidateBy({name:'bcryptByteLimit',validator:{validate:value=>typeof value==='string' && Buffer.byteLength(value,'utf8')<=72,defaultMessage:()=> 'Mật khẩu vượt giới hạn 72 byte UTF-8.'}})
  password!: string;
  @IsOptional() @IsIn(['WEB','MOBILE']) client_type?: 'WEB' | 'MOBILE';
}
export class RefreshDto {
  @IsOptional() @IsString() @Length(32,256) refresh_token?: string;
}
export class RegisterDto extends LoginDto {}
export class VerifyEmailDto {
  @IsString() token!: string;
  @IsOptional() @IsIn(['WEB','MOBILE']) client_type?: 'WEB' | 'MOBILE';
}
export class ResetPasswordDto {
  @IsEmail() email!: string;
}
export class ConfirmResetPasswordDto {
  @IsString() token!: string;

  @IsString() @Length(1,72)
  @ValidateBy({name:'bcryptByteLimit',validator:{validate:value=>typeof value==='string' && Buffer.byteLength(value,'utf8')<=72}})
  new_password!: string;
}
export class ChangePasswordDto {
  @IsString() current_password!: string;

  @IsString() @Length(1,72)
  @ValidateBy({name:'bcryptByteLimit',validator:{validate:value=>typeof value==='string' && Buffer.byteLength(value,'utf8')<=72}})
  new_password!: string;
}