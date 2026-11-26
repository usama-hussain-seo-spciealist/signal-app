import Foundation
import CoreBluetooth

/// Foreground transport foundation, not a signed/installable wallet app.
/// Pass opaque SPN/1 authenticated-session messages to the shared protocol host.
public final class CoreBluetoothTransport: NSObject, CBCentralManagerDelegate, CBPeripheralManagerDelegate, CBPeripheralDelegate {
 public enum Event { case state(String), connected(receiver: Bool), message(String), failure(String) }
 public var onEvent: ((Event) -> Void)?
 private var central: CBCentralManager!, peripheral: CBPeripheralManager!
 private var targetService: CBUUID?, remote: CBPeripheral?, subscriber: CBCentral?
 private var writeCharacteristic: CBCharacteristic?, notifyCharacteristic: CBMutableCharacteristic?
 private var output: [Data] = [], messageID: UInt16 = 0, receiving = false, generation = 0
 private var assembler = NearbyAssembler()
 private let writeUUID = CBUUID(string: "6f8d0001-8d9a-4d21-a8b7-9d7f70000001"), notifyUUID = CBUUID(string: "6f8d0002-8d9a-4d21-a8b7-9d7f70000001")
 public override init() { super.init(); central = CBCentralManager(delegate: self, queue: .main); peripheral = CBPeripheralManager(delegate: self, queue: .main) }
 public func startReceiving(accountID: String) throws { try begin(accountID: accountID, receiver: true) }
 public func connect(accountID: String) throws { try begin(accountID: accountID, receiver: false) }
 private func begin(accountID: String, receiver: Bool) throws {
  precondition(Thread.isMainThread); stop(); targetService = CBUUID(nsuuid: try NearbyFrame.serviceUUID(accountID: accountID)); receiving = receiver
  guard (receiver ? peripheral.state : central.state) == .poweredOn else { onEvent?(.failure("Bluetooth permission/power is not ready. Keep the native app open and retry.")); throw NearbyError.unavailable }
  let token = generation
  if receiver {
   let write = CBMutableCharacteristic(type: writeUUID, properties: [.write], value: nil, permissions: [.writeable])
   let notify = CBMutableCharacteristic(type: notifyUUID, properties: [.notify], value: nil, permissions: [.readable])
   notifyCharacteristic = notify; let service = CBMutableService(type: targetService!, primary: true); service.characteristics = [write, notify]; peripheral.add(service)
  } else { central.scanForPeripherals(withServices: [targetService!], options: [CBCentralManagerScanOptionAllowDuplicatesKey: false]) }
  DispatchQueue.main.asyncAfter(deadline: .now()+120) { [weak self] in guard let self = self, self.generation == token else { return }; self.fail("Foreground session expired. Retry the same saved transaction.") }
 }
 public func send(_ text: String) throws {
  precondition(Thread.isMainThread); guard messageID < UInt16.max else { throw NearbyError.limit }; messageID += 1
  let limit: Int
  if receiving { guard let peer = subscriber else { throw NearbyError.unavailable }; limit = min(182, peer.maximumUpdateValueLength) }
  else { guard let peer = remote, writeCharacteristic != nil else { throw NearbyError.unavailable }; limit = min(182, peer.maximumWriteValueLength(for: .withResponse)) }
  let frames = try NearbyFrame.split(text, id: messageID, valueLength: limit); guard output.count + frames.count <= 1500 else { throw NearbyError.limit }; let wasEmpty = output.isEmpty; output += frames; if wasEmpty { pump() }
 }
 private func pump() {
  guard let first = output.first else { return }
  if receiving { guard let notify = notifyCharacteristic, let peer = subscriber else { fail("No BLE subscriber."); return }; while let frame = output.first { if !peripheral.updateValue(frame, for: notify, onSubscribedCentrals: [peer]) { return }; output.removeFirst() } }
  else { guard let peer = remote, let write = writeCharacteristic else { fail("No BLE peer."); return }; peer.writeValue(first, for: write, type: .withResponse) }
 }
 private func receive(_ data: Data) { do { if let message = try assembler.accept(data) { onEvent?(.message(message)) } } catch { fail("Invalid or interrupted BLE frame; no transaction success implied.") } }
 private func fail(_ text: String) { stop(); onEvent?(.failure(text)) }
 public func stop() {
  precondition(Thread.isMainThread); generation += 1; central?.stopScan(); if let peer = remote { central?.cancelPeripheralConnection(peer) }; peripheral?.stopAdvertising(); peripheral?.removeAllServices(); remote = nil; subscriber = nil; writeCharacteristic = nil; notifyCharacteristic = nil; targetService = nil; output = []; messageID = 0; assembler.reset()
 }
 public func centralManagerDidUpdateState(_ central: CBCentralManager) { onEvent?(.state("Central Bluetooth state: \(central.state.rawValue)")); if central.state != .poweredOn && remote != nil { fail("Bluetooth central unavailable.") } }
 public func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) { onEvent?(.state("Peripheral Bluetooth state: \(peripheral.state.rawValue)")); if peripheral.state != .poweredOn && subscriber != nil { fail("Bluetooth peripheral unavailable.") } }
 public func peripheralManager(_ peripheral: CBPeripheralManager, didAdd service: CBService, error: Error?) { guard receiving, service.uuid == targetService else { return }; if error != nil { fail("BLE service registration failed."); return }; peripheral.startAdvertising([CBAdvertisementDataServiceUUIDsKey: [service.uuid]]) }
 public func peripheralManagerDidStartAdvertising(_ peripheral: CBPeripheralManager, error: Error?) { if error != nil { fail("BLE advertising failed.") } else { onEvent?(.state("Foreground receive advertisement started; not payment delivery.")) } }
 public func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didSubscribeTo characteristic: CBCharacteristic) { guard characteristic.uuid == notifyUUID, subscriber == nil else { return }; subscriber = central; peripheral.stopAdvertising(); onEvent?(.connected(receiver: true)) }
 public func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didUnsubscribeFrom characteristic: CBCharacteristic) { if subscriber?.identifier == central.identifier { fail("Receiver BLE session disconnected. Pending transactions require retry/receipt.") } }
 public func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) { for request in requests { guard request.characteristic.uuid == writeUUID, request.central.identifier == subscriber?.identifier, request.offset == 0, let data = request.value else { peripheral.respond(to: request, withResult: .requestNotSupported); continue }; receive(data); peripheral.respond(to: request, withResult: .success) } }
 public func peripheralManagerIsReady(toUpdateSubscribers peripheral: CBPeripheralManager) { pump() }
 public func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) { guard !receiving, remote == nil else { return }; central.stopScan(); remote = peripheral; peripheral.delegate = self; central.connect(peripheral) }
 public func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) { guard peripheral.identifier == remote?.identifier, let service = targetService else { return }; peripheral.discoverServices([service]) }
 public func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) { if peripheral.identifier == remote?.identifier { fail("BLE connection failed.") } }
 public func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) { if peripheral.identifier == remote?.identifier { fail("BLE connection interrupted; retry the same transaction.") } }
 public func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) { guard error == nil, let service = peripheral.services?.first(where: {$0.uuid == targetService}) else { fail("Expected receiver service missing."); return }; peripheral.discoverCharacteristics([writeUUID, notifyUUID], for: service) }
 public func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) { guard error == nil, let write = service.characteristics?.first(where: {$0.uuid == writeUUID}), let notify = service.characteristics?.first(where: {$0.uuid == notifyUUID}) else { fail("Expected GATT characteristics missing."); return }; writeCharacteristic = write; peripheral.setNotifyValue(true, for: notify) }
 public func peripheral(_ peripheral: CBPeripheral, didUpdateNotificationStateFor characteristic: CBCharacteristic, error: Error?) { guard characteristic.uuid == notifyUUID, error == nil, characteristic.isNotifying else { fail("BLE notification subscription failed."); return }; onEvent?(.connected(receiver: false)) }
 public func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) { guard characteristic.uuid == notifyUUID, error == nil, let data = characteristic.value else { fail("BLE receive interrupted."); return }; receive(data) }
 public func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) { guard error == nil, !output.isEmpty else { fail("BLE write interrupted."); return }; output.removeFirst(); pump() }
}
