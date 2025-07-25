import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SerializerFactory, Serializer_0_0_1 } from './serializer.js';
import { Serializer, Template } from './types.js';
import { streamToBuffer } from '#test/util.js';
import { PassThrough, Readable } from 'node:stream';

SerializerFactory.registerSerializer(new Serializer_0_0_1());

class SerializerStub implements Serializer {
  readonly version = '0.0.0';

  async serialize(_stream: PassThrough, _input: Record<string, unknown>, _template: Template): Promise<Readable> {
    return Readable.from('');
  }
}

async function serialize(template: Template, input: Record<string, unknown>): Promise<string> {
  const serializer = SerializerFactory.getSerializer(template.version);
  const stream = new PassThrough();
  await serializer.serialize(stream, input, template);
  return (await streamToBuffer(stream)).toString('utf-8');
}

const input = {
  singleMember: {
    lastname: 'lastname',
    firstname: 'firstname',
    filterLastName: 'lastname1',
    nicknames: ['nick1', 'nick2', 'nick3'],
  },
  members: [
    {
      lastname: 'lastname1',
      firstname: 'firstname1',
      'nick names': ['nick11', 'nick12', 'nick13'],
      friends: [
        {
          name: 'friend11',
          keep: true,
        },
        {
          name: 'friend12',
          keep: false,
        },
      ],
    },
    {
      lastname: 'lastname2',
      firstname: 'firstname2',
      'nick names': ['nick21', 'nick22', 'nick23'],
      friends: [
        {
          name: 'friend21',
          keep: true,
        },
        {
          name: 'friend22',
          keep: true,
        },
      ],
    },
  ],
};

describe('SerializerFactory', () => {

  it('register and get work as expected', () => {
    const serializerStub = new SerializerStub();
    SerializerFactory.registerSerializer(serializerStub);
    assert.deepEqual(SerializerFactory.getSerializer('0.0.0'), serializerStub);
  });

  it('get throws if invalid version', () => {
    assert.throws(() => { SerializerFactory.getSerializer('-1'); }, SerializerFactory.InvalidVersionError('-1'));
  });

});

describe('Serializer_0_0_1', () => {

  it('should be able to serialize an object to an edi string based on a template without any replacements', async () => {
    const template: Template = {
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
    const template: Template = {
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

    const template: Template = {
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

    const template: Template = {
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

    const template: Template = {
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

    const template: Template = {
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

    const template: Template = {
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

    const template: Template = {
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

    const template: Template = {
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

    const template: Template = {
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
    const template: Template = {
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
    const templates: Template[] = [
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

  it('length attribute with right align', async () => {
    const templates: Template[] = [
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
                    align: 'right',
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
                    align: 'right',
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
                    align: 'right',
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
                    align: 'right',
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
      '______firstname~',
      '______firstname~',
    ];

    for (let ii = 0; ii < templates.length; ++ii) {
      const template = templates[ii];
      const got = await serialize(template, input);

      const want = wants[ii];

      assert.deepEqual(got, want);
    }
  });

  it('ignore segment property', async () => {
    const template: Template = {
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
    const template: Template = {
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
    const template: Template = {
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
    const template: Template = {
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
    const template: Template = {
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
    const template: Template = {
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

    const want = 'open~firstname1*lastname1~firstname2*lastname2~close*4~';

    const got = await serialize(template, input);

    assert.deepEqual(got, want);
  });

  it('segment count with repetition', async () => {
    const template: Template = {
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

    const want = 'open~firstname1*lastname1~firstname2*lastname2~close*4~';

    const got = await serialize(template, input);

    assert.deepEqual(got, want);
  });

  it('repetition property', async () => {
    const template: Template = {
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
    const template: Template = {
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
    const template: Template = {
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
    const template: Template = {
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
    const template: Template = {
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
    const template: Template = {
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

  it('compareDate helper', async (context) => {
    context.mock.timers.enable({ apis: ['Date'], now: new Date('03/03/2025') });

    const dateInput = {
      day: new Date().toDateString(),
    };

    const template: Template = {
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
        {
          name: 'segment_two',
          container: false,
          children: [],
          elements: [
            {
              name: 'element_seven',
              value: `{{#dateCompare 'today' '>=' day}}1{{else}}0{{/dateCompare}}`,
            },
            {
              name: 'element_eight',
              value: `{{#dateCompare 'today' '<=' day}}1{{else}}0{{/dateCompare}}`,
            },
            {
              name: 'element_nine',
              value: `{{#dateCompare 'today' '==' day}}1{{else}}0{{/dateCompare}}`,
            },
            {
              name: 'element_ten',
              value: `{{#dateCompare 'today' '>' day}}1{{else}}0{{/dateCompare}}`,
            },
            {
              name: 'element_eleven',
              value: `{{#dateCompare 'today' '<' day}}1{{else}}0{{/dateCompare}}`,
            },
            {
              name: 'element_twelve',
              value: `{{#dateCompare 'today' '!=' day}}1{{else}}0{{/dateCompare}}`,
            },
          ],
        },
      ],
    };

    const want = `1*0*0*1*1*0~1*1*1*0*0*0~`;
    const got = await serialize(template, dateInput);

    assert.deepEqual(got, want);
  });

  it('compareDate helper with two dates', async (context) => {
    context.mock.timers.enable({ apis: ['Date'], now: new Date('03/03/2025') });
    const today = new Date();
    const tomorrow = new Date(new Date().setDate(today.getDate() + 1));
    const yesterday = new Date(new Date().setDate(today.getDate() - 1));

    const dateInput = {
      today: today.toDateString(),
      tomorrow: tomorrow.toDateString(),
      yesterday: yesterday.toDateString(),
    };

    const template: Template = {
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
              value: `{{#dateCompare yesterday '<' today}}1{{else}}0{{/dateCompare}}`,
            },
            {
              name: 'element_two',
              value: `{{#dateCompare tomorrow '>' today}}1{{else}}0{{/dateCompare}}`,
            },
            {
              name: 'element_three',
              value: `{{#dateCompare tomorrow '==' today}}1{{else}}0{{/dateCompare}}`,
            },
            {
              name: 'element_four',
              value: `{{#dateCompare yesterday '!=' today}}1{{else}}0{{/dateCompare}}`,
            },
            {
              name: 'element_five',
              value: `{{#dateCompare tomorrow '<=' today}}1{{else}}0{{/dateCompare}}`,
            },
            {
              name: 'element_six',
              value: `{{#dateCompare yesterday '>=' today}}1{{else}}0{{/dateCompare}}`,
            },
          ],
        },
      ],
    };

    const want = `1*1*0*1*0*0~`;
    const got = await serialize(template, dateInput);

    assert.deepEqual(got, want);
  });

  it('compareDate helper with dateFormat', async (context) => {
    context.mock.timers.enable({ apis: ['Date'], now: new Date('03/03/2025') });
    const today = new Date();
    const tomorrow = new Date(new Date().setDate(today.getDate() + 1));
    const yesterday = new Date(new Date().setDate(today.getDate() - 1));

    const dateInput = {
      today: today.toDateString(),
      tomorrow: tomorrow.toDateString(),
      yesterday: yesterday.toDateString(),
    };

    const template: Template = {
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
              value: `{{#dateCompare today '==' (dateFormat 'MM/dd/yyyy' today)}}1{{else}}0{{/dateCompare}}`,
            },
            {
              name: 'element_two',
              value: `{{#dateCompare today '!=' (dateFormat 'MM/dd/yyyy' today)}}1{{else}}0{{/dateCompare}}`,
            },
          ],
        },
      ],
    };

    const want = `1*0~`;
    const got = await serialize(template, dateInput);

    assert.deepEqual(got, want);
  });

  it('dateFormat helper', async (context) => {
    context.mock.timers.enable({ apis: ['Date'] });

    const dateInput = {
      day: '12/31/2025',
      invalid_day: '12312025',
    };

    const template: Template = {
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

    const want = `20251231*31202512*19700101~`;
    const got = await serialize(template, dateInput);

    assert.deepEqual(got, want);
  });

  it('dateFormat uses utc time', async (context) => {
    context.mock.timers.enable({ apis: ['Date'], now: new Date('03/31/2025') });

    const dateInput = {
      day: '2025-03-31',
      invalid_day: '03312025',
    };

    const template: Template = {
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

    const want = `20250331*31202503*20250331~`;
    const got = await serialize(template, dateInput);

    assert.deepEqual(got, want);
  });

  it('dateFormat throws if invalid date and input format is not supplied', async () => {
    const dateInput = {
      invalid_day: '12312025',
    };

    const template: Template = {
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

    const template: Template = {
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
    const template: Template = {
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

    const template: Template = {
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

    const templateDash: Template = {
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

    const templateNoDash: Template = {
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
    const templateInvalidKey: Template = {
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

  it('should be able to access the _PARENT object from in repetition', async () => {
    const template: Template = {
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
              name: 'member_first_name',
              value: '{{firstname}}',
            },
            {
              name: 'parent_lastname',
              value: '{{_PARENT.singleMember.lastname}}',
            },
          ],
          children: [
            {
              name: 'child_segment',
              container: false,
              repetition: {
                property: 'friends',
              },
              elements: [
                {
                  name: 'friend',
                  value: '{{name}}',
                },
                {
                  name: 'member_lastname',
                  value: '{{_PARENT.lastname}}',
                },
                {
                  name: 'parent_member_firstname',
                  value: '{{_PARENT._PARENT.singleMember.firstname}}',
                },
              ],
              children: [],
            },
          ],
        },
      ],
    };
    const want = 'firstname1*lastname~friend11*lastname1*firstname~friend12*lastname1*firstname~firstname2*lastname~friend21*lastname2*firstname~friend22*lastname2*firstname~';

    const got = await serialize(template, input);

    assert.deepEqual(got, want);
  });

  it('should be able to access the _PARENT object from in the repetition filter', async () => {
    const template: Template = {
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
              name: 'member_first_name',
              value: '{{firstname}}',
            },
          ],
          children: [
            {
              name: 'child_segment',
              container: false,
              repetition: {
                property: 'friends',
                filter: `{{#compare _PARENT.lastname '==' 'lastname1'}}true{{/compare}}`,
              },
              elements: [
                {
                  name: 'friend',
                  value: '{{name}}',
                },
              ],
              children: [],
            },
          ],
        },
      ],
    };

    const want = `firstname1~friend11~friend12~firstname2~`;
    const got = await serialize(template, input);

    assert.deepEqual(got, want);
  });

  it('should be able to access the _PARENT object from in the filter expression', async () => {
    // const template: Template = {
    //   $schema: '',
    //   name: '',
    //   version: '0.0.1',
    //   elementSeparator: '*',
    //   segmentSeparator: '~',
    //   componentSeparator: ':',
    //   repetitionSeparator: '!',
    //   rules: [
    //     {
    //       name: 'first_segment',
    //       container: false,
    //       filter: {
    //         property: 'members',
    //         expression: `{{#compare _PARENT.singleMember.filterLastName '==' lastname}}1{{/compare}}`,
    //       },
    //       elements: [
    //         {
    //           name: 'member_first_name',
    //           value: '{{#each members}}{{firstname}}{{/each}}',
    //         },
    //       ],
    //       children: [
    //         {
    //           name: 'container_segment',
    //           container: true,
    //           repetition: {
    //             property: 'members',
    //           },
    //           children: [
    //             {
    //               name: 'second_segment',
    //               container: false,
    //               filter: {
    //                 property: 'friends',
    //                 expression: `{{#compare _PARENT.firstname '==' 'firstname1'}}1{{/compare}}`,
    //               },
    //               elements: [
    //                 {
    //                   name: 'friends',
    //                   value: '{{#each friends}}{{name}}{{/each}}',
    //                 },
    //               ],
    //               children: [],
    //             },
    //           ],
    //         },
    //       ],
    //     },
    //   ],
    // };

    // const want = `firstname1~friend11friend12~`;

    const template: Template = {
      $schema: '',
      name: '',
      version: '0.0.1',
      elementSeparator: '*',
      segmentSeparator: '~',
      componentSeparator: ':',
      repetitionSeparator: '!',
      rules: [
        {
          name: 'container_segment',
          container: true,
          repetition: {
            property: 'members',
          },
          children: [
            {
              name: 'first_segment',
              container: false,
              filter: {
                property: 'friends',
                expression: `{{#if keep}}1{{/if}}`,
              },
              elements: [
                {
                  name: 'member',
                  value: '{{#each friends}}{{name}}{{/each}}',
                },
              ],
              children: [
                {
                  name: 'second_segment',
                  container: false,
                  filter: {
                    property: 'friends',
                    expression: `{{#compare _PARENT.lastname '==' 'lastname1'}}1{{/compare}}`,
                  },
                  elements: [
                    {
                      name: 'friend',
                      value: '{{#each friends}}{{name}}{{/each}}',
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

    const want = `friend11~friend11~friend21friend22~~`;
    const got = await serialize(template, input);

    assert.deepEqual(got, want);
  });

  it('getDate helper', async (context) => {
    context.mock.timers.enable({ apis: ['Date'], now: new Date('03/19/2025') });

    const template: Template = {
      $schema: '',
      name: '',
      version: '0.0.1',
      elementSeparator: '\n',
      segmentSeparator: '',
      componentSeparator: ':',
      repetitionSeparator: '!',
      rules: [
        {
          name: 'first_segment',
          container: false,
          elements: [
            {
              name: 'start_previous_week',
              value: `{{getDate 'start' 'previous' 'week'}}`,
            },
            {
              name: 'start_previous_month',
              value: `{{getDate 'start' 'previous' 'month'}}`,
            },
            {
              name: 'start_previous_year',
              value: `{{getDate 'start' 'previous' 'year'}}`,
            },
            {
              name: 'start_current_week',
              value: `{{getDate 'start' 'current' 'week'}}`,
            },
            {
              name: 'start_current_month',
              value: `{{getDate 'start' 'current' 'month'}}`,
            },
            {
              name: 'start_current_year',
              value: `{{getDate 'start' 'current' 'year'}}`,
            },
            {
              name: 'start_next_week',
              value: `{{getDate 'start' 'next' 'week'}}`,
            },
            {
              name: 'start_next_month',
              value: `{{getDate 'start' 'next' 'month'}}`,
            },
            {
              name: 'start_next_year',
              value: `{{getDate 'start' 'next' 'year'}}`,
            },
            {
              name: 'end_previous_week',
              value: `{{getDate 'end' 'previous' 'week'}}`,
            },
            {
              name: 'end_previous_month',
              value: `{{getDate 'end' 'previous' 'month'}}`,
            },
            {
              name: 'end_previous_year',
              value: `{{getDate 'end' 'previous' 'year'}}`,
            },
            {
              name: 'end_current_week',
              value: `{{getDate 'end' 'current' 'week'}}`,
            },
            {
              name: 'end_current_month',
              value: `{{getDate 'end' 'current' 'month'}}`,
            },
            {
              name: 'end_current_year',
              value: `{{getDate 'end' 'current' 'year'}}`,
            },
            {
              name: 'end_next_week',
              value: `{{getDate 'end' 'next' 'week'}}`,
            },
            {
              name: 'end_next_month',
              value: `{{getDate 'end' 'next' 'month'}}`,
            },
            {
              name: 'end_next_year',
              value: `{{getDate 'end' 'next' 'year'}}`,
            },
          ],
          children: [],
        },
      ],
    };

    const want = [
      '03/09/2025',
      '02/01/2025',
      '01/01/2024',
      '03/16/2025',
      '03/01/2025',
      '01/01/2025',
      '03/23/2025',
      '04/01/2025',
      '01/01/2026',
      '03/15/2025',
      '02/28/2025',
      '12/31/2024',
      '03/22/2025',
      '03/31/2025',
      '12/31/2025',
      '03/29/2025',
      '04/30/2025',
      '12/31/2026',
    ].join('\n');

    const got = await serialize(template, input);

    assert.deepEqual(got, want);
  });

  it('getDate helper works without input format in dateFormat helper', async (context) => {
    context.mock.timers.enable({ apis: ['Date'], now: new Date('03/19/2025') });

    const template: Template = {
      $schema: '',
      name: '',
      version: '0.0.1',
      elementSeparator: '\n',
      segmentSeparator: '',
      componentSeparator: ':',
      repetitionSeparator: '!',
      rules: [
        {
          name: 'first_segment',
          container: false,
          elements: [
            {
              name: 'start_previous_week',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'start' 'previous' 'week')}}`,
            },
            {
              name: 'start_previous_month',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'start' 'previous' 'month')}}`,
            },
            {
              name: 'start_previous_year',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'start' 'previous' 'year')}}`,
            },
            {
              name: 'start_current_week',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'start' 'current' 'week')}}`,
            },
            {
              name: 'start_current_month',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'start' 'current' 'month')}}`,
            },
            {
              name: 'start_current_year',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'start' 'current' 'year')}}`,
            },
            {
              name: 'start_next_week',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'start' 'next' 'week')}}`,
            },
            {
              name: 'start_next_month',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'start' 'next' 'month')}}`,
            },
            {
              name: 'start_next_year',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'start' 'next' 'year')}}`,
            },
            {
              name: 'end_previous_week',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'end' 'previous' 'week')}}`,
            },
            {
              name: 'end_previous_month',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'end' 'previous' 'month')}}`,
            },
            {
              name: 'end_previous_year',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'end' 'previous' 'year')}}`,
            },
            {
              name: 'end_current_week',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'end' 'current' 'week')}}`,
            },
            {
              name: 'end_current_month',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'end' 'current' 'month')}}`,
            },
            {
              name: 'end_current_year',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'end' 'current' 'year')}}`,
            },
            {
              name: 'end_next_week',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'end' 'next' 'week')}}`,
            },
            {
              name: 'end_next_month',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'end' 'next' 'month')}}`,
            },
            {
              name: 'end_next_year',
              value: `{{dateFormat 'yyyyMMdd' (getDate 'end' 'next' 'year')}}`,
            },
          ],
          children: [],
        },
      ],
    };

    const want = [
      '20250309',
      '20250201',
      '20240101',
      '20250316',
      '20250301',
      '20250101',
      '20250323',
      '20250401',
      '20260101',
      '20250315',
      '20250228',
      '20241231',
      '20250322',
      '20250331',
      '20251231',
      '20250329',
      '20250430',
      '20261231',
    ].join('\n');

    const got = await serialize(template, input);

    assert.deepEqual(got, want);
  });

  it('getDate helper with specified date', async (context) => {
    context.mock.timers.enable({ apis: ['Date'], now: new Date('01/19/2023') });

    const input = {
      'dateDash': '03-31-2025',
      'dateSlash': '03/31/2025',
    };

    const template: Template = {
      $schema: '',
      name: '',
      version: '0.0.1',
      elementSeparator: '\n',
      segmentSeparator: '',
      componentSeparator: ':',
      repetitionSeparator: '!',
      rules: [
        {
          name: 'first_segment',
          container: false,
          elements: [
            {
              name: 'start_previous_week',
              value: `{{getDate 'start' 'previous' 'week' [dateDash]}}`,
            },
            {
              name: 'start_previous_month',
              value: `{{getDate 'start' 'next' 'month' [dateSlash]}}`,
            },
          ],
          children: [],
        },
      ],
    };

    const want = [
      '03/23/2025',
      '04/01/2025',
    ].join('\n');

    const got = await serialize(template, input);

    assert.deepEqual(got, want);
  });
  it('numberFormat', async () => {
    const input = {
      integer: '444',
      float: '11.2',
    };

    const template: Template = {
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
              name: 'integer with dot',
              value: `{{numberFormat 'dot' 2 [integer]}}`,
            },
            {
              name: 'integer without dot',
              value: `{{numberFormat 'nodot' 2 [integer]}}`,
            },
            {
              name: 'flot with dot',
              value: `{{numberFormat 'dot' 2 [float]}}`,
            },
            {
              name: 'flot without dot',
              value: `{{numberFormat 'nodot' 2 [float]}}`,
            },
          ],
          children: [],
        },
      ],
    };

    const want = `444.00*44400*11.20*1120~`;

    const got = await serialize(template, input);

    assert.deepEqual(got, want);
  });

  it('numberFormat with invalid preference', async () => {
    const input = {
      integer: '42',
    };

    const template: Template = {
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
              name: 'integer with dot',
              value: `{{numberFormat 'notapreference' 2 [integer]}}`,
            },
          ],
          children: [],
        },
      ],
    };

    await assert.rejects(async () => await serialize(template, input), { message: `invalid dot preference 'notapreference'` });
  });

  it('numberFormat with string precision', async () => {
    const input = {
      integer: '42',
    };

    const template: Template = {
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
              name: 'integer with dot',
              value: `{{numberFormat 'dot' 'help' [integer]}}`,
            },
          ],
          children: [],
        },
      ],
    };

    await assert.rejects(async () => await serialize(template, input), { message: `could not convert precision to number 'help'` });
  });

  it('numberFormat with empty input', async () => {
    const input = {
      string: '',
    };

    const template: Template = {
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
              name: 'integer with dot',
              value: `{{numberFormat 'dot' 2 [string]}}`,
            },
          ],
          children: [],
        },
      ],
    };

    const want = '~';
    const got = await serialize(template, input);

    assert.deepEqual(got, want);
  });

  it('numberFormat with over max precision', async () => {
    const input = {
      integer: '42',
    };

    const template: Template = {
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
              name: 'integer with dot',
              value: `{{numberFormat 'dot' 21 [integer]}}`,
            },
          ],
          children: [],
        },
      ],
    };

    await assert.rejects(async () => await serialize(template, input), { message: `invalid dot precision. Must be between 0 and 20 inclusive '21'` });
  });

  it('numberFormat with under min precision', async () => {
    const input = {
      integer: '42',
    };

    const template: Template = {
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
              name: 'integer with dot',
              value: `{{numberFormat 'dot' -1 [integer]}}`,
            },
          ],
          children: [],
        },
      ],
    };

    await assert.rejects(async () => await serialize(template, input), { message: `invalid dot precision. Must be between 0 and 20 inclusive '-1'` });
  });

  it('numberFormat with invalid input', async () => {
    const input = {
      string: 'help',
    };

    const template: Template = {
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
              name: 'integer with dot',
              value: `{{numberFormat 'dot' 2 [string]}}`,
            },
          ],
          children: [],
        },
      ],
    };

    await assert.rejects(async () => await serialize(template, input), { message: `could not convert value to number '${input.string}'` });
  });

  it('arithmetic helpers', async () => {
    // NOTE: divide by zero returns 0

    const input = {
      zero: 0,
      one: 1,
      two: 2,
      three: 3,
      numberString: '4',
      float: '0.1',
      undefined: undefined,
      null: null,
      emptystring: '',
      invalidString: 'string',
      nan: NaN,
    };

    const template: Template = {
      $schema: '',
      name: '',
      version: '0.0.1',
      elementSeparator: '*',
      segmentSeparator: '~',
      componentSeparator: '::',
      repetitionSeparator: '!!',
      rules: [
        {
          name: 'Arithmetic_Test',
          container: false,
          children: [],
          elements: [
            {
              name: 'add',
              value: '{{add one two}}',
            },
            {
              name: 'subtract',
              value: '{{sub three one}}',
            },
            {
              name: 'multiply',
              value: '{{mul two three}}',
            },
            {
              name: 'divide',
              value: '{{div two one}}',
            },
            {
              name: 'add_float',
              value: '{{add one float}}',
            },
            {
              name: 'subtract_float',
              value: '{{sub three float}}',
            },
            {
              name: 'multiply_float',
              value: '{{mul two float}}',
            },
            {
              name: 'divide_float',
              value: '{{div two float}}',
            },
            {
              name: 'divide_zero',
              value: '{{div two zero}}',
            },
            {
              name: 'undefined',
              value: '{{add 1 undefined}}',
            },
            {
              name: 'null',
              value: '{{sub 3 null}}',
            },
            {
              name: 'divide_by_undefined',
              value: '{{div 3 undefined}}',
            },
            {
              name: 'numberString',
              value: '{{add 1 numberString}}',
            },
            {
              name: 'invalidString',
              value: '{{sub 1 invalidString}}',
            },
            {
              name: 'emptyString',
              value: '{{mul 3 emptyString}}',
            },
            {
              name: 'NaN',
              value: '{{sub numberString nan}}',
            },
          ],
        },
      ],
    };

    const want = '3*2*6*2*1.1*2.9*0.2*20*0*1*3*0*5*1*0*4~';
    const got = await serialize(template, input);

    assert.deepEqual(got, want);
  });

  it('sum with numbers, strings, and objects', async () => {
    const input = {
      nums: [1, 2, 3, 4, '5', -6],
      objNums: [
        {
          v: 1,
        },
        {
          v: 2,
        },
        {
          v: 3,
        },
        {
          v: 4,
        },
        {
          v: '5',
        },
        {
          v: -6,
        },
      ],
    };

    const template: Template = {
      $schema: '',
      name: '',
      version: '0.0.1',
      elementSeparator: '*',
      segmentSeparator: '~',
      componentSeparator: '::',
      repetitionSeparator: '!!',
      rules: [
        {
          name: 'Sum Test',
          container: false,
          children: [],
          elements: [
            {
              name: 'sum',
              value: '{{sum nums}}',
            },
            {
              name: 'sum objs',
              value: `{{sum objNums 'v'}}`,
            },
          ],
        },
      ],
    };

    const want = '9*9~';
    const got = await serialize(template, input);

    assert.deepEqual(got, want);
  });

  it('sum with non array', async () => {
    const input = {
      nums: {},
    };

    const template: Template = {
      $schema: '',
      name: '',
      version: '0.0.1',
      elementSeparator: '*',
      segmentSeparator: '~',
      componentSeparator: '::',
      repetitionSeparator: '!!',
      rules: [
        {
          name: 'Sum Test',
          container: false,
          children: [],
          elements: [
            {
              name: 'sum',
              value: '{{sum nums}}',
            },
          ],
        },
      ],
    };

    await assert.rejects(async () => await serialize(template, input), { message: 'cannot reduce non array object' });
  });

  it('sum with undefined and null', async () => {
    const input = {
      nums: [1, null, 3, undefined, 5],
    };

    const template: Template = {
      $schema: '',
      name: '',
      version: '0.0.1',
      elementSeparator: '*',
      segmentSeparator: '~',
      componentSeparator: '::',
      repetitionSeparator: '!!',
      rules: [
        {
          name: 'Sum Test',
          container: false,
          children: [],
          elements: [
            {
              name: 'sum',
              value: '{{sum nums}}',
            },
          ],
        },
      ],
    };

    const want = '9~';
    const got = await serialize(template, input);

    assert.deepEqual(got, want);
  });

  it('padding property in the length attribute works with handlebars', async () => {
    const template: Template = {
      $schema: '',
      name: '',
      version: '0.0.1',
      elementSeparator: '*',
      segmentSeparator: '~',
      componentSeparator: '>',
      repetitionSeparator: '!',
      rules: [
        {
          name: 'Segment_One',
          container: false,
          repetition: {
            property: 'members',
          },
          children: [],
          elements: [
            {
              name: 'element_without_padding',
              value: '',
              attributes: {
                length: {
                  min: 2,
                  max: 2,
                },
              },
            },
            {
              name: 'element_with_padding_expression',
              value: '',
              attributes: {
                length: {
                  min: 2,
                  max: 2,
                  padding: `{{#compare lastname '==' 'lastname1'}}1{{/compare}}`,
                },
              },
            },
            {
              name: 'element_with_padding_charater',
              value: '',
              attributes: {
                length: {
                  min: 2,
                  max: 2,
                  padding: '0',
                },
              },
            },
          ],
        },
      ],
    };
    const want = '  *11*00~  *  *00~';
    const got = await serialize(template, input);

    assert.deepEqual(got, want);
  });

  it('logical inline helpers', async () => {
    const template: Template = {
      $schema: '',
      name: '',
      version: '0.0.1',
      elementSeparator: '*',
      segmentSeparator: '~',
      componentSeparator: '>',
      repetitionSeparator: '!',
      rules: [
        {
          name: 'AND_SEGMENT',
          container: false,
          children: [],
          elements: [
            {
              name: 'AND_WORKING',
              value: '{{#if (and true true)}}1{{else}}0{{/if}}',
            },
            {
              name: 'AND_FAIL_LEFT',
              value: '{{#if (and false true)}}1{{else}}0{{/if}}',
            },
            {
              name: 'AND_FAIL_RIGHT',
              value: '{{#if (and true false)}}1{{else}}0{{/if}}',
            },
            {
              name: 'AND_FAIL',
              value: '{{#if (and false false)}}1{{else}}0{{/if}}',
            },
          ],
        },
        {
          name: 'OR_SEGMENT',
          container: false,
          children: [],
          elements: [
            {
              name: 'OR_WORKING',
              value: '{{#if (or true true)}}1{{else}}0{{/if}}',
            },
            {
              name: 'OR_PASS_LEFT',
              value: '{{#if (or true false)}}1{{else}}0{{/if}}',
            },
            {
              name: 'OR_PASS_RIGHT',
              value: '{{#if (or false true)}}1{{else}}0{{/if}}',
            },
            {
              name: 'OR_FAIL',
              value: '{{#if (or false false)}}1{{else}}0{{/if}}',
            },
          ],
        },
        {
          name: 'NOT_SEGMENT',
          container: false,
          children: [],
          elements: [
            {
              name: 'NOT_FALSE',
              value: '{{#if (not true)}}1{{else}}0{{/if}}',
            },
            {
              name: 'NOT_TRUE',
              value: '{{#if (not false)}}1{{else}}0{{/if}}',
            },
          ],
        },
      ],
    };

    const want = `1*0*0*0~1*1*1*0~0*1~`;
    const got = await serialize(template, {});

    assert.deepEqual(got, want);
  });

  it.only('getDayOfMonth helper', async (context) => {
    context.mock.timers.enable({ apis: ['Date'], now: new Date('03/03/2025') });

    const template: Template = {
      $schema: '',
      name: '',
      version: '0.0.1',
      elementSeparator: '*',
      segmentSeparator: '~',
      componentSeparator: '>',
      repetitionSeparator: '!',
      rules: [
        {
          name: 'getDayOfMonth',
          container: false,
          children: [],
          elements: [
            {
              name: '15',
              value: '{{getDayOfMonth 15}}',
            },
            {
              name: '2',
              value: '{{getDayOfMonth 2}}',
            },
            {
              name: '29',
              value: '{{getDayOfMonth 29}}',
            },
          ],
        },
        {
          name: 'getDayOfMonth with inputDate',
          container: false,
          children: [],
          elements: [
            {
              name: '15',
              value: `{{getDayOfMonth 15 '04/25/1999'}}`,
            },
            {
              name: '2',
              value: `{{getDayOfMonth 2 '04/25/1999'}}`,
            },
            {
              name: '29',
              value: `{{getDayOfMonth 29 '04/25/1999'}}`,
            },
            {
              name: '14',
              value: `{{getDayOfMonth 14 '25/04/1999' 'dd/MM/yyyy'}}`,
            },
          ],
        },
      ],
    };

    const want = `03/15/2025*03/02/2025*03/29/2025~04/15/1999*04/02/1999*04/29/1999*04/14/1999~`;
    const got = await serialize(template, {});

    assert.deepEqual(got, want);
  });
});
