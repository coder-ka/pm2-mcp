# PM2 MCP Server

A Model Context Protocol (MCP) server that provides PM2 process management capabilities for educational purposes.

## ⚠️ Warning

This project was created for learning MCP server development. It lacks several features needed for production use:

- Robust security measures
- Enhanced error handling  
- Performance optimizations
- Comprehensive logging management
- Configuration management
- Process monitoring and alerting
- Resource limits and controls

**This is a study project and should not be used in production environments.**

## Overview

This MCP server provides PM2 process management capabilities through the Model Context Protocol. It supports basic operations like starting, stopping, listing processes, and log management.

## Features

- **Process Management**: Start, stop, and list processes using PM2
- **Namespace Isolation**: Each server instance uses unique namespaces to prevent process name conflicts
- **MCP Compliant**: Standard MCP protocol implementation

## Installation

```bash
npm install
npm run build
```

## Usage

### Start as MCP Server

```bash
npm start
```

### Development & Testing

```bash
# Run tests
npm test

# Debug with MCP Inspector
npm run inspect

# Start test process
npm run start:test-server
```

## Available MCP Tools

1. **start-process**: Start a new process
   - `script`: The script/command to run
   - `args`: Optional array of arguments
   - `cwd`: Optional working directory

2. **delete-process**: Stop/delete a process
   - `name`: Process name to delete

3. **list-processes**: List PM2 processes
   - `namespace`: Optional namespace filter

4. **get-namespace**: Get current server namespace


## Architecture

- **MCP SDK**: Built using `@modelcontextprotocol/sdk` with stdio transport
- **Process Management**: Uses PM2 for process lifecycle management
- **Build System**: TypeScript compilation with ES2022/Node16 modules

## License

MIT