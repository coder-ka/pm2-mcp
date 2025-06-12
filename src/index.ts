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
      const processName = `${namespace}-${nanoid(6)}`;
      pm2.start(
        {
          script,
          args,
          cwd,
          name: processName,
          namespace,
        },
        (err, proc) => {
          if (err) {
            return reject(err);
          }
          console.error("DEBUG - proc type:", typeof proc);
          console.error("DEBUG - proc content:", JSON.stringify(proc, null, 2));

          let status = "unknown";
          if (Array.isArray(proc)) {
            status = proc[0]?.pm2_env?.status || "unknown";
          } else if (proc && typeof proc === "object" && "pm2_env" in proc) {
            status = (proc as any).pm2_env?.status || "unknown";
          }

          resolve({
            content: [
              {
                type: "text",
                text: `Process started successfully:\nName: ${processName}\nStatus: ${status}`,
              },
            ],
          });
        }
      );
    });
  }
);

server.tool(
  "delete-process",
  "Delete/stop a process by name",
  {
    name: z.string().describe("Process name to delete"),
  },
  async ({ name }) => {
    return new Promise((resolve, reject) => {
      pm2.delete(name, (err) => {
        if (err) {
          return reject(err);
        }
        resolve({
          content: [
            {
              type: "text",
              text: `Process deleted successfully: ${name}`,
            },
          ],
        });
      });
    });
  }
);

server.tool(
  "list-process",
  "List processes by namespace",
  {
    namespace: z.string().describe("Namespace to filter processes"),
  },
  async ({ namespace: targetNamespace }) => {
    return new Promise((resolve, reject) => {
      pm2.list((err, list) => {
        if (err) {
          return reject(err);
        }

        const filteredProcesses = list.filter((proc) =>
          proc.name?.startsWith(`${targetNamespace}-`)
        );

        const processInfo = filteredProcesses.map((proc) => ({
          name: proc.name,
          status: proc.pm2_env?.status,
          pid: proc.pid,
          cpu: proc.monit?.cpu,
          memory: proc.monit?.memory,
          uptime: proc.pm2_env?.pm_uptime,
          restart_time: proc.pm2_env?.restart_time,
        }));

        resolve({
          content: [
            {
              type: "text",
              text: `Processes in namespace '${targetNamespace}':\n${
                processInfo.length === 0
                  ? "No processes found"
                  : processInfo
                      .map(
                        (p) =>
                          `Name: ${p.name}\nStatus: ${p.status}\nPID: ${
                            p.pid
                          }\nCPU: ${p.cpu}%\nMemory: ${
                            p.memory ? (p.memory / 1024 / 1024).toFixed(2) : 0
                          }MB\nRestart Count: ${p.restart_time}\n`
                      )
                      .join("\n")
              }`,
            },
          ],
        });
      });
    });
  }
);

server.tool(
  "get-namespace",
  "Get the current server namespace",
  {},
  async () => {
    return {
      content: [
        {
          type: "text",
          text: `Current namespace: ${namespace}`,
        },
      ],
    };
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
