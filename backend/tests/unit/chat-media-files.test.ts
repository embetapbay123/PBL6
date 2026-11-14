import {mkdtemp,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {randomUUID} from 'node:crypto';
import {PrivateChatFiles,byteRange,detectedFormat,assertStaticImage,validateUploadSize} from '../../identity-store-service/src/messaging/media-files';

test('byte ranges are bounded and support suffix or open-ended requests',()=>{
 expect(byteRange(undefined,100)).toBeUndefined();expect(byteRange('bytes=10-20',100)).toEqual({start:10,end:20});expect(byteRange('bytes=90-999',100)).toEqual({start:90,end:99});expect(byteRange('bytes=10-',100)).toEqual({start:10,end:99});expect(byteRange('bytes=-8',100)).toEqual({start:92,end:99});expect(byteRange('bytes=-999',100)).toEqual({start:0,end:99});
 for(const value of ['bytes=100-','bytes=50-20','bytes=-0','bytes=0-1,5-6','bytes=9007199254740993-','file://a','bytes=-'])expect(()=>byteRange(value,100)).toThrow();
});
test('size and magic reject arbitrary documents, fake extensions and image/video scope mismatches',()=>{
 expect(()=>validateUploadSize('IMAGE',5*1024*1024)).not.toThrow();expect(()=>validateUploadSize('VIDEO',20*1024*1024)).not.toThrow();
 for(const [kind,size] of [['IMAGE',5*1024*1024+1],['VIDEO',20*1024*1024+1],['IMAGE',0],['VIDEO',1.1],['OTHER',2]] as const)expect(()=>validateUploadSize(kind as any,size)).toThrow();
 expect(detectedFormat(Buffer.from([255,216,255,0]),'IMAGE')).toBe('mjpeg');expect(detectedFormat(Buffer.from([137,80,78,71,13,10,26,10]),'IMAGE')).toBe('png');expect(detectedFormat(Buffer.from('RIFF0000WEBP'),'IMAGE')).toBe('webp');expect(detectedFormat(Buffer.from('0000ftypisom'),'VIDEO')).toBe('mov');
 for(const bytes of [Buffer.from('<svg><script>'),Buffer.from('https://image.test/x.png'),Buffer.from('RIFF0000AVI '),Buffer.alloc(0)])expect(()=>detectedFormat(bytes,'IMAGE')).toThrow();expect(()=>detectedFormat(Buffer.from('0000ftypisom'),'IMAGE')).toThrow();
});
test('private files accept only opaque keys, do not overwrite and cannot read symlinks',async()=>{
 const folder=await mkdtemp(join(tmpdir(),'pbl6-chat-media-unit-'));const files=new PrivateChatFiles(folder),id=randomUUID();
 try{
  expect(()=>new PrivateChatFiles('relative')).toThrow();
  for(const key of ['../photo.jpg','https://host/photo.png',id+'/photo.webp',id+'.exe',id+'.frame-8.jpg'])expect(()=>files.path(key)).toThrow();
  const temp=await files.temporary();await temp.handle.writeFile('private bytes');await temp.handle.close();
  const key=id+'.image.webp';await files.publish(temp.key,key);const read=await files.openRead(key);expect((await read.handle.readFile()).toString()).toBe('private bytes');await read.handle.close();
  const next=await files.temporary();await next.handle.writeFile('replacement');await next.handle.close();await expect(files.publish(next.key,key)).rejects.toThrow('CHAT_MEDIA_TARGET_EXISTS');
  // Windows may not grant symlink creation to this process; Unix deployment tests also cover it.
  if(process.platform!=='win32'){const target=join(folder,'source.txt'),link=id+'.preview.webp';await writeFile(target,'secret');await symlink(target,files.path(link));await expect(files.openRead(link)).rejects.toThrow();}
  await files.remove(key);await files.remove(key);
 }finally{const target=resolve(folder),parent=resolve(tmpdir());if(dirname(target)!==parent||!basename(target).startsWith('pbl6-chat-media-unit-'))throw new Error('Unexpected private test path');await rm(target,{recursive:true,force:true});}
});
test('animation chunks are rejected before a still-image decoder can ignore them',()=>{
 const apng=Buffer.alloc(8+12+8);apng.writeUInt32BE(8,8);apng.write('acTL',12,'ascii');expect(()=>assertStaticImage(apng,'png')).toThrow();
 const animated=Buffer.alloc(12+8+10);animated.write('VP8X',12,'ascii');animated.writeUInt32LE(10,16);animated[20]=2;expect(()=>assertStaticImage(animated,'webp')).toThrow();
 const anim=Buffer.alloc(12+8);anim.write('ANIM',12,'ascii');expect(()=>assertStaticImage(anim,'webp')).toThrow();
 const corrupt=Buffer.alloc(20);corrupt.writeUInt32BE(100000,8);expect(()=>assertStaticImage(corrupt,'png')).toThrow();
});
