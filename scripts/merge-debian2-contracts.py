"""Structural three-way merge of reviewed contracts; unknown conflicts stop the merge."""
import argparse
import json
import subprocess
from pathlib import Path

parser=argparse.ArgumentParser();parser.add_argument('--runtime-source',type=Path,required=True);parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args();plan=Path(__file__).resolve().parents[1]
missing=object();conflicts=[]

def merge(before,ours,theirs,path):
 if ours==theirs:return ours
 if ours==before:return theirs
 if theirs==before:return ours
 if isinstance(ours,dict) and isinstance(theirs,dict) and (before is missing or isinstance(before,dict)):
  old={} if before is missing else before;result={}
  for key in dict.fromkeys([*ours,*theirs,*old]):
   value=merge(old.get(key,missing),ours.get(key,missing),theirs.get(key,missing),path+'/'+key)
   if value is not missing:result[key]=value
  return result
 if isinstance(before,list) and isinstance(ours,list) and isinstance(theirs,list):
  key='operation_id'
  if all(isinstance(v,dict) and key in v for v in before+ours+theirs):
   def keyed(items):
    result={v[key]:v for v in items}
    if len(result)!=len(items):raise ValueError('Duplicate operation in '+path)
    return result
   return list(merge(keyed(before),keyed(ours),keyed(theirs),path).values())
  if all(isinstance(v,str) for v in before+ours+theirs) and set(before)<=set(ours) and set(before)<=set(theirs):
   return list(dict.fromkeys([*before,*ours,*theirs]))
 conflicts.append(path);return ours

prepared={}
for name in ['docs/contracts/openapi.json','docs/contracts/endpoint-status.json']:
 before=json.loads(subprocess.check_output(['git','show','6c364af:'+name],cwd=plan))
 ours=json.loads((args.runtime_source/name).read_text(encoding='utf-8'))
 theirs=json.loads(subprocess.check_output(['git','show','56dda4d:'+name],cwd=plan))
 prepared[name]=merge(before,ours,theirs,name)
if conflicts:raise SystemExit('Review semantic contract conflicts: '+', '.join(conflicts))
for name,value in prepared.items():(args.output/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('DEBIAN2_CONTRACT_MERGE_OK: no unresolved semantic conflicts')
