import { join } from "path";
import { tmpdir } from "os";
import { readFileSync, existsSync } from "fs";
import { MCPClient } from "./utils/mcp-client";

describe("PM2 MCP Server", () => {
  let client: MCPClient;
  let namespace: string;
  const serverPath = join(process.cwd(), "build", "index.js");

  beforeAll(() => {
    if (!existsSync(serverPath)) {
      throw new Error("Server not built. Run 'npm run build' first.");
    }
  });

  beforeEach(async () => {
    client = new MCPClient(serverPath);
    await client.initialize();
    
    // Get namespace for each test
    const namespaceResult = await client.callTool("get-namespace");
    namespace = namespaceResult.content[0].text.split(": ")[1];
  });

  afterEach(async () => {
    if (client) {
      await client.close();
    }
  });

  describe("Basic functionality", () => {
    test("should initialize MCP connection", async () => {
      expect(client).toBeDefined();
    });

    test("should get server namespace", async () => {
      expect(namespace).toBeDefined();
      expect(namespace).toHaveLength(6);
    });

    test("should list processes (initially empty)", async () => {
      const result = await client.callTool("list-processes", { namespace });
      
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain("No processes running");
    });
  });

  describe("Process management", () => {
    let testProcessName: string;

    test("should start a process", async () => {
      const testScript = join(process.cwd(), "tests", "pm2-example.js");
      const result = await client.callTool("start-process", {
        script: testScript,
        args: [],
        cwd: process.cwd(),
      });

      expect(result.content[0].text).toContain("Successfully started process");
      
      const processNameMatch = result.content[0].text.match(/'([^']+)'/);
      expect(processNameMatch).toBeTruthy();
      
      testProcessName = processNameMatch![1];
      expect(testProcessName).toMatch(new RegExp(`^${namespace}-`));
    });

    test("should list processes with namespace filter", async () => {
      const testScript = join(process.cwd(), "tests", "pm2-example.js");
      const startResult = await client.callTool("start-process", {
        script: testScript,
        args: [],
      });
      
      const processNameMatch = startResult.content[0].text.match(/'([^']+)'/);
      testProcessName = processNameMatch![1];

      const listResult = await client.callTool("list-processes", { namespace });
      
      expect(listResult.content[0].text).toContain(testProcessName);
      expect(listResult.content[0].text).toContain("1 total");
    });

    test("should list all processes", async () => {
      const testScript = join(process.cwd(), "tests", "pm2-example.js");
      const startResult = await client.callTool("start-process", {
        script: testScript,
        args: [],
      });
      
      const processNameMatch = startResult.content[0].text.match(/'([^']+)'/);
      testProcessName = processNameMatch![1];

      const listResult = await client.callTool("list-processes");
      
      expect(listResult.content[0].text).toContain(testProcessName);
    });

    test("should show process as running", async () => {
      const testScript = join(process.cwd(), "tests", "pm2-example.js");
      const startResult = await client.callTool("start-process", {
        script: testScript,
        args: [],
      });
      
      const processNameMatch = startResult.content[0].text.match(/'([^']+)'/);
      testProcessName = processNameMatch![1];

      // Wait for process to start properly
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const listResult = await client.callTool("list-processes", { namespace });
      expect(listResult.content[0].text).toContain("online");
    });

    test("should delete a process", async () => {
      const testScript = join(process.cwd(), "tests", "pm2-example.js");
      const startResult = await client.callTool("start-process", {
        script: testScript,
        args: [],
      });
      
      const processNameMatch = startResult.content[0].text.match(/'([^']+)'/);
      testProcessName = processNameMatch![1];

      const deleteResult = await client.callTool("delete-process", { name: testProcessName });
      
      expect(deleteResult.content[0].text).toContain("Successfully deleted process");
    });

    test("should verify process was deleted", async () => {
      const testScript = join(process.cwd(), "tests", "pm2-example.js");
      const startResult = await client.callTool("start-process", {
        script: testScript,
        args: [],
      });
      
      const processNameMatch = startResult.content[0].text.match(/'([^']+)'/);
      testProcessName = processNameMatch![1];

      await client.callTool("delete-process", { name: testProcessName });
      
      const listResult = await client.callTool("list-processes", { namespace });
      expect(listResult.content[0].text).toContain("No processes running");
    });
  });

  describe("Namespace isolation", () => {
    test("should manage multiple processes with same namespace", async () => {
      const testScript = join(process.cwd(), "tests", "pm2-example.js");
      
      // Start first process
      const firstResult = await client.callTool("start-process", {
        script: testScript,
        args: [],
      });
      const firstProcessName = firstResult.content[0].text.match(/'([^']+)'/)![1];

      // Start second process
      const secondResult = await client.callTool("start-process", {
        script: "echo",
        args: ["hello world"],
      });
      const secondProcessName = secondResult.content[0].text.match(/'([^']+)'/)![1];

      expect(firstProcessName).toMatch(new RegExp(`^${namespace}-`));
      expect(secondProcessName).toMatch(new RegExp(`^${namespace}-`));
      expect(firstProcessName).not.toBe(secondProcessName);

      // Verify both processes are listed
      const listResult = await client.callTool("list-processes", { namespace });
      expect(listResult.content[0].text).toContain("2 total");

      // Clean up
      await client.callTool("delete-process", { name: firstProcessName });
      await client.callTool("delete-process", { name: secondProcessName });
    });
  });

  describe("Error handling", () => {
    test("should handle deleting non-existent process", async () => {
      const result = await client.callTool("delete-process", { name: "non-existent-process" });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("process or namespace not found");
    });

    test("should handle invalid script", async () => {
      const result = await client.callTool("start-process", {
        script: "/non/existent/script.js",
      });
      
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error:");
    });
  });

  describe("Logging", () => {
    test("should create log file with namespace entries", async () => {
      const testScript = join(process.cwd(), "tests", "pm2-example.js");
      const startResult = await client.callTool("start-process", {
        script: testScript,
        args: [],
      });
      
      const processNameMatch = startResult.content[0].text.match(/'([^']+)'/);
      const processName = processNameMatch![1];

      const logFile = join(tmpdir(), "pm2-mcp.log");
      expect(existsSync(logFile)).toBe(true);
      
      const logContent = readFileSync(logFile, "utf8");
      expect(logContent).toContain(`[${namespace}]`);
      expect(logContent).toContain("Started process");

      // Clean up
      await client.callTool("delete-process", { name: processName });
    });
  });
});