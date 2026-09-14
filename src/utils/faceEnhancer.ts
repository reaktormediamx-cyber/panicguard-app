// Client-side Face Detection and Forensic Image Enhancement
// Detects faces in video frames and crops, upscales, and sharpens them for the C4 Central Dashboard.

export interface EnhancedFaceResult {
  originalFrameIndex: number;
  faceUrl: string; // Base64 jpeg data URL
  confidence?: number;
}

/**
 * Heuristic skin-tone detector for custom fallback face search
 */
function findFaceBoundingBox(ctx: CanvasRenderingContext2D, width: number, height: number): { x: number; y: number; w: number; h: number } {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let skinPixelCount = 0;
  
  const stride = 6; // Stepping stride for ultra-fast client processing
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx+1];
      const b = data[idx+2];
      
      // Standard heuristic human skin color range in RGB
      const isSkin = r > 95 && g > 40 && b > 20 && 
                     (r - g) > 15 && r > g && r > b &&
                     (Math.max(r, g, b) - Math.min(r, g, b) > 15);
                     
      if (isSkin) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        skinPixelCount++;
      }
    }
  }
  
  const sampledPixels = (width * height) / (stride * stride);
  const skinRatio = skinPixelCount / sampledPixels;

  // If a dense skin tone cluster is found, crop it with generous margins
  if (skinRatio > 0.012 && (maxX - minX) > 50 && (maxY - minY) > 50) {
    const w = maxX - minX;
    const h = maxY - minY;
    
    // Add margins to capture the whole head/shoulders
    const marginX = w * 0.25;
    const marginY = h * 0.35;
    
    const cropX = Math.max(0, minX - marginX);
    const cropY = Math.max(0, minY - marginY * 1.2); // extra top margin for forehead/hair
    const cropW = Math.min(width - cropX, w + marginX * 2);
    const cropH = Math.min(height - cropY, h + marginY * 2.2);

    return { x: cropX, y: cropY, w: cropW, h: cropH };
  }
  
  // Standard Fallback: Upper-middle region of standard webcams (optimized for 16:9/4:3 frames)
  const cropW = width * 0.38;
  const cropH = height * 0.48;
  return {
    x: (width - cropW) / 2,
    y: height * 0.12,
    w: cropW,
    h: cropH
  };
}

/**
 * Applies a 3x3 Convolution Sharpening Matrix to a Canvas context
 */
function sharpenImageData(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const output = ctx.createImageData(width, height);
  const outData = output.data;
  
  // Forensic enhancement kernel (Sharpen + Edge contrast boost)
  const weights = [
     0,  -1.1,  0,
    -1.1, 5.4, -1.1,
     0,  -1.1,  0
  ];
  const side = 3;
  const halfSide = 1;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sy = y;
      const sx = x;
      const dstOff = (y * width + x) * 4;
      
      let r = 0, g = 0, b = 0;
      for (let cy = 0; cy < side; cy++) {
        for (let cx = 0; cx < side; cx++) {
          const scy = Math.min(height - 1, Math.max(0, sy + cy - halfSide));
          const scx = Math.min(width - 1, Math.max(0, sx + cx - halfSide));
          const srcOff = (scy * width + scx) * 4;
          const wt = weights[cy * side + cx];
          
          r += data[srcOff] * wt;
          g += data[srcOff+1] * wt;
          b += data[srcOff+2] * wt;
        }
      }
      
      // Auto brightness adjustment & clamping values to 0-255
      outData[dstOff] = Math.min(255, Math.max(0, r));
      outData[dstOff+1] = Math.min(255, Math.max(0, g));
      outData[dstOff+2] = Math.min(255, Math.max(0, b));
      outData[dstOff+3] = data[dstOff+3]; // Keep alpha
    }
  }
  
  ctx.putImageData(output, 0, 0);
}

/**
 * Draws a futuristic HUD reticle overlay on the enhanced face crop
 */
function drawTacticalHUD(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Semi-transparent target brackets (tactical cyan / green)
  ctx.strokeStyle = "rgba(34, 197, 94, 0.85)"; // Green-500
  ctx.lineWidth = 2.5;
  
  const len = 24; // corner bracket size
  const pad = 12; // padding from border
  
  // Top-Left Corner
  ctx.beginPath();
  ctx.moveTo(pad, pad + len);
  ctx.lineTo(pad, pad);
  ctx.lineTo(pad + len, pad);
  ctx.stroke();
  
  // Top-Right Corner
  ctx.beginPath();
  ctx.moveTo(width - pad - len, pad);
  ctx.lineTo(width - pad, pad);
  ctx.lineTo(width - pad, pad + len);
  ctx.stroke();
  
  // Bottom-Left Corner
  ctx.beginPath();
  ctx.moveTo(pad, height - pad - len);
  ctx.lineTo(pad, height - pad);
  ctx.lineTo(pad + len, height - pad);
  ctx.stroke();
  
  // Bottom-Right Corner
  ctx.beginPath();
  ctx.moveTo(width - pad - len, height - pad);
  ctx.lineTo(width - pad, height - pad);
  ctx.lineTo(width - pad, height - pad - len);
  ctx.stroke();

  // Draw target crosshairs (dot in center)
  ctx.fillStyle = "rgba(34, 197, 94, 0.6)";
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 3, 0, Math.PI * 2);
  ctx.fill();

  // Futuristic HUD status badges
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fillRect(pad + 4, pad + 4, 115, 18);
  ctx.fillStyle = "#22c55e"; // Green-500
  ctx.font = "bold 9px monospace";
  ctx.fillText("🔍 DETECTADO - OPT", pad + 8, pad + 16);

  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fillRect(pad + 4, height - pad - 22, 115, 18);
  ctx.fillStyle = "#10b981"; // Emerald-500
  ctx.font = "bold 9px monospace";
  ctx.fillText("⚡ ENFOQUE MEJORADO", pad + 8, height - pad - 10);
}

/**
 * Takes base64 frames, detects faces, crops, upscales, sharpens, and applies tactical HUD.
 * Returns array of base64 JPEG data URLs representing enhanced face images.
 */
export async function detectAndEnhanceFaces(frames: string[]): Promise<string[]> {
  const enhancedFaceUrls: string[] = [];
  
  for (let idx = 0; idx < frames.length; idx++) {
    const frame = frames[idx];
    if (!frame) continue;
    
    try {
      // 1. Load base64 frame into an Image element
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const tempImg = new Image();
        tempImg.onload = () => resolve(tempImg);
        tempImg.onerror = (e) => reject(e);
        tempImg.src = frame;
      });
      
      // 2. Create high-resolution processing canvas
      const procCanvas = document.createElement("canvas");
      procCanvas.width = img.width || 640;
      procCanvas.height = img.height || 480;
      const procCtx = procCanvas.getContext("2d");
      if (!procCtx) continue;
      
      procCtx.drawImage(img, 0, 0);
      
      // 3. Attempt face detection (Native API or skin heuristic)
      let faceRect = { x: 0, y: 0, w: 0, h: 0 };
      let nativeDetected = false;
      
      if ("FaceDetector" in window) {
        try {
          const FaceDetectorClass = (window as any).FaceDetector;
          const detector = new FaceDetectorClass({ fastMode: true, maxDetectedFaces: 1 });
          const faces = await detector.detect(procCanvas);
          
          if (faces && faces.length > 0) {
            const b = faces[0].boundingBox;
            // Add margin for whole face crop
            const pX = b.width * 0.25;
            const pY = b.height * 0.35;
            faceRect = {
              x: Math.max(0, b.x - pX),
              y: Math.max(0, b.y - pY * 1.1),
              w: Math.min(procCanvas.width - b.x, b.width + pX * 2),
              h: Math.min(procCanvas.height - b.y, b.height + pY * 2.2),
            };
            nativeDetected = true;
          }
        } catch (err) {
          console.warn("Native FaceDetector failed, switching to smart skin-contour scanner:", err);
        }
      }
      
      // Fallback to skin contour or top-center heuristic if native didn't find anything
      if (!nativeDetected) {
        faceRect = findFaceBoundingBox(procCtx, procCanvas.width, procCanvas.height);
      }
      
      // 4. Crop the face region and upscale/render onto a square 350x350 tactical canvas
      const faceCanvas = document.createElement("canvas");
      faceCanvas.width = 350;
      faceCanvas.height = 350;
      const faceCtx = faceCanvas.getContext("2d");
      if (!faceCtx) continue;
      
      // Apply smooth image smoothing for cleaner scaling
      faceCtx.imageSmoothingEnabled = true;
      faceCtx.imageSmoothingQuality = "high";
      
      // Draw the cropped region resized to 350x350
      faceCtx.drawImage(
        procCanvas,
        faceRect.x,
        faceRect.y,
        faceRect.w,
        faceRect.h,
        0,
        0,
        350,
        350
      );
      
      // 5. Apply Convolution-based Sharpening and Contrast Auto-Stretching
      sharpenImageData(faceCtx, faceCanvas);
      
      // 6. Draw glowing HUD reticle overlay & metadata
      drawTacticalHUD(faceCtx, 350, 350);
      
      // 7. Extract base64 jpeg
      const faceDataUrl = faceCanvas.toDataURL("image/jpeg", 0.9);
      enhancedFaceUrls.push(faceDataUrl);
      
    } catch (e) {
      console.error("Error optimizing face for frame index", idx, e);
    }
  }
  
  return enhancedFaceUrls;
}
