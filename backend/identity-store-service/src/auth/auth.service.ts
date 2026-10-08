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
  async sendVerificationEmail(email: string, _token: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') return;
    // Sanitized log: never log raw token or raw email link per security policy
  }
  async sendPasswordResetEmail(email: string, _token: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') return;
    // Sanitized log: never log raw token or raw email link per security policy
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
    const roles: string[] = roleRows.map((r: any) => r.code);
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

  async register(email: string, password: string, displayName?: string) {
    const [existing] = await database.query('SELECT id, status FROM "user" WHERE lower(email)=lower($1)', [email]);
    if (existing) {
      if (existing.status === 'PENDING') {
        const rawToken = randomBytes(32).toString('hex');
        await database.query(
          `INSERT INTO one_time_token(id, user_id, purpose, token_hash, expires_at, created_at)
           VALUES($1, $2, 'EMAIL_VERIFICATION', $3, now() + interval '24 hours', now())`,
          [randomUUID(), existing.id, digest(rawToken)]
        );
        await this.emailAdapter.sendVerificationEmail(email, rawToken);
      }
      return {
        user_id: existing.id,
        email_verified: false,
        message: 'Nếu email chưa được đăng ký, một liên kết xác thực đã được gửi.'
      };
    }

    const hash = await bcrypt.hash(password, 10);
    const userId = randomUUID();
    const rawToken = randomBytes(32).toString('hex');
    const name = displayName || email.split('@')[0];

    await database.transaction(async manager => {
      await manager.query(
        'INSERT INTO "user"(id, email, password_hash, status, created_at, version) VALUES($1, $2, $3, \'PENDING\', now(), 0)',
        [userId, email, hash]
      );
      await manager.query(
        'INSERT INTO customer_profile(id, user_id, display_name, phone, updated_at) VALUES($1, $2, $3, NULL, now())',
        [randomUUID(), userId, name]
      );
      const [customerRole] = await manager.query('SELECT id FROM role WHERE code=\'CUSTOMER\'');
      if (customerRole) {
        await manager.query(
          'INSERT INTO user_role(user_id, role_id, granted_at) VALUES($1, $2, now())',
          [userId, customerRole.id]
        );
      }
      await manager.query(
        `INSERT INTO one_time_token(id, user_id, purpose, token_hash, expires_at, created_at)
         VALUES($1, $2, 'EMAIL_VERIFICATION', $3, now() + interval '24 hours', now())`,
        [randomUUID(), userId, digest(rawToken)]
      );
    });

    await this.emailAdapter.sendVerificationEmail(email, rawToken);
    return {
      user_id: userId,
      email_verified: false,
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực.'
    };
  }

  async verify(token: string) {
    const tokenHash = digest(token);
    await database.transaction(async manager => {
      const [tokenRow] = await manager.query(
        `SELECT id, user_id, expires_at, consumed_at FROM one_time_token
         WHERE token_hash=$1 AND purpose='EMAIL_VERIFICATION' FOR UPDATE`,
        [tokenHash]
      );
      if (!tokenRow || tokenRow.consumed_at) {
        throw new ApiError(400, 'INVALID_OR_CONSUMED_TOKEN', 'Mã xác thực không hợp lệ hoặc đã được sử dụng.');
      }
      if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
        throw new ApiError(400, 'TOKEN_EXPIRED', 'Mã xác thực đã hết hạn.');
      }
      await manager.query(
        'UPDATE one_time_token SET consumed_at=now() WHERE id=$1',
        [tokenRow.id]
      );
      const result = await manager.query(
        `UPDATE "user"
         SET status = 'ACTIVE', email_verified_at = now(), version = version + 1
         WHERE id = $1 AND status = 'PENDING'
         RETURNING id`,
        [tokenRow.user_id]
      );
      if (result.length === 0) {
        throw new ApiError(400, 'VERIFICATION_FAILED', 'Tài khoản không tồn tại hoặc đã kích hoạt.');
      }
    });
    return { status: 'OK', message: 'Xác thực email thành công.' };
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
    return { status: 'OK', message: 'Đăng xuất thành công.' };
  }
  async resetPassword(email: string) {
    const [user] = await database.query('SELECT id, status FROM "user" WHERE lower(email)=lower($1)', [email]);
    if (!user || user.status !== 'ACTIVE') {
      return { status: 'OK', message: 'Nếu email tồn tại trong hệ thống, link khôi phục đã được gửi.' };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = digest(rawToken);
    
    await database.query(
      `INSERT INTO one_time_token(id, user_id, purpose, token_hash, expires_at, created_at) 
       VALUES($1, $2, 'PASSWORD_RESET', $3, now() + interval '15 minutes', now())`,
      [randomUUID(), user.id, tokenHash]
    );

    await this.emailAdapter.sendPasswordResetEmail(email, rawToken);
    return { status: 'OK', message: 'Nếu email tồn tại trong hệ thống, link khôi phục đã được gửi.' };
  }

  async confirmResetPassword(rawToken: string, newPassword: string) {
    const tokenHash = digest(rawToken);

    await database.transaction(async manager => {
      const [tokenRow] = await manager.query(
        `SELECT id, user_id, expires_at, consumed_at FROM one_time_token
         WHERE token_hash=$1 AND purpose='PASSWORD_RESET' FOR UPDATE`,
        [tokenHash]
      );

      if (!tokenRow || tokenRow.consumed_at) {
        throw new ApiError(400, 'INVALID_TOKEN', 'Token không hợp lệ hoặc đã được sử dụng.');
      }
      if (new Date(tokenRow.expires_at).getTime() <= Date.now()) {
        throw new ApiError(400, 'TOKEN_EXPIRED', 'Token đã hết hạn.');
      }

      const hash = await bcrypt.hash(newPassword, 10);

      await manager.query(
        'UPDATE "user" SET password_hash=$1, version=version+1 WHERE id=$2',
        [hash, tokenRow.user_id]
      );

      await manager.query(
        'UPDATE one_time_token SET consumed_at=now() WHERE id=$1',
        [tokenRow.id]
      );

      await manager.query(
        'UPDATE refresh_session SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',
        [tokenRow.user_id]
      );
    });

    return { status: 'OK', message: 'Mật khẩu đã được khôi phục thành công.' };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const [user] = await database.query('SELECT id, password_hash, status FROM "user" WHERE id=$1', [userId]);
    if (!user || user.status !== 'ACTIVE') {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Phiên đăng nhập không hợp lệ.');
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) throw new ApiError(400, 'INVALID_CREDENTIALS', 'Mật khẩu hiện tại không chính xác.');

    const hash = await bcrypt.hash(newPassword, 10);

    await database.transaction(async manager => {
      await manager.query(
        'UPDATE "user" SET password_hash=$1, version=version+1 WHERE id=$2',
        [hash, userId]
      );

      await manager.query(
        'UPDATE refresh_session SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',
        [userId]
      );
    });

    return { status: 'OK', message: 'Đổi mật khẩu thành công.' };
  }
}