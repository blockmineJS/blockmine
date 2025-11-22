import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import * as THREE from 'three';
import MinecraftChat from '@/components/minecraft/MinecraftChat';
import { loadBlockTextures, getBlockMaterial } from './blockTextureLoader';

const MinecraftViewerTab = () => {
    const { botId } = useParams();
    const canvasRef = useRef(null);
    const socketRef = useRef(null);
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const animationFrameRef = useRef(null);
    const blocksGroupRef = useRef(null);
    const playersGroupRef = useRef(null);
    const texturesLoadedRef = useRef(false);
    const blocksCacheRef = useRef(new Map());
    const playersCacheRef = useRef(new Map());
    const raycasterRef = useRef(new THREE.Raycaster());
    const highlightRef = useRef(null);

    const [connected, setConnected] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [botState, setBotState] = useState(null);
    const [error, setError] = useState(null);

    const keysPressed = useRef({});

    useEffect(() => {
        connectToBot();

        return () => {
            if (socketRef.current) {
                socketRef.current.emit('viewer:disconnect');
                socketRef.current.disconnect();
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (rendererRef.current) {
                rendererRef.current.dispose();
            }
        };
    }, [botId]);

    // Инициализация сцены когда подключились
    useEffect(() => {
        if (connected && canvasRef.current && !rendererRef.current) {
            console.log('[MinecraftViewer] Initializing scene...');
            initializeScene();
            loadTexturesAsync();
        }
    }, [connected]);

    const loadTexturesAsync = async () => {
        try {
            await loadBlockTextures('1.20.1');
            texturesLoadedRef.current = true;
            console.log('[MinecraftViewer] Textures loaded, re-rendering blocks');

            if (botState?.blocks) {
                renderBlocks(botState.blocks);
            }
        } catch (error) {
            console.error('[MinecraftViewer] Failed to load textures:', error);
        }
    };

    const initializeScene = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const parent = canvas.parentElement;
        const width = parent?.clientWidth || window.innerWidth;
        const height = parent?.clientHeight || window.innerHeight;

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio || 1);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog = new THREE.Fog(0x87CEEB, 40, 80);

        const camera = new THREE.PerspectiveCamera(
            75,
            width / height,
            0.1,
            1000
        );

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 200, 100);
        scene.add(directionalLight);

        const gridHelper = new THREE.GridHelper(200, 20, 0x888888, 0x444444);
        scene.add(gridHelper);

        const axesHelper = new THREE.AxesHelper(50);
        scene.add(axesHelper);

        const blocksGroup = new THREE.Group();
        scene.add(blocksGroup);
        blocksGroupRef.current = blocksGroup;

        const playersGroup = new THREE.Group();
        scene.add(playersGroup);
        playersGroupRef.current = playersGroup;

        const highlightGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
        const highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.3,
            wireframe: true,
            wireframeLinewidth: 2
        });
        const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        highlight.visible = false;
        scene.add(highlight);
        highlightRef.current = highlight;

        rendererRef.current = renderer;
        sceneRef.current = scene;
        cameraRef.current = camera;

        if (botState && botState.position) {
            camera.position.set(
                botState.position.x,
                botState.position.y + 1.6,
                botState.position.z
            );
            camera.rotation.order = 'ZYX';
            camera.rotation.set(botState.pitch || 0, botState.yaw || 0, 0);
            console.log('[MinecraftViewer] Camera initialized at bot position:', botState.position);
        } else {
            camera.position.set(0, 70, 0);
            camera.lookAt(0, 0, 0);
            console.log('[MinecraftViewer] Camera initialized at default position');
        }

        const animate = () => {
            animationFrameRef.current = requestAnimationFrame(animate);

            if (document.pointerLockElement === canvas && blocksGroupRef.current && highlightRef.current) {
                const raycaster = raycasterRef.current;
                raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
                raycaster.far = 5;

                const intersects = raycaster.intersectObjects(blocksGroupRef.current.children, true);
                if (intersects.length > 0) {
                    const hit = intersects[0];

                    let blockPos;
                    if (hit.instanceId !== undefined) {
                        const matrix = new THREE.Matrix4();
                        hit.object.getMatrixAt(hit.instanceId, matrix);
                        const position = new THREE.Vector3();
                        position.setFromMatrixPosition(matrix);
                        blockPos = position;
                    } else {
                        blockPos = hit.object.position;
                    }

                    highlightRef.current.position.set(
                        Math.floor(blockPos.x) + 0.5,
                        Math.floor(blockPos.y) + 0.5,
                        Math.floor(blockPos.z) + 0.5
                    );
                    highlightRef.current.visible = true;
                } else {
                    highlightRef.current.visible = false;
                }
            } else if (highlightRef.current) {
                highlightRef.current.visible = false;
            }

            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            const parent = canvas.parentElement;
            const width = parent?.clientWidth || window.innerWidth;
            const height = parent?.clientHeight || window.innerHeight;

            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);

        console.log('[MinecraftViewer] Scene initialized', { width, height });

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    };

    const connectToBot = () => {
        setError(null);

        const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;
        const socket = io(`${SOCKET_URL}/minecraft-viewer`, {
            path: '/socket.io/',
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            console.log('[MinecraftViewer] Connected to server');
            socket.emit('viewer:connect', { botId: parseInt(botId) });
        });

        socket.on('viewer:connected', () => {
            console.log('[MinecraftViewer] Connected to bot');
            setConnected(true);
        });

        socket.on('viewer:state', (state) => {
            console.log('[MinecraftViewer] Initial state:', state);
            setBotState(state);
            if (state.blocks) {
                renderBlocks(state.blocks);
            }
            if (state.nearbyPlayers) {
                renderPlayers(state.nearbyPlayers);
            }
        });

        socket.on('viewer:spawn', (data) => {
            console.log('[MinecraftViewer] Bot spawned:', data);
        });

        socket.on('viewer:update', (state) => {
            setBotState(state);
            if (state.position) {
                updateCamera(state);
            }
            if (state.blocks) {
                renderBlocks(state.blocks);
            }
            if (state.nearbyPlayers) {
                renderPlayers(state.nearbyPlayers);
            }
        });

        socket.on('viewer:move', (data) => {
            setBotState(prev => ({
                ...prev,
                position: data.position,
                yaw: data.yaw,
                pitch: data.pitch
            }));
            updateCamera(data);
        });

        socket.on('viewer:health', (data) => {
            setBotState(prev => ({
                ...prev,
                health: data.health,
                food: data.food
            }));
        });

        socket.on('viewer:chat', (data) => {
            setChatMessages(prev => [...prev, { text: data.rawText, timestamp: Date.now() }]);
        });

        socket.on('viewer:error', ({ message }) => {
            console.error('[MinecraftViewer] Error:', message);
            setError(message);
            setConnected(false);
        });

        socket.on('disconnect', () => {
            console.log('[MinecraftViewer] Disconnected from server');
            setConnected(false);
        });

        socketRef.current = socket;
    };

    const updateCamera = (data) => {
        if (!cameraRef.current || !data.position) return;

        const camera = cameraRef.current;

        camera.position.x = data.position.x;
        camera.position.y = data.position.y + 1.6;
        camera.position.z = data.position.z;

        const pitch = data.pitch || 0;
        const yaw = data.yaw || 0;

        camera.rotation.order = 'ZYX';
        camera.rotation.set(pitch, yaw, 0);
    };

    const getBlockColor = (blockName) => {
        const colorMap = {
            'grass_block': 0x7cbd6b,
            'dirt': 0x96651b,
            'coarse_dirt': 0x7a5b3f,
            'podzol': 0x5a4832,
            'stone': 0x7f7f7f,
            'cobblestone': 0x7a7a7a,
            'mossy_cobblestone': 0x627662,
            'stone_bricks': 0x7a7a7a,
            'cracked_stone_bricks': 0x737373,
            'mossy_stone_bricks': 0x6b7a6b,
            'oak_log': 0x976f3b,
            'birch_log': 0xd7d3c9,
            'spruce_log': 0x5c4426,
            'jungle_log': 0x5c4426,
            'acacia_log': 0x6d6d6d,
            'dark_oak_log': 0x3d2f1d,
            'oak_planks': 0xb8945f,
            'birch_planks': 0xd7cb8d,
            'spruce_planks': 0x7a5c3e,
            'jungle_planks': 0xa86f3e,
            'acacia_planks': 0xba683b,
            'dark_oak_planks': 0x492f17,
            'sand': 0xe0d8a8,
            'red_sand': 0xbf6d3c,
            'gravel': 0x887e7e,
            'water': 0x3f76e4,
            'lava': 0xff6b1a,
            'glass': 0xc0f6fe,
            'white_stained_glass': 0xffffff,
            'bedrock': 0x565656,
            'coal_ore': 0x6b6b6b,
            'iron_ore': 0xc4a789,
            'gold_ore': 0xfcee4b,
            'diamond_ore': 0x6bcfef,
            'emerald_ore': 0x26a65b,
            'redstone_ore': 0x9e2c2c,
            'lapis_ore': 0x1c4b9b,
            'oak_leaves': 0x63a34f,
            'birch_leaves': 0x73a839,
            'spruce_leaves': 0x3d5d28,
            'jungle_leaves': 0x53a237,
            'acacia_leaves': 0x5f9f28,
            'dark_oak_leaves': 0x3f6e23,
            'snow': 0xffffff,
            'snow_block': 0xffffff,
            'ice': 0x9dd4ff,
            'packed_ice': 0x99b8ff,
            'clay': 0x9ca6b0,
            'terracotta': 0x9a5936,
            'white_terracotta': 0xd0a192,
            'orange_terracotta': 0xa15325,
            'yellow_terracotta': 0xba8524,
            'red_terracotta': 0x8f3d2e,
            'netherrack': 0x6b3b3b,
            'soul_sand': 0x544033,
            'glowstone': 0xf9d88c,
            'obsidian': 0x0f0b1a,
            'end_stone': 0xe3e8a0,
            'purpur_block': 0xa879c7,
            'white_wool': 0xffffff,
            'orange_wool': 0xf07613,
            'magenta_wool': 0xbd44b3,
            'light_blue_wool': 0x3aafd9,
            'yellow_wool': 0xf8c627,
            'lime_wool': 0x70b919,
            'pink_wool': 0xed8dac,
            'gray_wool': 0x3e4447,
            'light_gray_wool': 0x8e8e86,
            'cyan_wool': 0x158991,
            'purple_wool': 0x792aac,
            'blue_wool': 0x35399d,
            'brown_wool': 0x724728,
            'green_wool': 0x546d1b,
            'red_wool': 0xa12722,
            'black_wool': 0x191616,
            'bricks': 0x985542,
            'bookshelf': 0x7f5539,
        };
        return colorMap[blockName] || 0xcccccc;
    };

    const renderBlocks = (blocks) => {
        if (!blocksGroupRef.current) return;

        const blocksGroup = blocksGroupRef.current;
        const newBlocksSet = new Set();
        const blocksByMaterial = {};

        blocks.forEach(block => {
            const key = `${block.x},${block.y},${block.z}`;
            newBlocksSet.add(key);

            if (!blocksByMaterial[block.name]) {
                blocksByMaterial[block.name] = [];
            }
            blocksByMaterial[block.name].push(block);
        });

        const currentCache = blocksCacheRef.current;

        let addedBlocks = 0;
        let removedBlocks = 0;

        for (const key of newBlocksSet) {
            if (!currentCache.has(key)) {
                addedBlocks++;
            }
        }

        for (const key of currentCache.keys()) {
            if (!newBlocksSet.has(key)) {
                removedBlocks++;
            }
        }

        const totalChanges = addedBlocks + removedBlocks;
        const changePercentage = totalChanges / Math.max(blocks.length, 1);

        if (changePercentage < 0.05) {
            return;
        }

        while (blocksGroup.children.length > 0) {
            const child = blocksGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            blocksGroup.remove(child);
        }

        blocksCacheRef.current.clear();
        blocks.forEach(block => {
            const key = `${block.x},${block.y},${block.z}`;
            blocksCacheRef.current.set(key, block);
        });

        const geometry = new THREE.BoxGeometry(1, 1, 1);

        Object.entries(blocksByMaterial).forEach(([blockName, blockList]) => {
            const material = getBlockMaterial(blockName);
            const instancedMesh = new THREE.InstancedMesh(geometry, material, blockList.length);

            const matrix = new THREE.Matrix4();
            blockList.forEach((block, i) => {
                matrix.setPosition(block.x, block.y, block.z);
                instancedMesh.setMatrixAt(i, matrix);
            });

            instancedMesh.instanceMatrix.needsUpdate = true;
            blocksGroup.add(instancedMesh);
        });

        console.log(`[MinecraftViewer] Rendered ${blocks.length} blocks (${totalChanges} changed, ${changePercentage.toFixed(2)}%)`);
    };

    const renderPlayers = (players) => {
        if (!playersGroupRef.current) return;

        const playersGroup = playersGroupRef.current;
        const newPlayersMap = new Map();

        players.forEach(player => {
            const key = player.username;
            newPlayersMap.set(key, {
                x: player.position.x,
                y: player.position.y,
                z: player.position.z
            });
        });

        const currentCache = playersCacheRef.current;
        let hasChanges = false;

        if (newPlayersMap.size !== currentCache.size) {
            hasChanges = true;
        } else {
            for (const [username, pos] of newPlayersMap) {
                const cached = currentCache.get(username);
                if (!cached ||
                    Math.abs(cached.x - pos.x) > 0.1 ||
                    Math.abs(cached.y - pos.y) > 0.1 ||
                    Math.abs(cached.z - pos.z) > 0.1) {
                    hasChanges = true;
                    break;
                }
            }
        }

        if (!hasChanges) {
            return;
        }

        while (playersGroup.children.length > 0) {
            const child = playersGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
            playersGroup.remove(child);
        }

        playersCacheRef.current.clear();

        players.forEach(player => {
            const playerGroup = new THREE.Group();

            const bodyGeometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
            const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x00aaff });
            const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
            bodyMesh.position.y = 0.9;
            playerGroup.add(bodyMesh);

            const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
            const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
            const headMesh = new THREE.Mesh(headGeometry, headMaterial);
            headMesh.position.y = 2.2;
            playerGroup.add(headMesh);

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = 256;
            canvas.height = 64;
            context.fillStyle = 'rgba(0, 0, 0, 0.6)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.font = 'bold 32px Arial';
            context.fillStyle = 'white';
            context.textAlign = 'center';
            context.fillText(player.username, canvas.width / 2, 42);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.y = 3;
            sprite.scale.set(2, 0.5, 1);
            playerGroup.add(sprite);

            playerGroup.position.set(player.position.x, player.position.y, player.position.z);
            playersGroup.add(playerGroup);

            playersCacheRef.current.set(player.username, {
                x: player.position.x,
                y: player.position.y,
                z: player.position.z
            });
        });

        console.log(`[MinecraftViewer] Rendered ${players.length} players`);
    };

    useEffect(() => {
        if (!connected) return;

        const handleKeyDown = (e) => {
            if (chatOpen && e.code !== 'Escape') return;

            if (e.code === 'KeyT') {
                e.preventDefault();
                setChatOpen(true);
                return;
            }

            if (e.code === 'Escape') {
                setChatOpen(false);
                return;
            }

            keysPressed.current[e.code] = true;

            const keyMap = {
                'KeyW': 'forward',
                'KeyS': 'back',
                'KeyA': 'left',
                'KeyD': 'right',
                'Space': 'jump',
                'ShiftLeft': 'sneak',
                'ControlLeft': 'sprint'
            };

            if (keyMap[e.code] && !chatOpen) {
                socketRef.current?.emit('viewer:control', {
                    command: { type: 'move', direction: keyMap[e.code], active: true }
                });
            }
        };

        const handleKeyUp = (e) => {
            keysPressed.current[e.code] = false;

            const keyMap = {
                'KeyW': 'forward',
                'KeyS': 'back',
                'KeyA': 'left',
                'KeyD': 'right',
                'Space': 'jump',
                'ShiftLeft': 'sneak',
                'ControlLeft': 'sprint'
            };

            if (keyMap[e.code]) {
                socketRef.current?.emit('viewer:control', {
                    command: { type: 'move', direction: keyMap[e.code], active: false }
                });
            }
        };

        const handleMouseMove = (e) => {
            if (document.pointerLockElement !== canvasRef.current) return;

            const sensitivity = 0.03;

            socketRef.current?.emit('viewer:control', {
                command: {
                    type: 'look',
                    yaw: (botState?.yaw || 0) - e.movementX * sensitivity,
                    pitch: Math.max(-Math.PI / 2, Math.min(Math.PI / 2, (botState?.pitch || 0) - e.movementY * sensitivity))
                }
            });
        };

        const handleClick = () => {
            if (chatOpen) return;

            if (document.pointerLockElement === canvasRef.current) {
                const camera = cameraRef.current;
                const blocksGroup = blocksGroupRef.current;
                if (!camera || !blocksGroup) return;

                const raycaster = raycasterRef.current;
                raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
                raycaster.far = 5;

                const intersects = raycaster.intersectObjects(blocksGroup.children, true);
                if (intersects.length > 0) {
                    const hit = intersects[0];

                    let blockPos;
                    if (hit.instanceId !== undefined) {
                        const matrix = new THREE.Matrix4();
                        hit.object.getMatrixAt(hit.instanceId, matrix);
                        const position = new THREE.Vector3();
                        position.setFromMatrixPosition(matrix);
                        blockPos = position;
                    } else {
                        blockPos = hit.object.position || hit.point;
                    }

                    const blockX = Math.floor(blockPos.x);
                    const blockY = Math.floor(blockPos.y);
                    const blockZ = Math.floor(blockPos.z);

                    console.log(`[MinecraftViewer] Breaking block at ${blockX}, ${blockY}, ${blockZ}`);

                    socketRef.current?.emit('viewer:control', {
                        command: {
                            type: 'dig',
                            position: { x: blockX, y: blockY, z: blockZ }
                        }
                    });
                }
            } else {
                canvasRef.current?.requestPointerLock();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);
        canvasRef.current?.addEventListener('click', handleClick);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
            canvasRef.current?.removeEventListener('click', handleClick);
        };
    }, [connected, chatOpen, botState]);

    const sendChatMessage = (message) => {
        socketRef.current?.emit('viewer:control', {
            command: { type: 'chat', message }
        });
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-900">
                <div className="bg-red-900 text-red-200 p-6 rounded">
                    <h2 className="text-xl font-bold mb-2">Error</h2>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!connected) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-900">
                <div className="text-white">Connecting to bot...</div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full overflow-hidden bg-black">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

            {botState && (
                <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white p-4 rounded">
                    <div>Health: {botState.health?.toFixed(1) || 20}</div>
                    <div>Food: {botState.food?.toFixed(1) || 20}</div>
                    {botState.position && (
                        <div className="text-sm mt-2">
                            X: {botState.position.x.toFixed(1)}{' '}
                            Y: {botState.position.y.toFixed(1)}{' '}
                            Z: {botState.position.z.toFixed(1)}
                        </div>
                    )}
                </div>
            )}

            <MinecraftChat
                messages={chatMessages}
                isOpen={chatOpen}
                onClose={() => setChatOpen(false)}
                onSend={(message) => {
                    sendChatMessage(message);
                    setChatOpen(false);
                }}
                alwaysShowMessages={true}
            />
        </div>
    );
};

export default MinecraftViewerTab;
