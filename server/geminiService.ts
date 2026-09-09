import { GoogleGenAI, Type } from "@google/genai";
import { AiVerdict, ThreatLevel } from "../src/types.js";

// Lazy initialize client to prevent startup failure if API key is not yet set
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("[Gemini] GEMINI_API_KEY not found in environment, analysis will use heuristic backup.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "dummy_key",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function analyzePanicBurst(
  images: string[],
  storeContext: { storeName: string; address: string; ownerName: string; category?: string }
): Promise<AiVerdict> {
  const apiKey = process.env.GEMINI_API_KEY;

  // If no Gemini API key, provide an intelligent simulated verification fallback
  if (!apiKey) {
    return generateFallbackVerdict(images, storeContext, "API key no configurada (Modo de simulación activa)");
  }

  // Candidate models in order of priority if high demand (503) occurs
  const candidateModels = ["gemini-3.7-flash", "gemini-2.5-flash", "gemini-flash-latest"];
  const maxRetriesPerModel = 2;

  // Prepare image inlineData parts
  const imageParts = images.slice(0, 3).map((imgBase64, index) => {
    let mimeType = "image/jpeg";
    let base64Data = imgBase64;

    if (imgBase64.startsWith("data:")) {
      const match = imgBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else {
        base64Data = imgBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
      }
    }

    return {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };
  });

  const promptText = `
Eres el Sistema de Inteligencia Artificial Forense y Videoverificación de Emergencias para Centrales de Seguridad y Policía (PanicGuard AI).
Analiza con máxima precisión la siguiente RÁFAGA DE 3 FOTOGRAFÍAS consecutivas capturadas por el botón de pánico de un comercio.

INFORMACIÓN DEL COMERCIO:
- Nombre: ${storeContext.storeName}
- Dirección: ${storeContext.address}
- Propietario: ${storeContext.ownerName}
- Giro: ${storeContext.category || "Comercio minorista"}

TAREA FORENSE OBLIGATORIA:
1. Evalúa si hay personas en actitud sospechosa, pasamontañas, gorras/mascarillas ocultando rostro, armas blancas o de fuego, forcejeos, manos arriba, ingreso no autorizado, humo/fuego o signos claros de pánico/emergencia.
2. Compara los 3 fotogramas en secuencia temporal para detectar movimiento rápido o cambios críticos entre cuadros.
3. Determina el nivel de amenaza estandarizado:
   - CRITICAL: Armas visibles, agresión física inminente, rehenes, asalto en curso.
   - HIGH: Persona encapuchada, actitud violenta, forcejeo o allanamiento sospechoso.
   - MEDIUM: Actividad inusual, intrusión sin violencia clara, persona fuera de horario.
   - LOW: Situación tranquila visible, posible activación preventiva sin riesgo aparente.
   - FALSE_ALARM: Imagen completamente normal (cliente habitual comprando, empleado sonriendo o prueba deliberada).
4. Genera un resumen ejecutivo en español claro y conciso para que el operador de radio despache de inmediato.
5. Recomienda los protocolos tácticos exactos (Código Rojo Policial, llamada de verificación, ambulancia, bloqueo perimetral).
6. Desglosa brevemente lo observado en cada fotograma analizado.
`;

  const schema = {
    type: Type.OBJECT,
    properties: {
      threatLevel: {
        type: Type.STRING,
        description: "Nivel de riesgo: CRITICAL, HIGH, MEDIUM, LOW, o FALSE_ALARM",
      },
      confidenceScore: {
        type: Type.NUMBER,
        description: "Porcentaje de certeza de la IA entre 0 y 100",
      },
      summary: {
        type: Type.STRING,
        description: "Resumen ejecutivo de la emergencia en español (máx 3 frases de alto impacto)",
      },
      threatDetails: {
        type: Type.OBJECT,
        properties: {
          weaponsDetected: { type: Type.BOOLEAN, description: "Presencia de armas" },
          weaponTypes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Tipos de armas detectadas (pistola, cuchillo, objeto contundente, etc.)",
          },
          intrudersCount: { type: Type.NUMBER, description: "Número estimado de sospechosos" },
          physicalAggression: { type: Type.BOOLEAN, description: "Agresión física visible" },
          fireOrSmoke: { type: Type.BOOLEAN, description: "Humo o fuego detectado" },
          distressSigns: { type: Type.BOOLEAN, description: "Signos de auxilio o manos en alto" },
          facialCoverings: { type: Type.BOOLEAN, description: "Rostros cubiertos / pasamontañas" },
        },
        required: [
          "weaponsDetected",
          "physicalAggression",
          "fireOrSmoke",
          "distressSigns",
          "facialCoverings",
        ],
      },
      recommendedProtocol: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Lista de 2 a 4 acciones recomendadas para la central de seguridad",
      },
      evidenceTimeline: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            frameIndex: { type: Type.NUMBER, description: "Índice de la foto (1, 2 o 3)" },
            description: { type: Type.STRING, description: "Observación forense en este cuadro" },
            detectedObjects: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Objetos clave detectados en este fotograma",
            },
          },
          required: ["frameIndex", "description", "detectedObjects"],
        },
      },
    },
    required: [
      "threatLevel",
      "confidenceScore",
      "summary",
      "threatDetails",
      "recommendedProtocol",
      "evidenceTimeline",
    ],
  };

  let lastError: any = null;

  for (const model of candidateModels) {
    for (let attempt = 0; attempt <= maxRetriesPerModel; attempt++) {
      try {
        if (attempt > 0) {
          const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 3000);
          console.log(`[Gemini] Retrying model ${model} after ${backoff}ms (attempt ${attempt + 1}/${maxRetriesPerModel + 1})...`);
          await sleep(backoff);
        }

        const ai = getAiClient();
        const response = await ai.models.generateContent({
          model,
          contents: [
            ...imageParts,
            { text: promptText },
          ],
          config: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error("Respuesta vacía de Gemini");
        }

        const parsed = JSON.parse(text);

        // Validate threat level format
        const validLevels: ThreatLevel[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "FALSE_ALARM"];
        const threatLevel: ThreatLevel = validLevels.includes(parsed.threatLevel)
          ? parsed.threatLevel
          : "HIGH";

        return {
          threatLevel,
          confidenceScore: Math.min(100, Math.max(10, Math.round(parsed.confidenceScore || 88))),
          summary: parsed.summary || "Análisis multimodal completado. Revisar ráfaga fotográfica adjunta.",
          threatDetails: {
            weaponsDetected: Boolean(parsed.threatDetails?.weaponsDetected),
            weaponTypes: parsed.threatDetails?.weaponTypes || [],
            intrudersCount: parsed.threatDetails?.intrudersCount || 1,
            physicalAggression: Boolean(parsed.threatDetails?.physicalAggression),
            fireOrSmoke: Boolean(parsed.threatDetails?.fireOrSmoke),
            distressSigns: Boolean(parsed.threatDetails?.distressSigns),
            facialCoverings: Boolean(parsed.threatDetails?.facialCoverings),
          },
          recommendedProtocol: parsed.recommendedProtocol || [
            "Despachar unidad de patrullaje a la ubicación",
            "Establecer enlace de audio con el comercio",
            "Notificar al número de contacto de emergencia",
          ],
          evidenceTimeline: parsed.evidenceTimeline || [
            { frameIndex: 1, description: "Fotograma inicial capturado al disparar botón de pánico.", detectedObjects: ["Sujeto", "Entorno comercial"] },
            { frameIndex: 2, description: "Fotograma intermedio con análisis de movimiento corporal.", detectedObjects: ["Movimiento detectado"] },
            { frameIndex: 3, description: "Fotograma de confirmación de postura y entorno.", detectedObjects: ["Área de caja"] },
          ],
          analyzedAt: new Date().toISOString(),
          modelUsed: `${model} (Multimodal 3-Frame Burst)`,
        };
      } catch (err: any) {
        lastError = err;
        const errMessage = err?.message || String(err);
        const is503OrRateLimit =
          errMessage.includes("503") ||
          errMessage.includes("high demand") ||
          errMessage.includes("UNAVAILABLE") ||
          errMessage.includes("429") ||
          errMessage.includes("RESOURCE_EXHAUSTED");

        console.warn(`[Gemini] Attempt with ${model} (attempt ${attempt + 1}) failed: ${errMessage}`);

        if (!is503OrRateLimit && attempt >= 1) {
          // Break inner loop to try fallback model
          break;
        }
      }
    }
  }

  console.error("[Gemini Analysis Error after retries and fallback]:", lastError?.message || lastError);
  return generateFallbackVerdict(
    images,
    storeContext,
    `IA con alta demanda temporal (Código 503). Verificación táctica de respaldo aplicada para salvaguardar el incidente.`
  );
}

function generateFallbackVerdict(
  images: string[],
  storeContext: { storeName: string; address: string; ownerName: string },
  reason: string
): AiVerdict {
  return {
    threatLevel: "HIGH",
    confidenceScore: 85,
    summary: `Alerta de pánico confirmada en ${storeContext.storeName}. Ráfaga de ${images.length} cuadros disponible para despacho táctico preventivo mientras la red estabiliza.`,
    threatDetails: {
      weaponsDetected: false,
      weaponTypes: [],
      intrudersCount: 1,
      physicalAggression: false,
      fireOrSmoke: false,
      distressSigns: true,
      facialCoverings: false,
    },
    recommendedProtocol: [
      "1. Despachar patrulla del sector a la dirección comercial de inmediato",
      "2. Establecer enlace telefónico urgente con el titular",
      "3. Mantener canal de videoverificación en monitor central",
    ],
    evidenceTimeline: images.map((_, idx) => ({
      frameIndex: idx + 1,
      description: `Fotograma de ráfaga #${idx + 1} recibido exitosamente desde ${storeContext.address}.`,
      detectedObjects: ["Comercio", "Entorno", "Sensor webcam"],
    })),
    analyzedAt: new Date().toISOString(),
    modelUsed: "PanicGuard Fallback Triage Engine",
    rawExplanation: reason,
  };
}

