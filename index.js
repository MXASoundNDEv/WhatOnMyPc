const fs = require('fs').promises;
const path = require('path');
const ProgressBar = require('progress');

const programs = {};

// Fonction pour trier les fichiers par extension et programme
function classifyFile(file, fullPath, stats) {
    let extension = path.extname(file).toLowerCase();

    // Si le fichier n'a pas d'extension, utiliser 'other'
    if (!extension || extension === '') {
        extension = 'other';
    }

    const programName = path.basename(path.dirname(fullPath)); // Prendre le nom du dossier parent comme nom du programme

    // Si le programme n'existe pas encore, on le crée
    if (!programs[programName]) {
        programs[programName] = {
            files: {},
            info: {
                totalSize: 0,
                createdAt: stats.birthtime, // Utilise la date de création du premier fichier
                executable: null,
                uninstaller: null,
                fileCount: 0
            }
        };
    }    

        // Si l'extension n'existe pas dans "files", on initialise le tableau
        if (!programs[programName].files) {
            programs[programName].files = {};
        }

    // Assurer que la catégorie de fichiers par extension est initialisée
    if (!programs[programName].files[extension]) {
        programs[programName].files[extension] = []; // Initialiser le tableau pour cette extension
    }

    // Si l'extension n'existe pas dans "files", on initialise le tableau
    if (!programs[programName].info) {
        programs[programName].info =
            {
                totalSize: 0,
                createdAt: stats.birthtime, // Utilise la date de création du premier fichier
                executable: null,
                uninstaller: null,
                fileCount: 0
            };
    }

    // Ajouter le fichier au tableau approprié
    programs[programName].files[extension].push({
        fileName: file,
        fullPath: fullPath,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
    });

    // Mettre à jour les informations du programme
    programs[programName].info.totalSize += stats.size;
    programs[programName].info.fileCount++;

    // Si c'est un fichier exécutable (ex: .exe), on le note
    if (extension === '.exe' || extension === '.bat' || extension === '.sh') {
        programs[programName].info.executable = fullPath;
    }

    // Si c'est un fichier de désinstallation (ex: uninstall), on le note
    if (file.toLowerCase().includes('uninstall')) {
        programs[programName].info.uninstaller = fullPath;
    }
}

// Fonction pour compter le nombre total de fichiers
async function countFiles(directory) {
    console.log(`Counting file in ${directory} it's can take may long time`);
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
    // let totalFiles = await countFiles(directory);
    let totalFiles= 539367;
    console.log(`Nombre total de fichiers à scanner : ${totalFiles}`);

    const progressBar = new ProgressBar('Liste des fichiers [:bar] :current/:total', {
        total: totalFiles,
        width: 20,
        incomplete: ' ',
        complete: '=',
        renderThrottle: 200
    });

    let fileCounter = 0;

    async function readDirectory(directory) {
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
                await readDirectory(fullPath); // Lire récursivement les sous-dossiers
            } else {
                fileCounter++;
                classifyFile(file.name, fullPath, stats); // Classer et ajouter le fichier au bon programme
                progressBar.tick(); // Mettre à jour la barre de progression
            }
        }
    }

    await readDirectory(directory);
    console.log(`Nombre total de fichiers trouvés : ${fileCounter}`);

    // Sauvegarder les résultats dans un fichier JSON
    await fs.writeFile('programs.json', JSON.stringify(programs, null, 2));
    console.log(`Les fichiers ont été enregistrés dans programs.json.`);
}

// Lancer le scan avec le répertoire de base
const directoryToScan = 'D:/'; // Remplace ce chemin par le répertoire à scanner
listFilesWithProgress(directoryToScan)
    .then(() => console.log('Analyse terminée'))
    // .catch(err => console.error(`Erreur lors de l'analyse des fichiers : ${err}`));
