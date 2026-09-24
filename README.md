powershell -Command "@' 
#!/usr/bin/env node
import { readFile } from 'fs/promises';
import { loadModel, completion, unloadModel, LLAMA_3_2_1B_INST_Q4_0 } from '@qvac/sdk';

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

async function main() {
  const { notesPath, questionCount } = parseArgs(process.argv);

  let notes;
  try {
    notes = await readFile(notesPath, 'utf-8');
  } catch (err) {
    console.error('Could not read notes file:', err.message);
    process.exit(1);
  }

  if (!notes.trim()) {
    console.error('Notes file is empty.');
    process.exit(1);
  }

  console.log('Loading local model with QVAC SDK...');

  let modelId;
  try {
    modelId = await loadModel({ modelSrc: LLAMA_3_2_1B_INST_Q4_0 });
  } catch (err) {
    console.error('Failed to load model:', err);
    process.exit(1);
  }

  console.log(`Model loaded. Generating ${questionCount}-question quiz on-device...\n`);

  const prompt = [
    `Create exactly ${questionCount} multiple-choice questions using ONLY the study notes below.`,
    'Every question must have exactly four choices: A, B, C, D.',
    'Each question must have exactly one correct answer.',
    'Do not use outside knowledge.',
    'Do not invent facts.',
    'The correct answer must be directly supported by the notes.',
    'Make wrong choices clearly wrong according to the notes.',
    'After all questions, write ANSWER KEY:',
    'Give the correct letter and answer for each question.',
    '',
    'FORMAT:',
    '1. Question?',
    'A. Choice',
    'B. Choice',
    'C. Choice',
    'D. Choice',
    '',
    'ANSWER KEY:',
    '1. B. Correct answer',
    '',
    '--- NOTES START ---',
    notes.trim(),
    '--- NOTES END ---'
  ].join('\n');

  const history = [{ role: 'user', content: prompt }];

  try {
    const result = completion({
      modelId: modelId,
      history: history,
      stream: true
    });

    for await (const token of result.tokenStream) {
      process.stdout.write(token);
    }

    process.stdout.write('\n');
  } catch (err) {
    console.error('\nCompletion failed:', err);
  } finally {
    await unloadModel({ modelId });
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
'@ | Set-Content src\quiz.js"