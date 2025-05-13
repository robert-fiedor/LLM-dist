# JavaScript Project Manifest Extractor

A Node.js command-line tool that scans JavaScript/TypeScript codebases and generates a single compact manifest file containing file paths, methods, classes, and module dependencies.

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
# Basic usage
node src/index.js ./path/to/your/project

# Specify output file
node src/index.js ./path/to/your/project --out custom-manifest.json

# Compress output
node src/index.js ./path/to/your/project --compress
```

## Output Format

The tool generates a JSON manifest with:
- File paths and names
- Functions, methods, and their parameters
- Class definitions and fields
- Module dependencies

## Error Replay

If the tool crashes, you can run with the replay flag to see the error details:

```bash
npm run replay
```

## License

MIT

