/* eslint-env node */

/**
 * 📊 STREAMVAULT BUNDLE ANALYZER
 * Advanced bundle analysis and optimization recommendations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BundleAnalyzer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.distPath = path.join(this.projectRoot, 'dist');
    this.analysisResults = {
      totalSize: 0,
      gzipSize: 0,
      brotliSize: 0,
      chunks: [],
      assets: [],
      recommendations: []
    };
  }

  /**
   * Analyze bundle size and composition
   */
  async analyzeBundle() {
    console.log('🔍 Analyzing bundle composition...');

    try {
      // Check if dist directory exists
      if (!fs.existsSync(this.distPath)) {
        console.log('❌ Dist directory not found. Building first...');
        await this.buildProject();
      }

      // Analyze assets
      await this.analyzeAssets();

      // Analyze chunks
      await this.analyzeChunks();

      // Calculate compression ratios
      await this.calculateCompressionRatios();

      // Generate recommendations
      this.generateRecommendations();

      // Display results
      this.displayResults();
    } catch (error) {
      console.error('❌ Bundle analysis failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Build the project if needed
   */
  async buildProject() {
    console.log('🔨 Building project...');

    try {
      execSync('npm run build', {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }

  /**
   * Analyze individual assets
   */
  async analyzeAssets() {
    console.log('📁 Analyzing assets...');

    const assets = this.getAssets();

    for (const asset of assets) {
      const stats = fs.statSync(asset.path);
      const size = stats.size;

      this.analysisResults.assets.push({
        name: asset.name,
        path: asset.path,
        size: size,
        sizeFormatted: this.formatBytes(size),
        type: this.getAssetType(asset.name),
        priority: this.getAssetPriority(asset.name)
      });

      this.analysisResults.totalSize += size;
    }
  }

  /**
   * Analyze JavaScript chunks
   */
  async analyzeChunks() {
    console.log('🧩 Analyzing chunks...');

    const jsFiles = this.analysisResults.assets.filter((asset) => asset.type === 'javascript');

    for (const file of jsFiles) {
      const content = fs.readFileSync(file.path, 'utf8');

      // Analyze chunk composition
      const chunkAnalysis = this.analyzeChunkContent(content);

      this.analysisResults.chunks.push({
        name: file.name,
        size: file.size,
        sizeFormatted: file.sizeFormatted,
        ...chunkAnalysis
      });
    }
  }

  /**
   * Analyze chunk content for optimization opportunities
   */
  analyzeChunkContent(content) {
    const analysis = {
      lines: content.split('\n').length,
      characters: content.length,
      imports: this.extractImports(content),
      exports: this.extractExports(content),
      unusedCode: this.detectUnusedCode(content),
      duplicateCode: this.detectDuplicateCode(content),
      largeFunctions: this.detectLargeFunctions(content),
      optimizationScore: 0
    };

    // Calculate optimization score
    analysis.optimizationScore = this.calculateOptimizationScore(analysis);

    return analysis;
  }

  /**
   * Extract import statements
   */
  extractImports(content) {
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    const imports = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  /**
   * Extract export statements
   */
  extractExports(content) {
    const exportRegex =
      /export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    const exports = [];
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return exports;
  }

  /**
   * Detect unused code patterns
   */
  detectUnusedCode(content) {
    const unusedPatterns = [/console\.log\(/g, /debugger;/g, /\/\*.*?\*\//gs, /\/\/.*$/gm];

    let unusedCount = 0;

    for (const pattern of unusedPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        unusedCount += matches.length;
      }
    }

    return unusedCount;
  }

  /**
   * Detect duplicate code
   */
  detectDuplicateCode(content) {
    const lines = content.split('\n');
    const lineCounts = {};

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 10) {
        // Only count substantial lines
        lineCounts[trimmed] = (lineCounts[trimmed] || 0) + 1;
      }
    }

    return Object.values(lineCounts).filter((count) => count > 1).length;
  }

  /**
   * Detect large functions
   */
  detectLargeFunctions(content) {
    const functionRegex = /function\s+\w+\s*\([^)]*\)\s*\{[^}]*\}/g;
    const functions = content.match(functionRegex) || [];

    return functions.filter((func) => func.split('\n').length > 20).length;
  }

  /**
   * Calculate optimization score
   */
  calculateOptimizationScore(analysis) {
    let score = 100;

    // Deduct points for issues
    score -= Math.min(analysis.unusedCode * 2, 20);
    score -= Math.min(analysis.duplicateCode * 3, 30);
    score -= Math.min(analysis.largeFunctions * 5, 25);

    // Bonus for good practices
    if (analysis.imports.length > 0) score += 5;
    if (analysis.exports.length > 0) score += 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate compression ratios
   */
  async calculateCompressionRatios() {
    console.log('🗜️ Calculating compression ratios...');

    try {
      // Calculate gzip size
      const gzipSize = await this.calculateGzipSize();
      this.analysisResults.gzipSize = gzipSize;

      // Calculate brotli size
      const brotliSize = await this.calculateBrotliSize();
      this.analysisResults.brotliSize = brotliSize;
    } catch (error) {
      console.warn('⚠️ Compression calculation failed:', error.message);
    }
  }

  /**
   * Calculate gzip compression size
   */
  async calculateGzipSize() {
    try {
      const { gzipSync } = require('zlib');

      let totalGzipSize = 0;

      for (const asset of this.analysisResults.assets) {
        if (asset.type === 'javascript' || asset.type === 'css') {
          const content = fs.readFileSync(asset.path);
          const compressed = gzipSync(content);
          totalGzipSize += compressed.length;
        }
      }

      return totalGzipSize;
    } catch {
      return 0;
    }
  }

  /**
   * Calculate brotli compression size
   */
  async calculateBrotliSize() {
    try {
      const { brotliCompressSync } = require('zlib');

      let totalBrotliSize = 0;

      for (const asset of this.analysisResults.assets) {
        if (asset.type === 'javascript' || asset.type === 'css') {
          const content = fs.readFileSync(asset.path);
          const compressed = brotliCompressSync(content);
          totalBrotliSize += compressed.length;
        }
      }

      return totalBrotliSize;
    } catch {
      return 0;
    }
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Bundle size recommendations
    if (this.analysisResults.totalSize > 2 * 1024 * 1024) {
      // 2MB
      recommendations.push({
        type: 'bundle-size',
        priority: 'high',
        message: 'Bundle size is large (>2MB). Consider code splitting and lazy loading.',
        impact: 'High performance impact'
      });
    }

    // Compression recommendations
    if (this.analysisResults.gzipSize > 0) {
      const gzipRatio = (1 - this.analysisResults.gzipSize / this.analysisResults.totalSize) * 100;

      if (gzipRatio < 60) {
        recommendations.push({
          type: 'compression',
          priority: 'medium',
          message: `Gzip compression ratio is ${gzipRatio.toFixed(
            1
          )}%. Consider better minification.`,
          impact: 'Medium performance impact'
        });
      }
    }

    // Chunk analysis recommendations
    for (const chunk of this.analysisResults.chunks) {
      if (chunk.optimizationScore < 70) {
        recommendations.push({
          type: 'code-quality',
          priority: 'medium',
          message: `Chunk ${chunk.name} has optimization score ${chunk.optimizationScore}/100.`,
          impact: 'Medium maintainability impact'
        });
      }

      if (chunk.unusedCode > 10) {
        recommendations.push({
          type: 'unused-code',
          priority: 'low',
          message: `Chunk ${chunk.name} has ${chunk.unusedCode} unused code patterns.`,
          impact: 'Low performance impact'
        });
      }
    }

    this.analysisResults.recommendations = recommendations;
  }

  /**
   * Display analysis results
   */
  displayResults() {
    console.log('\n📊 BUNDLE ANALYSIS RESULTS');
    console.log('='.repeat(50));

    // Overall statistics
    console.log(`\n📦 Total Bundle Size: ${this.formatBytes(this.analysisResults.totalSize)}`);

    if (this.analysisResults.gzipSize > 0) {
      const gzipRatio = (1 - this.analysisResults.gzipSize / this.analysisResults.totalSize) * 100;
      console.log(
        `🗜️ Gzip Size: ${this.formatBytes(this.analysisResults.gzipSize)} (${gzipRatio.toFixed(
          1
        )}% compression)`
      );
    }

    if (this.analysisResults.brotliSize > 0) {
      const brotliRatio =
        (1 - this.analysisResults.brotliSize / this.analysisResults.totalSize) * 100;
      console.log(
        `🗜️ Brotli Size: ${this.formatBytes(
          this.analysisResults.brotliSize
        )} (${brotliRatio.toFixed(1)}% compression)`
      );
    }

    // Asset breakdown
    console.log('\n📁 Asset Breakdown:');
    const assetsByType = this.groupAssetsByType();

    for (const [type, assets] of Object.entries(assetsByType)) {
      const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
      console.log(`  ${type}: ${assets.length} files, ${this.formatBytes(totalSize)}`);
    }

    // Chunk analysis
    console.log('\n🧩 Chunk Analysis:');
    for (const chunk of this.analysisResults.chunks) {
      console.log(
        `  ${chunk.name}: ${chunk.sizeFormatted} (Score: ${chunk.optimizationScore}/100)`
      );
    }

    // Recommendations
    if (this.analysisResults.recommendations.length > 0) {
      console.log('\n💡 Optimization Recommendations:');

      const highPriority = this.analysisResults.recommendations.filter(
        (r) => r.priority === 'high'
      );
      const mediumPriority = this.analysisResults.recommendations.filter(
        (r) => r.priority === 'medium'
      );
      const lowPriority = this.analysisResults.recommendations.filter((r) => r.priority === 'low');

      if (highPriority.length > 0) {
        console.log('\n  🔴 High Priority:');
        highPriority.forEach((rec) => console.log(`    • ${rec.message}`));
      }

      if (mediumPriority.length > 0) {
        console.log('\n  🟡 Medium Priority:');
        mediumPriority.forEach((rec) => console.log(`    • ${rec.message}`));
      }

      if (lowPriority.length > 0) {
        console.log('\n  🟢 Low Priority:');
        lowPriority.forEach((rec) => console.log(`    • ${rec.message}`));
      }
    }

    // Performance score
    const performanceScore = this.calculatePerformanceScore();
    console.log(`\n🎯 Overall Performance Score: ${performanceScore}/100`);

    if (performanceScore < 70) {
      console.log('⚠️ Bundle needs optimization for better performance');
    } else if (performanceScore < 85) {
      console.log('✅ Bundle is good but could be improved');
    } else {
      console.log('🚀 Bundle is well optimized!');
    }
  }

  /**
   * Calculate overall performance score
   */
  calculatePerformanceScore() {
    let score = 100;

    // Deduct for large bundle size
    if (this.analysisResults.totalSize > 2 * 1024 * 1024) {
      score -= 20;
    } else if (this.analysisResults.totalSize > 1 * 1024 * 1024) {
      score -= 10;
    }

    // Deduct for poor compression
    if (this.analysisResults.gzipSize > 0) {
      const gzipRatio = (1 - this.analysisResults.gzipSize / this.analysisResults.totalSize) * 100;
      if (gzipRatio < 60) score -= 15;
      else if (gzipRatio < 70) score -= 10;
    }

    // Deduct for code quality issues
    const avgOptimizationScore =
      this.analysisResults.chunks.reduce((sum, chunk) => sum + chunk.optimizationScore, 0) /
      this.analysisResults.chunks.length;

    if (avgOptimizationScore < 70) score -= 15;
    else if (avgOptimizationScore < 80) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Group assets by type
   */
  groupAssetsByType() {
    const grouped = {};

    for (const asset of this.analysisResults.assets) {
      if (!grouped[asset.type]) {
        grouped[asset.type] = [];
      }
      grouped[asset.type].push(asset);
    }

    return grouped;
  }

  /**
   * Get all assets in dist directory
   */
  getAssets() {
    const assets = [];

    const scanDirectory = (dir, relativePath = '') => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativeItemPath = path.join(relativePath, item);

        if (fs.statSync(fullPath).isDirectory()) {
          scanDirectory(fullPath, relativeItemPath);
        } else {
          assets.push({
            name: item,
            path: fullPath,
            relativePath: relativeItemPath
          });
        }
      }
    };

    scanDirectory(this.distPath);
    return assets;
  }

  /**
   * Get asset type based on file extension
   */
  getAssetType(fileName) {
    const ext = path.extname(fileName).toLowerCase();

    const typeMap = {
      '.js': 'javascript',
      '.mjs': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.jsx': 'javascript',
      '.css': 'css',
      '.scss': 'css',
      '.sass': 'css',
      '.less': 'css',
      '.html': 'html',
      '.svg': 'image',
      '.png': 'image',
      '.jpg': 'image',
      '.jpeg': 'image',
      '.gif': 'image',
      '.webp': 'image',
      '.woff': 'font',
      '.woff2': 'font',
      '.ttf': 'font',
      '.eot': 'font'
    };

    return typeMap[ext] || 'other';
  }

  /**
   * Get asset priority based on file name and type
   */
  getAssetPriority(fileName) {
    if (fileName.includes('vendor') || fileName.includes('chunk')) {
      return 'low';
    } else if (fileName.includes('main') || fileName.includes('index')) {
      return 'high';
    } else {
      return 'medium';
    }
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  analyzer.analyzeBundle().catch(console.error);
}

module.exports = BundleAnalyzer;
