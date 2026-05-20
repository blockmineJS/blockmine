import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { io } from 'socket.io-client';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import MinecraftChat from '@/components/minecraft/MinecraftChat';
import MinecraftHotbar from '@/components/minecraft/MinecraftHotbar';
import MinecraftWindowOverlay from '@/components/minecraft/MinecraftWindowOverlay';
import MinecraftPlayerList from '@/components/minecraft/MinecraftPlayerList';
import MinecraftScoreboard from '@/components/minecraft/MinecraftScoreboard';
import MinecraftPauseMenu from '@/components/minecraft/MinecraftPauseMenu';
import MinecraftInventory from '@/components/minecraft/MinecraftInventory';
import {
    loadBlockTextures,
    getBlockMaterial,
    getBlockGeometry,
    getBlockEmissive,
    disposeTextureCache,
} from './blockTextureLoader';
import { getEntityGeometry, getEntityMaterial, isEntityBlock as isEntityModel } from './entityModels';
import { useCoordinatePickerStore } from '@/stores/coordinatePickerStore';
import FadeTransition from '@/components/FadeTransition';

const getThemeThreeColor = (variableName, fallback) => {
    if (typeof window === 'undefined') return new THREE.Color(fallback);
    const rawValue = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
    if (!rawValue) return new THREE.Color(fallback);
    const normalized = rawValue.replace(/\s+/g, ' ').split(' ');
    if (normalized.length < 3) return new THREE.Color(fallback);
    const [h, s, l] = normalized;
    const color = new THREE.Color();
    try { color.setStyle(`hsl(${h}, ${s}, ${l})`); }
    catch (e) { return new THREE.Color(fallback); }
    return color;
};

const VIEWER_ERROR_TRANSLATION_KEYS = {
    'Bot not running': 'errors.botNotRunning',
};

function detectWebGL() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return { supported: false, reason: 'no_context' };
        return { supported: true, version: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl' };
    } catch (e) {
        return { supported: false, reason: e.message };
    }
}

const DEFAULT_SETTINGS = {
    renderDistance: 24,
    correctionSpeed: 1.0,
    sensitivity: 1.0,
    localMovement: true,
    showDebug: false,
    fxaa: true,
    instancedRendering: true,
    frustumCulling: true,
    throttleWhenHidden: true,
    dynamicLighting: true,
};

const MAX_DYNAMIC_LIGHTS = 32;

const MinecraftViewerTab = () => {
    const { t } = useTranslation('minecraft-viewer');
    const { botId } = useParams();
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const socketRef = useRef(null);
    const rendererRef = useRef(null);
    const composerRef = useRef(null);
    const fxaaPassRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const animationFrameRef = useRef(null);
    const blocksGroupRef = useRef(null);
    const lightsGroupRef = useRef(null);
    const playersGroupRef = useRef(null);
    const texturesLoadedRef = useRef(false);
    const playersCacheRef = useRef(new Map());
    const raycasterRef = useRef(new THREE.Raycaster());
    const highlightRef = useRef(null);
    const chunkCacheRef = useRef(new Map());
    const lightCacheRef = useRef(new Map()); // 'x,y,z' -> PointLight
    const frustumRef = useRef(new THREE.Frustum());
    const projScreenMatrixRef = useRef(new THREE.Matrix4());
    const blocksMapRef = useRef(new Map());
    const pickMarkerRef = useRef(null);
    const sceneInitializedRef = useRef(false);
    const initialChunkReceivedRef = useRef(false);
    const tabHiddenRef = useRef(false);
    const lastFrameTimeRef = useRef(0);
    const fpsRef = useRef(0);
    const fpsTickerRef = useRef({ frames: 0, lastUpdate: performance.now() });
    const pauseMenuOpenRef = useRef(false);
    const openWindowRef = useRef(null);
    const inventoryOpenRef = useRef(false);
    const chatOpenRef = useRef(false);
    const pendingClickRef = useRef(false);
    // Флаг, что выход из pointer lock инициирован самим клиентом
    // (открытие окна/чата/меню/E/T/ESC). Если выход не инициирован — значит
    // браузер обработал ESC сам → открываем pause-меню.
    const intentionalUnlockRef = useRef(false);

    const [connected, setConnected] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [botState, setBotState] = useState(null);
    const [error, setError] = useState(null);
    const [selectedHotbarSlot, setSelectedHotbarSlot] = useState(0);
    const [webglError, setWebglError] = useState(null);
    const [renderReady, setRenderReady] = useState(false);
    const [openWindow, setOpenWindow] = useState(null);
    const [inventoryOpen, setInventoryOpen] = useState(false);
    const [tabHeld, setTabHeld] = useState(false);
    const [scoreboardVisible, setScoreboardVisible] = useState(true);
    const [scoreboard, setScoreboard] = useState(null);
    const [playerList, setPlayerList] = useState([]);
    const [tablistHeader, setTablistHeader] = useState('');
    const [tablistFooter, setTablistFooter] = useState('');
    const [pauseMenuOpen, setPauseMenuOpen] = useState(false);
    const [pointerLocked, setPointerLocked] = useState(false);
    const [waitingForWindow, setWaitingForWindow] = useState(false);
    const [, forceTick] = useState(0);

    const {
        isPickMode,
        selectedCoords,
        setSelectedCoords,
        confirmSelection,
        cancelPicking
    } = useCoordinatePickerStore();

    const [settings, setSettings] = useState(() => {
        try {
            const saved = localStorage.getItem('minecraftViewerSettings');
            if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        } catch (e) { /* ignore */ }
        return DEFAULT_SETTINGS;
    });

    const settingsRef = useRef(settings);
    const keysPressed = useRef({});
    const localCameraRef = useRef({ yaw: 0, pitch: 0 });

    useEffect(() => { chatOpenRef.current = chatOpen; }, [chatOpen]);
    useEffect(() => { openWindowRef.current = openWindow; }, [openWindow]);
    useEffect(() => { inventoryOpenRef.current = inventoryOpen; }, [inventoryOpen]);
    useEffect(() => { pauseMenuOpenRef.current = pauseMenuOpen; }, [pauseMenuOpen]);

    useEffect(() => {
        localStorage.setItem('minecraftViewerSettings', JSON.stringify(settings));
        settingsRef.current = settings;
        if (socketRef.current && connected) {
            socketRef.current.emit('viewer:control', {
                command: { type: 'set_render_distance', distance: settings.renderDistance }
            });
        }
        if (fxaaPassRef.current) fxaaPassRef.current.enabled = settings.fxaa;
        if (lightsGroupRef.current) {
            lightsGroupRef.current.visible = settings.dynamicLighting !== false;
        }
    }, [settings, connected]);

    // === WebGL detection ===
    useEffect(() => {
        const result = detectWebGL();
        if (!result.supported) {
            setWebglError(result.reason);
            console.error('[MinecraftViewer] WebGL is not supported:', result);
        } else {
            console.log('[MinecraftViewer] WebGL OK:', result.version);
        }
    }, []);

    // === Visibility throttling ===
    useEffect(() => {
        const onVis = () => { tabHiddenRef.current = document.hidden; };
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, []);

    // === Pointer lock state ===
    useEffect(() => {
        const onChange = () => {
            const locked = document.pointerLockElement === canvasRef.current;
            setPointerLocked(locked);
            if (!locked) {
                // Если выход из lock'а не инициирован самим клиентом
                // (т.е. это браузерный ESC), и других UI не открыто → pause menu
                if (!intentionalUnlockRef.current
                    && !chatOpenRef.current
                    && !openWindowRef.current
                    && !inventoryOpenRef.current
                    && !pauseMenuOpenRef.current) {
                    setPauseMenuOpen(true);
                }
                intentionalUnlockRef.current = false;
            }
        };
        const onError = () => {
            console.warn('[MinecraftViewer] Pointer lock error/denied');
        };
        document.addEventListener('pointerlockchange', onChange);
        document.addEventListener('pointerlockerror', onError);
        return () => {
            document.removeEventListener('pointerlockchange', onChange);
            document.removeEventListener('pointerlockerror', onError);
        };
    }, []);

    // Helper: безопасно выходим из pointer lock с пометкой что мы это специально
    const intentionalExitPointerLock = useCallback(() => {
        if (document.pointerLockElement) {
            intentionalUnlockRef.current = true;
            document.exitPointerLock();
        }
    }, []);

    // === Initial connection ===
    useEffect(() => {
        connectToBot();
        return () => {
            cleanupScene();
            if (socketRef.current) {
                socketRef.current.emit('viewer:disconnect');
                socketRef.current.disconnect();
            }
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [botId]);

    const cleanupScene = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (rendererRef.current) {
            try { rendererRef.current.dispose(); rendererRef.current.forceContextLoss?.(); }
            catch (e) { /* ignore */ }
            rendererRef.current = null;
        }
        if (composerRef.current) {
            try { composerRef.current.dispose?.(); } catch (e) { /* ignore */ }
            composerRef.current = null;
        }
        chunkCacheRef.current.forEach(cache => {
            (cache.meshes || []).forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
            });
        });
        chunkCacheRef.current.clear();
        lightCacheRef.current.clear();
        blocksMapRef.current.clear();
        sceneInitializedRef.current = false;
        initialChunkReceivedRef.current = false;
        setRenderReady(false);
    };

    // === Scene init only after first chunks received ===
    useEffect(() => {
        if (!connected || !canvasRef.current || sceneInitializedRef.current ||
            !initialChunkReceivedRef.current || webglError) return;
        try {
            initializeScene();
            sceneInitializedRef.current = true;
            setRenderReady(true);
            loadTexturesAsync();
        } catch (err) {
            console.error('[MinecraftViewer] initializeScene failed:', err);
            setWebglError(err.message || 'init_failed');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, botState?.blocks, webglError]);

    const loadTexturesAsync = async () => {
        try {
            await loadBlockTextures('1.20.1');
            texturesLoadedRef.current = true;
            if (botState?.blocks) renderBlocks(botState.blocks, true);
        } catch (err) {
            console.error('[MinecraftViewer] Failed to load textures:', err);
        }
    };

    const initializeScene = () => {
        const canvas = canvasRef.current;
        if (!canvas) throw new Error('canvas missing');

        const parent = canvas.parentElement;
        const width = parent?.clientWidth || window.innerWidth;
        const height = parent?.clientHeight || window.innerHeight;

        const renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false,
        });

        canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            setWebglError('context_lost');
        });
        canvas.addEventListener('webglcontextrestored', () => setWebglError(null));

        renderer.setSize(width, height);
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        renderer.setPixelRatio(pixelRatio);

        const srgbKey = 'SRGB' + 'ColorSpace';
        const SRGB = THREE[srgbKey];
        if ('outputColorSpace' in renderer && SRGB) renderer.outputColorSpace = SRGB;
        else if ('outputEncoding' in renderer && THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;

        const scene = new THREE.Scene();
        const sceneBackground = getThemeThreeColor('--background', 0x0a0a0f);
        const fogColor = sceneBackground.clone();
        renderer.setClearColor(sceneBackground, 1);
        scene.background = sceneBackground;
        scene.fog = new THREE.Fog(fogColor, 30, 80);

        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xfff5d6, 0.85);
        sunLight.position.set(100, 200, 100);
        scene.add(sunLight);

        const moonLight = new THREE.DirectionalLight(0x8090ff, 0.15);
        moonLight.position.set(-100, 200, -100);
        scene.add(moonLight);

        const blocksGroup = new THREE.Group();
        scene.add(blocksGroup);
        blocksGroupRef.current = blocksGroup;

        const lightsGroup = new THREE.Group();
        lightsGroup.visible = settingsRef.current.dynamicLighting !== false;
        scene.add(lightsGroup);
        lightsGroupRef.current = lightsGroup;

        const playersGroup = new THREE.Group();
        scene.add(playersGroup);
        playersGroupRef.current = playersGroup;

        const highlightGeometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
        const highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000, transparent: true, opacity: 0.3, wireframe: true, wireframeLinewidth: 2
        });
        const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
        highlight.visible = false;
        scene.add(highlight);
        highlightRef.current = highlight;

        const pickMarkerGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
        const pickMarkerMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const pickMarker = new THREE.Mesh(pickMarkerGeometry, pickMarkerMaterial);
        pickMarker.visible = false;
        scene.add(pickMarker);
        pickMarkerRef.current = pickMarker;

        rendererRef.current = renderer;
        sceneRef.current = scene;
        cameraRef.current = camera;

        // EffectComposer + FXAA
        try {
            const composer = new EffectComposer(renderer);
            composer.setSize(width, height);
            composer.setPixelRatio(pixelRatio);
            const renderPass = new RenderPass(scene, camera);
            composer.addPass(renderPass);
            const fxaaPass = new ShaderPass(FXAAShader);
            fxaaPass.material.uniforms['resolution'].value.set(
                1 / (width * pixelRatio), 1 / (height * pixelRatio)
            );
            fxaaPass.enabled = settingsRef.current.fxaa;
            composer.addPass(fxaaPass);
            composerRef.current = composer;
            fxaaPassRef.current = fxaaPass;
        } catch (err) {
            console.warn('[MinecraftViewer] FXAA setup failed', err);
            composerRef.current = null;
        }

        if (botState?.position) {
            camera.position.set(botState.position.x, botState.position.y + 1.6, botState.position.z);
            camera.rotation.order = 'ZYX';
            camera.rotation.set(botState.pitch || 0, botState.yaw || 0, 0);
        } else {
            camera.position.set(0, 70, 0);
            camera.lookAt(0, 0, 0);
        }

        const animate = (now) => {
            animationFrameRef.current = requestAnimationFrame(animate);

            const targetFps = (settingsRef.current.throttleWhenHidden && tabHiddenRef.current) ? 5 : 60;
            const minFrameTime = 1000 / targetFps;
            if (now - lastFrameTimeRef.current < minFrameTime) return;
            lastFrameTimeRef.current = now;

            fpsTickerRef.current.frames++;
            if (now - fpsTickerRef.current.lastUpdate >= 1000) {
                fpsRef.current = fpsTickerRef.current.frames;
                fpsTickerRef.current.frames = 0;
                fpsTickerRef.current.lastUpdate = now;
                if (settingsRef.current.showDebug) forceTick(v => v + 1);
            }

            if (camera) {
                camera.updateMatrixWorld();

                if (settingsRef.current.frustumCulling) {
                    const frustum = frustumRef.current;
                    const projScreenMatrix = projScreenMatrixRef.current;
                    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
                    frustum.setFromProjectionMatrix(projScreenMatrix);
                    if (blocksGroupRef.current) {
                        blocksGroupRef.current.children.forEach(mesh => {
                            if (mesh.boundingSphere) {
                                mesh.visible = frustum.intersectsSphere(mesh.boundingSphere);
                            }
                        });
                    }
                } else if (blocksGroupRef.current) {
                    blocksGroupRef.current.children.forEach(mesh => { mesh.visible = true; });
                }
            }

            // Local movement (predictions)
            if (camera && !chatOpenRef.current && !openWindowRef.current && !pauseMenuOpenRef.current
                && settingsRef.current.localMovement) {
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

                    if (keysPressed.current['KeyW']) camera.position.add(direction.clone().multiplyScalar(speed));
                    if (keysPressed.current['KeyS']) camera.position.sub(direction.clone().multiplyScalar(speed));
                    if (keysPressed.current['KeyA']) camera.position.add(right.clone().multiplyScalar(speed));
                    if (keysPressed.current['KeyD']) camera.position.sub(right.clone().multiplyScalar(speed));

                    if (checkCollision(camera.position.x, camera.position.y - 1.6, camera.position.z)) {
                        camera.position.copy(oldPos);
                    }
                }
            }

            // Block highlight (raycast)
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
                        const p = new THREE.Vector3();
                        p.setFromMatrixPosition(matrix);
                        blockPos = p;
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

            try {
                if (composerRef.current && settingsRef.current.fxaa) composerRef.current.render();
                else renderer.render(scene, camera);
            } catch (err) {
                console.error('[MinecraftViewer] Render error:', err);
            }
        };
        animationFrameRef.current = requestAnimationFrame(animate);

        const handleResize = () => {
            const parent2 = canvas.parentElement;
            const w = parent2?.clientWidth || window.innerWidth;
            const h = parent2?.clientHeight || window.innerHeight;
            const pr = renderer.getPixelRatio();
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            if (composerRef.current) composerRef.current.setSize(w, h);
            if (fxaaPassRef.current) {
                fxaaPassRef.current.material.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr));
            }
        };
        window.addEventListener('resize', handleResize);

        return () => window.removeEventListener('resize', handleResize);
    };

    const connectToBot = () => {
        setError(null);
        const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;
        const socket = io(`${SOCKET_URL}/minecraft-viewer`, {
            path: '/socket.io/',
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => socket.emit('viewer:connect', { botId: parseInt(botId) }));
        socket.on('viewer:connected', () => setConnected(true));

        socket.on('viewer:state', (state) => {
            setBotState(state);
            if (state.yaw !== undefined && state.pitch !== undefined) {
                localCameraRef.current.yaw = state.yaw;
                localCameraRef.current.pitch = state.pitch;
            }
            if (state.blocks?.length > 0) initialChunkReceivedRef.current = true;
            if (state.position && cameraRef.current) {
                cameraRef.current.position.set(state.position.x, state.position.y + 1.6, state.position.z);
                cameraRef.current.rotation.order = 'ZYX';
                cameraRef.current.rotation.set(localCameraRef.current.pitch, localCameraRef.current.yaw, 0);
            }
            if (state.blocks && sceneInitializedRef.current) renderBlocks(state.blocks);
            if (state.nearbyPlayers) renderPlayers(state.nearbyPlayers);
            if (state.currentWindow) setOpenWindow(state.currentWindow);
            // playerList и scoreboard приходят через отдельные события viewer:playerList/viewer:scoreboard
            // с защитой от деградации. НЕ перетираем их из общего state-stream.
        });

        socket.on('viewer:update', (state) => {
            if (state.blocks?.length > 0) initialChunkReceivedRef.current = true;
            setBotState(state);
            if (state.position) updateCamera(state);
            if (state.blocks && sceneInitializedRef.current) renderBlocks(state.blocks);
            if (state.nearbyPlayers) renderPlayers(state.nearbyPlayers);
            // playerList/scoreboard здесь тоже не трогаем
        });

        socket.on('viewer:move', (data) => {
            setBotState(prev => ({ ...prev, position: data.position, yaw: data.yaw, pitch: data.pitch }));
            updateCamera(data);
        });
        socket.on('viewer:health', (data) => {
            setBotState(prev => ({ ...prev, health: data.health, food: data.food }));
        });
        socket.on('viewer:chat', (data) => {
            setChatMessages(prev => [...prev, { text: data.rawText, timestamp: Date.now() }]);
        });
        socket.on('viewer:blockUpdate', (data) => {
            if (!blocksGroupRef.current || !data.position) return;
            const { x, y, z } = data.position;
            setBotState(prev => {
                if (!prev || !prev.blocks) return prev;
                const updatedBlocks = prev.blocks.filter(b => !(b.x === x && b.y === y && b.z === z));
                if (data.newBlock.type !== 0) {
                    updatedBlocks.push({ x, y, z, type: data.newBlock.type, name: data.newBlock.name });
                }
                updateSingleBlock(data.position, updatedBlocks);
                return { ...prev, blocks: updatedBlocks };
            });
        });

        socket.on('viewer:windowOpen', (payload) => {
            // Auto-release pointer lock so user can interact with GUI
            intentionalExitPointerLock();
            setWaitingForWindow(false);
            if (payload?.isPlayerInventory) {
                setInventoryOpen(true);
                setOpenWindow(payload);
            } else {
                setOpenWindow(payload);
            }
        });
        socket.on('viewer:windowUpdate', (payload) => setOpenWindow(payload));
        socket.on('viewer:windowClose', () => {
            setOpenWindow(null);
            setInventoryOpen(false);
            setWaitingForWindow(false);
        });

        socket.on('viewer:playerList', (payload) => {
            const newPlayers = payload?.players;
            // Игнорируем пустой список (промежуточное состояние)
            if (!Array.isArray(newPlayers) || newPlayers.length === 0) {
                if (payload?.header || payload?.footer) {
                    if (payload?.header !== undefined) setTablistHeader(payload.header || '');
                    if (payload?.footer !== undefined) setTablistFooter(payload.footer || '');
                }
                return;
            }

            // Защита от мерцания префиксов:
            // Считаем сколько игроков имеют непустой prefix.
            // Если резко стало меньше — это промежуточное состояние, оставляем старый.
            setPlayerList(prev => {
                const countPrefixed = (arr) => arr.filter(p => p?.prefix && p.prefix.length > 0).length;
                const oldPrefixed = countPrefixed(prev);
                const newPrefixed = countPrefixed(newPlayers);
                if (oldPrefixed > 0 && newPrefixed < oldPrefixed * 0.5) {
                    // Большая часть префиксов пропала — игнорируем
                    return prev;
                }
                return newPlayers;
            });
            setTablistHeader(payload?.header || '');
            setTablistFooter(payload?.footer || '');
        });
        socket.on('viewer:scoreboard', (payload) => {
            if (payload === null) {
                // явный delete scoreboard
                setScoreboard(null);
                return;
            }
            // Пустой — игнорируем
            if (!payload?.items || payload.items.length === 0) return;

            // Защита от мерцания: если новый snapshot имеет МЕНЬШЕ § кодов чем
            // последний — это скорее всего промежуточное состояние (prefix/suffix
            // ещё не применился у части строк). Игнорируем.
            const countCodes = (sb) => {
                if (!sb) return 0;
                let c = 0;
                if (typeof sb.title === 'string') c += (sb.title.match(/§/g) || []).length;
                if (Array.isArray(sb.items)) {
                    for (const it of sb.items) {
                        if (typeof it.line === 'string') c += (it.line.match(/§/g) || []).length;
                        else if (typeof it.displayName === 'string') c += (it.displayName.match(/§/g) || []).length;
                    }
                }
                return c;
            };

            setScoreboard(prev => {
                if (!prev) return payload;
                const oldCodes = countCodes(prev);
                const newCodes = countCodes(payload);
                // Если в новом scoreboard меньше § кодов — это деградация (промежуточное состояние)
                // оставляем старый
                if (oldCodes > 0 && newCodes < oldCodes * 0.7) {
                    return prev;
                }
                return payload;
            });
        });

        socket.on('viewer:error', ({ message }) => {
            console.error('[MinecraftViewer] Error:', message);
            setError(message);
            setConnected(false);
        });
        socket.on('disconnect', () => setConnected(false));

        socketRef.current = socket;
    };

    const updateCamera = (data) => {
        if (!cameraRef.current || !data.position) return;
        const serverPos = { x: data.position.x, y: data.position.y + 1.6, z: data.position.z };
        const camera = cameraRef.current;
        const k = settingsRef.current.correctionSpeed;

        const horizontalDist = Math.sqrt(
            Math.pow(serverPos.x - camera.position.x, 2) +
            Math.pow(serverPos.z - camera.position.z, 2)
        );
        camera.position.y = serverPos.y;

        if (horizontalDist >= 8) {
            camera.position.x = serverPos.x;
            camera.position.z = serverPos.z;
        } else if (horizontalDist > 1.5) {
            const s = 0.3 * k;
            camera.position.x += (serverPos.x - camera.position.x) * s;
            camera.position.z += (serverPos.z - camera.position.z) * s;
        } else if (horizontalDist > 0.5) {
            const s = 0.15 * k;
            camera.position.x += (serverPos.x - camera.position.x) * s;
            camera.position.z += (serverPos.z - camera.position.z) * s;
        } else if (horizontalDist > 0.1) {
            const s = 0.05 * k;
            camera.position.x += (serverPos.x - camera.position.x) * s;
            camera.position.z += (serverPos.z - camera.position.z) * s;
        }
    };

    const getChunkKey = (x, y, z) => `${Math.floor(x / 16)},${Math.floor(y / 16)},${Math.floor(z / 16)}`;
    const getBlockHash = (blocks) => blocks.map(b => `${b.x},${b.y},${b.z},${b.name}`).sort().join('|');

    const checkCollision = (x, y, z) => {
        for (let dy = 0; dy < 2; dy++) {
            const key = `${Math.floor(x)},${Math.floor(y + dy)},${Math.floor(z)}`;
            if (blocksMapRef.current.has(key)) return true;
        }
        return false;
    };

    const updateSingleBlock = (position, updatedBlocks) => {
        if (!blocksGroupRef.current) return;
        const chunkKey = getChunkKey(position.x, position.y, position.z);
        const cached = chunkCacheRef.current.get(chunkKey);
        if (cached?.meshes) {
            cached.meshes.forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
                blocksGroupRef.current.remove(mesh);
            });
        }
        chunkCacheRef.current.delete(chunkKey);
        renderBlocks(updatedBlocks, true);
    };

    // === Block rendering with smart geometry / lights ===
    const renderBlocks = (blocks, forceUpdate = false) => {
        if (!blocksGroupRef.current) return;
        const blocksGroup = blocksGroupRef.current;
        const lightsGroup = lightsGroupRef.current;
        const useInstanced = settingsRef.current.instancedRendering !== false;
        const useDynamicLighting = settingsRef.current.dynamicLighting !== false;

        blocksMapRef.current.clear();
        blocks.forEach(block => {
            const key = `${Math.floor(block.x)},${Math.floor(block.y)},${Math.floor(block.z)}`;
            blocksMapRef.current.set(key, true);
        });

        const chunkBlocks = new Map();
        blocks.forEach(block => {
            const chunkKey = getChunkKey(block.x, block.y, block.z);
            if (!chunkBlocks.has(chunkKey)) chunkBlocks.set(chunkKey, []);
            chunkBlocks.get(chunkKey).push(block);
        });

        const currentChunkKeys = new Set(chunkBlocks.keys());
        const cachedChunkKeys = new Set(chunkCacheRef.current.keys());
        let changedChunks = 0;
        const chanksToUpdate = new Set();

        for (const [chunkKey, list] of chunkBlocks.entries()) {
            const hash = getBlockHash(list);
            const cached = chunkCacheRef.current.get(chunkKey);
            if (!cached || cached.hash !== hash) { chanksToUpdate.add(chunkKey); changedChunks++; }
        }
        for (const chunkKey of cachedChunkKeys) {
            if (!currentChunkKeys.has(chunkKey)) { chanksToUpdate.add(chunkKey); changedChunks++; }
        }

        const changePct = changedChunks / Math.max(chunkBlocks.size, 1);
        if (!forceUpdate && changePct < 0.1 && changedChunks > 0 && changedChunks < 3) return;

        chanksToUpdate.forEach(chunkKey => {
            const cached = chunkCacheRef.current.get(chunkKey);
            if (cached?.meshes) {
                cached.meshes.forEach(mesh => {
                    if (mesh.geometry) mesh.geometry.dispose();
                    blocksGroup.remove(mesh);
                });
            }
            // remove dynamic lights belonging to this chunk
            cached?.lightKeys?.forEach(k => {
                const light = lightCacheRef.current.get(k);
                if (light) {
                    lightsGroup?.remove(light);
                    lightCacheRef.current.delete(k);
                }
            });
            chunkCacheRef.current.delete(chunkKey);
        });

        // Default cube geometry (translated so that block min-corner = 0,0,0)
        const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
        cubeGeometry.translate(0.5, 0.5, 0.5);

        chanksToUpdate.forEach(chunkKey => {
            const list = chunkBlocks.get(chunkKey);
            if (!list || list.length === 0) return;

            // Группируем блоки чанка по (имя+форма): блоки с одинаковой формой могут идти в InstancedMesh
            const groups = new Map();
            const lightKeys = [];

            list.forEach(block => {
                const customGeo = getBlockGeometry(block.name);
                const groupKey = `${block.name}|${customGeo ? 'special' : 'cube'}`;
                if (!groups.has(groupKey)) {
                    groups.set(groupKey, { name: block.name, customGeo, blocks: [] });
                }
                groups.get(groupKey).blocks.push(block);

                // Add PointLight for emissive blocks
                if (useDynamicLighting && lightCacheRef.current.size < MAX_DYNAMIC_LIGHTS) {
                    const emissive = getBlockEmissive(block.name);
                    if (emissive?.light) {
                        const lightKey = `${block.x},${block.y},${block.z}`;
                        if (!lightCacheRef.current.has(lightKey)) {
                            const pl = new THREE.PointLight(
                                emissive.light.color,
                                emissive.light.intensity,
                                emissive.light.distance
                            );
                            pl.position.set(block.x + 0.5, block.y + 0.5, block.z + 0.5);
                            lightsGroup?.add(pl);
                            lightCacheRef.current.set(lightKey, pl);
                            lightKeys.push(lightKey);
                        }
                    }
                }
            });

            const meshes = [];
            for (const { name, customGeo, blocks: blockList } of groups.values()) {
                const isEntity = isEntityModel(name);
                const blockGeometry = isEntity
                    ? getEntityGeometry(name)
                    : (customGeo || cubeGeometry);
                const material = isEntity ? getEntityMaterial(name) : getBlockMaterial(name);

                let mesh;
                // InstancedMesh поддерживается только для FrontSide материалов и обычных геометрий
                // (для прозрачных/cutout-блоков с DoubleSide лучше использовать обычный Mesh)
                const canInstance = useInstanced && !isEntity;

                if (canInstance) {
                    const instancedMesh = new THREE.InstancedMesh(blockGeometry, material, blockList.length);
                    const matrix = new THREE.Matrix4();
                    blockList.forEach((b, i) => {
                        matrix.setPosition(b.x, b.y, b.z);
                        instancedMesh.setMatrixAt(i, matrix);
                    });
                    instancedMesh.instanceMatrix.needsUpdate = true;
                    mesh = instancedMesh;
                } else {
                    const group = new THREE.Group();
                    blockList.forEach((b) => {
                        const m = new THREE.Mesh(blockGeometry, material);
                        m.position.set(b.x, b.y, b.z);
                        group.add(m);
                    });
                    mesh = group;
                }

                if (!blockGeometry.boundingSphere) blockGeometry.computeBoundingSphere();

                const cx = blockList.reduce((s, b) => s + b.x + 0.5, 0) / blockList.length;
                const cy = blockList.reduce((s, b) => s + b.y + 0.5, 0) / blockList.length;
                const cz = blockList.reduce((s, b) => s + b.z + 0.5, 0) / blockList.length;
                const maxDist = Math.max(...blockList.map(b => Math.sqrt(
                    Math.pow(b.x + 0.5 - cx, 2) + Math.pow(b.y + 0.5 - cy, 2) + Math.pow(b.z + 0.5 - cz, 2)
                ))) + 1;
                mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), maxDist);

                blocksGroup.add(mesh);
                meshes.push(mesh);
            }

            chunkCacheRef.current.set(chunkKey, {
                hash: getBlockHash(list),
                meshes,
                lightKeys,
            });
        });
    };

    const renderPlayers = (players) => {
        if (!playersGroupRef.current) return;
        const playersGroup = playersGroupRef.current;
        const currentPlayers = new Set(players.map(p => p.username));
        const cachedPlayers = new Set(playersCacheRef.current.keys());

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

        players.forEach(player => {
            const cached = playersCacheRef.current.get(player.username);
            if (!cached) {
                const playerGroup = new THREE.Group();
                const bodyMesh = new THREE.Mesh(
                    new THREE.BoxGeometry(0.6, 1.4, 0.3),
                    new THREE.MeshLambertMaterial({ color: 0x00aaff })
                );
                bodyMesh.position.y = 0.9;
                playerGroup.add(bodyMesh);

                const headGroup = new THREE.Group();
                headGroup.position.y = 1.8;
                headGroup.add(new THREE.Mesh(
                    new THREE.BoxGeometry(0.5, 0.5, 0.5),
                    new THREE.MeshLambertMaterial({ color: 0xffcc99 })
                ));
                const noseMesh = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 0.1, 0.2),
                    new THREE.MeshLambertMaterial({ color: 0xddaa77 })
                );
                noseMesh.position.z = 0.35;
                headGroup.add(noseMesh);
                playerGroup.add(headGroup);

                const cnv = document.createElement('canvas');
                cnv.width = 256; cnv.height = 64;
                const ctx = cnv.getContext('2d');
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                ctx.fillRect(0, 0, cnv.width, cnv.height);
                ctx.font = 'bold 32px Arial';
                ctx.fillStyle = 'white';
                ctx.textAlign = 'center';
                ctx.fillText(player.username, cnv.width / 2, 42);
                const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
                    map: new THREE.CanvasTexture(cnv)
                }));
                sprite.position.y = 2.5;
                sprite.scale.set(2, 0.5, 1);
                playerGroup.add(sprite);

                playerGroup.position.set(player.position.x, player.position.y, player.position.z);
                playerGroup.rotation.y = (player.yaw || 0) + Math.PI;
                playersGroup.add(playerGroup);
                playersCacheRef.current.set(player.username, {
                    group: playerGroup, headGroup,
                    targetPos: { x: player.position.x, y: player.position.y, z: player.position.z },
                    targetYaw: player.yaw || 0, targetPitch: player.pitch || 0
                });
            } else {
                cached.targetPos.x = player.position.x;
                cached.targetPos.y = player.position.y;
                cached.targetPos.z = player.position.z;
                cached.targetYaw = player.yaw || 0;
                cached.targetPitch = player.pitch || 0;
                const lerp = 0.3;
                cached.group.position.x += (cached.targetPos.x - cached.group.position.x) * lerp;
                cached.group.position.y += (cached.targetPos.y - cached.group.position.y) * lerp;
                cached.group.position.z += (cached.targetPos.z - cached.group.position.z) * lerp;
                let yawDiff = cached.targetYaw - (cached.group.rotation.y - Math.PI);
                while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
                while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
                cached.group.rotation.y += yawDiff * lerp;
                let pitchDiff = cached.targetPitch - (-cached.headGroup.rotation.x);
                cached.headGroup.rotation.x += -pitchDiff * lerp;
            }
        });
    };

    // === Window slot click handlers ===
    const handleWindowSlotClick = useCallback(({ slot, mouseButton, mode }) => {
        socketRef.current?.emit('viewer:control', {
            command: { type: 'click_window', slot, mouseButton, mode }
        });
    }, []);

    const handleWindowClose = useCallback(() => {
        socketRef.current?.emit('viewer:control', { command: { type: 'close_window' } });
        setOpenWindow(null);
        setInventoryOpen(false);
        setWaitingForWindow(false);
        // Возвращаемся в игру — снова захватываем pointer
        // Небольшая задержка чтобы React успел обновить state и убрать оверлей
        setTimeout(() => {
            if (!canvasRef.current) return;
            if (chatOpenRef.current || pauseMenuOpenRef.current) return;
            if (document.pointerLockElement === canvasRef.current) return;
            try { canvasRef.current.requestPointerLock(); }
            catch (err) { /* ignore */ }
        }, 50);
    }, []);

    // === Engage interaction (click on canvas to lock pointer) ===
    const engagePointerLock = useCallback(() => {
        if (!canvasRef.current) return;
        if (chatOpenRef.current || openWindowRef.current || pauseMenuOpenRef.current) return;
        if (document.pointerLockElement === canvasRef.current) return;
        try {
            canvasRef.current.requestPointerLock();
        } catch (e) {
            console.warn('[MinecraftViewer] requestPointerLock failed:', e);
        }
    }, []);

    // === Keyboard / mouse handling ===
    useEffect(() => {
        if (!connected) return;

        const handleKeyDown = (e) => {
            // Pause menu key (ESC) — приоритет
            if (e.code === 'Escape') {
                e.preventDefault();
                if (chatOpen) { setChatOpen(false); return; }
                if (openWindowRef.current || inventoryOpenRef.current) { handleWindowClose(); return; }
                setPauseMenuOpen(prev => !prev);
                intentionalExitPointerLock();
                return;
            }

            if (chatOpen) return;
            if (pauseMenuOpenRef.current) return;

            // Window/Inventory открыт: можно закрыть на E
            if (openWindowRef.current || inventoryOpenRef.current) {
                if (e.code === 'KeyE' || e.code === 'KeyI') {
                    e.preventDefault();
                    handleWindowClose();
                }
                return;
            }

            // === E / I — открыть инвентарь ===
            if (e.code === 'KeyE' || e.code === 'KeyI') {
                e.preventDefault();
                setWaitingForWindow(true);
                socketRef.current?.emit('viewer:control', { command: { type: 'open_inventory' } });
                intentionalExitPointerLock();
                // Если за 1.5 сек сервер не ответил — снимаем флаг
                setTimeout(() => setWaitingForWindow(false), 1500);
                return;
            }

            // === TAB — список игроков ===
            if (e.code === 'Tab') {
                e.preventDefault();
                if (!tabHeld) {
                    setTabHeld(true);
                    socketRef.current?.emit('viewer:control', { command: { type: 'request_player_list' } });
                }
                return;
            }

            // === T или / — чат ===
            if (e.code === 'KeyT' || e.code === 'Slash') {
                e.preventDefault();
                setChatOpen(true);
                intentionalExitPointerLock();
                return;
            }

            // === Q — выкинуть один предмет (Ctrl+Q — весь стак) ===
            if (e.code === 'KeyQ') {
                e.preventDefault();
                socketRef.current?.emit('viewer:control', {
                    command: { type: 'drop_item', full: e.ctrlKey }
                });
                return;
            }

            // === F — поменять руки (offhand) ===
            if (e.code === 'KeyF') {
                e.preventDefault();
                socketRef.current?.emit('viewer:control', { command: { type: 'swap_hands' } });
                return;
            }

            // === Цифры 1–9 — выбор слота хотбара ===
            if (e.code >= 'Digit1' && e.code <= 'Digit9') {
                const slotIndex = parseInt(e.code.replace('Digit', '')) - 1;
                setSelectedHotbarSlot(slotIndex);
                socketRef.current?.emit('viewer:control', {
                    command: { type: 'hotbar_slot', slot: slotIndex }
                });
                return;
            }

            // === F3 — toggle debug overlay ===
            if (e.code === 'F3') {
                e.preventDefault();
                setSettings(prev => ({ ...prev, showDebug: !prev.showDebug }));
                return;
            }

            // === F1 — hide HUD (toggle) ===
            if (e.code === 'F1') {
                e.preventDefault();
                setSettings(prev => ({ ...prev, hideHud: !prev.hideHud }));
                return;
            }

            // === F5 — переключение перспективы (1-е/3-е лицо) ===
            if (e.code === 'F5') {
                e.preventDefault();
                setSettings(prev => {
                    const modes = ['first', 'third_back', 'third_front'];
                    const idx = modes.indexOf(prev.cameraMode || 'first');
                    return { ...prev, cameraMode: modes[(idx + 1) % modes.length] };
                });
                return;
            }

            keysPressed.current[e.code] = true;

            const keyMap = {
                'KeyW': 'forward', 'KeyS': 'back', 'KeyA': 'left', 'KeyD': 'right',
                'Space': 'jump', 'ShiftLeft': 'sneak', 'ControlLeft': 'sprint'
            };
            if (keyMap[e.code]) {
                socketRef.current?.emit('viewer:control', {
                    command: { type: 'move', direction: keyMap[e.code], active: true }
                });
            }
        };

        const handleKeyUp = (e) => {
            if (e.code === 'Tab') { setTabHeld(false); return; }
            keysPressed.current[e.code] = false;
            const keyMap = {
                'KeyW': 'forward', 'KeyS': 'back', 'KeyA': 'left', 'KeyD': 'right',
                'Space': 'jump', 'ShiftLeft': 'sneak', 'ControlLeft': 'sprint'
            };
            if (keyMap[e.code]) {
                socketRef.current?.emit('viewer:control', {
                    command: { type: 'move', direction: keyMap[e.code], active: false }
                });
            }
        };

        const handleMouseMove = (e) => {
            if (document.pointerLockElement !== canvasRef.current) return;
            if (openWindowRef.current || pauseMenuOpenRef.current) return;

            const sensitivity = 0.03 * settingsRef.current.sensitivity;
            const camera = cameraRef.current;
            if (!camera) return;

            localCameraRef.current.yaw -= e.movementX * sensitivity;
            localCameraRef.current.pitch -= e.movementY * sensitivity;
            localCameraRef.current.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, localCameraRef.current.pitch));

            camera.rotation.order = 'ZYX';
            camera.rotation.set(localCameraRef.current.pitch, localCameraRef.current.yaw, 0);

            socketRef.current?.emit('viewer:control', {
                command: { type: 'look', yaw: localCameraRef.current.yaw, pitch: localCameraRef.current.pitch }
            });
        };

        const handleClickOnCanvas = (e) => {
            if (chatOpenRef.current || openWindowRef.current || inventoryOpenRef.current || pauseMenuOpenRef.current) return;

            const isLeft = e.button === 0;
            const isRight = e.button === 2;
            if (!isLeft && !isRight) return;

            // Pointer не залочен:
            //   - ЛКМ → захватываем курсор (как в Minecraft)
            //   - ПКМ → отправляем use_item (для серверных предметов с GUI: компас, голова и т.п.)
            if (document.pointerLockElement !== canvasRef.current) {
                if (isRight) {
                    setWaitingForWindow(true);
                    socketRef.current?.emit('viewer:control', { command: { type: 'use_item' } });
                    setTimeout(() => setWaitingForWindow(false), 1500);
                } else {
                    engagePointerLock();
                }
                return;
            }

            // Pointer залочен — обычная игровая логика
            const camera = cameraRef.current;
            const blocksGroup = blocksGroupRef.current;
            if (!camera || !blocksGroup) return;

            const raycaster = raycasterRef.current;
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            raycaster.far = isPickMode ? 50 : 5;

            const intersects = raycaster.intersectObjects(blocksGroup.children, true);
            if (intersects.length === 0) {
                // ПКМ в пустоту — активировать предмет (use_item: еда, лук, ведро воды,
                // компас и серверные предметы открывающие GUI)
                if (isRight) {
                    setWaitingForWindow(true);
                    socketRef.current?.emit('viewer:control', { command: { type: 'use_item' } });
                    setTimeout(() => setWaitingForWindow(false), 1500);
                }
                return;
            }

            const hit = intersects[0];
            let blockPos;
            if (hit.instanceId !== undefined) {
                const matrix = new THREE.Matrix4();
                hit.object.getMatrixAt(hit.instanceId, matrix);
                const p = new THREE.Vector3();
                p.setFromMatrixPosition(matrix);
                blockPos = p;
            } else {
                blockPos = hit.object.position || hit.point;
            }
            const bx = Math.floor(blockPos.x), by = Math.floor(blockPos.y), bz = Math.floor(blockPos.z);

            // === Coordinate picker mode ===
            if (isPickMode && isLeft) {
                const coords = { x: bx, y: by + 1, z: bz };
                setSelectedCoords(coords);
                if (pickMarkerRef.current) {
                    pickMarkerRef.current.position.set(bx + 0.5, by + 1.5, bz + 0.5);
                    pickMarkerRef.current.visible = true;
                }
                return;
            }

            // === ЛКМ — dig (или attack entity) ===
            if (isLeft) {
                socketRef.current?.emit('viewer:control', {
                    command: { type: 'dig', position: { x: bx, y: by, z: bz } }
                });
                return;
            }

            // === ПКМ — interact: попробовать активировать блок (сундук/рычаг/дверь),
            //   потом поставить блок, потом use_item ===
            if (isRight) {
                // Вычисляем грань блока, по которой щелкнули, чтобы поставить блок туда
                const face = hit.face;
                const faceVec = face
                    ? { x: face.normal.x, y: face.normal.y, z: face.normal.z }
                    : { x: 0, y: 1, z: 0 };

                // Возможно откроется GUI — ставим флаг ожидания
                setWaitingForWindow(true);
                setTimeout(() => setWaitingForWindow(false), 1500);

                // Сначала пытаемся активировать (для дверей/сундуков/верстаков)
                socketRef.current?.emit('viewer:control', {
                    command: { type: 'activate_block', position: { x: bx, y: by, z: bz } }
                });
                // Параллельно — попытка place_block (бот сам разберёт что у него в руке)
                socketRef.current?.emit('viewer:control', {
                    command: { type: 'place_block', position: { x: bx, y: by, z: bz }, face: faceVec }
                });
                // Также use_item (если в руке еда/лук/компас с серверным меню)
                socketRef.current?.emit('viewer:control', {
                    command: { type: 'use_item' }
                });
                return;
            }
        };

        const handleWheel = (e) => {
            if (chatOpenRef.current || openWindowRef.current || pauseMenuOpenRef.current) return;
            if (document.pointerLockElement !== canvasRef.current) return;
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
        const canvasNode = canvasRef.current;
        canvasNode?.addEventListener('mousedown', handleClickOnCanvas);
        const handleContextMenu = (e) => e.preventDefault();
        canvasNode?.addEventListener('contextmenu', handleContextMenu);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('wheel', handleWheel);
            canvasNode?.removeEventListener('mousedown', handleClickOnCanvas);
            canvasNode?.removeEventListener('contextmenu', handleContextMenu);
        };
    }, [connected, chatOpen, isPickMode, setSelectedCoords, tabHeld, handleWindowClose, engagePointerLock, intentionalExitPointerLock]);

    const sendChatMessage = (message) => {
        socketRef.current?.emit('viewer:control', { command: { type: 'chat', message } });
    };

    const updateSetting = useCallback((key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    const applySceneTheme = () => {
        const scene = sceneRef.current;
        if (!scene) return;
        const sceneBackground = getThemeThreeColor('--background', 0x0a0a0f);
        const fogColor = sceneBackground.clone();
        const renderer = rendererRef.current;
        scene.background = sceneBackground;
        renderer?.setClearColor(sceneBackground, 1);
        if (scene.fog) scene.fog.color.copy(fogColor);
        else scene.fog = new THREE.Fog(fogColor, 30, 80);
    };

    useEffect(() => {
        if (!connected) return;
        applySceneTheme();
        const observer = new MutationObserver(() => applySceneTheme());
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'style'],
        });
        return () => observer.disconnect();
    }, [connected]);

    useEffect(() => () => disposeTextureCache(), []);

    const localizedError = error
        ? t(VIEWER_ERROR_TRANSLATION_KEYS[error] || error, { defaultValue: error })
        : null;

    if (webglError) {
        return (
            <div className="flex h-full items-center justify-center bg-background text-foreground">
                <div className="rounded-lg border border-destructive/30 bg-destructive/85 p-6 text-destructive-foreground shadow-lg max-w-md">
                    <h2 className="mb-2 text-xl font-bold">{t('webgl.error', { defaultValue: 'Ошибка WebGL' })}</h2>
                    <p className="text-sm mb-2">
                        {t('webgl.notSupported', { defaultValue: 'WebGL недоступен в этом браузере. 3D-вьюер не может быть запущен.' })}
                    </p>
                    <p className="text-xs opacity-70">Причина: {webglError}</p>
                </div>
            </div>
        );
    }

    return (
        <FadeTransition
            transitionKey={error ? 'viewer-error' : connected ? 'viewer-ready' : 'viewer-connecting'}
            ready={connected && !error}
            duration={0.24}
            className="relative w-full h-full overflow-hidden bg-black"
            fallback={
                <div className="flex h-full items-center justify-center bg-background text-foreground">
                    {error ? (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/85 p-6 text-destructive-foreground shadow-lg">
                            <h2 className="mb-2 text-xl font-bold">{t('error')}</h2>
                            <p>{localizedError}</p>
                        </div>
                    ) : (
                        <div className="text-foreground">{t('connecting')}</div>
                    )}
                </div>
            }
        >
            <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-black">
                <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

                {/* Loading overlay until first chunks render */}
                {connected && !renderReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                        <div className="text-white text-sm">
                            {t('waitingChunks', { defaultValue: 'Загрузка мира...' })}
                        </div>
                    </div>
                )}

                {/* "Click to play" prompt when pointer is not locked and nothing else is open */}
                {connected && renderReady && !pointerLocked && !chatOpen && !openWindow && !inventoryOpen && !pauseMenuOpen && !isPickMode && !waitingForWindow && (
                    <div
                        className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
                        onClick={engagePointerLock}
                    >
                        <div
                            className="px-6 py-3 text-white"
                            style={{
                                fontFamily: '"Minecraft", "Press Start 2P", monospace',
                                background: 'rgba(0,0,0,0.55)',
                                border: '2px solid rgba(255,255,255,0.1)',
                                textShadow: '2px 2px 0 #3f3f3f',
                            }}
                        >
                            {t('clickToPlay', { defaultValue: 'Нажмите чтобы играть' })}
                        </div>
                    </div>
                )}

                {/* Crosshair (only when pointer locked) */}
                {pointerLocked && (
                    <div
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
                        style={{
                            width: 16, height: 16,
                            background: `
                                linear-gradient(white,white) center/100% 2px no-repeat,
                                linear-gradient(white,white) center/2px 100% no-repeat
                            `,
                            mixBlendMode: 'difference',
                        }}
                    />
                )}

                {/* HUD: Health/food/coords (только если есть state) */}
                {botState && pointerLocked && !pauseMenuOpen && !openWindow && !inventoryOpen && !chatOpen && !settings.hideHud && (
                    <div className="absolute top-4 right-4 rounded bg-black bg-opacity-50 px-3 py-2 text-white pointer-events-none text-xs"
                        style={{ fontFamily: '"Minecraft", "Press Start 2P", monospace', textShadow: '1px 1px 0 #000' }}>
                        <div>♥ {botState.health?.toFixed(1) || 20} | 🍗 {botState.food?.toFixed(1) || 20}</div>
                        {botState.position && (
                            <div className="text-xs opacity-80 mt-1">
                                {botState.position.x.toFixed(1)} {botState.position.y.toFixed(1)} {botState.position.z.toFixed(1)}
                            </div>
                        )}
                        {settings.showDebug && (
                            <div className="mt-1 text-[10px] opacity-60">
                                FPS: {fpsRef.current} · Chunks: {chunkCacheRef.current.size} · Lights: {lightCacheRef.current.size}
                            </div>
                        )}
                    </div>
                )}

                {/* Scoreboard */}
                <MinecraftScoreboard
                    scoreboard={scoreboard}
                    visible={scoreboardVisible && !pauseMenuOpen && !openWindow && !inventoryOpen && !chatOpen}
                />

                {/* TAB player list */}
                <MinecraftPlayerList
                    players={playerList}
                    header={tablistHeader}
                    footer={tablistFooter}
                    visible={tabHeld && !pauseMenuOpen && !openWindow && !inventoryOpen}
                />

                {/* Coordinate picker UI */}
                {isPickMode && (
                    <>
                        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className="animate-pulse text-xl font-bold text-cyan-400">
                                {t('picker.clickOnBlock')}
                            </div>
                        </div>
                        <div className="absolute bottom-20 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-cyan-500 bg-slate-900/95 p-4">
                            <div className="mb-3 text-center">
                                <div className="text-lg font-bold text-cyan-400">{t('picker.title')}</div>
                                <div className="text-sm text-gray-400">{t('picker.description')}</div>
                            </div>
                            {selectedCoords ? (
                                <div className="mb-3 text-center font-mono text-lg text-green-400">
                                    X: {selectedCoords.x}  Y: {selectedCoords.y}  Z: {selectedCoords.z}
                                </div>
                            ) : (
                                <div className="mb-3 text-center text-gray-500">{t('picker.notSelected')}</div>
                            )}
                            <div className="flex justify-center gap-2">
                                <button onClick={cancelPicking}
                                    className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600">
                                    {t('picker.cancel')}
                                </button>
                                <button onClick={() => selectedCoords && confirmSelection(selectedCoords)}
                                    disabled={!selectedCoords}
                                    className="rounded bg-cyan-600 px-4 py-2 text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-gray-600">
                                    {t('picker.confirm')}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Chat */}
                <MinecraftChat
                    messages={chatMessages}
                    isOpen={chatOpen}
                    onClose={() => setChatOpen(false)}
                    onSend={(message) => { sendChatMessage(message); setChatOpen(false); }}
                    alwaysShowMessages={true}
                />

                {/* Hotbar (скрывается F1, или когда открыто окно/инвентарь/меню) */}
                {!settings.hideHud && !openWindow && !inventoryOpen && !pauseMenuOpen && !chatOpen && (
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
                )}
                {/* Container window overlay (chest, furnace, crafting bench, etc.) */}
                {openWindow && !inventoryOpen && (
                    <MinecraftWindowOverlay
                        window={openWindow}
                        onSlotClick={handleWindowSlotClick}
                        onClose={handleWindowClose}
                    />
                )}

                {/* Player inventory (E / I) */}
                {inventoryOpen && openWindow?.isPlayerInventory && (
                    <MinecraftInventory
                        inventory={openWindow}
                        onSlotClick={handleWindowSlotClick}
                        onClose={handleWindowClose}
                        botState={botState}
                    />
                )}

                {/* Pause / Options menu (ESC) */}
                <MinecraftPauseMenu
                    visible={pauseMenuOpen}
                    onClose={() => setPauseMenuOpen(false)}
                    onDisconnect={() => {
                        socketRef.current?.emit('viewer:disconnect');
                        socketRef.current?.disconnect();
                        setConnected(false);
                        setPauseMenuOpen(false);
                    }}
                    settings={settings}
                    updateSetting={updateSetting}
                    scoreboardVisible={scoreboardVisible}
                    setScoreboardVisible={setScoreboardVisible}
                    gameInfo={`FPS: ${fpsRef.current} · Chunks: ${chunkCacheRef.current.size} · Lights: ${lightCacheRef.current.size}`}
                />
            </div>
        </FadeTransition>
    );
};

export default MinecraftViewerTab;
