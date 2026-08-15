import { z } from "zod";
import contractJson from "@/wordpress-plugin/absolute-asia/content-contract.json";

const ContractTypeSchema = z.object({
  postTypes: z.array(z.string()).optional(),
  consumer: z.string(),
  defaultFieldStatus: z.enum(["required", "optional", "deprecated", "skip"]).optional(),
  fields: z.array(z.string()),
  relationships: z.array(z.string()),
  repeaters: z.array(z.string()),
  retained: z.array(z.object({
    field: z.string(),
    status: z.enum(["required", "optional", "deprecated", "skip"]),
    consumer: z.string(),
    reason: z.string(),
  })).optional(),
});

const ContentContractSchema = z.object({
  version: z.number().int().positive(),
  types: z.record(z.string(), ContractTypeSchema),
  repeaterSchemas: z.record(z.string(), z.array(z.string())),
});

export const CONTENT_CONTRACT = ContentContractSchema.parse(contractJson);
export const CONTENT_CONTRACT_VERSION = CONTENT_CONTRACT.version;
export const KNOWN_ACF_FIELDS = new Set(
  Object.values(CONTENT_CONTRACT.types).flatMap((type) => [
    ...type.fields,
    ...(type.retained || []).map((entry) => entry.field),
  ]),
);

export const ItineraryRowSchema = z.object({
  day_num: z.union([z.string(), z.number()]).optional(),
  group_tag: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  image_url: z.string().optional(),
  latitude: z.union([z.string(), z.number()]).optional(),
  longitude: z.union([z.string(), z.number()]).optional(),
});

export function contractTypeFor(postType: string) {
  if (CONTENT_CONTRACT.types[postType]) return CONTENT_CONTRACT.types[postType];
  return Object.values(CONTENT_CONTRACT.types).find((type) => type.postTypes?.includes(postType));
}

/** Development-time guard; the admin audit remains authoritative for live data. */
export function validateAcfShape(postType: string, acf: Record<string, unknown>) {
  const spec = contractTypeFor(postType);
  if (!spec) return { unknownFields: Object.keys(acf), invalidRepeaters: [] as string[] };
  const allowed = new Set([...spec.fields, ...(spec.retained || []).map((entry) => entry.field)]);
  const invalidRepeaters: string[] = [];
  for (const field of spec.repeaters) {
    const value = acf[field];
    if (value !== undefined && value !== "" && !Array.isArray(value)) invalidRepeaters.push(field);
  }
  return {
    unknownFields: Object.keys(acf).filter((field) => !allowed.has(field)),
    invalidRepeaters,
  };
}
