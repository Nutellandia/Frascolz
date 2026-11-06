/**
 * @file sampleData.ts
 * @brief Realistic sample assets for game streaming, telemetry, textures, and 3D meshes
 * @author Emilio Frascogna (FRS)
 */

export interface SampleAsset {
  id: string;
  name: string;
  category: 'Gaming Delta' | '3D Geometry' | 'Texture / Graphic' | 'Network State' | 'Shader Bytecode' | 'Audio Stream';
  description: string;
  data: Uint8Array;
}

export function getSampleAssets(): SampleAsset[] {
  // 1. Game State Packet (Simulating high-frequency multi-entity state in an open-world game)
  const gameStateEntities = [];
  for (let i = 0; i < 60; i++) {
    gameStateEntities.push({
      entityId: `NPC_PEDESTRIAN_${1000 + i}`,
      position: [1420.25 + (i * 1.5), 890.12 - (i * 0.8), 24.50],
      velocity: [1.2, 0.0, 0.0],
      headingRad: 1.5708,
      animationState: i % 2 === 0 ? 'WALK_FORWARD' : 'IDLE_ALERT',
      lodTier: i < 15 ? 'HIGH_DETAIL' : 'PROXIMITY_CULLED',
      networkTick: 148290 + (i % 4),
    });
  }
  const gameStateJson = JSON.stringify({
    serverTimestamp: 1772668800000,
    worldSector: 'VICE_CITY_METRO_SOUTH_04',
    entities: gameStateEntities,
  });
  const gameStateBytes = new TextEncoder().encode(gameStateJson);

  // 2. 3D Mesh Vertex Array (.OBJ format simulation of vehicle chassis)
  let objData = "# FRS 3D Mesh Export - Vehicle Sports Coupe Model LOD0\n";
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      const px = (x - 10) * 0.25;
      const py = Math.sin(x * 0.5) * 0.4 + (y * 0.1);
      const pz = (y - 10) * 0.3;
      objData += `v ${px.toFixed(4)} ${py.toFixed(4)} ${pz.toFixed(4)}\n`;
      objData += `vn 0.0000 1.0000 0.0000\n`;
      objData += `vt ${(x / 20).toFixed(4)} ${(y / 20).toFixed(4)}\n`;
    }
  }
  for (let f = 1; f < 180; f++) {
    objData += `f ${f}/${f}/${f} ${f + 1}/${f + 1}/${f + 1} ${f + 20}/${f + 20}/${f + 20}\n`;
  }
  const meshBytes = new TextEncoder().encode(objData);

  // 3. Texture Normal Map / Delta Frame (Simulating 64x64 raw uncompressed RGBA pixel block)
  const textureBytes = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const idx = (y * 64 + x) * 4;
      // Normal map blue-tinted surface with repetitive bevels
      textureBytes[idx] = 128 + Math.floor(Math.sin(x * 0.2) * 20);     // R (X normal)
      textureBytes[idx + 1] = 128 + Math.floor(Math.cos(y * 0.2) * 20); // G (Y normal)
      textureBytes[idx + 2] = 255;                                      // B (Z normal pointing up)
      textureBytes[idx + 3] = 255;                                      // Alpha
    }
  }

  // 4. WGSL / GLSL High-Performance Compute Shader Source
  const shaderCode = `// FRS FrascoLZ Compute Kernel: Real-time Neural Upscaling & Radiance Cache
struct FrameConstants {
    viewMatrix: mat4x4<f32>,
    projMatrix: mat4x4<f32>,
    cameraPos: vec3<f32>,
    temporalJitter: vec2<f32>,
    resolution: vec2<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: FrameConstants;
@group(0) @binding(1) var inputColorTexture: texture_2d<f32>;
@group(0) @binding(2) var outputColorTexture: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let uv = vec2<f32>(global_id.xy) / uniforms.resolution;
    if (global_id.x >= u32(uniforms.resolution.x) || global_id.y >= u32(uniforms.resolution.y)) {
        return;
    }
    var accumulatedRadiance = vec4<f32>(0.0);
    for (var i: i32 = -1; i <= 1; i++) {
        for (var j: i32 = -1; j <= 1; j++) {
            let offsetCoord = vec2<i32>(global_id.xy) + vec2<i32>(i, j);
            let sampleColor = textureLoad(inputColorTexture, offsetCoord, 0);
            accumulatedRadiance += sampleColor * 0.1111;
        }
    }
    textureStore(outputColorTexture, global_id.xy, accumulatedRadiance);
}
`.repeat(6);
  const shaderBytes = new TextEncoder().encode(shaderCode);

  // 5. Raw Stereo 16-bit PCM Audio Waveform (Simulating 44.1kHz raw game sound effects / voice buffer)
  const sampleCount = Math.floor(44100 / 4); // 0.25 second chunk of audio
  const audioBytes = new Uint8Array(sampleCount * 4); // 16-bit stereo = 4 bytes per sample
  const dataView = new DataView(audioBytes.buffer);
  for (let i = 0; i < sampleCount; i++) {
    const t = i / 44100;
    // Harmonic chord: 440 Hz (A4) + 554.37 Hz (C#5) + 659.25 Hz (E5)
    const leftSample = Math.sin(2 * Math.PI * 440 * t) * 0.4 + Math.sin(2 * Math.PI * 554.37 * t) * 0.3;
    const rightSample = Math.sin(2 * Math.PI * 440 * t) * 0.3 + Math.sin(2 * Math.PI * 659.25 * t) * 0.4;
    
    const int16Left = Math.floor(Math.max(-1, Math.min(1, leftSample)) * 32767);
    const int16Right = Math.floor(Math.max(-1, Math.min(1, rightSample)) * 32767);
    
    dataView.setInt16(i * 4, int16Left, true);
    dataView.setInt16(i * 4 + 2, int16Right, true);
  }

  return [
    {
      id: 'game-state',
      name: 'GTA-Class Game State (60 Entities)',
      category: 'Network State',
      description: 'High-frequency multiplayer transform updates, physics velocities, and animation tags.',
      data: gameStateBytes,
    },
    {
      id: 'texture-normal',
      name: '4K Tile Normal Map (RGBA Delta)',
      category: 'Texture / Graphic',
      description: 'Raw pixel surface normals with gradient plateaus and repetitive micro-bump features.',
      data: textureBytes,
    },
    {
      id: 'mesh-car',
      name: 'Sports Coupe 3D Mesh (.OBJ)',
      category: '3D Geometry',
      description: 'High-density vertex positions, UV coordinates, and face topology arrays.',
      data: meshBytes,
    },
    {
      id: 'shader-source',
      name: 'Neural Radiance Compute Shader',
      category: 'Shader Bytecode',
      description: 'WGSL GPU compute shader routines with repetitive vector operations and uniform layouts.',
      data: shaderBytes,
    },
    {
      id: 'pcm-audio',
      name: 'Audio PCM Stereo 16-bit (Game SFX)',
      category: 'Audio Stream',
      description: 'Raw uncompressed 44.1kHz stereo waveform buffer before mixing and DSP processing.',
      data: audioBytes,
    },
  ];
}
