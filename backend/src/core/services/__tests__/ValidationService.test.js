const validationService = require('../ValidationService');
const { GRAPH_TYPES } = require('../../constants/graphTypes');

describe('ValidationService', () => {
    describe('parseGraph', () => {
        it('should parse JSON string graph', () => {
            const graphJson = JSON.stringify({ nodes: [], connections: [] });
            const result = validationService.parseGraph(graphJson, 'test');

            expect(result).toEqual({ nodes: [], connections: [] });
        });

        it('should return graph object as-is', () => {
            const graphObj = { nodes: [], connections: [] };
            const result = validationService.parseGraph(graphObj, 'test');

            expect(result).toBe(graphObj);
        });

        it('should return null for invalid JSON', () => {
            const result = validationService.parseGraph('invalid json', 'test');

            expect(result).toBeNull();
        });
    });

    describe('hasValidBasicStructure', () => {
        it('should return true for valid graph structure', () => {
            const graph = { nodes: [], connections: [] };

            expect(validationService.hasValidBasicStructure(graph)).toBe(true);
        });

        it('should return false for graph without nodes', () => {
            const graph = { connections: [] };

            expect(validationService.hasValidBasicStructure(graph)).toBe(false);
        });

        it('should return false for graph without connections', () => {
            const graph = { nodes: [] };

            expect(validationService.hasValidBasicStructure(graph)).toBe(false);
        });

        it('should return false for null graph', () => {
            expect(validationService.hasValidBasicStructure(null)).toBe(false);
        });

        it('should return false for undefined graph', () => {
            expect(validationService.hasValidBasicStructure(undefined)).toBe(false);
        });
    });

    describe('validateGraphStructure', () => {
        it('should validate correct graph structure', () => {
            const graph = {
                nodes: [
                    {
                        id: '1',
                        type: 'event:command',
                        position: { x: 0, y: 0 },
                        data: {}
                    }
                ],
                connections: [],
                variables: []
            };

            const result = validationService.validateGraphStructure(graph, 'test');

            expect(result.success).toBe(true);
            expect(result.shouldSkip).toBe(false);
        });

        it('should fail validation for invalid graph', () => {
            const graph = {
                nodes: 'not an array',
                connections: []
            };

            // В production mode не выбрасывает исключение, а возвращает shouldSkip: true
            if (process.env.NODE_ENV === 'production') {
                const result = validationService.validateGraphStructure(graph, 'test');

                expect(result.success).toBe(false);
                expect(result.shouldSkip).toBe(true);
                expect(result.error).toBeDefined();
            } else {
                // В dev/test mode выбрасывает исключение
                expect(() => {
                    validationService.validateGraphStructure(graph, 'test');
                }).toThrow('Invalid graph structure');
            }
        });
    });

    describe('validateNode', () => {
        it('should validate correct node configuration', () => {
            const nodeConfig = {
                type: 'test:node',
                label: 'Test Node',
                category: 'Test',
                description: 'Test description',
                inputs: [],
                outputs: [],
                graphType: GRAPH_TYPES.ALL
            };

            const result = validationService.validateNode(nodeConfig, 'test');

            expect(result.success).toBe(true);
            expect(result.shouldSkip).toBe(false);
        });

        it('should fail validation for invalid node', () => {
            const nodeConfig = {
                type: 'test:node',
                // Missing required fields
            };

            // В production mode не выбрасывает исключение, а возвращает shouldSkip: true
            if (process.env.NODE_ENV === 'production') {
                const result = validationService.validateNode(nodeConfig, 'test');

                expect(result.success).toBe(false);
                expect(result.shouldSkip).toBe(true);
                expect(result.error).toBeDefined();
            } else {
                // В dev/test mode выбрасывает исключение
                expect(() => {
                    validationService.validateNode(nodeConfig, 'test');
                }).toThrow();
            }
        });
    });

    describe('utility methods', () => {
        it('isValidationEnabled should return true', () => {
            expect(validationService.isValidationEnabled()).toBe(true);
        });

        it('isStrictMode should reflect environment', () => {
            const expected = process.env.NODE_ENV !== 'production';
            expect(validationService.isStrictMode()).toBe(expected);
        });
    });
});
