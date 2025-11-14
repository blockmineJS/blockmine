const {
    validateNodeConfig,
    validateNodeData,
    validateGraph,
} = require('../nodeSchemas');

describe('Node Validation Schemas', () => {
    describe('validateNodeConfig', () => {
        it('should validate correct node configuration', () => {
            const validConfig = {
                type: 'test:node',
                label: 'Test Node',
                category: 'Test',
                inputs: [
                    { id: 'input1', name: 'Input 1', type: 'String' }
                ],
                outputs: [
                    { id: 'output1', name: 'Output 1', type: 'String' }
                ],
            };

            const result = validateNodeConfig(validConfig);
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
        });

        it('should fail validation for missing required fields', () => {
            const invalidConfig = {
                label: 'Test Node',
            };

            const result = validateNodeConfig(invalidConfig);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('should fail validation for invalid pin structure', () => {
            const invalidConfig = {
                type: 'test:node',
                label: 'Test Node',
                category: 'Test',
                inputs: [
                    { id: '', name: 'Input 1', type: 'String' }
                ],
            };

            const result = validateNodeConfig(invalidConfig);
            expect(result.success).toBe(false);
        });

        it('should accept optional fields', () => {
            const configWithOptional = {
                type: 'test:node',
                label: 'Test Node',
                category: 'Test',
                description: 'A test node',
                inputs: [],
                outputs: [],
            };

            const result = validateNodeConfig(configWithOptional);
            expect(result.success).toBe(true);
        });
    });

    describe('validateNodeData', () => {
        it('should validate correct node data', () => {
            const validNodeData = {
                id: 'node-123',
                type: 'test:node',
                position: { x: 100, y: 200 },
                data: { pinCount: 2 },
            };

            const result = validateNodeData(validNodeData);
            expect(result.success).toBe(true);
        });

        it('should fail validation for missing position coordinates', () => {
            const invalidNodeData = {
                id: 'node-123',
                type: 'test:node',
                position: { x: 100 },
            };

            const result = validateNodeData(invalidNodeData);
            expect(result.success).toBe(false);
        });

        it('should accept empty data object', () => {
            const nodeDataWithEmptyData = {
                id: 'node-123',
                type: 'test:node',
                position: { x: 100, y: 200 },
            };

            const result = validateNodeData(nodeDataWithEmptyData);
            expect(result.success).toBe(true);
            expect(result.data.data).toEqual({});
        });
    });

    describe('validateGraph', () => {
        it('should validate correct graph structure', () => {
            const validGraph = {
                nodes: [
                    {
                        id: 'node-1',
                        type: 'test:node',
                        position: { x: 100, y: 200 },
                        data: {},
                    }
                ],
                connections: [
                    {
                        id: 'conn-1',
                        sourceNodeId: 'node-1',
                        targetNodeId: 'node-2',
                        sourcePinId: 'output1',
                        targetPinId: 'input1',
                    }
                ],
                variables: [
                    {
                        id: 'var-1',
                        name: 'testVar',
                        type: 'string',
                        value: 'test',
                    }
                ],
            };

            const result = validateGraph(validGraph);
            expect(result.success).toBe(true);
        });

        it('should fail validation for missing nodes array', () => {
            const invalidGraph = {
                connections: [],
            };

            const result = validateGraph(invalidGraph);
            expect(result.success).toBe(false);
        });

        it('should accept graph with empty variables', () => {
            const graphWithoutVars = {
                nodes: [],
                connections: [],
            };

            const result = validateGraph(graphWithoutVars);
            expect(result.success).toBe(true);
            expect(result.data.variables).toEqual([]);
        });

        it('should fail validation for invalid variable type', () => {
            const invalidGraph = {
                nodes: [],
                connections: [],
                variables: [
                    {
                        id: 'var-1',
                        name: 'testVar',
                        type: 'invalid_type',
                        value: 'test',
                    }
                ],
            };

            const result = validateGraph(invalidGraph);
            expect(result.success).toBe(false);
        });
    });
});
