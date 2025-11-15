"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitStructuredDataFromText = emitStructuredDataFromText;
exports.extractStructuredJsonBlock = extractStructuredJsonBlock;
const websocketHub_1 = require("./websocketHub");
function extractStructuredJsonBlock(content) {
    if (!content)
        return null;
    const trimmed = content.trim();
    const match = trimmed.match(/\{[\s\S]*\}$/);
    if (!match) {
        return null;
    }
    const jsonText = match[0];
    try {
        const data = JSON.parse(jsonText);
        const plainText = trimmed.slice(0, trimmed.length - jsonText.length).trim();
        return {
            data,
            jsonText,
            plainText,
        };
    }
    catch {
        return null;
    }
}
function emitStructuredDataFromText(content) {
    const extraction = extractStructuredJsonBlock(content);
    if (!extraction) {
        return;
    }
    (0, websocketHub_1.broadcastStructuredData)({
        plainText: extraction.plainText,
        structured: extraction.data,
        rawJson: extraction.jsonText,
    });
}
