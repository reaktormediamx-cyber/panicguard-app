import { jsPDF } from "jspdf";
import { PanicAlert, formatTriggerType } from "../types.js";

/**
 * Generates and downloads a comprehensive tactical forensic PDF report
 * including PanicGuard branding, store metadata, guard emergency description,
 * 3-frame burst photos, and unified chronological audit log.
 */
export async function downloadAlertPdfReport(alert: PanicAlert) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let currentY = 14;

  // 1. Header Banner with PanicGuard Branding
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, currentY, pageWidth - margin * 2, 24, "F");

  // Red accent border
  doc.setFillColor(220, 38, 38); // red-600
  doc.rect(margin, currentY, 4, 24, "F");

  // PanicGuard Logo & Brand text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("PANIC", margin + 8, currentY + 10);

  doc.setTextColor(239, 68, 68);
  doc.text("GUARD", margin + 28, currentY + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("SISTEMA TÁCTICO DE SEGURIDAD & VIDEOVERIFICACIÓN C4/C5", margin + 8, currentY + 16);
  doc.text("INFORME OFICIAL & BITÁCORA DE EMERGENCIA", margin + 8, currentY + 20);

  // Folio Badge on right
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(pageWidth - margin - 52, currentY + 4, 48, 16, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`ID: ${alert.id}`, pageWidth - margin - 48, currentY + 11);
  doc.setFontSize(7);
  doc.setTextColor(239, 68, 68);
  doc.text(`ESTADO: ${alert.status}`, pageWidth - margin - 48, currentY + 16);

  currentY += 28;

  // 2. Incident Summary Info Box
  const { label: triggerLabel } = formatTriggerType(alert.triggerType);
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(margin, currentY, pageWidth - margin * 2, 14, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("TIPO DE DETONACIÓN:", margin + 4, currentY + 6);
  doc.text("FECHA Y HORA:", margin + 65, currentY + 6);
  doc.text("CENTRAL ASIGNADA:", margin + 120, currentY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(triggerLabel, margin + 4, currentY + 11);
  doc.text(new Date(alert.timestamp).toLocaleString("es-MX"), margin + 65, currentY + 11);
  doc.text(alert.centralName || alert.store?.centralName || "Central C4/C5", margin + 120, currentY + 11);

  currentY += 18;

  // 3. Store Information Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("1. DATOS DEL ESTABLECIMIENTO REGISTRADO", margin, currentY);
  currentY += 3;

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  const storeBoxHeight = 24;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, currentY, pageWidth - margin * 2, storeBoxHeight, "F");
  doc.rect(margin, currentY, pageWidth - margin * 2, storeBoxHeight, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  // Column 1
  doc.text("Comercio / Tienda:", margin + 4, currentY + 6);
  doc.text("Titular Responsable:", margin + 4, currentY + 12);
  doc.text("Guardia en Turno:", margin + 4, currentY + 18);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(`${alert.store?.storeName || "N/A"} (${alert.store?.storeId || "S/ID"})`, margin + 38, currentY + 6);
  doc.text(alert.store?.ownerName || "N/A", margin + 38, currentY + 12);
  doc.text(alert.guardName || "Oficial en Turno (No especificado)", margin + 38, currentY + 18);

  // Column 2
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Contacto / Tel:", margin + 95, currentY + 6);
  doc.text("Dirección / Ciudad:", margin + 95, currentY + 12);
  doc.text("Coordenadas GPS:", margin + 95, currentY + 18);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text(alert.store?.phone || "N/A", margin + 125, currentY + 6);
  const fullLoc = `${alert.store?.address || ""}, ${alert.store?.city || ""}`.trim();
  doc.text(fullLoc.length > 40 ? fullLoc.substring(0, 38) + "..." : fullLoc, margin + 125, currentY + 12);
  const coords = alert.store?.coordinates;
  const coordsStr = coords && coords.latitude ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` : "No disponible";
  doc.text(coordsStr, margin + 125, currentY + 18);

  currentY += storeBoxHeight + 5;

  // 4. Guard Emergency Description (Highlighted Alert Box)
  if (alert.guardDescription || (alert.operatorNotes && alert.operatorNotes.some(n => n.includes("Guardia")))) {
    const desc = alert.guardDescription || alert.operatorNotes?.find(n => n.includes("Guardia")) || "";
    doc.setFillColor(254, 242, 242); // red-50
    doc.setDrawColor(248, 113, 113); // red-400
    doc.rect(margin, currentY, pageWidth - margin * 2, 14, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28); // red-700
    const guardHeader = alert.guardName
      ? `🚨 REPORTE DE SITUACIÓN DEL GUARDIA EN SITIO (${alert.guardName.toUpperCase()}):`
      : "🚨 REPORTE DE SITUACIÓN DEL GUARDIA EN SITIO:";
    doc.text(guardHeader, margin + 4, currentY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(127, 29, 29);
    const splitDesc = doc.splitTextToSize(desc, pageWidth - margin * 2 - 8);
    doc.text(splitDesc, margin + 4, currentY + 10);

    currentY += 18;
  }

  // 5. Photographic Burst Evidence (3 Frames)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("2. EVIDENCIA FOTOGRÁFICA (RÁFAGA DE 3 CUADROS DE SEGURIDAD)", margin, currentY);
  currentY += 3;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  const burstImages = alert.images && alert.images.length > 0 ? alert.images.slice(0, 3) : [];
  const imgWidth = 56;
  const imgHeight = 42;
  const imgGap = 7;

  if (burstImages.length > 0) {
    for (let i = 0; i < burstImages.length; i++) {
      const imgX = margin + i * (imgWidth + imgGap);
      const imgData = burstImages[i];

      try {
        if (imgData.startsWith("data:image/jpeg") || imgData.startsWith("data:image/png") || imgData.startsWith("data:image/webp")) {
          const format = imgData.includes("png") ? "PNG" : "JPEG";
          doc.addImage(imgData, format, imgX, currentY, imgWidth, imgHeight);
        } else {
          // Fallback box for SVG or non-raster
          doc.setFillColor(30, 41, 59);
          doc.rect(imgX, currentY, imgWidth, imgHeight, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text(`Fotograma #${i + 1}`, imgX + 15, currentY + 22);
        }
      } catch (e) {
        console.warn("Could not insert burst image into PDF:", e);
        doc.setFillColor(241, 245, 249);
        doc.rect(imgX, currentY, imgWidth, imgHeight, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Cuadro ${i + 1} Registrado`, imgX + 10, currentY + 22);
      }

      // Frame Label
      doc.setFillColor(15, 23, 42);
      doc.rect(imgX, currentY + imgHeight - 6, imgWidth, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(`FOTOGRAMA #${i + 1} (${i * 200}ms)`, imgX + 8, currentY + imgHeight - 2);
    }
    currentY += imgHeight + 6;
  } else {
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, currentY, pageWidth - margin * 2, 14, "F");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Sin fotogramas adjuntos en la alerta.", margin + 4, currentY + 8);
    currentY += 18;
  }

  // 6. Tactical Audit Logs & Incident Timeline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("3. BITÁCORA DETALLADA DE EVENTOS Y PROCESOS DE RESPUESTA", margin, currentY);
  currentY += 3;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  const logs = alert.logs || [];
  if (logs.length > 0) {
    logs.forEach((log, idx) => {
      // Check page boundary
      if (currentY > pageHeight - 20) {
        doc.addPage();
        currentY = 16;
      }

      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(margin, currentY, pageWidth - margin * 2, 7.5, "F");

      doc.setFont("courier", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const timeStr = new Date(log.timestamp).toLocaleTimeString("es-MX");
      doc.text(`[${timeStr}]`, margin + 2, currentY + 5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const actionText = log.operator ? `${log.action} - (${log.operator})` : log.action;
      const splitAction = doc.splitTextToSize(actionText, pageWidth - margin * 2 - 32);
      doc.text(splitAction[0] || actionText, margin + 24, currentY + 5);

      currentY += 8;
    });
  }

  // 7. Operator Notes / Bitácora Adicional
  if (alert.operatorNotes && alert.operatorNotes.length > 0) {
    if (currentY > pageHeight - 25) {
      doc.addPage();
      currentY = 16;
    }
    currentY += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("Anotaciones y Novedades del Operador / Guardia:", margin, currentY);
    currentY += 4;

    alert.operatorNotes.forEach((n) => {
      if (currentY > pageHeight - 15) {
        doc.addPage();
        currentY = 16;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`• ${n}`, margin + 3, currentY);
      currentY += 5;
    });
  }

  // 8. Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    doc.text(
      `PanicGuard Tactical C4/C5 Monitoreo - Alerta ${alert.id} | Generado: ${new Date().toLocaleString("es-MX")}`,
      margin,
      pageHeight - 6
    );
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - margin - 22, pageHeight - 6);
  }

  // Trigger browser download
  const filename = `Bitacora_PanicGuard_${alert.id}_${(alert.store?.storeName || "Comercio").replace(/\s+/g, "_")}.pdf`;
  doc.save(filename);
}
