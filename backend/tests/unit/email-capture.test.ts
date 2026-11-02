import {mkdtemp, readdir, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createEmailAdapter} from '../../identity-store-service/src/auth/smtp-email.adapter';

test('capture is opt-in development only and keeps actionable mail in a private temporary inbox', async () => {
  for (const env of [{NODE_ENV:'production',PBL6_REQUIRE_M3_INTEGRATION:'1'}, {NODE_ENV:'development'}]) {
    expect(() => createEmailAdapter({...env, EMAIL_ADAPTER:'capture'})).toThrow('Invalid EMAIL_ADAPTER configuration');
  }
  const directory = await mkdtemp(join(tmpdir(), 'pbl6-mail-test-'));
  try {
    const adapter = createEmailAdapter({NODE_ENV:'development',PBL6_REQUIRE_M3_INTEGRATION:'1',EMAIL_ADAPTER:'capture',EMAIL_CAPTURE_DIR:directory,WEB_ORIGIN:'http://127.0.0.1:3109'});
    await adapter.sendVerificationEmail('capture@example.test','unit-only-token');
    await adapter.sendPasswordResetEmail('capture@example.test','reset-only-token');
    await adapter.sendStaffInvitationEmail?.('staff@example.test');
    const files = await readdir(directory), messages = await Promise.all(files.map(async file => JSON.parse(await readFile(join(directory,file),'utf8'))));
    expect(files).toHaveLength(3); expect(new Set(files).size).toBe(3);
    for (const message of messages) expect(message.captured_at).toBeTruthy();
    expect(new URL(messages.find(m=>m.kind==='VERIFICATION').link).pathname).toBe('/verify-email');
    expect(new URL(messages.find(m=>m.kind==='PASSWORD_RESET').link).searchParams.get('token')).toBe('reset-only-token');
    expect(messages.find(m=>m.kind==='STAFF_INVITATION').link).toBe('http://127.0.0.1:3109/customer/invitations');
  } finally {await rm(directory,{recursive:true,force:true});}
});
