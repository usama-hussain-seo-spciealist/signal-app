"""Packaging gate accepts a complete fixture and rejects broken IPA resources."""
import importlib.util, hashlib, json, plistlib, shutil, tempfile, unittest, zipfile
from pathlib import Path
spec=importlib.util.spec_from_file_location('verify',Path(__file__).with_name('verify-ios-resources.py'))
verify=importlib.util.module_from_spec(spec);spec.loader.exec_module(verify)

class PackagingTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='SignalPayPackagingTest-');self.addCleanup(self.temp.cleanup)
  self.app=Path(self.temp.name)/'Payload'/'SignalPay.app';self.www=self.app/'www';self.www.mkdir(parents=True)
  for name in verify.REQUIRED|{'install.html'}:(self.www/name).write_text('fixture',encoding='utf-8')
  (self.www/'manifest.webmanifest').write_text('{"icons":[{"src":"icon-192.png"}]}')
  (self.www/'index.html').write_text('<script src="./app.js"></script>')
  entries=[{'path':p.name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in self.www.iterdir()]
  (self.www/'bundle-manifest.json').write_text(json.dumps({'format':'signalpay-bundled-assets','v':1,'files':entries}))
  (self.app/'SignalPay').write_bytes(b'fixture executable')
  (self.app/'Info.plist').write_bytes(plistlib.dumps({'CFBundleIdentifier':'com.signalpay.demo.ios','CFBundleShortVersionString':'3.4.1','CFBundleVersion':'341','CFBundleExecutable':'SignalPay','NSCameraUsageDescription':'camera','NSBluetoothAlwaysUsageDescription':'Bluetooth'}))
 def package(self):
  ipa=Path(self.temp.name)/'test.ipa'
  with zipfile.ZipFile(ipa,'w') as z:
   for p in self.app.rglob('*'):
    if p.is_file():z.write(p,p.relative_to(self.app.parent.parent).as_posix())
  return ipa
 def testCompleteExtractedPackagePasses(self):self.assertTrue(verify.verify_ipa(self.package())['passed'])
 def testRealPackagedWalletReferencesMatchSource(self):
  repo=Path(__file__).resolve().parent.parent
  shutil.copytree(repo/'native-ios/www',self.www,dirs_exist_ok=True)
  result=verify.verify_app(self.app,repo)
  self.assertEqual(result['assetsVerified'],40)
  self.assertEqual(result['sourceFilesMatched'],40)
 def testMissingIndexFails(self):
  (self.www/'index.html').unlink()
  with self.assertRaises(AssertionError):verify.verify_ipa(self.package())
 def testCorruptedScriptFails(self):
  (self.www/'app.js').write_text('changed')
  with self.assertRaises(AssertionError):verify.verify_ipa(self.package())
 def testMissingManifestFails(self):
  (self.www/'bundle-manifest.json').unlink()
  with self.assertRaises(FileNotFoundError):verify.verify_ipa(self.package())
 def testZipTraversalFails(self):
  ipa=self.package()
  with zipfile.ZipFile(ipa,'a') as z:z.writestr('../escape','blocked')
  with self.assertRaises(ValueError):verify.verify_ipa(ipa)

if __name__=='__main__':unittest.main()
