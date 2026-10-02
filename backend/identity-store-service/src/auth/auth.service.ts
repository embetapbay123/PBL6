import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { database } from '../../../shared/src/database';
import { config, required } from '../../../shared/src/config';
import { ApiError } from '../../../shared/src/errors';
import { verifyToken } from '../../../shared/src/auth';
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export class AuthService {
  async context(userId: string) {
    const [user] = await database.query('SELECT id,email,status,version FROM "user" WHERE id=$1',[userId]);
    if (!user || user.status !== 'ACTIVE') throw new ApiError(401,'SESSION_REVOKED','Phiên đăng nhập đã bị thu hồi.');
    const roleRows = await database.query('SELECT r.code FROM user_role ur JOIN role r ON r.id=ur.role_id WHERE ur.user_id=$1 AND r.status=\'ACTIVE\'',[userId]);
    const roles = roleRows.map((r: any) => r.code);
    const [member] = await database.query('SELECT store_id,role,status FROM store_membership WHERE user_id=$1 AND status=\'ACTIVE\'',[userId]);
    if (member) roles.push(member.role === 'OWNER' ? 'STORE_OWNER' : 'SELLER');
    const permissions = member ? (await database.query('SELECT p.code FROM membership_permission mp JOIN permission p ON p.id=mp.permission_id JOIN store_membership m ON m.id=mp.membership_id WHERE m.user_id=$1 AND m.status=\'ACTIVE\'',[userId])).map((p: any)=>p.code) : [];
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
  async login(email: string,password: string) {
    const [user] = await database.query('SELECT id,password_hash,status FROM "user" WHERE lower(email)=lower($1)',[email]);
    // Fixed dummy hash prevents an obvious early-return account enumeration path.
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
      // Retired token retained in family: replay revokes current session too.
      await manager.query('INSERT INTO refresh_session(id,user_id,token_hash,expires_at,revoked_at,family_id) VALUES($1,$2,$3,$4,now(),$5)',[randomUUID(),session.user_id,digest(token),session.expires_at,session.family_id]);
      return {sid:session.id,userId:session.user_id,token:replacement};
    });
    if ('error' in result) throw new ApiError(401,'SESSION_REVOKED','Phiên refresh không còn hiệu lực.');
    return {access_token:this.issueAccess(result.userId,result.sid),refresh_token:result.token,expires_at:new Date(Date.now()+900000).toISOString(),context:await this.context(result.userId)};
  }
  async logout(token: string) {
    await database.query('UPDATE refresh_session SET revoked_at=coalesce(revoked_at,now()) WHERE family_id IN (SELECT family_id FROM refresh_session WHERE token_hash=$1)',[digest(token)]);
  }
}
