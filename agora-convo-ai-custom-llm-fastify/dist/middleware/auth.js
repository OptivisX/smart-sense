"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const utils_1 = require("../libs/utils");
const validateRequest = (req, reply, done) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (process.env.NODE_ENV === 'development') {
        console.log('Received auth header:', authHeader);
        console.log('Received token:', token);
        console.log('Expected token:', utils_1.config.llm.openaiApiKey);
        console.log('Token comparison:', token === utils_1.config.llm.openaiApiKey);
    }
    if (!token || token !== utils_1.config.llm.openaiApiKey) {
        return reply.code(403).send({ error: 'Invalid or missing token' });
    }
    done();
};
exports.validateRequest = validateRequest;
