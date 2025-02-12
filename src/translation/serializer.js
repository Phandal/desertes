"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.X12Serializer = void 0;
const handlebars_1 = __importDefault(require("handlebars"));
const date_fns_1 = require("date-fns");
const stream_1 = require("stream");
const NoOpFilter = (_input) => { return 'true'; };
class X12Serializer {
    input;
    template;
    constructor(input, template) {
        this.input = input;
        this.template = template;
        this.registerHelpers();
    }
    async serialize() {
        const stream = new stream_1.PassThrough();
        await this.startSerializationStream(stream);
        return stream;
    }
    startSerializationStream(stream) {
        return new Promise((resolve, reject) => {
            try {
                this.serializeSegments(this.template.rules, this.input, stream);
                stream.end();
                resolve();
            }
            catch (err) {
                reject(err);
            }
        });
    }
    _serializeSegments(segments, input, stream) {
        if (!segments) {
            return;
        }
        return () => {
            for (const segment of segments) {
                if (segment.repetition) {
                    const repetition = segment.repetition;
                    const repetitionObject = input[repetition.property];
                    const repetitionCount = Array.isArray(repetitionObject) ? repetitionObject.length : 1; // Note the serialization should take place even if the input is undefined
                    const filterExpression = this.filterFactory(repetition.filter);
                    for (let i = 0; i < repetitionCount; ++i) {
                        const input = Array.isArray(repetitionObject) ? repetitionObject[i] : undefined;
                        if (filterExpression(input) === '') {
                            continue;
                        }
                        ; // Allow for filtering in the template
                        if (segment.container) {
                            this.serializeSegments(segment.children, input, stream);
                        }
                        else {
                            this.serializeElements(segment.elements, input, stream);
                            this.serializeSegments(segment.children, input, stream);
                        }
                    }
                }
                else if (segment.filter) {
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
                        this.serializeSegments(segment.children, new_input, stream);
                    }
                    else {
                        this.serializeElements(segment.elements, new_input, stream);
                        this.serializeSegments(segment.children, new_input, stream);
                    }
                }
                else if (segment.ignore) {
                    const filterExpression = this.filterFactory(segment.ignore);
                    if (filterExpression(input) !== '') {
                        if (segment.container) {
                            this.serializeSegments(segment.children, input, stream);
                        }
                        else {
                            this.serializeElements(segment.elements, input, stream);
                            this.serializeSegments(segment.children, input, stream);
                        }
                    }
                }
                else {
                    if (segment.container) {
                        this.serializeSegments(segment.children, input, stream);
                    }
                    else {
                        this.serializeElements(segment.elements, input, stream);
                        this.serializeSegments(segment.children, input, stream);
                    }
                }
            }
        };
    }
    serializeSegments = this.trampoline(this._serializeSegments);
    serializeElements(elements, input, stream) {
        const elementLength = elements.length - 1;
        elements.forEach((element, index) => {
            const compile = handlebars_1.default.compile(element.value);
            const output = this.postCompileAttributes(element.attributes, compile(input));
            stream.write(output);
            stream.write(index === elementLength ? this.template.segmentSeparator : this.template.elementSeparator);
        });
    }
    postCompileAttributes(attrs, input) {
        if (!attrs) {
            return input;
        }
        let output = input;
        if (attrs.length) {
            output = this.lengthAttribute(output, attrs.length);
        }
        return output;
    }
    lengthAttribute(input, attr) {
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
    filterFactory(filterExpression) {
        if (!filterExpression) {
            return NoOpFilter;
        }
        const compile = handlebars_1.default.compile(filterExpression);
        return (input) => {
            return compile(input);
        };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trampoline(fn) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (...args) => {
            let result = fn.call(this, ...args);
            while (typeof result === 'function') {
                result = result();
            }
            return result;
        };
    }
    registerHelpers() {
        handlebars_1.default.registerHelper('dateFormat', function (format, input) {
            const dateStr = typeof input === 'string' ? new Date(input) : new Date().toISOString();
            return new handlebars_1.default.SafeString((0, date_fns_1.format)(dateStr, format));
        });
        handlebars_1.default.registerHelper('compare', function (a, operator, b, options) {
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
            }
            else {
                // console.log(JSON.stringify({ f: 'inverse', a, b }));
                //@ts-expect-error: no-implicit-any
                return options.inverse(this);
            }
        });
        handlebars_1.default.registerHelper('replace', function (match, replace, d) {
            if (typeof d !== 'string') {
                return d;
            }
            const reg = RegExp(match);
            return d.replace(reg, replace);
        });
        handlebars_1.default.registerHelper('replaceAll', function (match, replace, d) {
            if (typeof d !== 'string') {
                return d;
            }
            const reg = RegExp(match, 'g');
            return d.replaceAll(reg, replace);
        });
        handlebars_1.default.registerHelper('match', function (val, ...arr) {
            const idx = arr.indexOf(val);
            return idx < 0 ? '' : arr[idx];
        });
        handlebars_1.default.registerHelper('matchArray', function (val, arr) {
            const idx = arr.indexOf(val);
            return idx < 0 ? '' : arr[idx];
        });
        handlebars_1.default.registerHelper('length', function (options) {
            //@ts-expect-error: no-implicit-any
            return options.fn(this).length.toString();
        });
    }
}
exports.X12Serializer = X12Serializer;
