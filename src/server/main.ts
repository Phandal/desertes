import express from 'express';
import cors from 'cors';
import { PassThrough, type Readable } from 'node:stream';
import ViteExpress from 'vite-express';
import * as template from './translation/template.js';
import * as inboundTemplate from './inboundTranslation/template.js';
import { SerializerFactory, Serializer_0_0_1 } from './translation/serializer';
import type { AnySchemaObject } from 'ajv';
import {
	DeserializerFactory,
	Deserializer_0_0_1,
} from './translation/deserializer.js';
import { createParser } from './inboundTranslation/parsers/parserfactory.js';
import { assemble } from './inboundTranslation/assembler.js';
import { convert } from './inboundTranslation/converter.js';

// Setup Factories
SerializerFactory.registerSerializer(new Serializer_0_0_1());
DeserializerFactory.registerDeserializer(new Deserializer_0_0_1());

const PORT = 3000;
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('^/$', (_, res) => {
	res.redirect('routes/');
});

app.get('/(routes/)?deserialize$', (_, res) => {
	res.redirect('/routes/deserialize/');
});

app.get('/(routes/)?serialize$', (_, res) => {
	res.redirect('/routes/serialize/');
});

app.post('/translate', async (req, res) => {
	try {
		console.log('translating...');
		console.log('body', req.body);
		const body = req.body;
		const templ = body.template;
		const mode = body.mode;
		const today = body.today;
		let output = '';

		if (mode === 'serialize') {
			const validationResponse = await template.validateSchema(templ, {
				loadSchema,
			});

			if (validationResponse instanceof Error) {
				throw validationResponse;
			}
			if (!validationResponse.valid) {
				// @ts-ignore
				throw new Error(
					validationResponse.errors
						.map(
							(err) =>
								`${err.message} | ${err.instancePath} | ${err.schemaPath}`,
						)
						.join(','),
				);
			}

			const input = body.serializerInput;
			const serializer = SerializerFactory.getSerializer(
				validationResponse.template.version,
			);
			const stream = new PassThrough();
			await serializer.serialize(
				stream,
				today,
				input,
				validationResponse.template,
			);
			output = await readStream(stream);
		} else if (mode === 'deserialize') {
			const config = inboundTemplate.validate(JSON.stringify(templ));
			if (config instanceof Error) {
				throw config;
			}

			const input = body.deserializerInput;
			const parser = createParser(config.parser);
			const parsedRecords = await parser(input);
			const members = assemble(config.assembler, parsedRecords);
			console.log('here');
			output = JSON.stringify(convert(members), null, 2);
		} else {
			throw new Error(`invalid mode '${mode}'`);
		}

		res.status(200).send(output);
		console.log('output', output);
	} catch (err) {
		const message =
			err instanceof Error ? err.message : 'unknown translation error';
		res.status(500).send(message);
	}
});

ViteExpress.listen(app, PORT, () =>
	console.log(`Server is listening on port localhost:${PORT}...`),
);

function readStream(stream: Readable): Promise<string> {
	const chunks: Buffer[] = [];
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

async function loadSchema(uri: string) {
	const res = await fetch(uri);
	if (!res.ok) {
		throw new Error(`Loading Error: ${res.statusText}`);
	}

	const json = <AnySchemaObject>await res.json();

	return json;
}
