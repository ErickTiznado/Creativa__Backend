
import { jest } from '@jest/globals';

jest.unstable_mockModule('nicola-framework', () => ({
    Dynamo: {
        Model: class { }
    }
}));

describe('ChatSession Model', () => {
    let ChatSession;

    beforeAll(async () => {
        const module = await import('../model/ChatSession.model');
        ChatSession = module.default;
    });

    test('should be defined', () => {
        expect(ChatSession).toBeDefined();
    });

    test('should have correct tableName', () => {
        expect(ChatSession.tableName).toBe('devschema.campaings_chat_sessions');
    });
});
