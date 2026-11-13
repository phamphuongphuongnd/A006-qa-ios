package com.phiotron.sundaysort.receiptocr

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Raw on-device text recognition. Returns lines with normalised boxes (0..1, top-left origin) so S3's parser
 * (amount / merchant / date) is the same TypeScript on both platforms.
 */
class ReceiptOcrModule : Module() {
  private val recognizer by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }

  override fun definition() = ModuleDefinition {
    Name("SundayReceiptOcr")

    Function("isAvailable") { true }

    AsyncFunction("recognize") { uri: String, promise: Promise ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val image = try {
        InputImage.fromFilePath(context, Uri.parse(uri))
      } catch (e: Exception) {
        promise.reject("E_IMAGE", e.message, e)
        return@AsyncFunction
      }
      val w = image.width.toDouble().coerceAtLeast(1.0)
      val h = image.height.toDouble().coerceAtLeast(1.0)
      recognizer.process(image)
        .addOnSuccessListener { text ->
          val lines = text.textBlocks.flatMap { block ->
            block.lines.map { line ->
              val b = line.boundingBox
              mapOf(
                "text" to line.text,
                "confidence" to line.confidence.toDouble(),
                "box" to if (b == null) null else mapOf(
                  "x" to b.left / w,
                  "y" to b.top / h,
                  "w" to b.width() / w,
                  "h" to b.height() / h,
                ),
              )
            }
          }
          promise.resolve(mapOf("text" to text.text, "lines" to lines, "width" to image.width, "height" to image.height))
        }
        .addOnFailureListener { promise.reject("E_OCR", it.message, it) }
    }
  }
}
