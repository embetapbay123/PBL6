/** Synthetic seed identities only. Never accept an arbitrary email or role from a client. */
export const demoAccounts: Readonly<Record<string, string>> = Object.freeze({
  customerA: 'customer.a@pbl6.test', customerB: 'customer.b@pbl6.test',
  ownerA: 'owner.a@pbl6.test', ownerB: 'owner.b@pbl6.test',
  staffA: 'seller.a@pbl6.test', staffB: 'seller.b@pbl6.test', admin: 'admin@pbl6.test',
});
