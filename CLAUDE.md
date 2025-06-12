# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a PM2 MCP (Model Context Protocol) Server that provides process management capabilities through the MCP framework. The server allows starting and managing processes via PM2 through MCP tools.

### Architecture

- **MCP Server**: Built using `@modelcontextprotocol/sdk` with stdio transport
- **Process Management**: Uses PM2 for process lifecycle management  
- **Namespacing**: Each server instance creates a unique namespace using nanoid to avoid process name conflicts
- **Build System**: Custom esbuild-based build pipeline using estrella

### Key Components

- `src/index.ts`: Main MCP server implementation with PM2 integration
- `src/bin.ts`: CLI entry point (currently placeholder)
- `scripts/`: Build pipeline with both standard and Node.js-specific builds
- Process names are automatically generated as `{namespace}-{randomId}` to prevent conflicts

## Development Commands

```bash
# Build the project (TypeScript compilation + esbuild bundling)
npm run build

# Build for Node.js environment specifically  
npm run build:node

# Watch mode for development
npm run watch

# Watch mode for Node.js
npm run watch:node

# Run tests
npm run test
```

## Build System Details

The project uses a dual-build approach:
- TypeScript compiler generates type definitions in `./types/`
- Custom esbuild pipeline creates bundled outputs in `./dist/` 
- Supports both CommonJS and ESM formats
- Creates separate builds for bin and library entry points

Build outputs:
- `dist/index.cjs` (CommonJS library)
- `dist/index.mjs` (ESM library) 
- `dist/bin.cjs` (CLI executable)
- `types/index.d.ts` (TypeScript definitions)