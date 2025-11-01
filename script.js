// --- Activation du Service Worker (PWA) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('Service Worker enregistré.'))
      .catch(err => console.log('Erreur Service Worker: ', err));
  });
}

// --- Logique de l'application ---
document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONSTANTES & VARIABLES GLOBALES ---
    
    const DB_KEY = 'jdrCompagnonDB_v1'; // La clé de notre "base de données"
    let currentCharacterId = null;     // L'ID du personnage en cours d'édition

    // --- 2. FONCTIONS UTILITAIRES ---

    /** Génère un ID unique simple */
    function generateUUID() {
        return `char-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    /** Récupère la base de données depuis localStorage */
    function getDatabase() {
        const db = localStorage.getItem(DB_KEY);
        return db ? JSON.parse(db) : {};
    }

    /** Sauvegarde la base de données dans localStorage */
    function saveDatabase(db) {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    }

    /** Calcule le modificateur de stat */
    function calculateBonus(statValue) {
        const bonus = Math.floor((statValue - 10) / 2);
        return (bonus >= 0) ? `+${bonus}` : `${bonus}`;
    }

    /** Crée une ligne dans un tableau (Attaque ou Sort) */
    function createItemRow(name, bonus, dmg, listElement) {
        if (!name) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${name}</td>
            <td>${bonus}</td>
            <td>${dmg}</td>
            <td class="edit-only"><button class="delete-btn">X</button></td>
        `; 
        tr.querySelector('.delete-btn').addEventListener('click', () => {
            tr.remove();
        });
        listElement.appendChild(tr);
    }
    
    /** Met à jour tous les bonus dérivés (Stats + Initiative) */
    function updateAllBonuses() {
        statInputs.forEach(input => {
            const bonusSpan = document.getElementById(input.id.replace('stat-', 'bonus-'));
            if (bonusSpan) {
                bonusSpan.textContent = calculateBonus(input.value);
            }
        });
        const dexBonus = calculateBonus(document.getElementById('stat-dex').value);
        document.getElementById('initiative').value = dexBonus;
    }

    /** Efface tous les champs du formulaire */
    function clearForm() {
        // Text inputs
        document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(input => {
            // Remet les valeurs par défaut pour les stats
            if (input.classList.contains('stat-input')) {
                input.value = '10';
            } else if (input.id === 'bonus-maitrise') {
                input.value = '+2';
            } else if (input.id === 'ca') {
                input.value = '10';
            } else {
                input.value = '';
            }
        });
        // Checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(check => {
            check.checked = false;
        });
        // Listes
        attackList.innerHTML = '';
        spellList.innerHTML = '';
        // Portrait
        portraitImg.src = '';
        portraitLabel.style.display = 'block';
        
        updateAllBonuses();
    }


    // --- 3. SÉLECTION DES ÉLÉMENTS (INPUTS, BOUTONS, LISTES) ---

    // Conteneur principal
    const sheetContainer = document.querySelector('.sheet');

    // Gestionnaire de personnages
    const charSelect = document.getElementById('char-select');
    const newCharBtn = document.getElementById('btn-new');
    const deleteCharBtn = document.getElementById('btn-delete');
    const exportBtn = document.getElementById('btn-export');
    const importBtn = document.getElementById('btn-import');
    const importFileInput = document.getElementById('import-file');
    
    // Tous les autres champs...
    const charName = document.getElementById('char-name');
    const charClass = document.getElementById('char-class');
    const charNotes = document.getElementById('char-notes');
    const portraitContainer = document.getElementById('portrait-container');
    const portraitUpload = document.getElementById('portrait-upload');
    const portraitImg = document.getElementById('char-portrait-img');
    const portraitLabel = document.getElementById('portrait-label');
    const bonusMaitrise = document.getElementById('bonus-maitrise');
    const ca = document.getElementById('ca');
    const initiative = document.getElementById('initiative');
    const pvMax = document.getElementById('pv-max');
    const pvCurrent = document.getElementById('pv-current');
    const desVie = document.getElementById('des-vie');
    const seuilBlessure = document.getElementById('seuil-blessure');
    const fatigue = document.getElementById('fatigue');
    const deathSaves = document.querySelectorAll('input[id^="death-"]');
    const statInputs = document.querySelectorAll('.stat-input');
    const jsChecks = document.querySelectorAll('.js-check');
    const maitriseChecks = document.querySelectorAll('.maitrise-check');
    const expertiseChecks = document.querySelectorAll('.expertise-check');
    const resistancesInput = document.getElementById('resistances');
    const spellSlots = document.querySelectorAll('.spell-slot-input');
    const inventoryNotes = document.getElementById('inventory-notes');
    const newAttackName = document.getElementById('new-attack-name');
    const newAttackBonus = document.getElementById('new-attack-bonus');
    const newAttackDmg = document.getElementById('new-attack-dmg');
    const addAttackBtn = document.getElementById('btn-add-attack');
    const attackList = document.getElementById('attack-list'); 
    const newSpellName = document.getElementById('new-spell-name');
    const newSpellBonus = document.getElementById('new-spell-bonus');
    const newSpellDmg = document.getElementById('new-spell-dmg');
    const addSpellBtn = document.getElementById('btn-add-spell');
    const spellList = document.getElementById('spell-list'); 
    const saveButton = document.getElementById('btn-save');
    const viewToggleButton = document.getElementById('btn-toggle-view');

    // Listes ciblées pour le verrouillage
    const fieldsToLock = document.querySelectorAll(
        '#char-name, #char-class, #bonus-maitrise, #ca, #pv-max, #des-vie, #seuil-blessure, #fatigue, #resistances, ' +
        '.stat-input, .spell-slot-input[id$="-max"]'
    );
    const checksToLock = document.querySelectorAll(
        '.js-check, .maitrise-check, .expertise-check'
    );
    
    // --- 4. LOGIQUE PRINCIPALE (CHARGEMENT, SAUVEGARDE, ETC.) ---

    /** Remplit le menu déroulant <select> */
    function loadCharacterList() {
        const db = getDatabase();
        const charIds = Object.keys(db);
        
        charSelect.innerHTML = '';
        
        if (charIds.length === 0) {
            currentCharacterId = null;
            return null; 
        }

        charIds.forEach(id => {
            const char = db[id];
            const option = document.createElement('option');
            option.value = id;
            option.textContent = char.name || 'Personnage sans nom';
            charSelect.appendChild(option);
        });

        if (currentCharacterId && db[currentCharacterId]) {
            charSelect.value = currentCharacterId;
        } else {
            currentCharacterId = charIds[0];
            charSelect.value = currentCharacterId;
        }
        
        return currentCharacterId;
    }

    /** Charge les données du personnage (par ID) dans le formulaire */
    function loadCharacter(id) {
        const db = getDatabase();
        const character = db[id];

        if (!character) {
            clearForm();
            currentCharacterId = null;
            return;
        }
        
        currentCharacterId = id; 

        // Remplir tous les champs texte
        charName.value = character.name || '';
        charClass.value = character.class || '';
        charNotes.value = character.notes || '';
        bonusMaitrise.value = character.bonusMaitrise || '+2';
        ca.value = character.ca || '10';
        pvMax.value = character.pvMax || '10';
        pvCurrent.value = character.pvCurrent || '10';
        desVie.value = character.desVie || '';
        seuilBlessure.value = character.seuilBlessure || '5';
        fatigue.value = character.fatigue || '0';
        resistancesInput.value = character.resistances || '';
        inventoryNotes.value = character.inventory || ''; 

        // Remplir les stats
        statInputs.forEach(input => {
            input.value = (character.stats && character.stats[input.id]) || '10';
        });
        
        // Remplir les checkboxes
        jsChecks.forEach(check => { check.checked = (character.js_maitrises && character.js_maitrises[check.id]) || false; });
        maitriseChecks.forEach(check => { check.checked = (character.maitrises && character.maitrises[check.id]) || false; });
        expertiseChecks.forEach(check => { check.checked = (character.expertises && character.expertises[check.id]) || false; });
        deathSaves.forEach(check => { check.checked = (character.deathSaves && character.deathSaves[check.id]) || false; });
        
        // Remplir les emplacements de sorts
        spellSlots.forEach(input => {
            input.value = (character.spellSlots && character.spellSlots[input.id]) || '';
        });

        // Vider et remplir les listes
        attackList.innerHTML = '';
        spellList.innerHTML = '';
        if (character.attacks) {
            character.attacks.forEach(item => createItemRow(item.name, item.bonus, item.dmg, attackList));
        }
        if (character.spells) {
            character.spells.forEach(item => createItemRow(item.name, item.bonus, item.dmg, spellList));
        }
        
        // Charger l'image (maintenant dans l'objet)
        if (character.portraitData) {
            portraitImg.src = character.portraitData;
            portraitLabel.style.display = 'none';
        } else {
            portraitImg.src = '';
            portraitLabel.style.display = 'block';
        }
        
        updateAllBonuses();
    }
    
    /** Sauvegarde le formulaire actuel dans l'objet du personnage sélectionné */
    function saveCharacter() {
        if (!currentCharacterId) {
            alert('Aucun personnage sélectionné. Créez-en un nouveau d\'abord.');
            return;
        }

        const db = getDatabase();
        
        const character = {
            name: charName.value,
            class: charClass.value,
            notes: charNotes.value,
            bonusMaitrise: bonusMaitrise.value,
            ca: ca.value,
            pvMax: pvMax.value,
            pvCurrent: pvCurrent.value,
            desVie: desVie.value,
            seuilBlessure: seuilBlessure.value,
            fatigue: fatigue.value,
            resistances: resistancesInput.value,
            inventory: inventoryNotes.value,
            portraitData: portraitImg.src, // Sauvegarde l'image
            stats: {},
            js_maitrises: {},
            maitrises: {},
            expertises: {},
            deathSaves: {},
            attacks: [],
            spells: [],
            spellSlots: {}
        };

        // Sauvegarde Stats, Maîtrises, Décès, Slots...
        statInputs.forEach(input => { character.stats[input.id] = input.value; });
        jsChecks.forEach(check => { character.js_maitrises[check.id] = check.checked; });
        maitriseChecks.forEach(check => { character.maitrises[check.id] = check.checked; });
        expertiseChecks.forEach(check => { character.expertises[check.id] = check.checked; });
        deathSaves.forEach(check => { character.deathSaves[check.id] = check.checked; });
        spellSlots.forEach(input => { character.spellSlots[input.id] = input.value; });

        // Sauvegarde Attaques & Sorts...
        attackList.querySelectorAll('tr').forEach(tr => {
            const cells = tr.querySelectorAll('td');
            character.attacks.push({ name: cells[0].textContent, bonus: cells[1].textContent, dmg: cells[2].textContent });
        });
        spellList.querySelectorAll('tr').forEach(tr => {
            const cells = tr.querySelectorAll('td');
            character.spells.push({ name: cells[0].textContent, bonus: cells[1].textContent, dmg: cells[2].textContent });
        });
        
        // Met à jour le personnage dans la BDD
        db[currentCharacterId] = character;
        saveDatabase(db);
        
        // Met à jour le nom dans la liste déroulante
        loadCharacterList();
        
        alert('Personnage sauvegardé !');
    }

    /** Crée un nouveau personnage vide */
    function createNewCharacter() {
        const name = prompt("Nom du nouveau personnage :", "Nouveau Personnage");
        if (!name) return; // Annulé

        const newId = generateUUID();
        
        // Crée une fiche "vide" avec les stats par défaut
        const newChar = {
            name: name,
            stats: { 
                'stat-str': '10', 'stat-dex': '10', 'stat-con': '10', 
                'stat-int': '10', 'stat-wis': '10', 'stat-cha': '10' 
            },
            pvMax: '10',
            pvCurrent: '10'
        }; 

        const db = getDatabase();
        db[newId] = newChar;
        saveDatabase(db);

        currentCharacterId = newId;
        loadCharacterList(); // Met à jour la liste
        loadCharacter(newId); // Charge la fiche vide
    }

    /** Supprime le personnage actuel */
    function deleteCurrentCharacter() {
        if (!currentCharacterId) {
            alert('Aucun personnage sélectionné.');
            return;
        }

        const db = getDatabase();
        const charName = db[currentCharacterId].name || "ce personnage";
        
        if (!confirm(`Voulez-vous vraiment supprimer ${charName} ? Cette action est irréversible.`)) {
            return;
        }

        delete db[currentCharacterId];
        saveDatabase(db);

        const firstCharId = loadCharacterList();
        loadCharacter(firstCharId);
    }

    /** Exporte le personnage actuel en fichier JSON */
    function exportCharacter() {
        if (!currentCharacterId) {
            alert('Veuillez d\'abord charger un personnage à exporter.');
            return;
        }

        const db = getDatabase();
        const characterData = db[currentCharacterId];
        const jsonString = JSON.stringify(characterData, null, 2); 
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        const safeName = (characterData.name || 'personnage').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `${safeName}.json`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /** Gère l'upload d'un fichier JSON */
    function importCharacter(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonString = e.target.result;
                const importedData = JSON.parse(jsonString);
                
                if (!importedData || !importedData.name) {
                    alert('Erreur : Fichier non valide ou nom de personnage manquant.');
                    return;
                }
                
                const newId = generateUUID();
                importedData.name = `${importedData.name} (Importé)`; 
                
                const db = getDatabase();
                db[newId] = importedData;
                saveDatabase(db);
                
                currentCharacterId = newId;
                loadCharacterList();
                loadCharacter(newId);
                
                alert('Personnage importé avec succès !');

            } catch (error) {
                alert('Erreur lors de la lecture du fichier : ' + error.message);
            }
        };
        
        reader.readAsText(file);
        event.target.value = null;
    }


    // --- 5. ÉVÉNEMENTS (EVENT LISTENERS) ---

    // A) Mise à jour auto des bonus
    statInputs.forEach(input => {
        input.addEventListener('input', updateAllBonuses);
    });

    // B) Logique d'upload de portrait
    portraitContainer.addEventListener('click', () => {
        if (!sheetContainer.classList.contains('view-mode')) {
            portraitUpload.click(); 
        }
    });
    portraitUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            portraitImg.src = e.target.result; 
            portraitLabel.style.display = 'none'; 
            // La sauvegarde se fait au clic sur "Sauvegarder"
        };
        reader.readAsDataURL(file);
    });

    // C) Ajout d'une attaque / sort
    addAttackBtn.addEventListener('click', () => {
        createItemRow(newAttackName.value, newAttackBonus.value, newAttackDmg.value, attackList);
        newAttackName.value = ''; newAttackBonus.value = ''; newAttackDmg.value = '';
    });
    addSpellBtn.addEventListener('click', () => {
        createItemRow(newSpellName.value, newSpellBonus.value, newSpellDmg.value, spellList);
        newSpellName.value = ''; newSpellBonus.value = ''; newSpellDmg.value = '';
    });

    // D) Logique du "Mode Jeu" (Verrouillage sélectif)
    viewToggleButton.addEventListener('click', () => {
        sheetContainer.classList.toggle('view-mode');
        const isViewMode = sheetContainer.classList.contains('view-mode');
        
        if (isViewMode) {
            // --- On passe en MODE VUE ---
            viewToggleButton.textContent = '🔓';
            viewToggleButton.title = 'Déverrouiller (Mode Édition)'
            // Verrouille les champs texte/numériques fixes
            fieldsToLock.forEach(field => {
                field.readOnly = true;
            });
            // Le style CSS s'occupe de bloquer les clics sur les checkboxes
            
        } else {
            // --- On passe en MODE ÉDITION ---
            viewToggleButton.textContent = '🔒';
            viewToggleButton.title = 'Verrouiller (Mode Jeu)'
            // Déverrouille les champs
            fieldsToLock.forEach(field => {
                field.readOnly = false;
            });
            
            // (L'initiative reste non-éditable car elle est calculée)
            initiative.readOnly = true;
        }
    });

    // E) Événements de gestion de personnages
    charSelect.addEventListener('change', () => {
        loadCharacter(charSelect.value);
    });
    
    saveButton.addEventListener('click', saveCharacter);
    newCharBtn.addEventListener('click', createNewCharacter);
    deleteCharBtn.addEventListener('click', deleteCurrentCharacter);
    exportBtn.addEventListener('click', exportCharacter);
    importBtn.addEventListener('click', () => importFileInput.click()); 
    importFileInput.addEventListener('change', importCharacter);


    // --- 6. DÉMARRAGE INITIAL ---
    const firstCharId = loadCharacterList();
    if (firstCharId) {
        loadCharacter(firstCharId);
    } else {
        // S'il n'y a aucun personnage, on en crée un
        createNewCharacter();
    }
});
