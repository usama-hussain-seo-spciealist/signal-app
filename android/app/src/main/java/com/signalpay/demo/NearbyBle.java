package com.signalpay.demo;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.*;
import android.bluetooth.le.*;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.ParcelUuid;
import android.os.SystemClock;
import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Collections;
import java.util.UUID;
import org.json.JSONObject;

/** Experimental one-peer, foreground-only GATT transport. Never decides payment success. */
@SuppressWarnings("deprecation")
final class NearbyBle {
 static final int PERMISSION=79;
 static final UUID WRITE=UUID.fromString("6f8d0001-8d9a-4d21-a8b7-9d7f70000001"),NOTIFY=UUID.fromString("6f8d0002-8d9a-4d21-a8b7-9d7f70000001"),CCCD=UUID.fromString("00002902-0000-1000-8000-00805f9b34fb");
 interface Events{void event(JSONObject value);}
 private final Activity activity;private final Events events;private final Handler main=new Handler(Looper.getMainLooper());
 private final NearbyFrame input=new NearbyFrame();private final ArrayDeque<byte[]> output=new ArrayDeque<>();
 private BluetoothAdapter adapter;private BluetoothGattServer server;private BluetoothGatt client;private BluetoothDevice remote;private BluetoothGattCharacteristic write,notify;
 private BluetoothLeScanner scanner;private BluetoothLeAdvertiser advertiser;private ScanCallback scan;private AdvertiseCallback advertising;
 private JSONObject pendingPermission;private UUID service;private boolean peripheral,connected,sending,closed;private int mtu=23,messageId=0,generation=0,writeSerial=0;
 NearbyBle(Activity activity,Events events){this.activity=activity;this.events=events;BluetoothManager m=(BluetoothManager)activity.getSystemService(Activity.BLUETOOTH_SERVICE);adapter=m==null?null:m.getAdapter();}
 private void runOnMain(Runnable task){main.post(()->{try{task.run();}catch(Exception error){fail("Bluetooth operation failed. Retry the saved transaction: "+error.getClass().getSimpleName());}});}
 private void emit(String type,String detail){try{JSONObject e=new JSONObject().put("type",type).put("detail",detail).put("role",peripheral?"receiver":"sender");events.event(e);}catch(Exception ignored){}}
 private void data(String text){try{events.event(new JSONObject().put("type","message").put("text",text).put("role",peripheral?"receiver":"sender"));}catch(Exception ignored){}}
 void dispatch(JSONObject command){runOnMain(()->{try{
  String action=command.optString("action");
  if("stop".equals(action)){stop();emit("stopped","Nearby transport stopped. Pending payments remain pending.");return;}
  if("status".equals(action)){emit("capability",adapter==null||!activity.getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)?"BLE unavailable on this device/emulator.":"Native BLE API available. Hardware discovery/delivery is not verified by this check.");return;}
  if("send".equals(action)){send(command.getString("text"));return;}
  if(!"listen".equals(action)&&!"connect".equals(action))throw new IllegalArgumentException("Unsupported nearby action");
  String account=command.getString("accountId");if(!account.matches("SP-[a-f0-9]{32}"))throw new IllegalArgumentException("Invalid nearby receiver account");
  if(adapter==null||!activity.getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)){emit("unavailable","BLE hardware unavailable. No Bluetooth payment was delivered.");return;}
  String[] needed=Build.VERSION.SDK_INT>=31?new String[]{Manifest.permission.BLUETOOTH_SCAN,Manifest.permission.BLUETOOTH_CONNECT,Manifest.permission.BLUETOOTH_ADVERTISE}:"connect".equals(action)?new String[]{Manifest.permission.ACCESS_FINE_LOCATION}:new String[]{};
  for(String permission:needed)if(activity.checkSelfPermission(permission)!=PackageManager.PERMISSION_GRANTED){pendingPermission=command;activity.requestPermissions(needed,PERMISSION);emit("permission","Allow Nearby devices/Bluetooth access to start a foreground session.");return;}
  start(action,account);
 }catch(Exception error){fail(error.getMessage());}});}
 void permissionResult(){JSONObject command=pendingPermission;pendingPermission=null;if(command==null)return;boolean granted=true;String[] permissions=Build.VERSION.SDK_INT>=31?new String[]{Manifest.permission.BLUETOOTH_SCAN,Manifest.permission.BLUETOOTH_CONNECT,Manifest.permission.BLUETOOTH_ADVERTISE}:new String[]{Manifest.permission.ACCESS_FINE_LOCATION};for(String p:permissions)if(activity.checkSelfPermission(p)!=PackageManager.PERMISSION_GRANTED)granted=false;if(granted)dispatch(command);else emit("unavailable","Bluetooth permission denied. No Bluetooth payment was delivered.");}
 boolean awaitingPermission(){return pendingPermission!=null;}
 static UUID accountService(String id){if(!id.matches("SP-[a-f0-9]{32}"))throw new IllegalArgumentException("Invalid account");String h=id.substring(3);return UUID.fromString(h.substring(0,8)+"-"+h.substring(8,12)+"-"+h.substring(12,16)+"-"+h.substring(16,20)+"-"+h.substring(20));}
 private void start(String action,String account){
  stop();closed=false;if(!adapter.isEnabled()){emit("unavailable","Bluetooth is off. Turn it on, keep SignalPay open, and retry. Internet is not required.");return;}
  service=accountService(account);peripheral="listen".equals(action);int token=generation;
  if(peripheral)listen(token);else discover(token);
  main.postDelayed(()->{if(token==generation&&!connected)fail("Receiver not connected. Keep both native apps open and retry the same transaction.");},30000);
  main.postDelayed(()->{if(token==generation)fail("Nearby foreground session expired. Reconnect to retry pending transactions.");},120000);
 }
 private void listen(int token){
  advertiser=adapter.getBluetoothLeAdvertiser();if(advertiser==null){fail("This device cannot advertise BLE. Use the existing QR fallback.");return;}
  BluetoothManager manager=(BluetoothManager)activity.getSystemService(Activity.BLUETOOTH_SERVICE);
  server=manager.openGattServer(activity,new BluetoothGattServerCallback(){
   @Override public void onServiceAdded(int status,BluetoothGattService added){runOnMain(()->{if(token!=generation)return;if(status!=BluetoothGatt.GATT_SUCCESS){fail("BLE service could not start.");return;}
    advertising=new AdvertiseCallback(){@Override public void onStartSuccess(AdvertiseSettings settings){runOnMain(()->{if(token==generation)emit("listening","Foreground BLE receive session is open. Sender scans this account QR once.");});}@Override public void onStartFailure(int code){runOnMain(()->{if(token==generation)fail("BLE advertising failed ("+code+").");});}};
    advertiser.startAdvertising(new AdvertiseSettings.Builder().setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY).setConnectable(true).setTimeout(0).build(),new AdvertiseData.Builder().setIncludeDeviceName(false).addServiceUuid(new ParcelUuid(service)).build(),advertising);
   });}
   @Override public void onConnectionStateChange(BluetoothDevice device,int status,int state){runOnMain(()->{if(token!=generation)return;if(state==BluetoothProfile.STATE_CONNECTED){if(remote!=null&&!remote.equals(device)){server.cancelConnection(device);return;}remote=device;}else if(remote!=null&&remote.equals(device))fail("Bluetooth disconnected. The sender stays Pending until a matching receiver receipt returns.");});}
   @Override public void onMtuChanged(BluetoothDevice device,int value){runOnMain(()->{if(token==generation&&device.equals(remote))mtu=Math.max(23,Math.min(value,185));});}
   @Override public void onDescriptorWriteRequest(BluetoothDevice device,int requestId,BluetoothGattDescriptor descriptor,boolean prepared,boolean response,int offset,byte[] value){runOnMain(()->{if(token!=generation)return;boolean valid=!prepared&&offset==0&&CCCD.equals(descriptor.getUuid())&&device.equals(remote)&&Arrays.equals(value,BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);if(response)server.sendResponse(device,requestId,valid?BluetoothGatt.GATT_SUCCESS:BluetoothGatt.GATT_FAILURE,0,null);if(valid){connected=true;if(advertising!=null)advertiser.stopAdvertising(advertising);emit("connected","BLE transport connected; account/session authentication is still required.");}});}
   @Override public void onCharacteristicWriteRequest(BluetoothDevice device,int requestId,BluetoothGattCharacteristic characteristic,boolean prepared,boolean response,int offset,byte[] value){runOnMain(()->{if(token!=generation)return;boolean valid=connected&&!prepared&&offset==0&&WRITE.equals(characteristic.getUuid())&&device.equals(remote);if(valid)try{receive(value);}catch(Exception error){valid=false;fail("Malformed BLE frame. Session closed.");}if(response&&server!=null)server.sendResponse(device,requestId,valid?BluetoothGatt.GATT_SUCCESS:BluetoothGatt.GATT_FAILURE,0,null);});}
   @Override public void onNotificationSent(BluetoothDevice device,int status){runOnMain(()->{if(token!=generation)return;if(status!=BluetoothGatt.GATT_SUCCESS){fail("BLE acknowledgement delivery interrupted. Retry the same transaction.");return;}sending=false;pump();});}
  });
  if(server==null){fail("BLE GATT server unavailable.");return;}
  BluetoothGattService primary=new BluetoothGattService(service,BluetoothGattService.SERVICE_TYPE_PRIMARY);
  write=new BluetoothGattCharacteristic(WRITE,BluetoothGattCharacteristic.PROPERTY_WRITE,BluetoothGattCharacteristic.PERMISSION_WRITE);
  notify=new BluetoothGattCharacteristic(NOTIFY,BluetoothGattCharacteristic.PROPERTY_NOTIFY,BluetoothGattCharacteristic.PERMISSION_READ);
  notify.addDescriptor(new BluetoothGattDescriptor(CCCD,BluetoothGattDescriptor.PERMISSION_WRITE|BluetoothGattDescriptor.PERMISSION_READ));primary.addCharacteristic(write);primary.addCharacteristic(notify);if(!server.addService(primary))fail("BLE service registration failed.");
 }
 private void discover(int token){
  scanner=adapter.getBluetoothLeScanner();if(scanner==null){fail("BLE scanner unavailable.");return;}
  scan=new ScanCallback(){@Override public void onScanResult(int callbackType,ScanResult result){runOnMain(()->{if(token!=generation||client!=null)return;scanner.stopScan(scan);remote=result.getDevice();client=remote.connectGatt(activity,false,callbacks(token),BluetoothDevice.TRANSPORT_LE);if(client==null)fail("BLE connection could not start.");});}@Override public void onScanFailed(int code){runOnMain(()->{if(token==generation)fail("BLE scan failed ("+code+").");});}};
  scanner.startScan(Collections.singletonList(new ScanFilter.Builder().setServiceUuid(new ParcelUuid(service)).build()),new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(),scan);emit("discovering","Looking for the scanned receiver’s foreground BLE service. Service discovery alone does not verify identity.");
 }
 private BluetoothGattCallback callbacks(int token){return new BluetoothGattCallback(){
  @Override public void onConnectionStateChange(BluetoothGatt gatt,int status,int state){runOnMain(()->{if(token!=generation)return;if(status!=BluetoothGatt.GATT_SUCCESS||state!=BluetoothProfile.STATE_CONNECTED){fail("Bluetooth disconnected. No unverified success was recorded.");return;}if(!gatt.requestMtu(185))gatt.discoverServices();});}
  @Override public void onMtuChanged(BluetoothGatt gatt,int value,int status){runOnMain(()->{if(token==generation){if(status==BluetoothGatt.GATT_SUCCESS)mtu=Math.max(23,Math.min(value,185));gatt.discoverServices();}});}
  @Override public void onServicesDiscovered(BluetoothGatt gatt,int status){runOnMain(()->{if(token!=generation)return;BluetoothGattService found=gatt.getService(service);if(status!=BluetoothGatt.GATT_SUCCESS||found==null){fail("Scanned receiver service not found.");return;}write=found.getCharacteristic(WRITE);notify=found.getCharacteristic(NOTIFY);BluetoothGattDescriptor descriptor=notify==null?null:notify.getDescriptor(CCCD);if(write==null||descriptor==null||!gatt.setCharacteristicNotification(notify,true)){fail("Receiver BLE protocol unavailable.");return;}descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);if(!gatt.writeDescriptor(descriptor))fail("BLE notification subscription failed.");});}
  @Override public void onDescriptorWrite(BluetoothGatt gatt,BluetoothGattDescriptor descriptor,int status){runOnMain(()->{if(token!=generation)return;if(status!=BluetoothGatt.GATT_SUCCESS){fail("BLE notification subscription rejected.");return;}connected=true;emit("connected","BLE transport connected; checking the scanned account key next.");});}
  @Override public void onCharacteristicChanged(BluetoothGatt gatt,BluetoothGattCharacteristic characteristic){byte[] value=characteristic.getValue();byte[] copy=value==null?null:value.clone();runOnMain(()->{if(token==generation&&NOTIFY.equals(characteristic.getUuid()))try{receive(copy);}catch(Exception error){fail("Malformed BLE frame. Session closed.");}});}
  @Override public void onCharacteristicWrite(BluetoothGatt gatt,BluetoothGattCharacteristic characteristic,int status){runOnMain(()->{if(token!=generation)return;if(status!=BluetoothGatt.GATT_SUCCESS){fail("BLE delivery interrupted. Retry the same transaction.");return;}sending=false;pump();});}
 };}
 private void receive(byte[] packet)throws Exception{String text=input.accept(packet,SystemClock.elapsedRealtime());if(text!=null)data(text);}
 private void send(String text){if(!connected||closed)throw new IllegalStateException("No authenticated transport connection is available.");if(++messageId>65535)throw new IllegalStateException("Reconnect the nearby session.");java.util.List<byte[]> frames=NearbyFrame.split(text,messageId,mtu-3);if(output.size()+frames.size()>1500)throw new IllegalStateException("Nearby output queue full.");output.addAll(frames);pump();}
 private void pump(){if(sending||output.isEmpty()||!connected||closed)return;byte[] packet=output.remove();boolean accepted;if(peripheral){notify.setValue(packet);accepted=server!=null&&remote!=null&&server.notifyCharacteristicChanged(remote,notify,false);}else{write.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);write.setValue(packet);accepted=client!=null&&client.writeCharacteristic(write);}if(!accepted){fail("Bluetooth output rejected. Pending state was retained.");return;}sending=true;int token=generation,serial=++writeSerial;main.postDelayed(()->{if(token==generation&&serial==writeSerial&&sending)fail("BLE write timed out. Reconnect and retry the same transaction.");},10000);}
 private void fail(String reason){stop();emit("error",reason==null?"Nearby transport unavailable.":reason);}
 void stop(){generation++;closed=true;connected=sending=false;pendingPermission=null;output.clear();input.clear();messageId=0;mtu=23;try{if(scanner!=null&&scan!=null)scanner.stopScan(scan);}catch(Exception ignored){}try{if(advertiser!=null&&advertising!=null)advertiser.stopAdvertising(advertising);}catch(Exception ignored){}try{if(client!=null){client.disconnect();client.close();}}catch(Exception ignored){}try{if(server!=null)server.close();}catch(Exception ignored){}client=null;server=null;remote=null;write=notify=null;scan=null;advertising=null;}
}
