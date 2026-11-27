"""Deterministic Xcode project; no external project-generator dependency."""
from pathlib import Path
import hashlib
p=Path(__file__).resolve().parent.parent/'native-ios'
def ident(s):return hashlib.sha256(s.encode()).hexdigest()[:24].upper()
def q(s):return '"'+s.replace('\\','\\\\').replace('"','\\"')+'"'
objects=[]
def obj(key,body):objects.append(f'{ident(key)} = {{ {body} }};');return ident(key)
swift=['App/AppDelegate.swift','App/WalletController.swift','App/CameraScanner.swift','App/BundleServer.swift','Sources/SignalPayNearby/BundleAssets.swift','Sources/SignalPayNearby/NearbyFrame.swift','Sources/SignalPayNearby/CoreBluetoothTransport.swift']
tests=['AppTests/WalletHostTests.swift']
uitests=['LaunchTests/LaunchTests.swift']
refs=[];builds=[];testbuilds=[];uibuilds=[]
for name in swift+tests+uitests:
 ref=obj('file:'+name,f'isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = {q(name)}; sourceTree = SOURCE_ROOT;');refs.append(ref)
 b=obj('build:'+name,f'isa = PBXBuildFile; fileRef = {ref};');(uibuilds if name in uitests else testbuilds if name in tests else builds).append(b)
resources=[]
for name,kind in [('www','folder'),('App/Assets.xcassets','folder.assetcatalog')]:
 ref=obj('file:'+name,f'isa = PBXFileReference; lastKnownFileType = {kind}; path = {q(name)}; sourceTree = SOURCE_ROOT;');refs.append(ref);resources.append(obj('build:'+name,f'isa = PBXBuildFile; fileRef = {ref};'))
app=obj('productApp','isa = PBXFileReference; explicitFileType = wrapper.application; path = SignalPay.app; sourceTree = BUILT_PRODUCTS_DIR;')
test=obj('productTest','isa = PBXFileReference; explicitFileType = wrapper.cfbundle; path = SignalPayTests.xctest; sourceTree = BUILT_PRODUCTS_DIR;')
ui=obj('productUI','isa = PBXFileReference; explicitFileType = wrapper.cfbundle; path = SignalPayLaunchTests.xctest; sourceTree = BUILT_PRODUCTS_DIR;')
def ids(xs):return '('+','.join(xs)+',)'
products=obj('products',f'isa = PBXGroup; children = {ids([app,test,ui])}; name = Products; sourceTree = "<group>";')
group=obj('mainGroup',f'isa = PBXGroup; children = {ids(refs+[products])}; sourceTree = "<group>";')
def phase(key,kind,files):return obj(key,f'isa = {kind}; buildActionMask = 2147483647; files = {ids(files) if files else "()"}; runOnlyForDeploymentPostprocessing = 0;')
appSources=phase('appSources','PBXSourcesBuildPhase',builds);testSources=phase('testSources','PBXSourcesBuildPhase',testbuilds)
appResources=phase('appResources','PBXResourcesBuildPhase',resources);testResources=phase('testResources','PBXResourcesBuildPhase',[])
appFrameworks=phase('appFrameworks','PBXFrameworksBuildPhase',[]);testFrameworks=phase('testFrameworks','PBXFrameworksBuildPhase',[])
uiSources=phase('uiSources','PBXSourcesBuildPhase',uibuilds);uiResources=phase('uiResources','PBXResourcesBuildPhase',[]);uiFrameworks=phase('uiFrameworks','PBXFrameworksBuildPhase',[])
def configs(kind):
 result=[]
 for mode in ['Debug','Release']:
  settings={'SDKROOT':'iphoneos','IPHONEOS_DEPLOYMENT_TARGET':'15.0','SWIFT_VERSION':'5.0','TARGETED_DEVICE_FAMILY':'1','CODE_SIGN_STYLE':'Automatic','CLANG_ENABLE_MODULES':'YES','SWIFT_OPTIMIZATION_LEVEL':'-Onone' if mode=='Debug' else '-O','DEBUG_INFORMATION_FORMAT':'dwarf','SWIFT_ACTIVE_COMPILATION_CONDITIONS':'DEBUG' if mode=='Debug' else '', 'ENABLE_TESTABILITY':'YES' if mode=='Debug' else 'NO'}
  if kind=='app':settings.update({'PRODUCT_NAME':'SignalPay','PRODUCT_BUNDLE_IDENTIFIER':'com.signalpay.demo.ios','INFOPLIST_FILE':'App/Info.plist','GENERATE_INFOPLIST_FILE':'NO','ASSETCATALOG_COMPILER_APPICON_NAME':'AppIcon','LD_RUNPATH_SEARCH_PATHS':'$(inherited) @executable_path/Frameworks','MARKETING_VERSION':'3.4.1','CURRENT_PROJECT_VERSION':'341'})
  if kind=='tests':settings.update({'PRODUCT_NAME':'SignalPayTests','PRODUCT_BUNDLE_IDENTIFIER':'com.signalpay.demo.ios.tests','GENERATE_INFOPLIST_FILE':'YES','TEST_HOST':'$(BUILT_PRODUCTS_DIR)/SignalPay.app/SignalPay','BUNDLE_LOADER':'$(TEST_HOST)','LD_RUNPATH_SEARCH_PATHS':'$(inherited) @executable_path/Frameworks @loader_path/Frameworks'})
  if kind=='ui':settings.update({'PRODUCT_NAME':'SignalPayLaunchTests','PRODUCT_BUNDLE_IDENTIFIER':'com.signalpay.demo.ios.launchtests','GENERATE_INFOPLIST_FILE':'YES','TEST_TARGET_NAME':'SignalPay','LD_RUNPATH_SEARCH_PATHS':'$(inherited) @executable_path/Frameworks @loader_path/Frameworks'})
  result.append(obj(kind+mode,'isa = XCBuildConfiguration; buildSettings = {'+' '.join(f'{k} = {q(v)};' for k,v in settings.items())+'}; name = '+mode+';'))
 return obj(kind+'Configs',f'isa = XCConfigurationList; buildConfigurations = {ids(result)}; defaultConfigurationIsVisible = 0; defaultConfigurationName = Release;')
appConfig=configs('app');testConfig=configs('tests');uiConfig=configs('ui');projectConfig=configs('project')
proxy=obj('testProxy',f'isa = PBXContainerItemProxy; containerPortal = {ident("project")}; proxyType = 1; remoteGlobalIDString = {ident("appTarget")}; remoteInfo = SignalPay;')
dependency=obj('testDependency',f'isa = PBXTargetDependency; target = {ident("appTarget")}; targetProxy = {proxy};')
appTarget=obj('appTarget',f'isa = PBXNativeTarget; buildConfigurationList = {appConfig}; buildPhases = {ids([appSources,appFrameworks,appResources])}; buildRules = (); dependencies = (); name = SignalPay; productName = SignalPay; productReference = {app}; productType = "com.apple.product-type.application";')
testTarget=obj('testTarget',f'isa = PBXNativeTarget; buildConfigurationList = {testConfig}; buildPhases = {ids([testSources,testFrameworks,testResources])}; buildRules = (); dependencies = {ids([dependency])}; name = SignalPayTests; productName = SignalPayTests; productReference = {test}; productType = "com.apple.product-type.bundle.unit-test";')
uiTarget=obj('uiTarget',f'isa = PBXNativeTarget; buildConfigurationList = {uiConfig}; buildPhases = {ids([uiSources,uiFrameworks,uiResources])}; buildRules = (); dependencies = {ids([dependency])}; name = SignalPayLaunchTests; productName = SignalPayLaunchTests; productReference = {ui}; productType = "com.apple.product-type.bundle.ui-testing";')
project=obj('project',f'isa = PBXProject; attributes = {{LastUpgradeCheck = 1600; TargetAttributes = {{{appTarget} = {{CreatedOnToolsVersion = 16.0;}}; {testTarget} = {{CreatedOnToolsVersion = 16.0; TestTargetID = {appTarget};}}; {uiTarget} = {{CreatedOnToolsVersion = 16.0; TestTargetID = {appTarget};}};}};}}; buildConfigurationList = {projectConfig}; compatibilityVersion = "Xcode 14.0"; developmentRegion = en; hasScannedForEncodings = 0; knownRegions = (en,Base); mainGroup = {group}; productRefGroup = {products}; projectDirPath = ""; projectRoot = ""; targets = {ids([appTarget,testTarget,uiTarget])};')
projectdir=p/'SignalPay.xcodeproj';(projectdir/'xcshareddata/xcschemes').mkdir(parents=True,exist_ok=True)
(projectdir/'project.pbxproj').write_text('// !$*UTF8*$!\n{ archiveVersion = 1; classes = {}; objectVersion = 56; objects = {\n'+'\n'.join(objects)+'\n}; rootObject = '+project+'; }\n',encoding='utf-8')
def reference(target,name):return f'<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="{target}" BuildableName="{name}" BlueprintName="{name.split(".")[0]}" ReferencedContainer="container:SignalPay.xcodeproj"/>'
a=reference(appTarget,'SignalPay.app');t=reference(testTarget,'SignalPayTests.xctest');u=reference(uiTarget,'SignalPayLaunchTests.xctest')
(projectdir/'xcshareddata/xcschemes/SignalPay.xcscheme').write_text(f'''<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="1600" version="1.3"><BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="YES" buildForArchiving="YES" buildForAnalyzing="YES">{a}</BuildActionEntry><BuildActionEntry buildForTesting="YES" buildForRunning="NO" buildForProfiling="NO" buildForArchiving="NO" buildForAnalyzing="YES">{t}</BuildActionEntry><BuildActionEntry buildForTesting="YES" buildForRunning="NO" buildForProfiling="NO" buildForArchiving="NO" buildForAnalyzing="YES">{u}</BuildActionEntry></BuildActionEntries></BuildAction><TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"><Testables><TestableReference skipped="NO">{t}</TestableReference><TestableReference skipped="NO">{u}</TestableReference></Testables></TestAction><LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugServiceExtension="internal" allowLocationSimulation="NO"><BuildableProductRunnable runnableDebuggingMode="0">{a}</BuildableProductRunnable></LaunchAction><ProfileAction buildConfiguration="Release" shouldUseLaunchSchemeArgsEnv="YES" useCustomWorkingDirectory="NO"><BuildableProductRunnable runnableDebuggingMode="0">{a}</BuildableProductRunnable></ProfileAction><AnalyzeAction buildConfiguration="Debug"/><ArchiveAction buildConfiguration="Release" revealArchiveInOrganizer="YES"/></Scheme>
''',encoding='utf-8')
print('Generated existing-repository native iOS project.')
