# pdf-remove-wm

Automated pipeline that watches a folder for `.md` files, converts them to PDF via the [markdowntopdf.com](https://www.markdowntopdf.com) API, removes the watermark locally with [pdf-lib](https://github.com/Hopding/pdf-lib), and saves clean PDFs to an output folder.

## How it works

```
input/*.md  -->  [chokidar watcher]  -->  [pipeline]
                                              |
                              +---------------+---------------+
                              |                               |
                      Step 1: MD -> PDF               Step 2: Remove WM
                  (markdowntopdf.com API)            (pdf-lib, set /G9 ca=0)
                              |                               |
                      temp/{id}.pdf                   output/{name}.pdf
```

The markdowntopdf.com free tier adds a watermark using a PDF ExtGState entry (`/G9` with `ca=0.0392` -- 3.9% opacity) applied to diagonal rotated text. Setting `ca=0` makes it fully transparent, so no browser automation or web scraping is needed.

## Prerequisites

- Node.js >= 18
- A free API key from [markdowntopdf.com](https://www.markdowntopdf.com/dashboard/api) (use `md_test_` prefix for sandbox)

## Setup

```bash
# Install dependencies
npm install

# Configure
cp .env.example .env
# Edit .env and set your MARKDOWNTOPDF_API_KEY
```

## Usage

```bash
# Start the watcher
npm start

# Or with auto-reload on code changes (development)
npm run dev
```

Drop `.md` files into the `input/` folder. Clean PDFs appear in `output/`.

Processed `.md` files are automatically moved to `input/done/` after conversion. Set `MOVE_PROCESSED=false` in `.env` to keep them in place.

## Configuration

All configuration is via environment variables in `.env`:

| Variable | Default | Description |
|---|---|---|
| `MARKDOWNTOPDF_API_KEY` | *(required)* | API key from markdowntopdf.com |
| `WM_STRATEGY` | `auto` | Watermark removal: `auto`, `local`, or `playwright` |
| `LOG_LEVEL` | `info` | Logging level (`debug`, `info`, `warn`, `error`) |
| `INPUT_DIR` | `./input` | Folder to watch for `.md` files |
| `OUTPUT_DIR` | `./output` | Folder for clean PDFs |
| `MOVE_PROCESSED` | `true` | Move processed `.md` files to `input/done/` |

## Project structure

```
pdf-remove-wm/
  src/
    index.js                  # Entry point, starts watcher
    config.js                 # Loads .env, validates config
    watcher.js                # chokidar folder watcher
    pipeline.js               # Orchestrator: read -> convert -> remove-wm -> save
    converters/
      markdown-to-pdf.js      # markdowntopdf.com REST API client
    removers/
      local-remover.js         # pdf-lib watermark removal
    utils/
      logger.js               # pino structured logging
      retry.js                # Exponential backoff with jitter
      file-ops.js             # Atomic moves, file stability check, dir creation
  input/                      # Drop .md files here
  input/done/                 # Processed .md files (auto-created)
  output/                     # Clean PDFs land here
  temp/                       # Runtime temp files (gitignored)
```

## Tech stack

- **Node.js** (ES modules)
- **chokidar** -- folder watching with file stability detection
- **pdf-lib** -- local PDF manipulation (watermark removal)
- **pino** -- structured JSON logging (pretty-printed in debug mode)
- **dotenv** -- environment variable loading
- **uuid** -- correlation IDs for request tracing

## Error handling

- API calls retry up to 3 times with exponential backoff (rate limits, service unavailable)
- Failed files are preserved in `temp/failed/{correlationId}/` with both the watermarked and partially-clean PDFs for debugging
- Structured error logs include correlation IDs for tracing
