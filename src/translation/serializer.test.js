import { describe, it } from 'node:test';
import assert from 'node:assert';
import { X12Serializer } from '#translation/serializer.js';
function readStream(stream) {
    const chunks = [];
    return new Promise((res, rej) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', (err) => rej(err));
        stream.on('end', () => res(Buffer.concat(chunks).toString('utf8')));
    });
}
async function serialize(template, input) {
    const serializer = new X12Serializer(input, template);
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
describe('X12Serializer', () => {
    it('should be able to serialize an object to an edi string based on a template without any replacements', async () => {
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '>',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'ISA',
                    container: false,
                    elements: [
                        {
                            name: 'ISA_Segment',
                            value: 'ISA',
                        },
                        {
                            name: 'Authorization_Information_Qualifier',
                            value: '00',
                        },
                    ],
                    children: [
                        {
                            name: 'GS',
                            container: false,
                            elements: [
                                {
                                    name: 'GS_Segment',
                                    value: 'GS',
                                },
                                {
                                    name: 'Functional_Identifier_Code',
                                    value: '01',
                                },
                            ],
                            children: [
                                {
                                    name: 'ST',
                                    container: false,
                                    elements: [
                                        {
                                            name: 'ST_Segment',
                                            value: 'ST',
                                        },
                                        {
                                            name: 'Transaction_Set_Identifier_Code',
                                            value: '834',
                                        },
                                    ],
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        const want = 'ISA*00~GS*01~ST*834~';
        const got = await serialize(template, input);
        assert.deepEqual(got, want);
    });
    it('should be able to serialize an object to an edi string based on a template with containers and no replacements', async () => {
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '>',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'ISA',
                    container: false,
                    elements: [
                        {
                            name: 'ISA_Segment',
                            value: 'ISA',
                        },
                        {
                            name: 'Authorization_Information_Qualifier',
                            value: '00',
                        },
                    ],
                    children: [
                        {
                            name: 'GS',
                            container: false,
                            elements: [
                                {
                                    name: 'GS_Segment',
                                    value: 'GS',
                                },
                                {
                                    name: 'Functional_Identifier_Code',
                                    value: '01',
                                },
                            ],
                            children: [
                                {
                                    name: 'ST_Loop',
                                    container: true,
                                    children: [
                                        {
                                            name: 'ST',
                                            container: false,
                                            elements: [
                                                {
                                                    name: 'ST_Segment',
                                                    value: 'ST',
                                                },
                                                {
                                                    name: 'Transaction_Set_Identifier_Code',
                                                    value: '834',
                                                },
                                            ],
                                            children: [],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        const want = 'ISA*00~GS*01~ST*834~';
        const got = await serialize(template, input);
        assert.deepEqual(got, want);
    });
    it('should be able to serialize an object to an edi string based on a template with replacements via hanldebars', async () => {
        const input = { firstValue: '00', secondValue: '01' };
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '>',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'ISA',
                    container: false,
                    elements: [
                        {
                            name: 'ISA_Segment',
                            value: 'ISA',
                        },
                        {
                            name: 'Authorization_Information_Qualifier',
                            value: '{{firstValue}}',
                        },
                    ],
                    children: [
                        {
                            name: 'GS',
                            container: false,
                            elements: [
                                {
                                    name: 'GS_Segment',
                                    value: 'GS',
                                },
                                {
                                    name: 'Functional_Identifier_Code',
                                    value: '{{secondValue}}',
                                },
                            ],
                            children: [
                                {
                                    name: 'ST',
                                    container: false,
                                    elements: [
                                        {
                                            name: 'ST_Segment',
                                            value: 'ST',
                                        },
                                        {
                                            name: 'Transaction_Set_Identifier_Code',
                                            value: '834',
                                        },
                                    ],
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        const want = 'ISA*00~GS*01~ST*834~';
        const got = await serialize(template, input);
        assert.deepEqual(got, want);
    });
    it('should be able to serialize an object to an edi string based on a template with siblings and with replacements via handlebars', async () => {
        const input = {
            firstValue: '00',
            secondValue: '01',
            transactionSets: [
                { identifier: '111' },
                { identifier: '222' },
            ],
        };
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '>',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'ISA',
                    container: false,
                    elements: [
                        {
                            name: 'ISA_Segment',
                            value: 'ISA',
                        },
                        {
                            name: 'Authorization_Information_Qualifier',
                            value: '{{firstValue}}',
                        },
                    ],
                    children: [
                        {
                            name: 'GS',
                            container: false,
                            elements: [
                                {
                                    name: 'GS_Segment',
                                    value: 'GS',
                                },
                                {
                                    name: 'Functional_Identifier_Code',
                                    value: '{{secondValue}}',
                                },
                            ],
                            children: [
                                {
                                    name: 'ST',
                                    container: false,
                                    repetition: {
                                        property: 'transactionSets',
                                    },
                                    elements: [
                                        {
                                            name: 'ST_Segment',
                                            value: 'ST',
                                        },
                                        {
                                            name: 'Transaction_Set_Identifier_Code',
                                            value: '{{identifier}}',
                                        },
                                    ],
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        const want = 'ISA*00~GS*01~ST*111~ST*222~';
        const got = await serialize(template, input);
        assert.deepEqual(got, want);
    });
    it('should be able to serialize an object to an edi string based on a template with containers and with replacements via hanldebars', async () => {
        const input = {
            firstValue: '00',
            secondValue: '01',
            transactionSets: [
                { identifier: '834' },
                { identifier: '856' },
            ],
        };
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '>',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'ISA',
                    container: false,
                    elements: [
                        {
                            name: 'ISA_Segment',
                            value: 'ISA',
                        },
                        {
                            name: 'Authorization_Information_Qualifier',
                            value: '{{firstValue}}',
                        },
                    ],
                    children: [
                        {
                            name: 'GS',
                            container: false,
                            elements: [
                                {
                                    name: 'GS_Segment',
                                    value: 'GS',
                                },
                                {
                                    name: 'Functional_Identifier_Code',
                                    value: '{{secondValue}}',
                                },
                            ],
                            children: [
                                {
                                    name: 'ST_loop',
                                    container: true,
                                    children: [
                                        {
                                            name: 'ST',
                                            container: false,
                                            repetition: {
                                                property: 'transactionSets',
                                            },
                                            elements: [
                                                {
                                                    name: 'ST_Segment',
                                                    value: 'ST',
                                                },
                                                {
                                                    name: 'Transaction_Set_Identifier_Code',
                                                    value: '{{identifier}}',
                                                },
                                            ],
                                            children: [],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        const want = 'ISA*00~GS*01~ST*834~ST*856~';
        const got = await serialize(template, input);
        assert.deepEqual(got, want);
    });
    it('should be able to serialize an object to an edi string based on a template with containers and siblings and replacements via handlebars', async () => {
        const input = {
            firstValue: '00',
            secondValue: '01',
            transactionSets: [
                {
                    stIdentifier: '111',
                    bsns: [
                        { identifier: 'bsn1' },
                        { identifier: 'bsn2' },
                    ],
                },
                {
                    stIdentifier: '222',
                    bsns: [
                        { identifier: 'bsn3' },
                        { identifier: 'bsn4' },
                    ],
                },
            ],
        };
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '>',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'ISA',
                    container: false,
                    elements: [
                        {
                            name: 'ISA_Segment',
                            value: 'ISA',
                        },
                        {
                            name: 'Authorization_Information_Qualifier',
                            value: '{{firstValue}}',
                        },
                    ],
                    children: [
                        {
                            name: 'GS',
                            container: false,
                            elements: [
                                {
                                    name: 'GS_Segment',
                                    value: 'GS',
                                },
                                {
                                    name: 'Functional_Identifier_Code',
                                    value: '{{secondValue}}',
                                },
                            ],
                            children: [
                                {
                                    name: 'ST_loop',
                                    container: true,
                                    children: [
                                        {
                                            name: 'ST',
                                            container: false,
                                            repetition: {
                                                property: 'transactionSets',
                                            },
                                            elements: [
                                                {
                                                    name: 'ST_Segment',
                                                    value: 'ST',
                                                },
                                                {
                                                    name: 'Transaction_Set_Identifier_Code',
                                                    value: '{{stIdentifier}}',
                                                },
                                            ],
                                            children: [
                                                {
                                                    name: 'BSN',
                                                    container: false,
                                                    repetition: {
                                                        property: 'bsns',
                                                    },
                                                    elements: [
                                                        {
                                                            name: 'BSN_Segment',
                                                            value: 'BSN',
                                                        },
                                                        {
                                                            name: 'BSN01',
                                                            value: '{{identifier}}',
                                                        },
                                                    ],
                                                    children: [],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        const want = 'ISA*00~GS*01~ST*111~BSN*bsn1~BSN*bsn2~ST*222~BSN*bsn3~BSN*bsn4~';
        const got = await serialize(template, input);
        assert.deepEqual(got, want);
    });
    it('should be able to serialize an object to an edi string based on a template with containers and siblings and more than one element replaced via handlebars', async () => {
        const input = {
            firstValue: '00',
            secondValue: '01',
        };
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '>',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'ISA',
                    container: false,
                    elements: [
                        {
                            name: 'ISA_Segment',
                            value: 'ISA',
                        },
                        {
                            name: 'Authorization_Information_Qualifier',
                            value: '{{firstValue}}',
                        },
                        {
                            name: 'Authorization_Information',
                            value: '{{secondValue}}',
                        },
                    ],
                    children: [],
                },
            ],
        };
        const want = 'ISA*00*01~';
        const got = await serialize(template, input);
        assert.deepEqual(got, want);
    });
    it('should be able to serialize an object to an edi string where the handlebars replacement is 2 levels deep and the second level has a larger number of keys than the first', async () => {
        const input = {
            firstValue: 'firstValue',
            st: [
                {
                    stValue: 'st01',
                    bgn: [
                        { key: 1 },
                        { key: 2 },
                        { key: 3 },
                    ],
                },
                {
                    stValue: 'st02',
                    bgn: [
                        { key: 4 },
                        { key: 5 },
                        { key: 6 },
                    ],
                },
            ],
        };
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '>',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'ISA',
                    container: false,
                    elements: [
                        {
                            name: 'ISA_Segment',
                            value: 'ISA',
                        },
                        {
                            name: 'Authorization_Information_Qualifier',
                            value: '{{firstValue}}',
                        },
                    ],
                    children: [
                        {
                            name: 'ST',
                            container: false,
                            repetition: {
                                property: 'st',
                            },
                            elements: [
                                {
                                    name: 'ST_Segment',
                                    value: 'ST',
                                },
                                {
                                    name: 'Identifier',
                                    value: '{{stValue}}',
                                },
                            ],
                            children: [
                                {
                                    name: 'BGN',
                                    container: false,
                                    repetition: {
                                        property: 'bgn',
                                    },
                                    elements: [
                                        {
                                            name: 'BGN_Segment',
                                            value: 'BGN',
                                        },
                                        {
                                            name: 'first',
                                            value: '{{key}}',
                                        },
                                    ],
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        const want = 'ISA*firstValue~ST*st01~BGN*1~BGN*2~BGN*3~ST*st02~BGN*4~BGN*5~BGN*6~';
        const got = await serialize(template, input);
        assert.deepEqual(got, want);
    });
    it('should be able to serialize an object to an edi string where the handlebars replacement is 2 levels deep and the second level has a smaller number of keys than the first', async () => {
        const input = {
            firstValue: 'firstValue',
            st: [
                {
                    stValue: 'st01',
                    bgn: [
                        { key: 1 },
                        { key: 2 },
                    ],
                },
                {
                    stValue: 'st02',
                    bgn: [
                        { key: 3 },
                        { key: 4 },
                    ],
                },
                {
                    stValue: 'st03',
                    bgn: [
                        { key: 5 },
                        { key: 6 },
                    ],
                },
            ],
        };
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '>',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'ISA',
                    container: false,
                    elements: [
                        {
                            name: 'ISA_Segment',
                            value: 'ISA',
                        },
                        {
                            name: 'Authorization_Information_Qualifier',
                            value: '{{firstValue}}',
                        },
                    ],
                    children: [
                        {
                            name: 'ST',
                            container: false,
                            repetition: {
                                property: 'st',
                            },
                            elements: [
                                {
                                    name: 'ST_Segment',
                                    value: 'ST',
                                },
                                {
                                    name: 'Identifier',
                                    value: '{{stValue}}',
                                },
                            ],
                            children: [
                                {
                                    name: 'BGN',
                                    container: false,
                                    repetition: {
                                        property: 'bgn',
                                    },
                                    elements: [
                                        {
                                            name: 'BGN_Segment',
                                            value: 'BGN',
                                        },
                                        {
                                            name: 'first',
                                            value: '{{key}}',
                                        },
                                    ],
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        const want = 'ISA*firstValue~ST*st01~BGN*1~BGN*2~ST*st02~BGN*3~BGN*4~ST*st03~BGN*5~BGN*6~';
        const got = await serialize(template, input);
        assert.deepEqual(got, want);
    });
    it('should be able to serialize an object to an edi string where the handlebars replacement is 2 levels deep and the second level has a different number of keys than its siblings', async () => {
        const input = {
            firstValue: 'firstValue',
            st: [
                {
                    stValue: 'st01',
                    bgn: [
                        { key: 1 },
                    ],
                },
                {
                    stValue: 'st02',
                    bgn: [
                        { key: 2 },
                        { key: 3 },
                    ],
                },
                {
                    stValue: 'st03',
                    bgn: [
                        { key: 4 },
                        { key: 5 },
                        { key: 6 },
                    ],
                },
            ],
        };
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '>',
            repetitionSeparator: '!',
            rules: [
                {
                    name: 'ISA',
                    container: false,
                    elements: [
                        {
                            name: 'ISA_Segment',
                            value: 'ISA',
                        },
                        {
                            name: 'Authorization_Information_Qualifier',
                            value: '{{firstValue}}',
                        },
                    ],
                    children: [
                        {
                            name: 'ST',
                            container: false,
                            repetition: {
                                property: 'st',
                            },
                            elements: [
                                {
                                    name: 'ST_Segment',
                                    value: 'ST',
                                },
                                {
                                    name: 'Identifier',
                                    value: '{{stValue}}',
                                },
                            ],
                            children: [
                                {
                                    name: 'BGN',
                                    container: false,
                                    repetition: {
                                        property: 'bgn',
                                    },
                                    elements: [
                                        {
                                            name: 'BGN_Segment',
                                            value: 'BGN',
                                        },
                                        {
                                            name: 'first',
                                            value: '{{key}}',
                                        },
                                    ],
                                    children: [],
                                },
                            ],
                        },
                    ],
                },
            ],
        };
        const want = 'ISA*firstValue~ST*st01~BGN*1~ST*st02~BGN*2~BGN*3~ST*st03~BGN*4~BGN*5~BGN*6~';
        const got = await serialize(template, input);
        assert.deepEqual(got, want);
    });
    it('compare helper', async () => {
        const template = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '',
            repetitionSeparator: '',
            rules: [
                {
                    name: 'Segment_One',
                    container: false,
                    elements: [
                        {
                            name: 'element_one',
                            value: `{{#compare singleMember.lastname '==' 'firstname'}}1{{else}}0{{/compare}}`,
                        },
                        {
                            name: 'element_two',
                            value: `{{#compare singleMember.lastname '==' 'lastname'}}1{{else}}0{{/compare}}`,
                        },
                        {
                            name: 'element_three',
                            value: `{{#compare singleMember.lastname '==' 'nick1'}}1{{else compare singleMember.lastname '==' 'nick2'}}2{{else compare singleMember.lastname '==' 'lastname'}}3{{else}}0{{/compare}}`,
                        },
                        {
                            name: 'element_three',
                            value: `{{#compare singleMember.lastname '==' 'nick1'}}1{{else compare singleMember.lastname '==' 'nick2'}}2{{else compare singleMember.lastname '==' 'nick3'}}3{{else}}0{{/compare}}`,
                        },
                    ],
                    children: [],
                },
            ],
        };
        const want = '0*1*3*0~';
        const got = await serialize(template, input);
        assert.deepEqual(got, want);
    });
    it('length attribute', async () => {
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
            assert.deepEqual(got, want);
        }
    });
    it('ignore segment property', async () => {
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
        assert.deepEqual(got, want);
    });
    it('filter segment property', async () => {
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
        assert.deepEqual(got, want);
    });
    it('match helper', async () => {
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
        assert.deepEqual(got, want);
    });
    it('matchArray helper', async () => {
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
        assert.deepEqual(got, want);
    });
    it('length helper', async () => {
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
        assert.deepEqual(got, want);
    });
    it('segment count', async () => {
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
        assert.deepEqual(got, want);
    });
    it('segment count with repetition', async () => {
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
        assert.deepEqual(got, want);
    });
    it('repetition property', async () => {
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
        assert.deepEqual(got, want);
    });
    it('repetition property with filter', async () => {
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
        assert.deepEqual(got, want);
    });
    it('repetition property recursive', async () => {
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
        assert.deepEqual(got, want);
    });
    it('repetition property recursive with filter', async () => {
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
        assert.deepEqual(got, want);
    });
    it('repetition property recursive with filters', async () => {
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
        assert.deepEqual(got, want);
    });
    it('trim property', async () => {
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
        assert.deepEqual(got, want);
    });
    it('compareDate helper', async () => {
        const dateInput = {
            day: new Date().toString(),
        };
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
                    name: 'segment_one',
                    container: false,
                    children: [],
                    elements: [
                        {
                            name: 'element_one',
                            value: `{{#dateCompare 'lastweek' '<' day}}1{{else}}0{{/dateCompare}}`,
                        },
                        {
                            name: 'element_two',
                            value: `{{#dateCompare 'lastweek' '>' day}}1{{else}}0{{/dateCompare}}`,
                        },
                        {
                            name: 'element_three',
                            value: `{{#dateCompare 'lastweek' '==' day}}1{{else}}0{{/dateCompare}}`,
                        },
                        {
                            name: 'element_four',
                            value: `{{#dateCompare 'lastweek' '!=' day}}1{{else}}0{{/dateCompare}}`,
                        },
                        {
                            name: 'element_five',
                            value: `{{#dateCompare 'lastweek' '<=' day}}1{{else}}0{{/dateCompare}}`,
                        },
                        {
                            name: 'element_six',
                            value: `{{#dateCompare 'lastweek' '>=' day}}1{{else}}0{{/dateCompare}}`,
                        },
                    ],
                },
            ],
        };
        const want = `1*0*0*1*1*0~`;
        const got = await serialize(template, dateInput);
        assert.deepEqual(got, want);
    });
    it('dateFormat helper', async (context) => {
        context.mock.timers.enable({ apis: ['Date'] });
        const dateInput = {
            day: '12/31/2025',
            invalid_day: '12312025',
        };
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
                    name: 'segment_one',
                    container: false,
                    children: [],
                    elements: [
                        {
                            name: 'element_one',
                            value: `{{dateFormat 'yyyyMMdd' [day]}}`,
                        },
                        {
                            name: 'element_two',
                            value: `{{dateFormat 'ddyyyyMM' [invalid_day] 'MMddyyyy'}}`,
                        },
                        {
                            name: 'element_three',
                            value: `{{dateFormat 'yyyyMMdd'}}`,
                        },
                    ],
                },
            ],
        };
        const now = new Date();
        const currentDateString = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${(now.getDate().toString().padStart(2, '0'))}`;
        const want = `20251231*31202512*${currentDateString}~`;
        const got = await serialize(template, dateInput);
        assert.deepEqual(got, want);
    });
    it('dateFormat throws if invalid date and input format is not supplied', async () => {
        const dateInput = {
            invalid_day: '12312025',
        };
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
                    name: 'segment_one',
                    container: false,
                    children: [],
                    elements: [
                        {
                            name: 'element_two',
                            value: `{{dateFormat 'ddyyyyMM' [invalid_day]}}`,
                        },
                    ],
                },
            ],
        };
        await assert.rejects(async () => await serialize(template, dateInput), RangeError);
    });
    it('dateFormat uses empty input if input is empty', async () => {
        const dateInput = {
            day: '',
        };
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
                    name: 'segment_one',
                    container: false,
                    children: [],
                    elements: [
                        {
                            name: 'element_one',
                            value: 'one',
                        },
                        {
                            name: 'element_two',
                            value: `{{dateFormat 'yyyy/MM/dd' day}}`,
                        },
                        {
                            name: 'element_three',
                            value: 'three',
                        },
                    ],
                },
            ],
        };
        const want = 'one**three~';
        const got = await serialize(template, dateInput);
        assert.deepEqual(got, want);
    });
    it('trim works with replace', async () => {
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
                    name: 'ContainerSegment',
                    container: true,
                    repetition: {
                        property: 'members',
                    },
                    children: [
                        {
                            name: 'SegmentWithTrim',
                            container: false,
                            trim: true,
                            elements: [
                                {
                                    name: 'Element_One',
                                    value: '{{firstname}}',
                                },
                                {
                                    name: 'Element_Two',
                                    value: '',
                                },
                                {
                                    name: 'Element_Three',
                                    value: '',
                                },
                                {
                                    name: 'Element_Four',
                                    value: '',
                                },
                                {
                                    name: 'Element_Five',
                                    value: '',
                                },
                            ],
                            children: [],
                        },
                        {
                            name: 'SegmentWithoutTrim',
                            container: false,
                            trim: false,
                            elements: [
                                {
                                    name: 'Element_One',
                                    value: '{{lastname}}',
                                },
                                {
                                    name: 'Element_Two',
                                    value: '',
                                },
                                {
                                    name: 'Element_Three',
                                    value: '',
                                },
                                {
                                    name: 'Element_Four',
                                    value: '',
                                },
                                {
                                    name: 'Element_Five',
                                    value: '',
                                },
                            ],
                            children: [],
                        },
                    ],
                },
            ],
        };
        const want = 'firstname1~lastname1****~firstname2~lastname2****~';
        const got = await serialize(template, input);
        assert.deepEqual(got, want);
    });
    it('ssnFormat', async () => {
        const ssnInput = {
            ssnDash: 'XXX-XX-XXXX',
            ssnNoDash: 'XXXXXXXXX',
        };
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
                    name: 'segment_one',
                    container: false,
                    children: [],
                    elements: [
                        {
                            name: 'element_one',
                            value: `{{ssnFormat 'dash' [ssnDash]}}`,
                        },
                        {
                            name: 'element_two',
                            value: `{{ssnFormat 'nodash' [ssnDash]}}`,
                        },
                        {
                            name: 'element_three',
                            value: `{{ssnFormat 'dash' [ssnNoDash]}}`,
                        },
                        {
                            name: 'element_four',
                            value: `{{ssnFormat 'nodash' [ssnNoDash]}}`,
                        },
                    ],
                },
            ],
        };
        const want = 'XXX-XX-XXXX*XXXXXXXXX*XXX-XX-XXXX*XXXXXXXXX~';
        const got = await serialize(template, ssnInput);
        assert.deepEqual(got, want);
    });
    it('ssnFormat throws if invalid ssn is supplied', async () => {
        const ssnInput = {
            ssnDash: 'XX-XXX-XXXX',
            ssnNoDash: 'XXXXXXXX',
        };
        const templateDash = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '::',
            repetitionSeparator: '!!',
            rules: [
                {
                    name: 'segment_one',
                    container: false,
                    children: [],
                    elements: [
                        {
                            name: 'element_one',
                            value: `{{ssnFormat 'dash' [ssnDash]}}`,
                        },
                    ],
                },
            ],
        };
        const templateNoDash = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '::',
            repetitionSeparator: '!!',
            rules: [
                {
                    name: 'segment_one',
                    container: false,
                    children: [],
                    elements: [
                        {
                            name: 'element_one',
                            value: `{{ssnFormat 'dash' [ssnNoDash]}}`,
                        },
                    ],
                },
            ],
        };
        await assert.rejects(async () => await serialize(templateDash, ssnInput), { message: 'invalid ssn format \'XX-XXX-XXXX\'' });
        await assert.rejects(async () => await serialize(templateNoDash, ssnInput), { message: 'invalid ssn format \'XXXXXXXX\'' });
    });
    it('ssnFormat throws if the key is invalid', async () => {
        const templateInvalidKey = {
            $schema: '',
            name: '',
            version: '0.0.1',
            elementSeparator: '*',
            segmentSeparator: '~',
            componentSeparator: '::',
            repetitionSeparator: '!!',
            rules: [
                {
                    name: 'segment_one',
                    container: false,
                    children: [],
                    elements: [
                        {
                            name: 'element_one',
                            value: `{{ssnFormat 'key' '333-22-4444'}}`,
                        },
                    ],
                },
            ],
        };
        await assert.rejects(async () => await serialize(templateInvalidKey, {}), { message: 'invalid ssn format key \'key\'' });
    });
});
