import pm2 from "pm2";
import { nanoid } from "nanoid";
import { appendFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const namespace = nanoid(6);

// Log file path - put in temp directory to avoid cluttering current directory
const logFile = join(tmpdir(), `pm2-mcp.log`);

// Helper function to log to file
function log(message: string) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${namespace}] [${timestamp}] ${message}\n`;
  appendFileSync(logFile, logMessage);
}

function isError(error: unknown): error is Error {
  return (
    error instanceof Error ||
    (typeof error === "object" && error !== null && "message" in error)
  );
}

// Helper function to handle PM2 operations with automatic connect/disconnect
async function withPM2<T>(operation: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    pm2.connect((connectErr) => {
      if (connectErr) {
        return reject(connectErr);
      }

      operation()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          pm2.disconnect();
        });
    });
  });
}

// Cleanup function to delete all processes in this namespace
async function cleanup() {
  await withPM2(async () => {
    try {
      const list = await new Promise<pm2.ProcessDescription[]>(
        (resolve, reject) => {
          pm2.list((err, list) => {
            if (err) {
              return reject(err);
            }
            resolve(list);
          });
        }
      );

      await Promise.all(
        list
          .filter((proc) => proc.name && proc.name.startsWith(`${namespace}-`))
          .map(
            (proc) =>
              new Promise<void>((resolve, reject) => {
                pm2.delete(proc.name!, (deleteErr) => {
                  if (deleteErr) {
                    log(
                      `Error deleting process ${proc.name}: ${deleteErr.message}`
                    );
                    return reject(deleteErr);
                  }
                  log(`Successfully deleted process ${proc.name}`);
                  resolve();
                });
              })
          )
      );

      log(
        `Cleanup complete. All processes with namespace '${namespace}' have been deleted.`
      );
    } catch (error) {
      log(
        `Error during cleanup: ${
          isError(error) ? error.message : JSON.stringify(error)
        }`
      );
    }
  });
}

async function startServer() {
  const server = new McpServer({
    name: "pm2-mcp-server",
    version: "1.0.0",
  });

  // Define tools
  server.tool(
    "start-process",
    "Start a new process using PM2",
    {
      script: z.string().describe("The script or command to run"),
      args: z
        .array(z.string())
        .optional()
        .describe("Optional array of arguments"),
      cwd: z.string().optional().describe("Optional working directory"),
    },
    async ({ script, args, cwd }) => {
      const processName = `${namespace}-${nanoid(6)}`;

      await withPM2(async () => {
        return new Promise<void>((resolve, reject) => {
          const options: any = {
            name: processName,
            script,
            args: args || [],
            cwd: cwd || process.cwd(),
          };

          pm2.start(options, (err) => {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        });
      });

      log(`Started process: ${processName} (${script})`);

      return {
        content: [
          {
            type: "text",
            text: `Successfully started process '${processName}' with script: ${script}`,
          },
        ],
      };
    }
  );

  server.tool(
    "delete-process",
    "Stop and delete a process by name",
    {
      name: z.string().describe("Process name to delete"),
    },
    async ({ name }) => {
      await withPM2(async () => {
        return new Promise<void>((resolve, reject) => {
          pm2.delete(name, (err) => {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        });
      });

      log(`Deleted process: ${name}`);

      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted process '${name}'`,
          },
        ],
      };
    }
  );

  server.tool(
    "list-processes",
    "List PM2 processes, optionally filtered by namespace",
    {
      namespace: z.string().optional().describe("Optional namespace to filter processes (if not provided, shows all processes)"),
    },
    async ({ namespace: filterNamespace }) => {
      const processes = await withPM2(async () => {
        return new Promise<pm2.ProcessDescription[]>((resolve, reject) => {
          pm2.list((err, list) => {
            if (err) {
              return reject(err);
            }
            resolve(list);
          });
        });
      });

      const filteredProcesses = filterNamespace 
        ? processes.filter(proc => proc.name && proc.name.startsWith(`${filterNamespace}-`))
        : processes;

      const processInfo = filteredProcesses.map(proc => ({
        name: proc.name || 'unnamed',
        status: proc.pm2_env?.status || 'unknown',
        pid: proc.pid || 'N/A',
        cpu: proc.monit?.cpu || 0,
        memory: proc.monit?.memory || 0,
        uptime: proc.pm2_env?.pm_uptime ? Date.now() - proc.pm2_env.pm_uptime : 0,
        script: proc.pm2_env?.pm_exec_path || 'N/A'
      }));

      const logMessage = filterNamespace 
        ? `Listed ${filteredProcesses.length} processes for namespace '${filterNamespace}'`
        : `Listed ${processes.length} processes (all)`;
      log(logMessage);

      const processTable = processInfo.map(proc => 
        `${proc.name.padEnd(20)} | ${proc.status.padEnd(10)} | PID: ${String(proc.pid).padEnd(8)} | CPU: ${proc.cpu}% | Memory: ${Math.round(proc.memory / 1024 / 1024)}MB | Uptime: ${Math.round(proc.uptime / 1000)}s`
      ).join('\n');

      const titleText = filterNamespace 
        ? `PM2 Processes for namespace '${filterNamespace}' (${filteredProcesses.length} total)`
        : `PM2 Processes (${processes.length} total)`;

      return {
        content: [
          {
            type: "text",
            text: `${titleText}:\n\n${processTable || 'No processes running'}`,
          },
        ],
      };
    }
  );

  server.tool(
    "get-namespace",
    "Get the current server namespace",
    {},
    async () => {
      log(`Namespace requested: ${namespace}`);

      return {
        content: [
          {
            type: "text",
            text: `Current server namespace: ${namespace}`,
          },
        ],
      };
    }
  );

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Connect to the MCP server
  await server.connect(transport);

  log("MCP server started and listening for requests...");
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  log("Received SIGINT, cleaning up...");
  await cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  log("Received SIGTERM, cleaning up...");
  await cleanup();
  process.exit(0);
});

process.on("beforeExit", async (code) => {
  log("Process exiting, cleaning up...");
  await cleanup();
  process.exit(code);
});

startServer().catch((error) => {
  log(`Server error: ${error.message}`);
  process.exit(1);
});
