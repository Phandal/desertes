import Handlebars from 'handlebars';
import { PassThrough, type Readable, type Writable } from 'node:stream';
import type {
	ElementRule,
	ElementRuleAttribute,
	Template,
	Repetition,
	Serializer,
	SegmentRule,
	CloseSegmentRule,
} from './types.js';
import {
	format as datefnsFormat,
	parse as datefnsParse,
	sub as datefnsSub,
} from 'date-fns';

type FilterFunction = (input: unknown) => string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TrampolineFunction<K> = (...args: any[]) => Thunk<K>;
type Thunk<K> = K | (() => Thunk<K>);

const NoOpFilter: FilterFunction = (_input: unknown) => {
	return 'true';
};

export class X12Serializer<T extends Record<string, unknown>>
	implements Serializer<T>
{
	input: T;
	template: Template;

	constructor(input: T, template: Template) {
		this.input = input;
		this.template = template;
		this.setupLogger();
		this.registerHelpers();
	}

	public async serialize(): Promise<Readable> {
		const stream = new PassThrough();
		await this.startSerializationStream(stream);
		return stream;
	}

	private startSerializationStream(stream: Writable): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.serializeSegments(this.template.rules, this.input, stream);
				stream.end();
				resolve();
			} catch (err) {
				reject(err);
			}
		});
	}

	private _serializeSegments(
		segments: SegmentRule[] | undefined,
		input: T,
		stream: Writable,
	): Thunk<number> {
		if (!segments) {
			return 0;
		}

		return (): number => {
			let segmentCount = 0;
			for (const segment of segments) {
				if (segment.repetition) {
					const repetition: Repetition = segment.repetition;
					const repetitionObject = input[repetition.property];
					const repetitionCount = Array.isArray(repetitionObject)
						? repetitionObject.length
						: 1; // Note the serialization should take place even if the input is undefined

					const filterExpression = this.filterFactory(repetition.filter);

					for (let i = 0; i < repetitionCount; ++i) {
						const input = Array.isArray(repetitionObject)
							? repetitionObject[i]
							: undefined;

						if (filterExpression(input) === '') {
							continue;
						} // Allow for filtering in the template

						if (segment.container) {
							segmentCount += this.serializeSegments(
								segment.children,
								input,
								stream,
							);
						} else {
							this.serializeElements(
								segment.elements,
								input,
								segment.trim,
								stream,
							);
							segmentCount += this.serializeSegments(
								segment.children,
								input,
								stream,
							);
							segmentCount += this.updateSegmentCount(segment);
							this.serializeCloseRule(
								segment.closeRule,
								input,
								segmentCount,
								stream,
							);
						}
					}
				} else if (segment.filter) {
					const new_input = structuredClone(input);
					const filter = segment.filter;
					const filterExpression = this.filterFactory(filter.expression);
					const filterObject = input[filter.property];
					let filteredObject = filterObject;

					if (Array.isArray(filterObject)) {
						filteredObject = filterObject.filter((filterField) => {
							return filterExpression(filterField) !== '';
						});
					}

					//@ts-expect-error: cannot assign to generic T
					new_input[filter.property] = filteredObject;

					if (segment.container) {
						segmentCount += this.serializeSegments(
							segment.children,
							new_input,
							stream,
						);
					} else {
						this.serializeElements(
							segment.elements,
							new_input,
							segment.trim,
							stream,
						);
						segmentCount += this.serializeSegments(
							segment.children,
							new_input,
							stream,
						);
						segmentCount += this.updateSegmentCount(segment);
						this.serializeCloseRule(
							segment.closeRule,
							new_input,
							segmentCount,
							stream,
						);
					}
				} else if (segment.ignore) {
					const filterExpression = this.filterFactory(segment.ignore);

					if (filterExpression(input) !== '') {
						if (segment.container) {
							segmentCount += this.serializeSegments(
								segment.children,
								input,
								stream,
							);
						} else {
							this.serializeElements(
								segment.elements,
								input,
								segment.trim,
								stream,
							);
							segmentCount += this.serializeSegments(
								segment.children,
								input,
								stream,
							);
							segmentCount += this.updateSegmentCount(segment);
							this.serializeCloseRule(
								segment.closeRule,
								input,
								segmentCount,
								stream,
							);
						}
					}
				} else {
					if (segment.container) {
						segmentCount += this.serializeSegments(
							segment.children,
							input,
							stream,
						);
					} else {
						this.serializeElements(
							segment.elements,
							input,
							segment.trim,
							stream,
						);
						segmentCount += this.serializeSegments(
							segment.children,
							input,
							stream,
						);
						segmentCount += this.updateSegmentCount(segment);
						this.serializeCloseRule(
							segment.closeRule,
							input,
							segmentCount,
							stream,
						);
					}
				}
			}

			return segmentCount;
		};
	}

	private serializeSegments = this.trampoline<number>(this._serializeSegments);

	private serializeCloseRule(
		closeRule: CloseSegmentRule | undefined,
		input: T,
		segmentCount: number,
		stream: Writable,
	): void {
		if (!closeRule) {
			return;
		}

		const newInput = structuredClone(input);
		//@ts-expect-error: cannot assign to generic T
		newInput['_segment_count'] = segmentCount;
		this.serializeElements(
			closeRule.elements,
			newInput,
			closeRule.trim,
			stream,
		);
	}

	private serializeElements(
		elementRules: ElementRule[],
		input: T,
		trim: boolean | undefined,
		stream: Writable,
	): void {
		const elements: string[] = [];
		elementRules.forEach((element) => {
			const compile = Handlebars.compile<T>(element.value);
			const output = this.postCompileAttributes(
				element.attributes,
				compile(input),
			);
			elements.push(output);
		});

		let output = '';
		// Trim empty elements
		if (trim) {
			let encounteredNonEmptyElement = false;
			output = elements
				.reverse()
				.reduce((acc: string[], element: string) => {
					if (element.length === 0 && !encounteredNonEmptyElement) {
						return acc;
					}

					acc.push(element);
					encounteredNonEmptyElement = true;
					return acc;
				}, [])
				.reverse()
				.join(this.template.elementSeparator)
				.concat(this.template.segmentSeparator);
		} else {
			output = elements
				.join(this.template.elementSeparator)
				.concat(this.template.segmentSeparator);
		}

		stream.write(output);
	}

	private updateSegmentCount(segment: SegmentRule): number {
		if (!segment.container && segment.closeRule) {
			return 2;
		} else {
			return 1;
		}
	}

	private postCompileAttributes(
		attrs: ElementRuleAttribute | undefined,
		input: string,
	): string {
		if (!attrs) {
			return input;
		}
		let output = input;

		if (attrs.length) {
			output = this.lengthAttribute(output, attrs.length);
		}

		return output;
	}

	private lengthAttribute(
		input: string,
		attr: ElementRuleAttribute['length'],
	): string {
		const max = attr.max;
		const min = attr.min;
		const padding = attr.padding || ' ';

		if (max < min) {
			return input;
		}
		let output = input;

		if (output.length > max) {
			output = output.substring(0, max);
		}

		if (output.length < min) {
			output = output.padEnd(min, padding);
		}

		return output;
	}

	private filterFactory(filterExpression?: string): FilterFunction {
		if (!filterExpression) {
			return NoOpFilter;
		}

		const compile = Handlebars.compile(filterExpression);

		return (input: unknown) => {
			return compile(input);
		};
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private trampoline<K>(fn: TrampolineFunction<K>): (...args: any[]) => K {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (...args: any[]): K => {
			let result = fn.call(this, ...args);

			while (typeof result === 'function') {
				result = (result as () => Thunk<K>)();
			}

			return result;
		};
	}

	private setupLogger(): void {
		Handlebars.logger.log = (_level, obj): void =>
			console.log({ msg: `Handlebars Log: ${obj}` });
	}

	private registerHelpers(): void {
		Handlebars.registerHelper(
			'dateFormat',
			function (
				format: string,
				input?: string,
				inputFormat?: string | unknown,
			): Handlebars.SafeString {
				if (typeof input === 'string' && input.length === 0) {
					return new Handlebars.SafeString('');
				} else {
					const dateStr = createValidDate(input, inputFormat);
					return new Handlebars.SafeString(datefnsFormat(dateStr, format));
				}
			},
		);

		Handlebars.registerHelper(
			'dateCompare',
			function (
				key: string,
				operator: string,
				input: string,
				options: Handlebars.HelperOptions,
			): string {
				let result;
				const ad = getDateFromKey(key);
				const bd = new Date(input);

				switch (operator) {
					case '==':
						result = ad === bd;
						break;
					case '!=':
						result = ad !== bd;
						break;
					case '<=':
						result = ad <= bd;
						break;
					case '>=':
						result = ad >= bd;
						break;
					case '<':
						result = ad < bd;
						break;
					case '>':
						result = ad > bd;
						break;
					default:
						throw new Error(`invalid date compare operator: ${operator}`);
				}

				if (result) {
					//@ts-expect-error: no-implicit-any
					return options.fn(this);
				} else {
					//@ts-expect-error: no-implicit-any
					return options.inverse(this);
				}
			},
		);

		Handlebars.registerHelper(
			'compare',
			function (
				a: string,
				operator: string,
				b: string,
				options: Handlebars.HelperOptions,
			): string {
				let result;

				switch (operator) {
					case '==':
						result = a === b;
						break;
					case '!=':
						result = a !== b;
						break;

					case '>=':
						result = a >= b;
						break;
					case '<=':
						result = a <= b;
						break;
					default:
						throw new Error(`invalid operator: ${operator}`);
				}

				if (result) {
					// console.log(JSON.stringify({ f: 'fn', a, b }));
					//@ts-expect-error: no-implicit-any
					return options.fn(this);
				} else {
					// console.log(JSON.stringify({ f: 'inverse', a, b }));
					//@ts-expect-error: no-implicit-any
					return options.inverse(this);
				}
			},
		);

		Handlebars.registerHelper(
			'replace',
			function (match: string, replace: string, d: string): string {
				if (typeof d !== 'string') {
					return d;
				}

				const reg = RegExp(match);
				return d.replace(reg, replace);
			},
		);

		Handlebars.registerHelper(
			'replaceAll',
			function (match: string, replace: string, d: string): string {
				if (typeof d !== 'string') {
					return d;
				}

				const reg = RegExp(match, 'g');
				return d.replaceAll(reg, replace);
			},
		);

		Handlebars.registerHelper(
			'match',
			function (val: string, ...arr: unknown[]): string {
				const idx = arr.indexOf(val);

				return idx < 0 ? '' : (arr[idx] as string);
			},
		);

		Handlebars.registerHelper(
			'matchArray',
			function (val: string, arr: string[]): string {
				const idx = arr.indexOf(val);

				return idx < 0 ? '' : arr[idx];
			},
		);

		Handlebars.registerHelper(
			'length',
			function (options: Handlebars.HelperOptions): string {
				//@ts-expect-error: no-implicit-any
				return options.fn(this).length.toString();
			},
		);

		Handlebars.registerHelper(
			'ssnFormat',
			function (key: string, ssn: string): string {
				const { first, second, third } = parseSSN(ssn);
				switch (key) {
					case 'dash':
						return `${first}-${second}-${third}`;
					case 'nodash':
						return `${first}${second}${third}`;
					default:
						throw new Error(`invalid ssn format key '${key}'`);
				}
			},
		);
	}
}

function getDateFromKey(key: string): Date {
	switch (key) {
		case 'lastweek':
			return datefnsSub(new Date(), {
				weeks: 1,
			});
		case 'yesterday':
			return datefnsSub(new Date(), {
				days: 1,
			});
		default:
			throw new Error(`invalid date compare key: ${key}`);
	}
}

function createValidDate(input?: string, inputFormat?: string | unknown): Date {
	if (input === undefined || typeof input !== 'string') {
		return new Date();
	}

	if (inputFormat === undefined || typeof inputFormat !== 'string') {
		return new Date(input);
	}
	return datefnsParse(input, inputFormat, new Date());
}

function parseSSN(ssn: string): {
	first: string;
	second: string;
	third: string;
} {
	if (ssn.length === 9) {
		return {
			first: ssn.substring(0, 3),
			second: ssn.substring(3, 5),
			third: ssn.substring(5, 9),
		};
	} else if (
		ssn.length === 11 &&
		ssn.charAt(3) === '-' &&
		ssn.charAt(6) === '-'
	) {
		return {
			first: ssn.substring(0, 3),
			second: ssn.substring(4, 6),
			third: ssn.substring(7, 11),
		};
	} else {
		throw new Error(
			`invalid ssn format '${ssn.replaceAll(/[a-zA-Z0-9]/g, 'X')}'`,
		);
	}
}
