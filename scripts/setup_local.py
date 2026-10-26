"""Create local-only secrets without printing them. Existing files are preserved."""
from pathlib import Path
import os, secrets, subprocess
root=Path(__file__).resolve().parents[1]
folder=root/'infrastructure'; keys=folder/'secrets'; keys.mkdir(exist_ok=True)
env=folder/'.env'
local_ids={'LOCAL_UID':str(os.getuid()) if hasattr(os,'getuid') else '1000',
           'LOCAL_GID':str(os.getgid()) if hasattr(os,'getgid') else '1000'}
if not env.exists():
 text=(folder/'.env.example').read_text(encoding='utf-8')
 lines=[]
 for line in text.splitlines():
  if line.endswith('=GENERATED_LOCALLY'): line=line.split('=',1)[0]+'='+secrets.token_hex(32)
  name=line.split('=',1)[0]
  if name in local_ids: line=name+'='+local_ids[name]
  lines.append(line)
 env.write_text('\n'.join(lines)+'\n',encoding='utf-8')
else:
 text=env.read_text(encoding='utf-8')
 lines=text.splitlines()
 names=set()
 for index,line in enumerate(lines):
  if '=' not in line or line.startswith('#'): continue
  name=line.split('=',1)[0]
  names.add(name)
  if name in local_ids: lines[index]=name+'='+local_ids[name]
 additions=[name+'='+value for name,value in local_ids.items() if name not in names]
 if additions: lines.extend(additions)
 env.write_text('\n'.join(lines)+'\n',encoding='utf-8')
if not (keys/'jwt-private.pem').exists():
 code="const fs=require('fs'),c=require('crypto');const k=c.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});fs.writeFileSync('jwt-private.pem',k.privateKey,{mode:0o600});fs.writeFileSync('jwt-public.pem',k.publicKey);"
 subprocess.run(['node','-e',code],cwd=keys,check=True)
print('Local config and keys ready; values were not printed. Existing configuration preserved.')
