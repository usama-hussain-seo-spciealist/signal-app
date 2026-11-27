"""Fail closed on missing/changed offline resources in a built .app or extracted IPA.

Standard-library only. Source comparison proves the packaged wallet is unchanged.
The manifest is a packaging integrity check, not a replacement for Apple signing.
"""
from pathlib import Path, PurePosixPath
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import argparse, hashlib, json, plistlib, stat, tempfile, zipfile

REQUIRED = {'index.html','styles.css','app.js','core.js','account-core.js','account-store.js',
 'auth-crypto.js','auth-store.js','session.js','scanner.js','jsQR.js','qrcode.js',
 'nearby-session.js','nearby.js','native-scanner.js','migration-core.js','migration.js',
 'updates.js','install.js','ios-install.js','app-version.json','soundbox.js','receipt-chime.wav',
 'manifest.webmanifest','icon.svg','icon-180.png','icon-192.png','icon-512.png'}

def safe(name):
 p = PurePosixPath(name)
 if not name or '\\' in name or '\0' in name or p.is_absolute() or any(x in ('','.','..') for x in name.split('/')):
  raise ValueError('Unsafe asset path: '+name)
 return p

class References(HTMLParser):
 def __init__(self): super().__init__();self.paths=[]
 def handle_starttag(self,tag,attrs):
  attrs=dict(attrs)
  if tag in ('script','img','audio','source','link'):
   value=attrs.get('href' if tag=='link' else 'src')
   if value:self.paths.append(value)

def verify_app(app, source=None, expected_version='3.4.1'):
 app=Path(app);www=app/'www'
 info=plistlib.loads((app/'Info.plist').read_bytes())
 assert info['CFBundleIdentifier']=='com.signalpay.demo.ios','Bundle identity changed'
 assert info['CFBundleShortVersionString']==expected_version,'Unexpected native version'
 assert info['CFBundleVersion']=='341','Unexpected build number'
 assert (app/info['CFBundleExecutable']).is_file(),'Missing native executable'
 assert not (app/'embedded.mobileprovision').exists(),'Expected unsigned signing package'
 for key in ('NSCameraUsageDescription','NSBluetoothAlwaysUsageDescription'):
  assert info.get(key),'Missing permission description: '+key
 manifest=json.loads((www/'bundle-manifest.json').read_bytes())
 assert manifest['format']=='signalpay-bundled-assets' and manifest['v']==1,'Invalid manifest format'
 entries=manifest['files'];assert 0<len(entries)<=500
 names=[e['path'] for e in entries];assert len(set(names))==len(names),'Duplicate asset paths'
 assert REQUIRED<=set(names),'Required assets missing: '+str(REQUIRED-set(names))
 actual={p.relative_to(www).as_posix() for p in www.rglob('*') if p.is_file()}
 assert actual==set(names)|{'bundle-manifest.json'},'Manifest/package file set differs'
 source_matches=0
 for e in entries:
  safe(e['path']);p=www/e['path']
  assert not p.is_symlink() and p.resolve().is_relative_to(www.resolve()),'Asset escapes bundle'
  data=p.read_bytes()
  assert 0<len(data)<8_000_000 and len(data)==e['bytes'],'Missing/invalid asset size: '+e['path']
  assert hashlib.sha256(data).hexdigest()==e['sha256'],'Asset checksum mismatch: '+e['path']
  if source:
   assert data==(Path(source)/e['path']).read_bytes(),'Wallet differs from source: '+e['path']
   source_matches+=1
 refs=[]
 for html in ('index.html','install.html'):
  parser=References();parser.feed((www/html).read_text(encoding='utf-8'));refs.extend(parser.paths)
 refs.extend(i['src'] for i in json.loads((www/'manifest.webmanifest').read_bytes())['icons'])
 for ref in refs:
  parsed=urlsplit(ref)
  if parsed.scheme or parsed.netloc:raise AssertionError('Remote runtime asset: '+ref)
  path=unquote(parsed.path).removeprefix('/signal-app/')
  safe(path);assert path in names,'Referenced asset absent: '+ref
 return {'passed':True,'nativeVersion':info['CFBundleShortVersionString'],'build':info['CFBundleVersion'],
  'bundleIdentifier':info['CFBundleIdentifier'],'assetsVerified':len(entries),'sourceFilesMatched':source_matches,
  'localReferencesVerified':len(refs),'physicalDeviceLaunch':'UNVERIFIED','physicalBluetooth':'OPEN / UNVERIFIED'}

def verify_ipa(ipa,source=None):
 # Extract only after validating every ZIP member. Fresh temporary folder only.
 with tempfile.TemporaryDirectory(prefix='SignalPayIpaVerification-') as folder:
  with zipfile.ZipFile(ipa) as z:
   names=z.namelist();assert len(names)==len(set(names)),'Duplicate ZIP entries'
   for entry in z.infolist():
    safe(entry.filename.rstrip('/'))
    assert not stat.S_ISLNK(entry.external_attr>>16),'Symlink in IPA'
    assert entry.file_size<32_000_000,'Oversized IPA member'
   assert sum(e.file_size for e in z.infolist())<100_000_000,'Oversized IPA'
   z.extractall(folder)
  apps=list((Path(folder)/'Payload').glob('*.app'));assert len(apps)==1,'Expected one app'
  result=verify_app(apps[0],source)
  result.update(ipaBytes=Path(ipa).stat().st_size,ipaSha256=hashlib.sha256(Path(ipa).read_bytes()).hexdigest(),extractedIpaVerified=True)
  return result

if __name__=='__main__':
 parser=argparse.ArgumentParser();group=parser.add_mutually_exclusive_group(required=True)
 group.add_argument('--app');group.add_argument('--ipa');parser.add_argument('--source-root');parser.add_argument('--report')
 args=parser.parse_args();result=verify_ipa(args.ipa,args.source_root) if args.ipa else verify_app(args.app,args.source_root)
 output=json.dumps(result,indent=2)+'\n';print(output)
 if args.report:Path(args.report).write_text(output,encoding='utf-8')
