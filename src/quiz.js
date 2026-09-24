#!/usr/bin/env node
// notes-quiz — generate a quiz from your own study notes, 100% on-device.
//
// Uses the QVAC SDK (@qvac/sdk) to load a small local LLM and run a single
// completion() call over your notes. The model is downloaded once (to
// ~/.qvac/models) and cached; every run after that is fully offline.
//
// Usage:
//   node src/quiz.js <path-to-notes.txt> [--questions 5]
//
// Example:
//   node src/quiz.js notes/sample-notes.txt --questions 5

import { readFile } from 'node:fs/promises';
import { loadModel, completion, unloadModel } from '@qvac/sdk';

// A small, fast instruction-tuned model. This constant maps to a model
// already published in QVAC's distributed model registry — the SDK
// downloads and caches it automatically on first use.
import { LLAMA_3_2_1B_INST_Q4_0 } from '@qvac/sdk';

function parseArgs(argv) {
  const args = argv.slice(2);
  const notesPath = args[0];
  let questionCount = 5;

  const qIndex = args.indexOf('--questions');
  if (qIndex !== -1 && args[qIndex + 1]) {
    const parsed = Number.parseInt(args[qIndex + 1], 10);
    if (Number.isFinite(parsed) && parsed > 0) questionCount = parsed;
  }

  if (!notesPath) {
    console.error('Usage: node src/quiz.js <path-to-notes.txt> [--questions N]');
    process.exit(1);
  }

  return { notesPath, questionCount };
}

function formatMB(bytes) {
  return (bytes / 1e6).toFixed(1);
}

function printDownloadProgress(p) {
  const line = `▸ Downloading model: ${p.percentage.toFixed(0)}% (${formatMB(p.downloaded)}/${formatMB(p.total)} MB)`;
  process.stderr.write(process.stderr.isTTY ? `\r${line}` : `${line}\n`);
  if (p.percentage >= 100) process.stderr.write('\n');
}

async function main() {
  const { notesPath, questionCount } = parseArgs(process.argv);

  let notes;
  try {
    notes = await readFile(notesPath, 'utf-8');
  } catch (err) {
    console.error(`✖ Could not read notes file at "${notesPath}": ${err.message}`);
    process.exit(1);
  }

  if (!notes.trim()) {
    console.error('✖ Notes file is empty.');
    process.exit(1);
  }

  console.log('▸ Loading local model with QVAC SDK (first run downloads it, then it is cached)...');

  let modelId;
  try {
    modelId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      onProgress: printDownloadProgress
    });
  } catch (err) {
    console.error('✖ Failed to load model:', err);
    process.exit(1);
  }

  console.log(`▸ Model loaded (id: ${modelId}). Generating a ${questionCount}-question quiz on-device...\n`);

  const prompt = [
    `You are a study assistant. Read the notes below and write a ${questionCount}-question quiz`,
    'that tests understanding of the material.',
    '',
    'Rules:',
    '- Number the questions 1 through N.',
    '- Mix question types: some short-answer, some multiple choice (A/B/C/D).',
    '- After ALL questions, add a line that says "ANSWER KEY:" followed by the',
    '  correct answers, numbered to match.',
    '- Only use information present in the notes below. Do not invent facts.',
    '',
    '--- NOTES START ---',
    notes.trim(),
    '--- NOTES END ---'
  ].join('\n');

  const history = [{ role: 'user', content: prompt }];

  try {
    const result = completion({ modelId, history, stream: true });
    for await (const token of result.tokenStream) {
      process.stdout.write(token);
    }
    process.stdout.write('\n');
  } catch (err) {
    console.error('\n✖ Completion failed:', err);
  } finally {
    // Free the model from memory before exiting.
    await unloadModel({ modelId });
  }
}

main().catch((err) => {
  console.error('✖ Unexpected error:', err);
  process.exit(1);
});
