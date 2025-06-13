import { spawn, ChildProcess } from "child_process";
import { setTimeout } from "timers/promises";

export interface MCPRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

export class MCPClient {
  private process: ChildProcess;
  private requestId = 1;
  private pendingRequests = new Map<number, { resolve: (value: any) => void; reject: (error: any) => void }>();
  private isClosing = false;

  constructor(serverPath: string) {
    this.process = spawn("node", [serverPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.process.stdout?.on("data", (data) => {
      const lines = data.toString().split("\n").filter((line: string) => line.trim());
      for (const line of lines) {
        try {
          const response: MCPResponse = JSON.parse(line);
          const pending = this.pendingRequests.get(response.id);
          if (pending) {
            this.pendingRequests.delete(response.id);
            if (response.error) {
              pending.reject(new Error(response.error.message));
            } else {
              pending.resolve(response.result);
            }
          }
        } catch (e) {
          // Ignore non-JSON output
        }
      }
    });

    this.process.stderr?.on("data", (data) => {
      if (!this.isClosing) {
        console.error("Server stderr:", data.toString());
      }
    });
  }

  async request(method: string, params?: any): Promise<any> {
    if (this.isClosing) {
      throw new Error("Client is closing");
    }

    const id = this.requestId++;
    const request: MCPRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.process.stdin?.write(JSON.stringify(request) + "\n");
      
      // Timeout after 10 seconds
      setTimeout(10000).then(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Request timeout"));
        }
      });
    });
  }

  async initialize(): Promise<void> {
    await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "test-client",
        version: "1.0.0",
      },
    });
  }

  async close(): Promise<void> {
    this.isClosing = true;
    this.process.kill();
    await new Promise((resolve) => {
      this.process.on("exit", resolve);
    });
  }

  async callTool(name: string, args: any = {}): Promise<any> {
    return this.request("tools/call", {
      name,
      arguments: args,
    });
  }
}