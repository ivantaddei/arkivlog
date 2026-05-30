import { tool } from "ai";
import { z } from "zod";
import { arkivlog } from "./arkivlog";
import { INVENTORY, type Vehicle } from "./inventory";

type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Fire-and-forget log to ArkivLog. Wraps every tool execution.
 * The actor is the chat sessionId so we can later trace a full conversation.
 */
function recordToolInvocation(
  toolName: string,
  sessionId: string,
  severity: Severity,
  input: unknown,
  output: unknown,
  durationMs: number,
) {
  arkivlog.record({
    eventType: "TOOL_INVOKED",
    actor: sessionId,
    target: toolName,
    severity,
    metadata: {
      input,
      output,
      durationMs,
    },
  });
}

/**
 * Build the tool map for a specific chat session. The sessionId is captured
 * in each tool's closure so every log call carries it consistently.
 */
export function buildTools(sessionId: string) {
  return {
    searchInventory: tool({
      description:
        "Buscar vehículos disponibles en el inventario de la concesionaria. Filtra por marca, modelo o precio máximo. Devuelve hasta 5 resultados.",
      inputSchema: z.object({
        brand: z.string().optional().describe("Marca a buscar, ej. Toyota"),
        model: z.string().optional().describe("Modelo, ej. Corolla"),
        maxPriceUsd: z
          .number()
          .optional()
          .describe("Precio máximo en USD"),
        onlyAvailable: z
          .boolean()
          .optional()
          .default(true)
          .describe("Si true, solo devuelve los disponibles"),
      }),
      execute: async (input) => {
        const start = Date.now();
        const results = INVENTORY.filter((v) => {
          if (input.onlyAvailable !== false && !v.available) return false;
          if (input.brand && !v.brand.toLowerCase().includes(input.brand.toLowerCase()))
            return false;
          if (input.model && !v.model.toLowerCase().includes(input.model.toLowerCase()))
            return false;
          if (input.maxPriceUsd && v.priceUsd > input.maxPriceUsd) return false;
          return true;
        }).slice(0, 5);
        const output = {
          count: results.length,
          vehicles: results,
        };
        recordToolInvocation(
          "searchInventory",
          sessionId,
          "LOW",
          input,
          output,
          Date.now() - start,
        );
        return output;
      },
    }),

    getVehicleDetails: tool({
      description:
        "Obtener detalles completos de un vehículo específico por su VIN (Vehicle Identification Number).",
      inputSchema: z.object({
        vin: z.string().describe("VIN del vehículo, ej. 1HGCM82633A123456"),
      }),
      execute: async (input) => {
        const start = Date.now();
        const vehicle = INVENTORY.find((v) => v.vin === input.vin) ?? null;
        const output: { found: boolean; vehicle: Vehicle | null } = {
          found: !!vehicle,
          vehicle,
        };
        recordToolInvocation(
          "getVehicleDetails",
          sessionId,
          "LOW",
          input,
          output,
          Date.now() - start,
        );
        return output;
      },
    }),

    scheduleTestDrive: tool({
      description:
        "Agendar una prueba de manejo para un vehículo. Severity MEDIUM porque involucra datos personales del cliente.",
      inputSchema: z.object({
        vin: z.string().describe("VIN del vehículo a probar"),
        customerEmail: z.string().email().describe("Email del cliente"),
        customerName: z.string().describe("Nombre completo del cliente"),
        preferredDate: z
          .string()
          .describe("Fecha preferida en formato ISO (YYYY-MM-DD)"),
      }),
      execute: async (input) => {
        const start = Date.now();
        const vehicle = INVENTORY.find((v) => v.vin === input.vin);
        if (!vehicle || !vehicle.available) {
          const output = {
            scheduled: false,
            reason: vehicle ? "Vehículo no disponible" : "VIN no encontrado",
          };
          recordToolInvocation(
            "scheduleTestDrive",
            sessionId,
            "MEDIUM",
            input,
            output,
            Date.now() - start,
          );
          return output;
        }
        const output = {
          scheduled: true,
          confirmationId: `TD-${Date.now().toString(36).toUpperCase()}`,
          vehicle: `${vehicle.brand} ${vehicle.model} (${vehicle.year})`,
          when: input.preferredDate,
          customerEmail: input.customerEmail,
        };
        recordToolInvocation(
          "scheduleTestDrive",
          sessionId,
          "MEDIUM",
          input,
          output,
          Date.now() - start,
        );
        return output;
      },
    }),

    getFinancingQuote: tool({
      description:
        "Calcular cotización de financiación para un vehículo. Devuelve cuota mensual estimada. Severity HIGH porque es información financiera vinculante.",
      inputSchema: z.object({
        vehiclePriceUsd: z.number().positive().describe("Precio del vehículo en USD"),
        downPaymentUsd: z
          .number()
          .nonnegative()
          .describe("Anticipo en USD"),
        months: z
          .number()
          .int()
          .min(12)
          .max(72)
          .describe("Plazo en meses (12 a 72)"),
      }),
      execute: async (input) => {
        const start = Date.now();
        const annualRate = 0.18;
        const monthlyRate = annualRate / 12;
        const financed = Math.max(
          0,
          input.vehiclePriceUsd - input.downPaymentUsd,
        );
        const factor =
          (monthlyRate * Math.pow(1 + monthlyRate, input.months)) /
          (Math.pow(1 + monthlyRate, input.months) - 1);
        const monthlyPaymentUsd = Math.round(financed * factor * 100) / 100;
        const totalPaidUsd =
          Math.round(monthlyPaymentUsd * input.months * 100) / 100;
        const output = {
          financedUsd: financed,
          monthlyPaymentUsd,
          totalPaidUsd,
          annualRate,
          months: input.months,
        };
        recordToolInvocation(
          "getFinancingQuote",
          sessionId,
          "HIGH",
          input,
          output,
          Date.now() - start,
        );
        return output;
      },
    }),
  };
}

export type DealershipTools = ReturnType<typeof buildTools>;
