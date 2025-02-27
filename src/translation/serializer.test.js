"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const node_assert_1 = __importDefault(require("node:assert"));
const serializer_js_1 = require("#translation/serializer.js");
function readStream(stream) {
    const chunks = [];
    return new Promise((res, rej) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', (err) => rej(err));
        stream.on('end', () => res(Buffer.concat(chunks).toString('utf8')));
    });
}
async function serialize(template, input) {
    const serializer = new serializer_js_1.X12Serializer(input, template);
    const stream = await serializer.serialize();
    return await readStream(stream);
}
const input = {
    singleMember: {
        lastname: 'lastname',
        firstname: 'firstname',
        nicknames: ['nick1', 'nick2', 'nick3'],
    },
    members: [
        {
            lastname: 'lastname1',
            firstname: 'firstname1',
            'nick names': ['nick11', 'nick12', 'nick13'],
        },
        {
            lastname: 'lastname2',
            firstname: 'firstname2',
            'nick names': ['nick21', 'nick22', 'nick23'],
        },
    ],
};
(0, node_test_1.describe)('X12Serializer', () => {
    (0, node_test_1.it)('length attribute', async () => {
        const templates = [
            {
                $schema: '',
                name: '',
                version: '0.0.1',
                elementSeparator: '*',
                segmentSeparator: '~',
                componentSeparator: ':',
                repetitionSeparator: '!',
                rules: [
                    {
                        name: 'first_segment',
                        container: false,
                        elements: [
                            {
                                name: 'first_name',
                                value: '{{singleMember.firstname}}',
                                attributes: {
                                    length: {
                                        min: 0,
                                        max: 5,
                                    },
                                },
                            },
                        ],
                        children: [],
                    },
                ],
            },
            {
                $schema: '',
                name: '',
                version: '0.0.1',
                elementSeparator: '*',
                segmentSeparator: '~',
                componentSeparator: ':',
                repetitionSeparator: '!',
                rules: [
                    {
                        name: 'first_segment',
                        container: false,
                        elements: [
                            {
                                name: 'first_name',
                                value: '{{singleMember.firstname}}',
                                attributes: {
                                    length: {
                                        min: 0,
                                        max: 15,
                                    },
                                },
                            },
                        ],
                        children: [],
                    },
                ],
            },
            {
                $schema: '',
                name: '',
                version: '0.0.1',
                elementSeparator: '*',
                segmentSeparator: '~',
                componentSeparator: ':',
                repetitionSeparator: '!',
                rules: [
                    {
                        name: 'first_segment',
                        container: false,
                        elements: [
                            {
                                name: 'first_name',
                                value: '{{singleMember.firstname}}',
                                attributes: {
                                    length: {
                                        min: 15,
                                        max: 15,
                                        padding: '_',
                                    },
                                },
                            },
                        ],
                        children: [],
                    },
                ],
            },
            {
                $schema: '',
                name: '',
                version: '0.0.1',
                elementSeparator: '*',
                segmentSeparator: '~',
                componentSeparator: ':',
                repetitionSeparator: '!',
                rules: [
                    {
                        name: 'first_segment',
                        container: false,
                        elements: [
                            {
                                name: 'first_name',
                                value: '{{singleMember.firstname}}',
                                attributes: {
                                    length: {
                                        min: 15,
                                        max: 20,
                                        padding: '_',
                                    },
                                },
                            },
                        ],
                        children: [],
                    },
                ],
            },
        ];
        const wants = [
            'first~',
            'firstname~',
            'firstname______~',
            'firstname______~',
        ];
        for (let ii = 0; ii < templates.length; ++ii) {
            const template = templates[ii];
            const got = await serialize(template, input);
            const want = wants[ii];
            node_assert_1.default.deepEqual(got, want);
        }
    });
    (0, node_test_1.it)('ignore segment property', async () => {
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: ':',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'first_segment',
                    container: false,
                    ignore: '',
                    elements: [
                        {
                            name: 'first_name',
                            value: '{{singleMember.firstname}}',
                        },
                    ],
                    children: [],
                },
                {
                    name: 'second_segment',
                    container: false,
                    ignore: `{{#compare singleMember.firstname '==' 'firstname'}}true{{else}}{{/compare}}`,
                    elements: [
                        {
                            name: 'first_name',
                            value: '{{singleMember.firstname}}',
                        },
                    ],
                    children: [],
                },
                {
                    name: 'third_segment',
                    container: false,
                    ignore: `{{#compare singleMember.firstname '==' 'test'}}true{{else}}{{/compare}}`,
                    elements: [
                        {
                            name: 'first_name',
                            value: '{{singleMember.firstname}}',
                        },
                    ],
                    children: [],
                },
            ],
        };
        const want = `firstname~firstname~`;
        const got = await serialize(template, input);
        node_assert_1.default.deepEqual(got, want);
    });
    (0, node_test_1.it)('filter segment property', async () => {
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: ':',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'first_segment',
                    container: false,
                    filter: {
                        property: 'members',
                        expression: `{{#compare firstname '==' 'firstname1'}}1{{/compare}}`,
                    },
                    elements: [
                        {
                            name: 'first_element',
                            value: '{{members.length}}',
                        },
                    ],
                    children: [],
                },
                {
                    name: 'second_segment',
                    container: false,
                    elements: [
                        {
                            name: 'second_element',
                            value: '{{members.length}}',
                        },
                    ],
                    children: [],
                },
            ],
        };
        const want = `1~2~`;
        const got = await serialize(template, input);
        node_assert_1.default.deepEqual(got, want);
    });
    (0, node_test_1.it)('match helper', async () => {
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: ':',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'first_segment',
                    container: false,
                    ignore: '',
                    elements: [
                        {
                            name: 'first_name',
                            value: `{{match singleMember.firstname 'firstname' 'middlename' 'lastname'}}`,
                        },
                        {
                            name: 'first_name',
                            value: `{{match singleMember.firstname 'noname' 'middlename' 'lastname'}}`,
                        },
                        {
                            name: 'first_name',
                            value: `{{match singleMember.firstname singleMember.firstname 'middlename' 'lastname'}}`,
                        },
                    ],
                    children: [],
                },
            ],
        };
        const want = 'firstname**firstname~';
        const got = await serialize(template, input);
        node_assert_1.default.deepEqual(got, want);
    });
    (0, node_test_1.it)('matchArray helper', async () => {
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: ':',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'first_segment',
                    container: false,
                    elements: [
                        {
                            name: 'first_name',
                            value: `{{matchArray 'nick1' singleMember.nicknames}}`,
                        },
                        {
                            name: 'first_name',
                            value: `{{matchArray 'nonick' singleMember.nicknames}}`,
                        },
                    ],
                    children: [],
                },
            ],
        };
        const want = 'nick1*~';
        const got = await serialize(template, input);
        node_assert_1.default.deepEqual(got, want);
    });
    (0, node_test_1.it)('length helper', async () => {
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: ':',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'first_segment',
                    container: false,
                    elements: [
                        {
                            name: 'first element',
                            value: '{{#length}}{{singleMember.firstname}}{{/length}}',
                        },
                        {
                            name: 'second element',
                            value: `{{#length}}{{#each singleMember.nicknames}}{{#compare this '==' 'nick2'}}1{{/compare}}{{/each}}{{/length}}`,
                        },
                    ],
                    children: [],
                },
            ],
        };
        const want = '9*1~';
        const got = await serialize(template, input);
        node_assert_1.default.deepEqual(got, want);
    });
    (0, node_test_1.it)('segment count', async () => {
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '::',
            repetitionSeparator: '!!',
            rules: [
                {
                    name: 'Opening_Segment',
                    container: false,
                    elements: [
                        {
                            name: 'Opening_Element',
                            value: 'open',
                        },
                    ],
                    children: [
                        {
                            name: 'Member_Record1',
                            container: false,
                            elements: [
                                {
                                    name: 'firstname',
                                    value: 'firstname1',
                                },
                                {
                                    name: 'lastname',
                                    value: 'lastname1',
                                },
                            ],
                            children: [],
                        },
                        {
                            name: 'Member_Record2',
                            container: false,
                            elements: [
                                {
                                    name: 'firstname',
                                    value: 'firstname2',
                                },
                                {
                                    name: 'lastname',
                                    value: 'lastname2',
                                },
                            ],
                            children: [],
                        },
                    ],
                    closeRule: {
                        name: 'Closing_Segment',
                        elements: [
                            {
                                name: 'Closing_Element',
                                value: 'close',
                            },
                            {
                                name: 'iteration_count',
                                value: '{{_segment_count}}',
                            },
                        ],
                    },
                },
            ],
        };
        const want = 'open~firstname1*lastname1~firstname2*lastname2~close*2~';
        const got = await serialize(template, input);
        node_assert_1.default.deepEqual(got, want);
    });
    (0, node_test_1.it)('segment count with repetition', async () => {
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '::',
            repetitionSeparator: '!!',
            rules: [
                {
                    name: 'Opening_Segment',
                    container: false,
                    elements: [
                        {
                            name: 'Opening_Element',
                            value: 'open',
                        },
                    ],
                    children: [
                        {
                            name: 'Member_Records',
                            container: false,
                            repetition: {
                                property: 'members',
                            },
                            elements: [
                                {
                                    name: 'firstname',
                                    value: '{{firstname}}',
                                },
                                {
                                    name: 'lastname',
                                    value: '{{lastname}}',
                                },
                            ],
                            children: [],
                        },
                    ],
                    closeRule: {
                        name: 'Closing_Segment',
                        elements: [
                            {
                                name: 'Closing_Element',
                                value: 'close',
                            },
                            {
                                name: 'iteration_count',
                                value: '{{_segment_count}}',
                            },
                        ],
                    },
                },
            ],
        };
        const want = 'open~firstname1*lastname1~firstname2*lastname2~close*2~';
        const got = await serialize(template, input);
        node_assert_1.default.deepEqual(got, want);
    });
    (0, node_test_1.it)('repetition property', async () => {
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: ':',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'first_segment',
                    container: false,
                    repetition: {
                        property: 'members',
                    },
                    elements: [
                        {
                            name: 'first_name',
                            value: '{{firstname}}',
                        },
                    ],
                    children: [],
                },
            ],
        };
        const want = 'firstname1~firstname2~';
        const got = await serialize(template, input);
        node_assert_1.default.deepEqual(got, want);
    });
    (0, node_test_1.it)('repetition property with filter', async () => {
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: ':',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'first_segment',
                    container: false,
                    repetition: {
                        property: 'members',
                        filter: `{{#compare firstname '==' 'firstname1'}}true{{/compare}}`,
                    },
                    elements: [
                        {
                            name: 'first_name',
                            value: '{{firstname}}',
                        },
                    ],
                    children: [],
                },
            ],
        };
        const want = 'firstname1~';
        const got = await serialize(template, input);
        node_assert_1.default.deepEqual(got, want);
    });
    (0, node_test_1.it)('repetition property recursive', async () => {
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: ':',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'first_segment',
                    container: false,
                    repetition: {
                        property: 'members',
                    },
                    elements: [
                        {
                            name: 'first_name',
                            value: '{{firstname}}',
                        },
                    ],
                    children: [
                        {
                            name: 'recursive_segment',
                            container: false,
                            repetition: {
                                property: 'nick names',
                            },
                            elements: [
                                {
                                    name: 'nickname',
                                    value: '{{this}}',
                                },
                            ],
                            children: [],
                        },
                    ],
                },
            ],
        };
        const want = 'firstname1~nick11~nick12~nick13~firstname2~nick21~nick22~nick23~';
        const got = await serialize(template, input);
        node_assert_1.default.deepEqual(got, want);
    });
    (0, node_test_1.it)('repetition property recursive with filter', async () => {
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: ':',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'first_segment',
                    container: false,
                    repetition: {
                        property: 'members',
                    },
                    elements: [
                        {
                            name: 'first_name',
                            value: '{{firstname}}',
                        },
                    ],
                    children: [
                        {
                            name: 'recursive_segment',
                            container: false,
                            repetition: {
                                property: 'nick names',
                                filter: `{{#compare this '==' 'nick11'}}true{{/compare}}`,
                            },
                            elements: [
                                {
                                    name: 'nickname',
                                    value: '{{this}}',
                                },
                            ],
                            children: [],
                        },
                    ],
                },
            ],
        };
        const want = 'firstname1~nick11~firstname2~';
        const got = await serialize(template, input);
        node_assert_1.default.deepEqual(got, want);
    });
    (0, node_test_1.it)('repetition property recursive with filters', async () => {
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: ':',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'first_segment',
                    container: false,
                    repetition: {
                        property: 'members',
                        filter: `{{#compare firstname '==' 'firstname1'}}true{{/compare}}`,
                    },
                    elements: [
                        {
                            name: 'first_name',
                            value: '{{firstname}}',
                        },
                    ],
                    children: [
                        {
                            name: 'recursive_segment',
                            container: false,
                            repetition: {
                                property: 'nick names',
                                filter: `{{#compare this '==' 'nick11'}}true{{/compare}}`,
                            },
                            elements: [
                                {
                                    name: 'nickname',
                                    value: '{{this}}',
                                },
                            ],
                            children: [],
                        },
                    ],
                },
            ],
        };
        const want = 'firstname1~nick11~';
        const got = await serialize(template, input);
        node_assert_1.default.deepEqual(got, want);
    });
    (0, node_test_1.it)('trim property', async () => {
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '::',
            repetitionSeparator: '!!',
            rules: [
                {
                    name: 'Segment_One',
                    container: false,
                    trim: true,
                    elements: [
                        {
                            name: 'trimmed_segment_true',
                            value: 'header',
                        },
                        {
                            name: 'element_one',
                            value: '',
                        },
                        {
                            name: 'element_two',
                            value: '',
                        },
                        {
                            name: 'element_three',
                            value: '',
                        },
                    ],
                    children: [],
                    closeRule: {
                        name: 'CloseSegment',
                        trim: true,
                        elements: [
                            {
                                name: 'trimmed_close_true',
                                value: 'trailer',
                            },
                            {
                                name: 'element_one',
                                value: '',
                            },
                            {
                                name: 'element_two',
                                value: '',
                            },
                            {
                                name: 'element_three',
                                value: '',
                            },
                        ],
                    },
                },
                {
                    name: 'Segment_Two',
                    container: false,
                    trim: true,
                    elements: [
                        {
                            name: 'untrimmed_segment_true',
                            value: 'header',
                        },
                        {
                            name: 'element_one',
                            value: '',
                        },
                        {
                            name: 'element_two',
                            value: '',
                        },
                        {
                            name: 'element_three',
                            value: 'three',
                        },
                    ],
                    children: [],
                    closeRule: {
                        name: 'CloseSegment',
                        trim: true,
                        elements: [
                            {
                                name: 'untrimmed_close_true',
                                value: 'trailer',
                            },
                            {
                                name: 'element_one',
                                value: '',
                            },
                            {
                                name: 'element_two',
                                value: '',
                            },
                            {
                                name: 'element_three',
                                value: 'three',
                            },
                        ],
                    },
                },
                {
                    name: 'Segment_Three',
                    container: false,
                    trim: false,
                    elements: [
                        {
                            name: 'untrimmed_segment_false',
                            value: 'header',
                        },
                        {
                            name: 'element_one',
                            value: '',
                        },
                        {
                            name: 'element_two',
                            value: '',
                        },
                        {
                            name: 'element_three',
                            value: '',
                        },
                    ],
                    children: [],
                    closeRule: {
                        name: 'CloseSegment',
                        trim: false,
                        elements: [
                            {
                                name: 'untrimmed_close_false',
                                value: 'trailer',
                            },
                            {
                                name: 'element_one',
                                value: '',
                            },
                            {
                                name: 'element_two',
                                value: '',
                            },
                            {
                                name: 'element_three',
                                value: '',
                            },
                        ],
                    },
                },
                {
                    name: 'Segment_Four',
                    container: false,
                    trim: false,
                    elements: [
                        {
                            name: 'untrimmed_segment_false',
                            value: 'header',
                        },
                        {
                            name: 'element_one',
                            value: '',
                        },
                        {
                            name: 'element_two',
                            value: '',
                        },
                        {
                            name: 'element_three',
                            value: 'three',
                        },
                    ],
                    children: [],
                    closeRule: {
                        name: 'CloseSegment',
                        trim: false,
                        elements: [
                            {
                                name: 'untrimmed_close_false',
                                value: 'trailer',
                            },
                            {
                                name: 'element_one',
                                value: '',
                            },
                            {
                                name: 'element_two',
                                value: '',
                            },
                            {
                                name: 'element_three',
                                value: 'three',
                            },
                        ],
                    },
                },
            ],
        };
        const want = 'header~trailer~header***three~trailer***three~header***~trailer***~header***three~trailer***three~';
        const got = await serialize(template, input);
        node_assert_1.default.deepEqual(got, want);
    });
});
