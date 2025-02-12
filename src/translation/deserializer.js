"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.X12Deserializer = void 0;
const parser_js_1 = require("#translation/parser.js");
class X12Deserializer {
    input;
    template;
    tree = undefined;
    constructor(input, template) {
        this.input = input;
        this.template = template;
    }
    deserialize() {
        const parser = new parser_js_1.X12Parser({
            elementSeparator: this.template.elementSeparator,
            segmentSeparator: this.template.segmentSeparator,
            componentSeparator: this.template.componentSeparator,
            repetitionSeparator: this.template.repetitionSeparator,
            input: this.input,
        });
        this.tree = parser.parse();
        let obj = {};
        let currentRowCount = 0;
        while (this.tree.hasNextSegment()) {
            for (const rule of this.template.rules) {
                if (rule.numberOfRowsToSkip && rule.numberOfRowsToSkip > currentRowCount) {
                    // Advance the tree to skip the row
                    this.tree.nextSegment();
                    ++currentRowCount;
                    continue;
                }
                obj = this.deserializeSegment(obj, this.tree.nextSegment(), rule);
            }
        }
        return obj;
    }
    deserializeSegment(obj, segment, rule) {
        if (!segment) {
            return obj;
        }
        if (!rule.container) {
            obj = this.deserializeStandardSegment(obj, segment, rule);
        }
        else {
            obj = this.deserializeContainerSegment(obj, segment, rule);
        }
        return obj;
    }
    deserializeStandardSegment(obj, segment, standardRule) {
        let tempSeg = {};
        for (const element of standardRule.elements) {
            const value = segment.nextElement()?.value;
            tempSeg[element.name] = value;
        }
        const childObj = {};
        if (standardRule.children) {
            for (const child of standardRule.children) {
                if (!this.tree?.hasNextSegment()) {
                    break;
                }
                let segNode = this.tree.nextSegment();
                this.deserializeSegment(childObj, segNode, child);
                tempSeg = this.addChildSegment(tempSeg, childObj);
                segNode = this.tree?.nextSegment();
            }
        }
        obj = this.addSegment(obj, standardRule.name, tempSeg);
        return obj;
    }
    deserializeContainerSegment(obj, segment, containerRule) {
        let tempSeg = {};
        const container = [];
        let segNode = segment;
        for (const child of containerRule.children) {
            if (!segNode) {
                break;
            }
            ;
            container.push(this.deserializeSegment({}, segNode, child));
            segNode = this.tree?.nextSegment();
        }
        tempSeg = this.addContainer(tempSeg, container);
        obj = this.addSegment(obj, containerRule.name, tempSeg);
        return obj;
    }
    addSegment(obj, header, seg) {
        if (obj[header]) {
            obj[header].push(seg);
        }
        else {
            obj[header] = [seg];
        }
        return obj;
    }
    addChildSegment(seg, childSeg) {
        Object.assign(seg, childSeg);
        return seg;
    }
    addContainer(seg, container) {
        container.forEach((ediObject) => {
            seg = this.addChildSegment(seg, ediObject);
        });
        return seg;
    }
}
exports.X12Deserializer = X12Deserializer;
