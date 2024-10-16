const fs = require('fs').promises;
const path = require('path');
const ProgressBar = require('progress');
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const directoryTree = {}; // Contiendra la structure des dossiers et fichiers

// Fonction pour compter le nombre total de fichiers
async function countFiles(directory) {
    console.log(`Counting files in ${directory}... This may take some time.`);
    let totalFiles = 0;

    async function recursiveCount(directory) {
        let files;
        try {
            files = await fs.readdir(directory, { withFileTypes: true });
        } catch (err) {
            if (err.code === 'EPERM' || err.code === 'EACCES') {
                console.log(`Permission refusée pour accéder à : ${directory}`);
                return;
            } else {
                console.log(`Erreur lors de l'accès à : ${directory}`);
                return;
            }
        }

        for (const file of files) {
            const fullPath = path.join(directory, file.name);
            let stats;
            try {
                stats = await fs.stat(fullPath);
            } catch (err) {
                console.log(`Impossible d'accéder à : ${fullPath}`);
                continue;
            }

            if (stats.isDirectory()) {
                await recursiveCount(fullPath); // Compter récursivement les sous-dossiers
            } else {
                totalFiles++; // Incrémenter le nombre total de fichiers
            }
        }
    }

    await recursiveCount(directory);
    return totalFiles;
}

// Fonction principale pour parcourir les fichiers avec barre de progression
async function listFilesWithProgress(directory) {
    let totalFiles
    console.log(process.env.NODE_ENV);
    
    if (process.env.NODE_ENV !== 'production'){
        totalFiles= 539367;
    } else {
        totalFiles = await countFiles(directory);
    };

    console.log(`Nombre total de fichiers à scanner : ${totalFiles}`);

    const progressBar = new ProgressBar('Liste des fichiers [:bar] :current/:total', {
        total: totalFiles,
        width: 20,
        incomplete: ' ',
        complete: '=',
        renderThrottle: 100
    });

    let fileCounter = 0;

    // Fonction pour lire les dossiers et construire l'arborescence
    async function readDirectory(directory, tree) {
        let files;
        try {
            files = await fs.readdir(directory, { withFileTypes: true });
        } catch (err) {
            if (err.code === 'EPERM' || err.code === 'EACCES') {
                console.log(`Permission refusée pour accéder à : ${directory}`);
                return;
            } else {
                console.log(`Erreur lors de l'accès à : ${directory}`);
                return;
            }
        }

        for (const file of files) {
            const fullPath = path.join(directory, file.name);
            let stats;
            try {
                stats = await fs.stat(fullPath);
            } catch (err) {
                console.log(`Impossible d'accéder à : ${fullPath}`);
                continue;
            }

            if (stats.isDirectory()) {
                tree[file.name] = { type: 'directory', files: {} };
                await readDirectory(fullPath, tree[file.name].files); // Lire récursivement les sous-dossiers
            } else {
                fileCounter++;
                tree[file.name] = {
                    type: 'file',
                    size: stats.size,
                    createdAt: stats.birthtime,
                    modifiedAt: stats.mtime,
                    fullPath: fullPath
                };
                progressBar.tick(); // Mettre à jour la barre de progression
            }
        }
    }

    // Construire la structure du système de fichiers
    await readDirectory(directory, directoryTree);

    console.log(`Nombre total de fichiers trouvés : ${fileCounter}`);

    // Sauvegarder les résultats dans un fichier JSON
    await fs.writeFile(process.env.FILE_SAVE || 'directory_structure.json', JSON.stringify(directoryTree, null, 2));
    console.log(`Les fichiers ont été enregistrés dans directory_structure.json.`);
}

// Lancer le scan avec le répertoire de base
const directoryToScan = process.env.FILE_PATH || 'D:/'; // Remplace ce chemin par le répertoire à scanner
listFilesWithProgress(directoryToScan)
    .then(() => console.log('Analyse terminée'))
    .catch(err => console.error(`Erreur lors de l'analyse des fichiers : ${err}`));
