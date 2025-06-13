# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a PM2 MCP (Model Context Protocol) Server that provides process management capabilities through the MCP framework. The server allows starting and managing processes via PM2 through MCP tools.

### Architecture

- **MCP Server**: Built using `@modelcontextprotocol/sdk` with stdio transport
- **Process Management**: Uses PM2 for process lifecycle management  
- **Namespacing**: Each server instance creates a unique namespace using nanoid to avoid process name conflicts
- **Build System**: TypeScript compilation with ES2022/Node16 modules

### Key Components

- `src/index.ts`: Main MCP server implementation with PM2 integration
  - `start-process` tool: Starts new processes with auto-generated names
  - `delete-process` tool: Stops/deletes processes by name
- Process names are automatically generated as `{namespace}-{randomId}` to prevent conflicts
- Graceful shutdown handling with SIGINT/SIGTERM signal handlers
- Uses Zod for parameter validation on MCP tools

### Available MCP Tools

1. **start-process**: Start a new process
   - `script`: The script/command to run
   - `args`: Optional array of arguments
   - `cwd`: Optional working directory
   
2. **delete-process**: Stop/delete a process
   - `name`: Process name to delete

## Development Commands

```bash
# Build the project (TypeScript compilation + chmod)
npm run build

# Debug server with MCP inspector
npm run inspect
```

## Build System Details

- TypeScript compiler generates JavaScript in `./build/`
- Uses ES2022 target with Node16 module resolution  
- Executable is `build/index.js` with shebang for CLI usage
- Binary name: `pm2-mcp` (available after npm install -g)
- Build includes chmod 755 to make executable

## Development & Testing

- Uses basic assertion-based testing in `tests/` directory
- `pm2-example.js` serves as a test process that logs incrementally
- Logs are written to temp directory (`/tmp/pm2-mcp.log`) with namespace prefixing
- Each server instance uses unique 6-char namespace to avoid PM2 process conflicts
- MCP Inspector available via `npm run inspect` for debugging tool interactions