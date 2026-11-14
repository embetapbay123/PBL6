import {chatIpScope,chatIpHash,chatParticipant} from '../../identity-store-service/src/messaging/media-scope';
test('IP quota shares IPv4 mapped forms and IPv6 /64 interfaces without storing an address',()=>{
 expect(chatIpScope('127.0.0.1')).toBe(chatIpScope('::ffff:127.0.0.1'));
 expect(chatIpScope('127.0.0.1')).toBe(chatIpScope('::FFFF:7F00:0001'));
 expect(chatIpScope('2001:db8:aa:1::1')).toBe(chatIpScope('2001:0DB8:00aa:0001:ffff:ffff:aaaa:bbbb'));
 expect(chatIpScope('2001:db8:aa:1::1')).not.toBe(chatIpScope('2001:db8:aa:2::1'));
 expect(chatIpHash('::ffff:127.0.0.1','x'.repeat(32))).toBe(chatIpHash('127.0.0.1','x'.repeat(32)));
 expect(chatIpHash('127.0.0.1','x'.repeat(32))).toMatch(/^[a-f0-9]{64}$/);
 for(const value of ['not-an-ip','127.000.0.1','1.2.3.4,5.6.7.8',''])expect(()=>chatIpScope(value)).toThrow();
 expect(()=>chatIpHash('127.0.0.1','short')).toThrow();
});
test('participant checks stop foreign users, inactive members and writes to a locked Store',async()=>{
 const query=jest.fn().mockResolvedValue([{id:'thread',customer_user_id:'buyer',store_id:'shop',store_status:'ACTIVE'}]),manager={query} as any;
 await expect(chatParticipant(manager,'thread',{user_id:'foreign'},'CUSTOMER')).rejects.toMatchObject({status:404});
 await expect(chatParticipant(manager,'thread',{user_id:'buyer'},'CUSTOMER')).resolves.toMatchObject({id:'thread'});
 const actor={user_id:'owner',store_membership:{store_id:'shop',role:'OWNER',status:'ACTIVE'}};
 await expect(chatParticipant(manager,'thread',actor,'STORE')).resolves.toMatchObject({id:'thread'});
 await expect(chatParticipant(manager,'thread',{...actor,store_membership:{...actor.store_membership,store_id:'other'}},'STORE')).rejects.toMatchObject({status:404});
 const before=query.mock.calls.length;await expect(chatParticipant(manager,'thread',{user_id:'staff',store_membership:{store_id:'shop',role:'SELLER',status:'ACTIVE',permissions:[]}},'STORE')).rejects.toMatchObject({status:403});expect(query.mock.calls.length).toBe(before);
 query.mockResolvedValue([{id:'thread',customer_user_id:'buyer',store_id:'shop',store_status:'LOCKED'}]);
 await expect(chatParticipant(manager,'thread',{user_id:'buyer'},'CUSTOMER',true)).rejects.toMatchObject({status:409});
 await expect(chatParticipant(manager,'thread',{user_id:'buyer'},'CUSTOMER')).resolves.toMatchObject({id:'thread'});
});
