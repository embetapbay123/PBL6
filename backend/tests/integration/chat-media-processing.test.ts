import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {randomUUID} from 'node:crypto';
import {PrivateChatFiles} from '../../identity-store-service/src/messaging/media-files';
import {ChatMediaProcessor} from '../../identity-store-service/src/messaging/media-process';

const native=process.env.CHAT_MEDIA_NATIVE_TEST==='1'?describe:describe.skip;
native('private media through real FFmpeg with no network',()=>{
 let root:string,files:PrivateChatFiles,processor:ChatMediaProcessor;
 beforeAll(async()=>{root=await mkdtemp(join(tmpdir(),'pbl6-native-media-'));files=new PrivateChatFiles(root);processor=new ChatMediaProcessor(files,undefined,error=>console.error(String((error as any).stderr??'Native process failed')));await processor.ready();});
 afterAll(async()=>{if(root){const target=resolve(root);if(dirname(target)!==resolve(tmpdir())||!basename(target).startsWith('pbl6-native-media-'))throw Error('Invalid native test folder');await rm(target,{recursive:true,force:true});}});
 const generate=(key:string,args:string[])=>execFileSync('/usr/bin/ffmpeg',['-nostdin','-v','error','-threads','1','-filter_threads','1',...args,'-threads','1','-n',files.path(key)],{timeout:30000,stdio:'pipe'});
 test.each([['png','png'],['jpeg','mjpeg'],['webp','libwebp']])('a real %s image is decoded and normalized to private WebP',async(_,codec)=>{
  const key=randomUUID()+'.upload';generate(key,['-f','lavfi','-i','color=c=blue:s=256x128','-frames:v','1','-c:v',codec,'-f','image2']);
  const result=await processor.process(key,'IMAGE');expect(result).toMatchObject({content_type:'image/webp',width:256,height:128});expect(result.stored_bytes).toBeGreaterThan(0);
  const bytes=await readFile(files.path(result.key));expect(bytes.toString('ascii',0,4)).toBe('RIFF');expect(bytes.toString('ascii',8,12)).toBe('WEBP');
 });
 test('video becomes a playable bounded MP4 and a separate private preview',async()=>{
  const key=randomUUID()+'.upload';generate(key,['-f','lavfi','-i','testsrc=size=128x96:rate=12','-t','2','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-metadata','title=private-location-fixture','-f','mp4']);
  const result=await processor.process(key,'VIDEO');expect(result).toMatchObject({content_type:'video/mp4',width:128,height:96});expect(result.duration_ms).toBeGreaterThan(1000);expect(result.duration_ms).toBeLessThanOrEqual(2050);expect(result.preview).toBeTruthy();expect((await readFile(files.path(result.preview!))).toString('ascii',8,12)).toBe('WEBP');
  expect((await readFile(files.path(result.key))).includes(Buffer.from('private-location-fixture'))).toBe(false);
 });
 test('JPEG orientation is applied to pixels and EXIF is removed from the shared image',async()=>{
  const key=randomUUID()+'.upload';generate(key,['-f','lavfi','-i','color=c=red:s=96x64','-frames:v','1','-c:v','mjpeg','-f','image2']);
  const jpeg=await readFile(files.path(key)),exif=Buffer.alloc(32);exif.write('Exif\0\0',0,'binary');exif.write('II',6);exif.writeUInt16LE(42,8);exif.writeUInt32LE(8,10);exif.writeUInt16LE(1,14);exif.writeUInt16LE(274,16);exif.writeUInt16LE(3,18);exif.writeUInt32LE(1,20);exif.writeUInt16LE(6,24);
  const marker=Buffer.from([255,225,0,34]);await writeFile(files.path(key),Buffer.concat([jpeg.subarray(0,2),marker,exif,jpeg.subarray(2)]));
  const result=await processor.process(key,'IMAGE');expect(result).toMatchObject({width:64,height:96});expect((await readFile(files.path(result.key))).includes(Buffer.from('Exif'))).toBe(false);
 });
 test('oversized duration and animated PNG are rejected before publishing an output',async()=>{
  const long=randomUUID()+'.upload';generate(long,['-f','lavfi','-i','color=c=blue:s=64x64:r=2','-t','31','-c:v','libx264','-threads','1','-pix_fmt','yuv420p','-f','mp4']);
  await expect(processor.process(long,'VIDEO')).rejects.toMatchObject({response:{code:'CHAT_VIDEO_DURATION'}});
  const animated=randomUUID()+'.upload';generate(animated,['-f','lavfi','-i','testsrc=size=64x64:rate=2','-t','1','-c:v','apng','-plays','0','-f','apng']);
  await expect(processor.process(animated,'IMAGE')).rejects.toMatchObject({response:{code:'CHAT_IMAGE_ANIMATED'}});
 });
 test('spoofed extension/magic and a document containing a remote reference never becomes media',async()=>{
  for(const body of ['<svg><image href="http://127.0.0.1/private"/></svg>','\x89PNG\r\n\x1a\ncorrupt payload']){
   const key=randomUUID()+'.upload';await writeFile(files.path(key),Buffer.from(body,'latin1'));await expect(processor.process(key,'IMAGE')).rejects.toThrow();
  }
 });
});
