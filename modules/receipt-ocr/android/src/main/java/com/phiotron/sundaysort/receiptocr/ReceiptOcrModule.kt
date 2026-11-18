package com.phiotron.sundaysort.receiptocr

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import java.io.File
import java.io.FileOutputStream
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

    // QA-100 A13-5: the picker re-encoding a 50 MP camera JPEG (quality 0.6) took 15–18 s on a Galaxy A13 before the
    // reading even started, and ML Kit then decoded the full-size photo again. The picker now copies the file as is
    // and this makes one small upright JPEG (long side ≤ maxSide) that is both read and kept as the receipt photo.
    // Subsampled decode: the full 50 MP bitmap (~200 MB) is never in memory.
    AsyncFunction("shrink") { uri: String, maxSide: Int, quality: Int ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val src = Uri.parse(uri)
      val resolver = context.contentResolver
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      resolver.openInputStream(src).use { BitmapFactory.decodeStream(it, null, bounds) }
      val longSide = maxOf(bounds.outWidth, bounds.outHeight)
      if (longSide <= 0) throw IllegalArgumentException("not an image")
      val orientation = try {
        resolver.openInputStream(src).use { ExifInterface(it!!).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL) }
      } catch (e: Exception) {
        ExifInterface.ORIENTATION_NORMAL
      }
      // QA-100 B-102: re-encoding an already small picture (a screenshot, a saved image) only adds JPEG noise — ML Kit
      // then lost a "TOTAL" line and read "Supernarket". Small and upright → keep the file as it is.
      val upright = orientation == ExifInterface.ORIENTATION_NORMAL || orientation == ExifInterface.ORIENTATION_UNDEFINED
      if (longSide <= maxSide && upright) return@AsyncFunction uri
      var sample = 1
      while (longSide / (sample * 2) >= maxSide) sample *= 2
      val decoded = resolver.openInputStream(src).use {
        BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample })
      } ?: throw IllegalArgumentException("not an image")
      val m = Matrix()
      when (orientation) {
        ExifInterface.ORIENTATION_ROTATE_90 -> m.postRotate(90f)
        ExifInterface.ORIENTATION_ROTATE_180 -> m.postRotate(180f)
        ExifInterface.ORIENTATION_ROTATE_270 -> m.postRotate(270f)
        ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> m.postScale(-1f, 1f)
        ExifInterface.ORIENTATION_FLIP_VERTICAL -> m.postScale(1f, -1f)
      }
      val scale = minOf(1f, maxSide.toFloat() / maxOf(decoded.width, decoded.height))
      if (scale < 1f) m.postScale(scale, scale)
      val out = if (m.isIdentity) decoded else Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, m, true)
      val dir = File(context.cacheDir, "ReceiptShrink").apply { mkdirs() }
      val file = File(dir, "receipt-${System.currentTimeMillis()}-${(Math.random() * 1e6).toInt()}.jpg")
      FileOutputStream(file).use { out.compress(Bitmap.CompressFormat.JPEG, quality.coerceIn(50, 100), it) }
      if (out !== decoded) out.recycle()
      decoded.recycle()
      // The picker's full-size copy in our own cache is no longer needed (a few MB each).
      if (src.scheme == "file") {
        val f = File(src.path ?: "")
        if (f.canonicalPath.startsWith(File(context.cacheDir, "ImagePicker").canonicalPath)) f.delete()
      }
      Uri.fromFile(file).toString()
    }

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
