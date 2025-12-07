import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import * as THREE from 'three';
import MinecraftChat from '@/components/minecraft/MinecraftChat';
import MinecraftHotbar from '@/components/minecraft/MinecraftHotbar';
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
    const chunkCacheRef = useRef(new Map()); // Кэш чанков блоков
    const frustumRef = useRef(new THREE.Frustum());
    const blocksMapRef = useRef(new Map()); // Карта блоков для коллизий (x,y,z -> true)

    const [connected, setConnected] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [botState, setBotState] = useState(null);
    const [error, setError] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [selectedHotbarSlot, setSelectedHotbarSlot] = useState(0);

    const [settings, setSettings] = useState(() => {
        const defaults = {
            renderDistance: 24,
            correctionSpeed: 1.0,
            sensitivity: 1.0,
            localMovement: true,
            showDebug: false,
        };
        try {
            const saved = localStorage.getItem('minecraftViewerSettings');
            if (saved) {
                return { ...defaults, ...JSON.parse(saved) };
            }
        } catch (e) {}
        return defaults;
    });

    const settingsRef = useRef(settings);

    const keysPressed = useRef({});
    const localCameraRef = useRef({ yaw: 0, pitch: 0 });
    const chatOpenRef = useRef(false);

    useEffect(() => {
        chatOpenRef.current = chatOpen;
    }, [chatOpen]);

    useEffect(() => {
        localStorage.setItem('minecraftViewerSettings', JSON.stringify(settings));
        settingsRef.current = settings;

        if (socketRef.current && connected) {
            socketRef.current.emit('viewer:control', {
                command: { type: 'set_render_distance', distance: settings.renderDistance }
            });
        }
    }, [settings, connected]);

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
        scene.fog = new THREE.Fog(0x87CEEB, 30, 60);

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

            if (camera) {
                camera.updateMatrixWorld();
                const frustum = frustumRef.current;
                const projScreenMatrix = new THREE.Matrix4();
                projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
                frustum.setFromProjectionMatrix(projScreenMatrix);

                if (blocksGroupRef.current) {
                    blocksGroupRef.current.children.forEach(mesh => {
                        if (mesh.boundingSphere) {
                            mesh.visible = frustum.intersectsSphere(mesh.boundingSphere);
                        }
                    });
                }
            }

            if (camera && !chatOpenRef.current && settingsRef.current.localMovement) {
                const isMoving = keysPressed.current['KeyW'] || keysPressed.current['KeyS'] ||
                                keysPressed.current['KeyA'] || keysPressed.current['KeyD'];

                if (isMoving) {
                    const speed = 0.08;
                    const direction = new THREE.Vector3();
                    const right = new THREE.Vector3();

                    camera.getWorldDirection(direction);
                    direction.y = 0;
                    direction.normalize();

                    right.crossVectors(camera.up, direction).normalize();

                    const oldPos = camera.position.clone();

                    if (keysPressed.current['KeyW']) {
                        camera.position.add(direction.clone().multiplyScalar(speed));
                    }
                    if (keysPressed.current['KeyS']) {
                        camera.position.sub(direction.clone().multiplyScalar(speed));
                    }
                    if (keysPressed.current['KeyA']) {
                        camera.position.add(right.clone().multiplyScalar(speed));
                    }
                    if (keysPressed.current['KeyD']) {
                        camera.position.sub(right.clone().multiplyScalar(speed));
                    }

                    const hasCollision = checkCollision(
                        camera.position.x,
                        camera.position.y - 1.6,
                        camera.position.z
                    );

                    if (hasCollision) {
                        camera.position.copy(oldPos);
                    }
                }
            }

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

            if (state.yaw !== undefined && state.pitch !== undefined) {
                localCameraRef.current.yaw = state.yaw;
                localCameraRef.current.pitch = state.pitch;
            }

            if (state.position && cameraRef.current) {
                cameraRef.current.position.set(
                    state.position.x,
                    state.position.y + 1.6,
                    state.position.z
                );
                cameraRef.current.rotation.order = 'ZYX';
                cameraRef.current.rotation.set(localCameraRef.current.pitch, localCameraRef.current.yaw, 0);
            }

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

        socket.on('viewer:blockUpdate', (data) => {
            if (!blocksGroupRef.current || !data.position) return;

            const { x, y, z } = data.position;

            setBotState(prev => {
                if (!prev || !prev.blocks) return prev;

                const updatedBlocks = prev.blocks.filter(
                    b => !(b.x === x && b.y === y && b.z === z)
                );

                if (data.newBlock.type !== 0) {
                    updatedBlocks.push({
                        x, y, z,
                        type: data.newBlock.type,
                        name: data.newBlock.name
                    });
                }

                updateSingleBlock(data.position, data.oldBlock, data.newBlock, updatedBlocks);

                return {
                    ...prev,
                    blocks: updatedBlocks
                };
            });

            console.log('[MinecraftViewer] Block updated:', data);
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

        const serverPos = {
            x: data.position.x,
            y: data.position.y + 1.6,
            z: data.position.z
        };

        const camera = cameraRef.current;
        const correctionMultiplier = settingsRef.current.correctionSpeed;

        const horizontalDist = Math.sqrt(
            Math.pow(serverPos.x - camera.position.x, 2) +
            Math.pow(serverPos.z - camera.position.z, 2)
        );

        camera.position.y = serverPos.y;

        if (horizontalDist >= 8) {
            camera.position.x = serverPos.x;
            camera.position.z = serverPos.z;
        }
        else if (horizontalDist > 1.5) {
            const speed = 0.3 * correctionMultiplier;
            camera.position.x += (serverPos.x - camera.position.x) * speed;
            camera.position.z += (serverPos.z - camera.position.z) * speed;
        }
        else if (horizontalDist > 0.5) {
            const speed = 0.15 * correctionMultiplier;
            camera.position.x += (serverPos.x - camera.position.x) * speed;
            camera.position.z += (serverPos.z - camera.position.z) * speed;
        }
        else if (horizontalDist > 0.1) {
            const speed = 0.05 * correctionMultiplier;
            camera.position.x += (serverPos.x - camera.position.x) * speed;
            camera.position.z += (serverPos.z - camera.position.z) * speed;
        }
    };

    const getChunkKey = (x, y, z) => {
        const chunkX = Math.floor(x / 16);
        const chunkY = Math.floor(y / 16);
        const chunkZ = Math.floor(z / 16);
        return `${chunkX},${chunkY},${chunkZ}`;
    };

    const getBlockHash = (blocks) => {
        return blocks.map(b => `${b.x},${b.y},${b.z},${b.name}`).sort().join('|');
    };

    const checkCollision = (x, y, z) => {
        for (let dy = 0; dy < 2; dy++) {
            const checkY = Math.floor(y + dy);
            const checkX = Math.floor(x);
            const checkZ = Math.floor(z);
            const key = `${checkX},${checkY},${checkZ}`;
            if (blocksMapRef.current.has(key)) {
                return true; // Коллизия
            }
        }
        return false; // Свободно
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

    // Обновление одного блока в реальном времени
    const updateSingleBlock = (position, oldBlock, newBlock, updatedBlocks) => {
        if (!blocksGroupRef.current) return;

        const { x, y, z } = position;
        const chunkKey = getChunkKey(x, y, z);

        const cached = chunkCacheRef.current.get(chunkKey);
        if (cached) {
            if (cached.meshes) {
                cached.meshes.forEach(mesh => {
                    if (mesh.geometry) mesh.geometry.dispose();
                    if (mesh.material) mesh.material.dispose();
                    blocksGroupRef.current.remove(mesh);
                });
            }
            chunkCacheRef.current.delete(chunkKey);
        }

        // Форсируем перерисовку с обновленными блоками
        renderBlocks(updatedBlocks, true); // true = форсировать обновление
    };

    const renderBlocks = (blocks, forceUpdate = false) => {
        if (!blocksGroupRef.current) return;

        const blocksGroup = blocksGroupRef.current;

        blocksMapRef.current.clear();
        blocks.forEach(block => {
            const key = `${Math.floor(block.x)},${Math.floor(block.y)},${Math.floor(block.z)}`;
            blocksMapRef.current.set(key, true);
        });

        const chunkBlocks = new Map();
        blocks.forEach(block => {
            const chunkKey = getChunkKey(block.x, block.y, block.z);
            if (!chunkBlocks.has(chunkKey)) {
                chunkBlocks.set(chunkKey, []);
            }
            chunkBlocks.get(chunkKey).push(block);
        });

        const currentChunkKeys = new Set(chunkBlocks.keys());
        const cachedChunkKeys = new Set(chunkCacheRef.current.keys());

        let changedChunks = 0;
        const chanksToUpdate = new Set();

        for (const [chunkKey, chunkBlockList] of chunkBlocks.entries()) {
            const blockHash = getBlockHash(chunkBlockList);
            const cached = chunkCacheRef.current.get(chunkKey);

            if (!cached || cached.hash !== blockHash) {
                chanksToUpdate.add(chunkKey);
                changedChunks++;
            }
        }

        for (const chunkKey of cachedChunkKeys) {
            if (!currentChunkKeys.has(chunkKey)) {
                chanksToUpdate.add(chunkKey);
                changedChunks++;
            }
        }

        const changePercentage = changedChunks / Math.max(chunkBlocks.size, 1);
        if (!forceUpdate && changePercentage < 0.1 && changedChunks > 0 && changedChunks < 3) {
            return;
        }

        console.log(`[MinecraftViewer] Updating ${changedChunks} chunks out of ${chunkBlocks.size}`);

        chanksToUpdate.forEach(chunkKey => {
            const cached = chunkCacheRef.current.get(chunkKey);
            if (cached && cached.meshes) {
                cached.meshes.forEach(mesh => {
                    if (mesh.geometry) mesh.geometry.dispose();
                    if (mesh.material) mesh.material.dispose();
                    blocksGroup.remove(mesh);
                });
            }
            chunkCacheRef.current.delete(chunkKey);
        });

        const geometry = new THREE.BoxGeometry(1, 1, 1);

        chanksToUpdate.forEach(chunkKey => {
            const chunkBlockList = chunkBlocks.get(chunkKey);
            if (!chunkBlockList || chunkBlockList.length === 0) return;

            // Группируем блоки чанка по материалу
            const blocksByMaterial = {};
            chunkBlockList.forEach(block => {
                if (!blocksByMaterial[block.name]) {
                    blocksByMaterial[block.name] = [];
                }
                blocksByMaterial[block.name].push(block);
            });

            const meshes = [];
            Object.entries(blocksByMaterial).forEach(([blockName, blockList]) => {
                const material = getBlockMaterial(blockName);
                const instancedMesh = new THREE.InstancedMesh(geometry, material, blockList.length);

                const matrix = new THREE.Matrix4();
                blockList.forEach((block, i) => {
                    matrix.setPosition(block.x, block.y, block.z);
                    instancedMesh.setMatrixAt(i, matrix);
                });

                instancedMesh.instanceMatrix.needsUpdate = true;

                if (!geometry.boundingSphere) {
                    geometry.computeBoundingSphere();
                }

                // Создаём bounding sphere для всего чанка на основе блоков
                const centerX = blockList.reduce((sum, b) => sum + b.x, 0) / blockList.length;
                const centerY = blockList.reduce((sum, b) => sum + b.y, 0) / blockList.length;
                const centerZ = blockList.reduce((sum, b) => sum + b.z, 0) / blockList.length;

                const maxDist = Math.max(...blockList.map(b =>
                    Math.sqrt(
                        Math.pow(b.x - centerX, 2) +
                        Math.pow(b.y - centerY, 2) +
                        Math.pow(b.z - centerZ, 2)
                    )
                )) + 1; // +1 для размера блока

                instancedMesh.boundingSphere = new THREE.Sphere(
                    new THREE.Vector3(centerX, centerY, centerZ),
                    maxDist
                );

                blocksGroup.add(instancedMesh);
                meshes.push(instancedMesh);
            });

            // Кэшируем чанк
            chunkCacheRef.current.set(chunkKey, {
                hash: getBlockHash(chunkBlockList),
                meshes: meshes
            });
        });

        console.log(`[MinecraftViewer] Total blocks: ${blocks.length}, Chunks: ${chunkBlocks.size}, Updated: ${changedChunks}`);
    };

    const renderPlayers = (players) => {
        if (!playersGroupRef.current) return;

        const playersGroup = playersGroupRef.current;
        const currentPlayers = new Set(players.map(p => p.username));
        const cachedPlayers = new Set(playersCacheRef.current.keys());

        // Удаляем игроков которых больше нет
        for (const username of cachedPlayers) {
            if (!currentPlayers.has(username)) {
                const cached = playersCacheRef.current.get(username);
                if (cached?.group) {
                    cached.group.traverse(obj => {
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) obj.material.dispose();
                    });
                    playersGroup.remove(cached.group);
                }
                playersCacheRef.current.delete(username);
            }
        }

        // Обновляем или создаём игроков
        players.forEach(player => {
            const cached = playersCacheRef.current.get(player.username);

            if (!cached) {
                // Создаём нового игрока
                const playerGroup = new THREE.Group();

                const bodyGeometry = new THREE.BoxGeometry(0.6, 1.4, 0.3);
                const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x00aaff });
                const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
                bodyMesh.position.y = 0.9;
                playerGroup.add(bodyMesh);

                // Голова (отдельная группа для поворота по pitch)
                const headGroup = new THREE.Group();
                headGroup.position.y = 1.8;

                const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
                const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
                const headMesh = new THREE.Mesh(headGeometry, headMaterial);
                headGroup.add(headMesh);

                const noseGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.2);
                const noseMaterial = new THREE.MeshLambertMaterial({ color: 0xddaa77 });
                const noseMesh = new THREE.Mesh(noseGeometry, noseMaterial);
                noseMesh.position.z = 0.35;
                headGroup.add(noseMesh);

                playerGroup.add(headGroup);

                // Имя игрока
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
                sprite.position.y = 2.5;
                sprite.scale.set(2, 0.5, 1);
                playerGroup.add(sprite);

                // Позиция и поворот всего игрока по yaw
                playerGroup.position.set(player.position.x, player.position.y, player.position.z);
                playerGroup.rotation.y = (player.yaw || 0) + Math.PI;
                playersGroup.add(playerGroup);

                // Сохраняем ссылки на объекты для обновления
                playersCacheRef.current.set(player.username, {
                    group: playerGroup,
                    headGroup: headGroup,
                    targetPos: { x: player.position.x, y: player.position.y, z: player.position.z },
                    targetYaw: player.yaw || 0,
                    targetPitch: player.pitch || 0
                });
            } else {
                // Обновляем существующего игрока плавно
                cached.targetPos.x = player.position.x;
                cached.targetPos.y = player.position.y;
                cached.targetPos.z = player.position.z;
                cached.targetYaw = player.yaw || 0;
                cached.targetPitch = player.pitch || 0;

                // Плавная интерполяция
                const lerpFactor = 0.3;
                cached.group.position.x += (cached.targetPos.x - cached.group.position.x) * lerpFactor;
                cached.group.position.y += (cached.targetPos.y - cached.group.position.y) * lerpFactor;
                cached.group.position.z += (cached.targetPos.z - cached.group.position.z) * lerpFactor;

                // Интерполяция углов
                let yawDiff = cached.targetYaw - (cached.group.rotation.y - Math.PI);
                // Нормализация угла (-PI, PI)
                while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
                while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
                cached.group.rotation.y += yawDiff * lerpFactor;

                let pitchDiff = cached.targetPitch - (-cached.headGroup.rotation.x);
                cached.headGroup.rotation.x += -pitchDiff * lerpFactor;
            }
        });
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

            // Переключение слотов хотбара (1-9)
            if (e.code >= 'Digit1' && e.code <= 'Digit9') {
                const slotIndex = parseInt(e.code.replace('Digit', '')) - 1;
                setSelectedHotbarSlot(slotIndex);
                socketRef.current?.emit('viewer:control', {
                    command: { type: 'hotbar_slot', slot: slotIndex }
                });
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

            const sensitivity = 0.03 * settingsRef.current.sensitivity;
            const camera = cameraRef.current;
            if (!camera) return;

            localCameraRef.current.yaw -= e.movementX * sensitivity;
            localCameraRef.current.pitch -= e.movementY * sensitivity;
            localCameraRef.current.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, localCameraRef.current.pitch));

            camera.rotation.order = 'ZYX';
            camera.rotation.set(localCameraRef.current.pitch, localCameraRef.current.yaw, 0);

            socketRef.current?.emit('viewer:control', {
                command: {
                    type: 'look',
                    yaw: localCameraRef.current.yaw,
                    pitch: localCameraRef.current.pitch
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

        const handleWheel = (e) => {
            if (chatOpen) return;

            e.preventDefault();
            const delta = Math.sign(e.deltaY);
            setSelectedHotbarSlot(prev => {
                const newSlot = (prev + delta + 9) % 9;
                socketRef.current?.emit('viewer:control', {
                    command: { type: 'hotbar_slot', slot: newSlot }
                });
                return newSlot;
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('wheel', handleWheel, { passive: false });
        canvasRef.current?.addEventListener('click', handleClick);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('wheel', handleWheel);
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

    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="relative w-full h-full overflow-hidden bg-black">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

            {/* Кнопка настроек */}
            <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="absolute top-4 left-4 bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-2 rounded z-10"
                title="Настройки (Esc)"
            >
                ⚙️
            </button>

            {/* Панель настроек */}
            {settingsOpen && (
                <div className="absolute top-14 left-4 bg-black bg-opacity-90 text-white p-4 rounded w-72 z-20">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold">Настройки</h3>
                        <button onClick={() => setSettingsOpen(false)} className="text-gray-400 hover:text-white">✕</button>
                    </div>

                    <div className="space-y-4">
                        {/* Радиус отображения */}
                        <div>
                            <label className="block text-sm mb-1">
                                Радиус отображения: {settings.renderDistance} блоков
                            </label>
                            <input
                                type="range"
                                min="8"
                                max="64"
                                step="4"
                                value={settings.renderDistance}
                                onChange={(e) => updateSetting('renderDistance', parseInt(e.target.value))}
                                className="w-full accent-blue-500"
                            />
                        </div>

                        {/* Сила синхронизации */}
                        <div>
                            <label className="block text-sm mb-1">
                                Сила синхронизации: {settings.correctionSpeed.toFixed(1)}x
                            </label>
                            <input
                                type="range"
                                min="0.2"
                                max="3"
                                step="0.1"
                                value={settings.correctionSpeed}
                                onChange={(e) => updateSetting('correctionSpeed', parseFloat(e.target.value))}
                                className="w-full accent-blue-500"
                            />
                            <div className="text-xs text-gray-400 mt-1">
                                Меньше = плавнее движение, Больше = точнее позиция
                            </div>
                        </div>

                        {/* Чувствительность мыши */}
                        <div>
                            <label className="block text-sm mb-1">
                                Чувствительность мыши: {settings.sensitivity.toFixed(1)}x
                            </label>
                            <input
                                type="range"
                                min="0.2"
                                max="3"
                                step="0.1"
                                value={settings.sensitivity}
                                onChange={(e) => updateSetting('sensitivity', parseFloat(e.target.value))}
                                className="w-full accent-blue-500"
                            />
                        </div>

                        {/* Чекбоксы */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.localMovement}
                                    onChange={(e) => updateSetting('localMovement', e.target.checked)}
                                    className="accent-blue-500"
                                />
                                <span className="text-sm">Предикты (локальное движение)</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={settings.showDebug}
                                    onChange={(e) => updateSetting('showDebug', e.target.checked)}
                                    className="accent-blue-500"
                                />
                                <span className="text-sm">Показывать отладку</span>
                            </label>
                        </div>

                        {/* Кнопка сброса */}
                        <button
                            onClick={() => setSettings({
                                renderDistance: 24,
                                correctionSpeed: 1.0,
                                sensitivity: 1.0,
                                localMovement: true,
                                showDebug: false,
                            })}
                            className="w-full mt-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                        >
                            Сбросить настройки
                        </button>
                    </div>
                </div>
            )}

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
                    {settings.showDebug && cameraRef.current && (
                        <div className="text-xs mt-2 text-gray-400 border-t border-gray-600 pt-2">
                            <div>Camera: {cameraRef.current.position.x.toFixed(1)}, {cameraRef.current.position.y.toFixed(1)}, {cameraRef.current.position.z.toFixed(1)}</div>
                            <div>Yaw: {(localCameraRef.current.yaw * 180 / Math.PI).toFixed(0)}°</div>
                            <div>Chunks: {chunkCacheRef.current.size}</div>
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

            {/* Хот бар */}
            <MinecraftHotbar
                inventory={botState?.inventory || []}
                selectedSlot={selectedHotbarSlot}
                onSlotSelect={(slotIndex) => {
                    setSelectedHotbarSlot(slotIndex);
                    socketRef.current?.emit('viewer:control', {
                        command: { type: 'hotbar_slot', slot: slotIndex }
                    });
                }}
            />
        </div>
    );
};

export default MinecraftViewerTab;
