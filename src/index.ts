import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import pm2 from "pm2";
import { nanoid } from "nanoid";

// Create server instance
const server = new McpServer({
  name: "pm2",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

const namespace = nanoid(6);

server.tool(
  "start-process",
  "Start a new process",
  {
    script: z.string().describe("The script to run"),
    args: z
      .array(z.string())
      .optional()
      .describe("Arguments to pass to the script"),
    cwd: z.string().optional().describe("Working directory for the script"),
  },
  async ({ script, args = [], cwd }) => {
    return new Promise((resolve, reject) => {
      pm2.start(
        {
          script,
          args,
          cwd,
          name: `${namespace}-${nanoid(6)}`,
          namespace,
        },
        (err, proc) => {
          if (err) {
            return reject(err);
          }
          resolve({
            content: [
              {
                type: "text",
                text: `Process started successfully:\nID: ${
                  proc.pm_id
                }\nName: ${proc.name}\nStatus: ${proc.status || "unknown"}`,
              },
            ],
          });
        }
      );
    });
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  await new Promise<void>((resolve, reject) => {
    pm2.connect((err) => {
      if (err) {
        console.error("Failed to connect to PM2:", err);
        return reject(err);
      }

      console.log("Connected to PM2");
      resolve();
    });
  });
  console.error("PM2 MCP Server running on stdio");
}

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down gracefully...");
  pm2.disconnect();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down gracefully...");
  pm2.disconnect();
  process.exit(0);
});

main()
  .catch((error) => {
    console.error("Fatal error in main():", error);
    pm2.disconnect();
    process.exit(1);
  })
  .then(() => {
    console.log(`Server started successfully with namespace: ${namespace}`);
  });
