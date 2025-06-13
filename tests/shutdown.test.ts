import { join } from "path";
import { MCPClient } from "./utils/mcp-client";

describe("Server Shutdown Cleanup", () => {
  const serverPath = join(process.cwd(), "build", "index.js");

  test("should cleanup processes on server shutdown", async () => {
    let client: MCPClient;
    let namespace: string;
    const testProcessNames: string[] = [];

    try {
      // Start server and create some processes
      client = new MCPClient(serverPath);
      await client.initialize();
      
      // Get namespace
      const namespaceResult = await client.callTool("get-namespace");
      namespace = namespaceResult.content[0].text.split(": ")[1];

      // Start multiple test processes
      for (let i = 0; i < 3; i++) {
        const startResult = await client.callTool("start-process", {
          script: join(process.cwd(), "tests", "pm2-example.js"),
          args: [],
        });
        
        const processNameMatch = startResult.content[0].text.match(/'([^']+)'/);
        if (processNameMatch) {
          testProcessNames.push(processNameMatch[1]);
        }
      }

      // Verify processes are running
      const beforeShutdownList = await client.callTool("list-processes", { namespace });
      expect(beforeShutdownList.content[0].text).toContain("3 total");

      // Force close the server (simulates unexpected shutdown)
      await client.close();
      
      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Start a new client to check if processes were cleaned up
      const newClient = new MCPClient(serverPath);
      await newClient.initialize();
      
      // Check if old processes still exist
      const afterShutdownList = await newClient.callTool("list-processes");
      
      // Verify that none of our test processes are still running
      let foundOldProcesses = false;
      for (const processName of testProcessNames) {
        if (afterShutdownList.content[0].text.includes(processName)) {
          foundOldProcesses = true;
        }
      }
      
      expect(foundOldProcesses).toBe(false);
      
      await newClient.close();
      
    } catch (error) {
      throw error;
    }
  }, 15000); // Longer timeout for this test
});