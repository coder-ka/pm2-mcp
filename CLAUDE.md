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

3. **list-processes**: List PM2 processes
   - `namespace`: Optional namespace filter (shows only processes from specific server instance)

4. **get-namespace**: Get current server namespace
   - Returns the 6-character namespace for this server instance

## Development Commands

```bash
# Build the project (TypeScript compilation + chmod)
npm run build

# Run comprehensive test suite (builds + runs Jest)
npm test

# Debug server with MCP inspector
npm run inspect

# Start test server process (for manual testing)
npm run start:test-server
```

### Testing Commands
```bash
# Run specific test file
npx jest tests/server.test.ts

# Run tests with coverage report
npx jest --coverage

# Run tests in watch mode for development
npx jest --watch

# Run tests with verbose output
npx jest --verbose
```

## Build System Details

- TypeScript compiler generates JavaScript in `./build/`
- Uses ES2022 target with Node16 module resolution  
- Executable is `build/index.js` with shebang for CLI usage
- Binary name: `pm2-mcp` (available after npm install -g)
- Build includes chmod 755 to make executable

## Testing Architecture

The test suite uses Jest with TypeScript and implements a comprehensive MCP client that validates all server functionality:

- **Jest Framework**: Modern testing with `ts-jest` for TypeScript compilation
- **MCP Client Utility**: Reusable client in `tests/utils/mcp-client.ts` for server communication
- **Test Coverage**: 14 test cases covering all MCP tools, error handling, and process lifecycle
- **Namespace Isolation Testing**: Verifies that each server instance operates independently
- **Process Management Validation**: Tests starting, listing, and deleting processes
- **Error Boundary Testing**: Validates proper error handling (server returns `isError: true` instead of throwing)
- **Shutdown Cleanup Testing**: Ensures processes are automatically cleaned up on server termination

### Test Structure
- `tests/server.test.ts`: Core functionality tests (basic operations, process management, namespace isolation, error handling, logging)
- `tests/shutdown.test.ts`: Server shutdown cleanup verification
- `tests/utils/mcp-client.ts`: Reusable MCP client implementation with `callTool()` helper
- `tests/pm2-example.js`: Simple test process that outputs incrementally
- `tests/tsconfig.json`: CommonJS TypeScript config for Jest compatibility

### Key Testing Details
- Tests use Jest with `ts-jest` for TypeScript compilation
- Dual TypeScript configs: main project uses ES2022/Node16, tests use CommonJS for Jest compatibility
- Error handling tests check for `result.isError: true` flag rather than thrown exceptions
- Each test gets fresh server instance with unique namespace for isolation

## Logging & Debugging

- Logs written to `/tmp/pm2-mcp.log` with namespace prefixing for isolation
- Each server instance uses unique 6-char namespace to avoid PM2 process conflicts  
- MCP Inspector available via `npm run inspect` for debugging tool interactions
- Server includes comprehensive error handling with proper MCP error responses