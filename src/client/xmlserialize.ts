import './style.css';
import { makeEditor } from './util';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

const DEFAULT_SCHEMA = 'https://storageukgreadyedi.blob.core.windows.net/schema-files/v0.0.1/xmltemplate.json';
const DEFAULT_VERSION = 'xml_0.0.1';

// Setting things on the window object
window.MonacoEnvironment = {
  getWorker: async (_workerId: string, _label: string) => {
    return new editorWorker();
  },
};

window.addEventListener('beforeunload', (e) => {
  e.preventDefault();
});

const memberJson = `{
  "data": [
    {
      "Employee": true,
      "Benefit Plans": [
        {
          "Benefit Plan Name": "Dental",
          "Member Benefit Begin Date": "2024-12-01",
          "Member Benefit End Date": "9999-12-31",
          "Relationship Code": "Self",
          "Coverage Name": "Waived",
          "Benefit Plan Policy Number": "PXXXX",
          "Benefit Plan Provider Name": "HealthPartners",
          "Vendor": "HealthPartners",
          "Benefit Type": "Dental",
          "EOI Provider Name": "",
          "Benefit Plan Effective From": "01/01/2024",
          "Benefit Plan Effective To": "12/31/9999"
        }
      ],
      "Cost Centers": {
        "Location": {
          "name": "Home",
          "key": "",
          "externalId": "",
          "level1": "Home",
          "level2": "Home"
        },
        "Department": {
          "name": "After Market",
          "key": "",
          "externalId": "",
          "level1": "After Market",
          "level2": ""
        },
        "Jobs (HR)": {
          "name": "Admin I",
          "key": "",
          "externalId": "",
          "level1": "Admin I"
        }
      },
      "Subscriber Type": "Subscriber",
      "Reference ID": "XXXXXXXXXX",
      "Employee ID": "",
      "First Name of Member": "FirstName1",
      "Middle Initial of Member": "MiddleName1",
      "Last Name of Member": "LasName1",
      "Suffix of Member": "",
      "Members Date of Birth": "01/01/1985",
      "SSN of Member": "222-22-2222",
      "SSN of Individual": "222-22-2222",
      "Insured Party Telephone Number": "333-222-5555",
      "Member Email Address": "sample@example.com",
      "Subscribers Address Line 1": "111 Park Ave North",
      "Subscribers Address Line 2": "",
      "Subscribers City": "St. Michael",
      "Subscribers State": "NM",
      "Subscribers Zip Code": "56666",
      "Subscribers Country Code": "US",
      "Member Hire Date": "08/25/2023",
      "Member Termination Date": "",
      "Member Rehire Date": "08/25/2023",
      "Member Paid Hourly": false,
      "Member Pay Frequency": "Bi-Weekly",
      "Member Deceased": false,
      "Member Employment Status": "Leave of Absence",
      "Members Marital Status": "",
      "Member Handicapped": "",
      "Members Gender": "U",
      "Student Status": "N",
      "Member Smoker": false,
      "Qualifying Event": {
        "Life Event Change": "HSA Changes",
        "Effective Date": "05/13/2024"
      }
    },
    {
      "Employee": true,
      "Benefit Plans": [
        {
          "Benefit Plan Name": "Dental",
          "Member Benefit Begin Date": "2025-01-01",
          "Member Benefit End Date": "9999-12-31",
          "Relationship Code": "Self",
          "Coverage Name": "Employee",
          "Benefit Plan Policy Number": "PPXXX",
          "Benefit Plan Provider Name": "HealthPartners",
          "Vendor": "HealthPartners",
          "Benefit Type": "Dental",
          "EOI Provider Name": "",
          "Benefit Plan Effective From": "01/01/2024",
          "Benefit Plan Effective To": "12/31/9999"
        },
        {
          "Benefit Plan Name": "Dental",
          "Member Benefit Begin Date": "2024-01-01",
          "Member Benefit End Date": "2024-12-31",
          "Relationship Code": "Self",
          "Coverage Name": "Employee",
          "Benefit Plan Policy Number": "PPXXX",
          "Benefit Plan Provider Name": "HealthPartners",
          "Vendor": "HealthPartners",
          "Benefit Type": "Dental",
          "EOI Provider Name": "",
          "Benefit Plan Effective From": "01/01/2024",
          "Benefit Plan Effective To": "12/31/9999"
        },
        {
          "Benefit Plan Name": "HealthPartners $1650/$3300 75% HSA Plus Non-Embedded",
          "Member Benefit Begin Date": "2025-01-01",
          "Member Benefit End Date": "9999-12-31",
          "Relationship Code": "Self",
          "Coverage Name": "Employee (Standard)",
          "Benefit Plan Policy Number": "CCCCP",
          "Benefit Plan Provider Name": "HealthPartners",
          "Vendor": "HealthPartners",
          "Benefit Type": "Medical",
          "EOI Provider Name": "",
          "Benefit Plan Effective From": "01/01/2025",
          "Benefit Plan Effective To": "12/31/9999"
        },
        {
          "Benefit Plan Name": "HealthPartners $3300/$6600 75% HSA Plus Embedded",
          "Member Benefit Begin Date": "2025-01-01",
          "Member Benefit End Date": "9999-12-31",
          "Relationship Code": "Self",
          "Coverage Name": "Waived",
          "Benefit Plan Policy Number": "CCCPP",
          "Benefit Plan Provider Name": "HealthPartners",
          "Vendor": "HealthPartners",
          "Benefit Type": "Medical",
          "EOI Provider Name": "",
          "Benefit Plan Effective From": "01/01/2025",
          "Benefit Plan Effective To": "12/31/9999"
        },
        {
          "Benefit Plan Name": "HealthPartners $6000/$12000 75% HSA Plus Embedded",
          "Member Benefit Begin Date": "2025-01-01",
          "Member Benefit End Date": "9999-12-31",
          "Relationship Code": "Self",
          "Coverage Name": "Waived",
          "Benefit Plan Policy Number": "CCPPPS",
          "Benefit Plan Provider Name": "HealthPartners",
          "Vendor": "HealthPartners",
          "Benefit Type": "Medical",
          "EOI Provider Name": "",
          "Benefit Plan Effective From": "01/01/2025",
          "Benefit Plan Effective To": "12/31/9999"
        }
      ],
      "Cost Centers": {
        "Location": {
          "name": "New York, NY",
          "key": "",
          "externalId": "",
          "level1": "Level1",
          "level2": "New York, NY"
        },
        "Department": {
          "name": "Engineering",
          "key": "",
          "externalId": "",
          "level1": "Engineering",
          "level2": ""
        },
        "LOA State": {
          "name": "NY",
          "key": "",
          "externalId": "",
          "level1": "NY",
          "level2": ""
        },
        "Jobs (HR)": {
          "name": "Engineer III",
          "key": "",
          "externalId": "",
          "level1": "Engineer III"
        }
      },
      "Subscriber Type": "Subscriber",
      "Reference ID": "XXXXXXXXXX",
      "Employee ID": "888",
      "First Name of Member": "FirstName2",
      "Middle Initial of Member": "N",
      "Last Name of Member": "LastName2",
      "Suffix of Member": "",
      "Members Date of Birth": "03/05/1966",
      "SSN of Member": "333-33-3333",
      "SSN of Individual": "333-33-3333",
      "Insured Party Telephone Number": "555-888-9999",
      "Member Email Address": "sample2@example.com",
      "Subscribers Address Line 1": "222 40th St NW",
      "Subscribers Address Line 2": "",
      "Subscribers City": "New York",
      "Subscribers State": "NY",
      "Subscribers Zip Code": "33333",
      "Subscribers Country Code": "US",
      "Member Hire Date": "01/28/2019",
      "Member Termination Date": "",
      "Member Rehire Date": "",
      "Member Paid Hourly": false,
      "Member Pay Frequency": "Inc Bi-Weekly",
      "Member Deceased": false,
      "Member Employment Status": "Active",
      "Members Marital Status": "S",
      "Member Handicapped": "",
      "Members Gender": "M",
      "Student Status": "N",
      "Member Smoker": false
    }
  ]
}
`;

let Filename = 'template.json';
const templateEditorDiv = <HTMLDivElement>(
  document.querySelector('div#template-editor')
);
const inputEditorDiv = <HTMLDivElement>(
  document.querySelector('div#input-editor')
);
const outputEditorDiv = <HTMLDivElement>(
  document.querySelector('div#output-editor')
);
const serializeButton = <HTMLButtonElement>(
  document.querySelector('button#serialize')
);
const clearButton = <HTMLButtonElement>document.querySelector('button#clear');
const saveButton = <HTMLButtonElement>document.querySelector('button#save');
const fileInput = <HTMLInputElement>document.querySelector('input#load');
const nameInput = <HTMLInputElement>document.querySelector('input#name');

const templateEditor = makeEditor(templateEditorDiv, { language: 'xml' });
const inputEditor = makeEditor(inputEditorDiv, { language: 'json' });
const outputEditor = makeEditor(outputEditorDiv, {
  readOnly: true,
  language: 'text',
});

inputEditor.setValue(memberJson);

const makeTemplate = () => {
  const rules = templateEditor.getValue();
  const name = nameInput.value;

  return {
    $schema: DEFAULT_SCHEMA,
    version: DEFAULT_VERSION,
    name,
    rules,
  };
}

serializeButton.addEventListener('click', async () => {
  try {
    const input = JSON.parse(inputEditor.getValue() || '{}');
    const today = input.today || new Date().toISOString();
    const template = makeTemplate();

    const serializerInput = {
      members: input.data || [],
      referenceIdentifier: input.documentNumber || 1,
    };

    const response = await fetch('/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'serialize', template, serializerInput, today }),
    });
    const body = await response.text();
    outputEditor.setValue(body);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'unexpected client side error';
    outputEditor.setValue(message);
  }
});

clearButton.addEventListener('click', () => {
  outputEditor.setValue('');
});

saveButton.addEventListener('click', () => {
  const template = makeTemplate();
  const templateBlob = new Blob([JSON.stringify(template, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(templateBlob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', Filename);
  link.click();
  link.remove();
});

fileInput.addEventListener('change', (e) => {
  const files = (<HTMLInputElement>e.target).files;
  if (!files || files.length === 0) return;

  const file = files[0];
  Filename = file.name;

  const reader = new FileReader();

  reader.onload = (e) => {
    if (!e.target) return;
    const fileContent = e.target.result || '';

    try {
      const tmpl = JSON.parse(fileContent.toString());
      if (!tmpl.name || !tmpl.rules) {
        throw new Error('invalid xml template, missing either \'name\' or \'rules\'');
      }
      nameInput.value = tmpl.name;
      templateEditor.setValue(tmpl.rules);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown error';
      templateEditor.setValue('');
      nameInput.value = '';
      outputEditor.setValue(`Error loading template file: ${message}`);
    }
  };

  reader.onerror = (e) => {
    outputEditor.setValue(`Error reading file: ${e}`);
  };

  reader.readAsText(file);
});
