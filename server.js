import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadModel, completion, unloadModel } from '@qvac/sdk';
import { LLAMA_3_2_1B_INST_Q4_0 } from '@qvac/sdk';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const webDir = join(__dirname, 'web');
const PORT = 3000;

async function generateQuiz(notes, questionCount) {
  const modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0
  });

  try {
    const prompt = [
      `Create exactly ${questionCount} multiple-choice questions from ONLY these study notes.`,
      'Each question must have exactly four choices: A, B, C, D.',
      'Each question must have exactly one correct answer.',
      'Do not use information that is not in the notes.',
      'Keep questions and choices short and clear.',
      '',
      'Use exactly this format:',
      '1. Question?',
      'A. Choice',
      'B. Choice',
      'C. Choice',
      'D. Choice',
      '',
      '2. Question?',
      'A. Choice',
      'B. Choice',
      'C. Choice',
      'D. Choice',
      '',
      'ANSWER KEY:',
      '1. B',
      '2. A',
      '',
      '--- STUDY NOTES ---',
      notes.trim(),
      '--- END NOTES ---'
    ].join('\n');

    const result = completion({
      modelId,
      history: [{ role: 'user', content: prompt }],
      stream: true
    });

    let output = '';

    for await (const token of result.tokenStream) {
      output += token;
    }

    return output;
  } finally {
    await unloadModel({ modelId });
  }
}

async function serveStatic(req, res) {
  let pathname = req.url.split('?')[0];

  if (pathname === '/') {
    pathname = '/index.html';
  }

  const safePath = normalize(pathname).replace(/^(\.\.[\\/])+/, '');
  const filePath = join(webDir, safePath);

  try {
    const data = await readFile(filePath);

    const types = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json'
    };

    res.writeHead(200, {
      'Content-Type': types[extname(filePath)] || 'text/plain'
    });

    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/quiz') {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const { notes, questionCount } = JSON.parse(body);

        if (!notes || !notes.trim()) {
          res.writeHead(400, {
            'Content-Type': 'application/json'
          });
          res.end(JSON.stringify({
            error: 'Please enter study notes.'
          }));
          return;
        }

        console.log('Generating quiz with QVAC...');

        const quiz = await generateQuiz(
          notes,
          Number(questionCount) || 3
        );

        res.writeHead(200, {
          'Content-Type': 'application/json'
        });

        res.end(JSON.stringify({ quiz }));
      } catch (error) {
        console.error(error);

        res.writeHead(500, {
          'Content-Type': 'application/json'
        });

        res.end(JSON.stringify({
          error: error.message
        }));
      }
    });

    return;
  }

  await serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log('');
  console.log('=================================');
  console.log('QVAC Study Quiz is running!');
  console.log(`Browser: http://localhost:${PORT}`);
  console.log('=================================');
  console.log('');
});