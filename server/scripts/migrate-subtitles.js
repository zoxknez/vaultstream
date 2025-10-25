#!/usr/bin/env node
/**
 * Migration Script: Per-Episode Subtitle Storage
 * 
 * This script migrates existing subtitle files from the old structure:
 *   subtitles/{hash}/subtitle.vtt
 * 
 * To the new per-episode structure:
 *   subtitles/{hash}/0/subtitle.vtt  (for file index 0 - typically movies/single files)
 * 
 * Usage: node migrate-subtitles.js
 */

const fs = require('fs').promises;
const path = require('path');

const SUBTITLE_DIR = path.join(__dirname, '..', 'uploads', 'subtitles');

async function migrateSubtitles() {
  console.log('🔄 Starting subtitle migration...\n');
  
  try {
    const hashDirs = await fs.readdir(SUBTITLE_DIR, { withFileTypes: true });
    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const dirEntry of hashDirs) {
      if (!dirEntry.isDirectory()) continue;

      const hash = dirEntry.name;
      const hashPath = path.join(SUBTITLE_DIR, hash);
      
      try {
        const contents = await fs.readdir(hashPath, { withFileTypes: true });
        
        // Check if there are subtitle files directly in the hash directory
        const subtitleFiles = contents.filter(
          (entry) => entry.isFile() && (entry.name.endsWith('.vtt') || entry.name.endsWith('.srt'))
        );

        if (subtitleFiles.length === 0) {
          // Already migrated or no subtitles
          skipped++;
          continue;
        }

        // Create fileIndex 0 directory (default for single files/movies)
        const fileIndex0Path = path.join(hashPath, '0');
        await fs.mkdir(fileIndex0Path, { recursive: true });

        // Move subtitle files to the new location
        for (const subtitleFile of subtitleFiles) {
          const oldPath = path.join(hashPath, subtitleFile.name);
          const newPath = path.join(fileIndex0Path, subtitleFile.name);
          
          await fs.rename(oldPath, newPath);
          console.log(`✅ Migrated: ${hash}/${subtitleFile.name} → ${hash}/0/${subtitleFile.name}`);
          migrated++;
        }
      } catch (error) {
        console.error(`❌ Error migrating ${hash}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Migrated: ${migrated} files`);
    console.log(`   ⏭️  Skipped: ${skipped} directories`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('\n✨ Migration complete!');

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  No subtitles directory found. Nothing to migrate.');
      return;
    }
    throw error;
  }
}

// Run migration
migrateSubtitles().catch((error) => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});
