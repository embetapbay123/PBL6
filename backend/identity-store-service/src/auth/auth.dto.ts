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
export class RegisterDto {
  @IsEmail() @Length(1, 254) email!: string;
  @IsString() @Length(1, 72)
  @ValidateBy({name:'bcryptByteLimit',validator:{validate:value=>typeof value==='string' && Buffer.byteLength(value,'utf8')<=72,defaultMessage:()=> 'Mật khẩu vượt giới hạn 72 byte UTF-8.'}})
  password!: string;
  @IsOptional() @IsString() @Length(1, 200) display_name?: string;
}
export class VerifyEmailDto {
  @IsString() @Length(1, 4096) token!: string;
}
export class ResetPasswordDto {
  @IsEmail() @Length(1, 254) email!: string;
}
export class ConfirmResetPasswordDto {
  @IsString() @Length(1, 4096) token!: string;
  @IsString() @Length(8, 72)
  @ValidateBy({name:'bcryptByteLimit',validator:{validate:value=>typeof value==='string' && Buffer.byteLength(value,'utf8')<=72,defaultMessage:()=> 'Mật khẩu vượt giới hạn 72 byte UTF-8.'}})
  new_password!: string;
}
export class ChangePasswordDto {
  @IsString() @Length(1, 72) current_password!: string;
  @IsString() @Length(8, 72)
  @ValidateBy({name:'bcryptByteLimit',validator:{validate:value=>typeof value==='string' && Buffer.byteLength(value,'utf8')<=72,defaultMessage:()=> 'Mật khẩu vượt giới hạn 72 byte UTF-8.'}})
  new_password!: string;
}