"""Create local-only secrets without printing them. Existing files are preserved."""
from pathlib import Path
import secrets, subprocess
root=Path(__file__).resolve().parents[1]
folder=root/'infrastructure'; keys=folder/'secrets'; keys.mkdir(exist_ok=True)
env=folder/'.env'
if not env.exists():
 text=(folder/'.env.example').read_text(encoding='utf-8')
 lines=[]
 for line in text.splitlines():
  if line.endswith('=GENERATED_LOCALLY'): line=line.split('=',1)[0]+'='+secrets.token_hex(32)
  lines.append(line)
 env.write_text('\n'.join(lines)+'\n',encoding='utf-8')
if not (keys/'jwt-private.pem').exists():
 code="const fs=require('fs'),c=require('crypto');const k=c.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});fs.writeFileSync('jwt-private.pem',k.privateKey,{mode:0o600});fs.writeFileSync('jwt-public.pem',k.publicKey);"
 subprocess.run(['node','-e',code],cwd=keys,check=True)
print('Local config and keys ready; values were not printed. Existing configuration preserved.')
