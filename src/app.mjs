import express from 'express';
import cors from 'cors';
import { X12Serializer } from './translation/serializer.js';
import * as template from './translation/template.js';
import { Readable } from 'node:stream';
/** @import {AnySchemaObject} from 'ajv' */

const PORT = 3000;

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));

app.post('/translate', async function(req, res) {
  try {
    console.log('translating...');
    console.log('body', req.body);
    const body = req.body;
    const templ = body.template;
    const input = body.input;

    const valid = await template.validateSchema(templ, {
      loadSchema,
    });

    if (!valid.valid) {
      // @ts-ignore
      throw new Error(valid.errors.map((err) => `${err.message} | ${err.instancePath} | ${err.schemaPath}`).join(','));
    }

    const serializer = new X12Serializer(input, valid.template);
    const stream = await serializer.serialize();
    const output = await readStream(stream);

    res.status(200).send(output);
    console.log('output', output);
  } catch (err) {
    const message = (err instanceof Error) ? err.message : 'unknown translation error';
    res.status(500).send(message);
  }
});

console.error(`Listening on port ${PORT}...`);
app.listen(PORT);


/**
  * Reads all contents of the stream
  * @param {Readable} stream
  * @returns {Promise<string>}
  */
function readStream(stream) {
  /**@type {Buffer[]}*/
  const chunks = [];
  return new Promise((res, rej) => {
    stream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    stream.on('end', () => {
      res(Buffer.concat(chunks).toString('utf-8'));
    });

    stream.on('error', (err) => {
      rej(err);
    });
  });
}

/**
  * LoadSchema used in the ajv package to fetch json schemas
  * @param {string} uri
  * @returns {Promise<AnySchemaObject>}
  */
async function loadSchema(uri) {
  const res = await fetch(uri);
  if (!res.ok) {
    throw new Error("Loading Error: " + res.statusText);
  }

  const json = /** @type {AnySchemaObject} */ (await res.json());

  return json;
}
