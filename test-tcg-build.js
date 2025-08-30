/**
 * Quick TCG System Test Build
 * Tests core TCG functionality without full plugin dependencies
 */

const esbuild = require('esbuild');
const path = require('path');

async function buildTCGTest() {
  try {
    console.log('🎮 Building TCG Test Bundle...');
    
    const result = await esbuild.build({
      entryPoints: [
        'src/features/tcg/types.ts',
        'src/features/tcg/core/rng-system.ts',
        'src/features/tcg/core/progression-engine.ts',
        'src/features/tcg/themes/theme-system.ts'
      ],
      bundle: true,
      platform: 'node',
      target: 'es2020',
      format: 'cjs',
      outdir: 'dist/tcg-test',
      sourcemap: true,
      metafile: true,
      external: ['obsidian'],
      define: {
        'process.env.NODE_ENV': '"development"'
      },
      logLevel: 'info'
    });

    console.log('✅ TCG Test Bundle built successfully!');
    console.log(`📊 Bundle size: ${Object.values(result.metafile.outputs)
      .reduce((total, output) => total + output.bytes, 0)} bytes`);
    
    return true;
  } catch (error) {
    console.error('❌ TCG Build failed:', error);
    return false;
  }
}

if (require.main === module) {
  buildTCGTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { buildTCGTest };