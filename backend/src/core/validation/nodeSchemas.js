const { z } = require('zod');

const PinSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    type: z.string().min(1),
    required: z.boolean().optional(),
    defaultValue: z.any().optional(),
});

const NodeConfigSchema = z.object({
    type: z.string().min(1),
    label: z.string().min(1),
    category: z.string().min(1),
    description: z.string().optional(),
    inputs: z.array(PinSchema).optional().default([]),
    outputs: z.array(PinSchema).optional().default([]),
    executor: z.function().optional(),
    evaluator: z.function().optional(),
    graphTypes: z.array(z.enum(['all', 'command', 'event'])).optional(),
});

const NodeDataSchema = z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    position: z.object({
        x: z.number(),
        y: z.number(),
    }),
    data: z.any().optional().default({}),
    deletable: z.boolean().optional(),
});

const ConnectionSchema = z.object({
    id: z.string().min(1),
    sourceNodeId: z.string().min(1),
    targetNodeId: z.string().min(1),
    sourcePinId: z.string().min(1),
    targetPinId: z.string().min(1),
});

const GraphSchema = z.object({
    nodes: z.array(NodeDataSchema),
    connections: z.array(ConnectionSchema),
    variables: z.array(z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        type: z.enum(['string', 'number', 'boolean', 'array', 'object']),
        value: z.any(),
    })).optional().default([]),
});

function validateNodeConfig(nodeConfig) {
    try {
        return {
            success: true,
            data: NodeConfigSchema.parse(nodeConfig),
        };
    } catch (error) {
        return {
            success: false,
            error: error.issues || error.errors || [{ message: error.message }],
        };
    }
}

function validateNodeData(nodeData) {
    try {
        return {
            success: true,
            data: NodeDataSchema.parse(nodeData),
        };
    } catch (error) {
        return {
            success: false,
            error: error.issues || error.errors || [{ message: error.message }],
        };
    }
}

function validateGraph(graph) {
    try {
        return {
            success: true,
            data: GraphSchema.parse(graph),
        };
    } catch (error) {
        return {
            success: false,
            error: error.issues || error.errors || [{ message: error.message }],
        };
    }
}

module.exports = {
    PinSchema,
    NodeConfigSchema,
    NodeDataSchema,
    ConnectionSchema,
    GraphSchema,
    validateNodeConfig,
    validateNodeData,
    validateGraph,
};
