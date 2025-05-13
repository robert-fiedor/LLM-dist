# JavaScript Project Manifest Extractor

A Node.js command-line tool that scans JavaScript/TypeScript codebases and generates a single compact manifest file containing file paths, methods, classes, and module dependencies. Optimized for LLM consumption by default.

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/LLM-dist.git
cd LLM-dist

# Install dependencies
npm install
```

## Usage

```bash
# Basic usage - Produces LLM-optimized output by default
node src/index.js ./path/to/your/project

# Specify output file
node src/index.js ./path/to/your/project --out custom-manifest.json

# Compress output
node src/index.js ./path/to/your/project --compress

# Generate full (non-optimized) output with all metadata
node src/index.js ./path/to/your/project --full-format
```

## Output Format

The tool generates a JSON manifest with:
- File paths and names
- Functions, methods, and their parameters
- Class definitions and fields
- Module dependencies

By default, the output is optimized for LLM consumption by removing:
- Location information (line/column positions)
- Detailed statistics
- Redundant filename information
- Absolute paths
- Overly complex parameter metadata

Use the `--full-format` flag to include all metadata if needed.

## Error Replay

If the tool crashes, you can run with the replay flag to see the error details:

```bash
npm run replay
```

## License

MIT

