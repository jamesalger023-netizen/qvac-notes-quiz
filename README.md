# notes-quiz

Turn your own study notes into a quiz — generated **entirely on-device** with
[Tether's QVAC SDK](https://qvac.tether.io). No API key, no cloud call, no
usage bill. Your notes never leave your machine.

Give it a `.txt` file of notes and it loads a small local language model,
runs it locally, and streams a numbered quiz (with an answer key) straight to
your terminal.

## What it does / which QVAC function it calls

The app calls `loadModel()` to load `LLAMA_3_2_1B_INST_Q4_0` (downloaded once
from QVAC's distributed model registry and cached locally), then calls
`completion()` with your notes embedded in the prompt, streaming the model's
response token-by-token to stdout. Everything — the download aside — runs on
your CPU/GPU, not on a server.

## Why I built it

Studying from your own notes/PDFs often means pasting private material into
someone else's cloud chatbot. This keeps the whole flow — notes in, quiz
out — on your own hardware.

## SDK version used

`@qvac/sdk` **0.19.0** or newer (declared in `package.json`).

## Requirements

- Node.js >= 22.17
- ~2 GB free RAM, a few hundred MB free disk for the model
- See QVAC's [system requirements](https://docs.qvac.tether.io/sdk/system-requirements/)
  for OS/GPU details (macOS 14+, Linux with Vulkan, Windows with Vulkan, etc.)

## Install

```bash
git clone https://github.com/<your-username>/qvac-notes-quiz.git
cd qvac-notes-quiz
npm install
```

## Run

Using the included sample notes (about photosynthesis):

```bash
npm start
```

Or point it at your own notes file:

```bash
QVAC_CONFIG_PATH=./qvac.config.json node src/quiz.js path/to/your-notes.txt --questions 5
```

The first run downloads the model (a few hundred MB) and caches it under
`~/.qvac/models`. Every run after that is fully offline.

### Example output

```
▸ Loading local model with QVAC SDK (first run downloads it, then it is cached)...
▸ Downloading model: 100% (770.1/770.1 MB)
▸ Model loaded (id: llama-3.2-1b-inst-q4_0). Generating a 5-question quiz on-device...

1. What pigment absorbs light for photosynthesis, and why do plants look green?
2. Where in the plant cell do the light-dependent reactions take place?
   A) Stroma  B) Thylakoid membrane  C) Mitochondria  D) Nucleus
...

ANSWER KEY:
1. Chlorophyll; it reflects green light while absorbing red and blue.
2. B) Thylakoid membrane
...
```

## Project structure

```
src/quiz.js          # the app: loadModel() + completion()
notes/sample-notes.txt
qvac.config.json     # enables QVAC console logging
package.json          # declares @qvac/sdk as a dependency
```

## License

MIT — see [LICENSE](./LICENSE).
