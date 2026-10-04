import { Body, Controller, Get, Post, HttpCode, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { AuthGuard, Public, ServiceGuard, ServiceCallers, verifyService } from '../../../shared/src/auth';
import { config } from '../../../shared/src/config';
import { database } from '../../../shared/src/database';
import { ApiError } from '../../../shared/src/errors';
import { AuthService } from './auth.service';
import { ConfirmResetPasswordDto, LoginDto, RefreshDto, RegisterDto, ResetPasswordDto, ResetPasswordDto ,ChangePasswordDto} from './auth.dto';
import { ProfileService } from '../profile/profile.service';

@Controller() @UseGuards(AuthGuard)
export class AuthController {
  private readonly service = new AuthService();
  private readonly profiles = new ProfileService();
  private deliver(tokens: any, res: Response, web: boolean) {
    if (!web) return tokens;
    const secure = config('M3').secureCookie;
    res.cookie('pbl6_refresh',tokens.refresh_token,{httpOnly:true,secure,sameSite:'strict',path:'/api/v1/auth',maxAge:7*86400000});
    const csrf = randomBytes(24).toString('hex');
    res.cookie('pbl6_csrf',csrf,{httpOnly:false,secure,sameSite:'strict',path:'/',maxAge:7*86400000});
    const { refresh_token, ...safe } = tokens; return safe;
  }
  private getRefresh(req: Request, dto: RefreshDto) {
    const cookie = req.cookies?.pbl6_refresh;
    if (cookie) {
      const origin = req.headers.origin;
      const header = req.headers['x-csrf-token']; const csrf = req.cookies?.pbl6_csrf;
      if (origin !== config('M3').origin || typeof header !== 'string' || typeof csrf !== 'string' || header.length !== csrf.length || !timingSafeEqual(Buffer.from(header),Buffer.from(csrf))) throw new ApiError(403,'CSRF_REJECTED','Không xác minh được yêu cầu phiên.');
      return {token:cookie,web:true};
    }
    if (!dto.refresh_token) throw new ApiError(401,'UNAUTHENTICATED','Thiếu refresh token.');
    return {token:dto.refresh_token,web:false};
  }
  @Post('auth/register') @HttpCode(200) @Public()
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const web = dto.client_type === 'WEB';
    if (web && req.headers.origin !== config('M3').origin) {
        throw new ApiError(403, 'CSRF_REJECTED', 'Origin không hợp lệ.');
    }
    await this.service.register(dto.email, dto.password);
    return {
      message: 'Nếu email chưa được đăng ký, một liên kết xác thực đã được gửi.'
    };
  }
  @Post('auth/reset-password') @HttpCode(200) @Public()
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.service.resetPassword(dto.email);
    return { message: 'Nếu email tồn tại trong hệ thống, link khôi phục đã được gửi.' };
  }
  @Post('auth/reset-password/confirm') @HttpCode(200) @Public()
  async confirmResetPassword(@Body() dto: ConfirmResetPasswordDto) {
    await this.service.confirmResetPassword(dto.token, dto.new_password);
    return { message: 'Mật khẩu đã được khôi phục thành công.' };
  }
  @Post('auth/change-password') @HttpCode(200) @Public()
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: any) {
    const userId = req.user.sub; // Lấy từ claims của Access Token
    await this.service.changePassword(userId, dto.current_password, dto.new_password);
    return { message: 'Đổi mật khẩu thành công.' };
  }
  @Post('auth/verify-email') @HttpCode(200) @Public()
  async verify(@Body() dto: RefreshDto,@Req() req: Request,@Res({passthrough:true}) res: Response) {
    const session = this.getRefresh(req,dto);
    return this.deliver(await this.service.verify(session.token),res,session.web);
  }
  @Post('auth/login') @HttpCode(200) @Public()
  async login(@Body() dto: LoginDto,@Req() req: Request,@Res({passthrough:true}) res: Response) {
    const web = dto.client_type === 'WEB';
    if (web && req.headers.origin !== config('M3').origin) throw new ApiError(403,'CSRF_REJECTED','Origin không hợp lệ.');
    return this.deliver(await this.service.login(dto.email,dto.password),res,web);
  }
  @Post('auth/refresh') @HttpCode(200) @Public()
  async refresh(@Body() dto: RefreshDto,@Req() req: Request,@Res({passthrough:true}) res: Response) {
    const session = this.getRefresh(req,dto);
    return this.deliver(await this.service.refresh(session.token),res,session.web);
  }
  @Post('auth/logout') @HttpCode(200) @Public()
  async logout(@Body() dto: RefreshDto,@Req() req: Request,@Res({passthrough:true}) res: Response) {
    const session = this.getRefresh(req,dto); await this.service.logout(session.token);
    res.clearCookie('pbl6_refresh',{path:'/api/v1/auth'}); res.clearCookie('pbl6_csrf',{path:'/'});
    return {success:true};
  }
  @Get('me/context') context(@Req() req: any) { return req.auth; }
  @Get('me') async profile(@Req() req: any) {
    return this.profiles.getProfile(req.auth.user_id);
  }
  @Post('internal/context') @HttpCode(200) @Public() @UseGuards(ServiceGuard) @ServiceCallers('M1','M2','M3','M4')
  async internalContext(@Req() req: Request,@Body() body: {token:string}) {
    const c = config('M3'); verifyService(req.headers,c.internalKeys,['M1','M2','M3','M4']);
    if (typeof body.token !== 'string') throw new ApiError(422,'VALIDATION_FAILED','Thiếu token.');
    return this.service.resolve(body.token);
  }
  @Get('internal/stores/active') @Public() @UseGuards(ServiceGuard) @ServiceCallers('M1','M2','M4')
  async activeStores(@Req() req: Request) {
    verifyService(req.headers,config('M3').internalKeys,['M1','M2','M4']);
    return {ids:(await database.query('SELECT id FROM store WHERE status=\'ACTIVE\'')).map((r:any)=>r.id)};
  }
}
