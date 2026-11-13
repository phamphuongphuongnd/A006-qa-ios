import ExpoModulesCore
import Vision

/** Vision text recognition; same result shape as Android (normalised boxes, top-left origin). */
public class ReceiptOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SundayReceiptOcr")

    Function("isAvailable") { () -> Bool in true }

    AsyncFunction("recognize") { (uri: URL, promise: Promise) in
      guard let image = UIImage(contentsOfFile: uri.path), let cg = image.cgImage else {
        promise.reject("E_IMAGE", "Could not read image")
        return
      }
      let request = VNRecognizeTextRequest { req, error in
        if let error = error {
          promise.reject("E_OCR", error.localizedDescription)
          return
        }
        let observations = (req.results as? [VNRecognizedTextObservation]) ?? []
        // Vision's top candidate per observation; boxes are bottom-left origin → flip to top-left.
        let lines: [[String: Any]] = observations.compactMap { o in
          guard let c = o.topCandidates(1).first else { return nil }
          let b = o.boundingBox
          return [
            "text": c.string,
            "confidence": Double(c.confidence),
            "box": ["x": b.minX, "y": 1 - b.maxY, "w": b.width, "h": b.height],
          ]
        }
        promise.resolve([
          "text": lines.compactMap { $0["text"] as? String }.joined(separator: "\n"),
          "lines": lines,
          "width": cg.width,
          "height": cg.height,
        ])
      }
      request.recognitionLevel = .accurate
      request.usesLanguageCorrection = true
      request.recognitionLanguages = ["en-GB", "en-US"]
      let orientation = Self.cgOrientation(image.imageOrientation)
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          try VNImageRequestHandler(cgImage: cg, orientation: orientation).perform([request])
        } catch {
          promise.reject("E_OCR", error.localizedDescription)
        }
      }
    }
  }

  private static func cgOrientation(_ o: UIImage.Orientation) -> CGImagePropertyOrientation {
    switch o {
    case .up: return .up
    case .down: return .down
    case .left: return .left
    case .right: return .right
    case .upMirrored: return .upMirrored
    case .downMirrored: return .downMirrored
    case .leftMirrored: return .leftMirrored
    case .rightMirrored: return .rightMirrored
    @unknown default: return .up
    }
  }
}
