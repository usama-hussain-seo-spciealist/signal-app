import UIKit
import AVFoundation

final class CameraScanner: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
 var onResult: ((String?, String?) -> Void)?
 private let capture = AVCaptureSession(), cameraQueue = DispatchQueue(label: "SignalPay.camera")
 private var preview: AVCaptureVideoPreviewLayer?, finished = false
 override func viewDidLoad() {
  super.viewDidLoad(); view.backgroundColor = .black
  let cancel = UIButton(type: .system); cancel.setTitle("Cancel scan", for: .normal); cancel.tintColor = .white; cancel.translatesAutoresizingMaskIntoConstraints = false
  cancel.addTarget(self, action: #selector(cancelScan), for: .touchUpInside); view.addSubview(cancel)
  NSLayoutConstraint.activate([cancel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),cancel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20)])
  let layer = AVCaptureVideoPreviewLayer(session: capture); layer.videoGravity = .resizeAspectFill; view.layer.insertSublayer(layer, at: 0); preview = layer
  switch AVCaptureDevice.authorizationStatus(for: .video) {
  case .authorized: configure()
  case .notDetermined: AVCaptureDevice.requestAccess(for: .video) { [weak self] allowed in DispatchQueue.main.async { if allowed { self?.configure() } else { self?.finish(nil,"Camera denied. Enable SignalPay camera access in iPhone Settings or upload a QR image.") } } }
  default: finish(nil,"Camera unavailable/denied. Check iPhone Settings or upload a QR image.")
  }
 }
 override func viewDidLayoutSubviews() { super.viewDidLayoutSubviews(); preview?.frame = view.bounds }
 private func configure() {
  guard !finished else { return }
  cameraQueue.async { [weak self] in
   guard let self, !self.finished else { return }
   do {
    guard let device = AVCaptureDevice.default(for: .video) else { throw CameraError.missing }
    let input = try AVCaptureDeviceInput(device: device), output = AVCaptureMetadataOutput()
    self.capture.beginConfiguration(); self.capture.sessionPreset = .high
    guard self.capture.canAddInput(input), self.capture.canAddOutput(output) else { self.capture.commitConfiguration(); throw CameraError.missing }
    self.capture.addInput(input); self.capture.addOutput(output); output.setMetadataObjectsDelegate(self, queue: .main); output.metadataObjectTypes = [.qr]; self.capture.commitConfiguration()
    self.capture.startRunning()
   } catch { DispatchQueue.main.async { self.finish(nil,"Camera could not start. Upload a QR image or retry on a physical iPhone.") } }
  }
 }
 func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput objects: [AVMetadataObject], from connection: AVCaptureConnection) {
  guard let text = (objects.first as? AVMetadataMachineReadableCodeObject)?.stringValue else { return }
  guard text.utf8.count <= 8192 else { finish(nil,"QR is too large. Use a current SignalPay account QR."); return }; finish(text,nil)
 }
 @objc private func cancelScan() { finish(nil,nil) }
 func stop() { finished = true; cameraQueue.async { [capture] in if capture.isRunning { capture.stopRunning() } }; onResult = nil }
 private func finish(_ value: String?, _ error: String?) { guard !finished else { return }; let callback = onResult; stop(); callback?(value,error) }
 private enum CameraError: Error { case missing }
}
