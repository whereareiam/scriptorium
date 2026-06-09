import path from "node:path";
import { z } from "zod";

export const runtimeConfigSchema = z.object({
  source: z.object({
    type: z.enum(["local", "git"]).default("local"),
    target: z.string().min(1).optional(),
    defaultBranch: z.string().min(1).default("dev"),
    auth: z.object({
      token: z.string().optional(),
      username: z.string().min(1).default("x-access-token")
    }).default({
      username: "x-access-token"
    })
  }).default({
    type: "local",
    defaultBranch: "dev",
    auth: {
      username: "x-access-token"
    }
  }),
  runtime: z.object({
    dataDir: z.string().min(1).default(path.resolve(process.cwd(), ".scriptorium", "runtime"))
  }).default({
    dataDir: path.resolve(process.cwd(), ".scriptorium", "runtime")
  }),
  triggers: z.object({
    webhook: z.object({
      secret: z.string().optional()
    }).optional()
  }).optional()
});

export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;
