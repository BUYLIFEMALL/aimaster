import { z } from "zod";

type SchemaNode = {
  type?: string;
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
  required?: string[];
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
};

// generateContent's OpenAPI responseSchema accepts a narrower schema than Zod.
// The full strict Zod schema still validates every response on our server.
export function providerSchema(schema: z.ZodType): Record<string, unknown> {
  const walk = (node: SchemaNode): Record<string, unknown> => {
    if (!node.type) throw new Error("Unsupported provider schema node");
    const result: Record<string, unknown> = { type: node.type.toUpperCase() };
    if (node.properties)
      result.properties = Object.fromEntries(
        Object.entries(node.properties).map(([key, child]) => [
          key,
          walk(child),
        ]),
      );
    if (node.items) result.items = walk(node.items);
    for (const key of ["required", "enum", "minimum", "maximum"] as const)
      if (node[key] !== undefined) result[key] = node[key];
    return result;
  };
  return walk(z.toJSONSchema(schema) as SchemaNode);
}
