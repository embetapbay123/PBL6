jest.mock('node:fs',()=>({readFileSync:jest.fn((file:string)=>'public-key:'+file)}));
import { readFileSync } from 'node:fs';
import { deploymentPublicKey } from '../../shared/src/config';
test('immutable deployment key is read once even across repeated request configuration reads',()=>{
  for(let i=0;i<200;i++)expect(deploymentPublicKey('/run/secrets/public-key.pem')).toBe('public-key:/run/secrets/public-key.pem');
  expect(readFileSync).toHaveBeenCalledTimes(1);
  expect(deploymentPublicKey('/run/secrets/new-public-key.pem')).toBe('public-key:/run/secrets/new-public-key.pem');
  expect(readFileSync).toHaveBeenCalledTimes(2);
});
test('unreadable replacement key fails closed and does not replace the previous valid key',()=>{
  (readFileSync as jest.Mock).mockImplementationOnce(()=>{throw new Error('Unreadable key');});
  expect(()=>deploymentPublicKey('/missing-key.pem')).toThrow('Unreadable key');
  expect(deploymentPublicKey('/run/secrets/new-public-key.pem')).toBe('public-key:/run/secrets/new-public-key.pem');
});
