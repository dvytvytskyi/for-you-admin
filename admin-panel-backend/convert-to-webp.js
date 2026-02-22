const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const targetDirs = process.argv.slice(2);

if (targetDirs.length === 0) {
    console.log('Usage: node convert-to-webp.js <dir1> <dir2> ...');
    process.exit(1);
}

async function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    for (const file of files) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = await getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            const ext = path.extname(file).toLowerCase();
            if (ext === '.jpg' || ext === '.jpeg') {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    }

    return arrayOfFiles;
}

async function convert() {
    for (const dir of targetDirs) {
        console.log(`\n📂 Processing directory: ${dir}`);
        if (!fs.existsSync(dir)) {
            console.log(`⚠️ Directory does not exist: ${dir}`);
            continue;
        }

        const files = await getAllFiles(dir);
        console.log(`📊 Found ${files.length} JPG/JPEG files`);

        for (const file of files) {
            const webpPath = file.replace(/\.(jpg|jpeg)$/i, '.webp');

            try {
                console.log(`🔄 Converting: ${file} -> ${webpPath}`);

                await sharp(file)
                    .webp({ quality: 80 })
                    .toFile(webpPath);

                console.log(`  ✅ Success. Deleting original...`);
                fs.unlinkSync(file);

                // Also delete the ._ files if they exist (macOS junk)
                const dotUnderscore = path.join(path.dirname(file), '._' + path.basename(file));
                if (fs.existsSync(dotUnderscore)) {
                    console.log(`  🗑️ Deleting metadata file: ${dotUnderscore}`);
                    fs.unlinkSync(dotUnderscore);
                }

            } catch (err) {
                console.error(`  ❌ Error processing ${file}:`, err.message);
            }
        }
    }
    console.log('\n✨ Done!');
}

convert();
