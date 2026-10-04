import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { database } from '../../../shared/src/database';
import { config, required } from '../../../shared/src/config';
import { ApiError } from '../../../shared/src/errors';
import { verifyToken } from '../../../shared/src/auth';
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export interface IEmailAdapter {
  sendVerificationEmail(email: string, token: string): Promise<void>;
  sendPasswordResetEmail(email: string, token: string): Promise<void>;
}
export class MockEmailAdapter implements IEmailAdapter {
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    console.log(`[FIXTURE - MOCK EMAIL] DEV ONLY`);
    console.log(`[FIXTURE - MOCK EMAIL] Đang gửi email xác thực tới: ${email}`);
    console.log(`[FIXTURE - MOCK EMAIL] Link: https://m3-domain.com/verify?token=${token}`);
  }
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    console.log(`[FIXTURE - MOCK EMAIL] Gửi link khôi phục mật khẩu tới: ${email}`);
    console.log(`[FIXTURE - MOCK EMAIL] Link: https://m3-domain.com/reset-password/confirm?token=${token}`);
  }
}
export class AuthService {
  constructor(
    private readonly emailAdapter: IEmailAdapter = new MockEmailAdapter()
  ) {}
  async context(userId: string) {
    const [user] = await database.query('SELECT id,email,status,version FROM "user" WHERE id=$1',[userId]);
    if (!user || user.status !== 'ACTIVE') throw new ApiError(401,'SESSION_REVOKED','Phiên đăng nhập đã bị thu hồi.');
    const roleRows = await database.query('SELECT r.code FROM user_role ur JOIN role r ON r.id=ur.role_id WHERE ur.user_id=$1 AND r.status=\'ACTIVE\'',[userId]);
    const roles = roleRows.map((r: any) => r.code);
    const [member] = await database.query(
      `SELECT m.store_id,m.role,m.status
       FROM store_membership m
       JOIN store s ON s.id=m.store_id AND s.status='ACTIVE'
       WHERE m.user_id=$1 AND m.status='ACTIVE'
       ORDER BY m.joined_at DESC,m.id
       LIMIT 1`,
      [userId],
    );
    if (member) roles.push(member.role === 'OWNER' ? 'STORE_OWNER' : 'SELLER');
    const permissions = member ? (await database.query(
      `SELECT p.code
       FROM membership_permission mp
       JOIN permission p ON p.id=mp.permission_id
       WHERE mp.membership_id=(
         SELECT m.id
         FROM store_membership m
         JOIN store s ON s.id=m.store_id AND s.status='ACTIVE'
         WHERE m.user_id=$1 AND m.store_id=$2 AND m.status='ACTIVE'
         LIMIT 1
       )`,
      [userId, member.store_id],
    )).map((p: any)=>p.code) : [];
    return {user_id:user.id, roles:[...new Set(roles)], token_version:user.version,
      ...(member ? {store_membership:{...member,permissions}} : {})};
  }
  async resolve(token: string) {
    const claims = verifyToken(token,config('M3').publicKey);
    const [session] = await database.query('SELECT id FROM refresh_session WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL AND expires_at>now()',[claims.sid,claims.sub]);
    if (!session) throw new ApiError(401,'SESSION_REVOKED','Phiên đăng nhập đã bị thu hồi.');
    return this.context(claims.sub!);
  }
  private issueAccess(userId: string, sid: string) {
    return jwt.sign({sid},readFileSync(required('JWT_PRIVATE_KEY_FILE'),'utf8'),{algorithm:'RS256',subject:userId,issuer:'pbl6-identity',audience:'pbl6-clients',expiresIn:'15m'});
  }
  private issueVerificationToken(userId: string): string {
    const privateKey = readFileSync(required('JWT_PRIVATE_KEY_FILE'),'utf8');
    return jwt.sign({}, privateKey, { algorithm: 'RS256', subject: userId, expiresIn: '15m' });
  }

  async register(email: string, password: string) {
    const [existing] = await database.query('SELECT id, status FROM "user" WHERE lower(email)=lower($1)', [email]);
    if (existing) {
      if (existing.status === 'PENDING') {
         const token = this.issueVerificationToken(existing.id);
         await this.emailAdapter.sendVerificationEmail(email, token);
      }
      return; 
    }
    const hash = await bcrypt.hash(password, 10);
    const userId = randomUUID();
    await database.query(
      'INSERT INTO "user"(id, email, password_hash, status, version) VALUES($1, $2, $3, \'PENDING\', 0)', 
      [userId, email, hash]
    );

    const token = this.issueVerificationToken(userId);
    await this.emailAdapter.sendVerificationEmail(email, token);
  }

  async verify(token: string) {
    let claims;
    try {
      claims = verifyToken(token, config('M3').publicKey);
    } catch (e) {
      throw new ApiError(400, 'INVALID_OR_EXPIRED_TOKEN', 'Token không hợp lệ hoặc đã hết hạn.');
    }
    if (!claims.sub) {
      throw new ApiError(400, 'INVALID_TOKEN', 'Token không hợp lệ.');
    }
    const result = await database.query(
      `UPDATE "user"
       SET status = 'ACTIVE', version = version + 1
       WHERE id = $1 AND status = 'PENDING'
       RETURNING id`,
      [claims.sub]
    );
    if (result.length === 0) {
      throw new ApiError(400, 'VERIFICATION_FAILED', 'Xác thực thất bại. Token đã được sử dụng hoặc tài khoản không tồn tại.');
    }
    return this.context(claims.sub);
  }

  async login(email: string,password: string) {
    const [user] = await database.query('SELECT id,password_hash,status FROM "user" WHERE lower(email)=lower($1)',[email]);
    const dummy = '$2b$10$8hVpt.bXmhHRfERkH5eDyOlEE8rfOySwvmXsMbSJDvjgeRcoDOkGq';
    const valid = await bcrypt.compare(password,user?.password_hash ?? dummy);
    if (!user || !valid || user.status !== 'ACTIVE') throw new ApiError(401,'INVALID_CREDENTIALS','Email hoặc mật khẩu không hợp lệ.');
    const sid = randomUUID(); const token = randomBytes(48).toString('base64url');
    await database.query('INSERT INTO refresh_session(id,user_id,token_hash,expires_at,family_id) VALUES($1,$2,$3,now()+interval \'7 days\',$1)',[sid,user.id,digest(token)]);
    return {access_token:this.issueAccess(user.id,sid),refresh_token:token,expires_at:new Date(Date.now()+900000).toISOString(),context:await this.context(user.id)};
  }
  async refresh(token: string) {
    const result = await database.transaction(async manager => {
      const [session] = await manager.query('SELECT * FROM refresh_session WHERE token_hash=$1 FOR UPDATE',[digest(token)]);
      if (!session) return {error:true};
      if (session.revoked_at || new Date(session.expires_at).getTime() <= Date.now()) {
        await manager.query('UPDATE refresh_session SET revoked_at=coalesce(revoked_at,now()) WHERE family_id=$1',[session.family_id]);
        return {error:true};
      }
      const [user] = await manager.query('SELECT status FROM "user" WHERE id=$1',[session.user_id]);
      if (!user || user.status !== 'ACTIVE') {
        await manager.query('UPDATE refresh_session SET revoked_at=coalesce(revoked_at,now()) WHERE user_id=$1',[session.user_id]);
        return {error:true};
      }
      const replacement = randomBytes(48).toString('base64url');
      await manager.query('UPDATE refresh_session SET token_hash=$1 WHERE id=$2',[digest(replacement),session.id]);
      await manager.query('INSERT INTO refresh_session(id,user_id,token_hash,expires_at,revoked_at,family_id) VALUES($1,$2,$3,$4,now(),$5)',[randomUUID(),session.user_id,digest(token),session.expires_at,session.family_id]);
      return {sid:session.id,userId:session.user_id,token:replacement};
    });
    if ('error' in result) throw new ApiError(401,'SESSION_REVOKED','Phiên refresh không còn hiệu lực.');
    return {access_token:this.issueAccess(result.userId,result.sid),refresh_token:result.token,expires_at:new Date(Date.now()+900000).toISOString(),context:await this.context(result.userId)};
  }
  async logout(token: string) {
    await database.query('UPDATE refresh_session SET revoked_at=coalesce(revoked_at,now()) WHERE family_id IN (SELECT family_id FROM refresh_session WHERE token_hash=$1)',[digest(token)]);
  }
  async resetPassword(email: string) {
    const [user] = await database.query('SELECT id, status FROM "user" WHERE lower(email)=lower($1)', [email]);
    
    // Nếu user không tồn tại hoặc chưa ACTIVE thì ngầm bỏ qua, nhưng không throw lỗi.
    if (!user || user.status !== 'ACTIVE') return;

    // YÊU CẦU: Token hash & expiry
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = digest(rawToken);
    
    // Lưu vào Database với thời hạn 15 phút
    await database.query(
      `INSERT INTO password_reset_request(id, user_id, token_hash, expires_at) 
       VALUES($1, $2, $3, now() + interval '15 minutes')`,
      [randomUUID(), user.id, tokenHash]
    );

    await this.emailAdapter.sendPasswordResetEmail(email, rawToken);
  }

  async confirmResetPassword(rawToken: string, newPassword: string) {
    const tokenHash = digest(rawToken);

    await database.transaction(async manager => {
      // FOR UPDATE để block các request đồng thời (Chặn Race condition / Replay)
      const [request] = await manager.query(
        'SELECT id, user_id, expires_at, used_at FROM password_reset_request WHERE token_hash=$1 FOR UPDATE',
        [tokenHash]
      );

      // Validate logic theo yêu cầu
      if (!request) throw new ApiError(400, 'INVALID_TOKEN', 'Token không hợp lệ.');
      if (request.used_at) throw new ApiError(400, 'TOKEN_USED', 'Token đã được sử dụng.');
      if (new Date(request.expires_at).getTime() <= Date.now()) throw new ApiError(400, 'TOKEN_EXPIRED', 'Token đã hết hạn.');

      const hash = await bcrypt.hash(newPassword, 10);

      // Cập nhật mật khẩu và tăng version (Để invalidate Access Token hiện hành)
      await manager.query(
        'UPDATE "user" SET password_hash=$1, version=version+1 WHERE id=$2',
        [hash, request.user_id]
      );

      // YÊU CẦU: One-time -> Đánh dấu token đã sử dụng
      await manager.query(
        'UPDATE password_reset_request SET used_at=now() WHERE id=$1',
        [request.id]
      );

      // YÊU CẦU: Password thay đổi thu hồi phiên đúng BR
      await manager.query(
        'UPDATE refresh_session SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',
        [request.user_id]
      );
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const [user] = await database.query('SELECT password_hash FROM "user" WHERE id=$1', [userId]);
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Phiên đăng nhập không hợp lệ.');

    // YÊU CẦU: Kiểm credential hiện hành
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new ApiError(400, 'INVALID_CREDENTIALS', 'Mật khẩu hiện tại không chính xác.');

    const hash = await bcrypt.hash(newPassword, 10);

    await database.transaction(async manager => {
      // Cập nhật mật khẩu và tăng version
      await manager.query(
        'UPDATE "user" SET password_hash=$1, version=version+1 WHERE id=$2',
        [hash, userId]
      );

      // YÊU CẦU: Thu hồi tất cả các phiên hiện tại (Bao gồm cả phiên đang gọi API này)
      await manager.query(
        'UPDATE refresh_session SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',
        [userId]
      );
    });
  }
}