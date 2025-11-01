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

    // --- 1. FONCTIONS UTILITAIRES ---

    function calculateBonus(statValue) {
        const bonus = Math.floor((statValue - 10) / 2);
        return (bonus >= 0) ? `+${bonus}` : `${bonus}`;
    }

    function createItemRow(name, bonus, dmg, listElement) {
        if (!name) return;
        const tr = document.createElement('tr');
        // Ajout de la classe "edit-only" à la dernière cellule (td)
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


    // --- 2. SÉLECTION DES ÉLÉMENTS ---

    const sheetContainer = document.querySelector('.sheet');
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
    const loadButton = document.getElementById('btn-load');
    const viewToggleButton = document.getElementById('btn-toggle-view');

    // NOUVEAU: Listes ciblées pour le verrouillage
    const fieldsToLock = document.querySelectorAll(
        // Champs fixes
        '#char-name, #char-class, #bonus-maitrise, #ca, #pv-max, #des-vie, #seuil-blessure, #fatigue, #resistances, ' +
        // Inputs de stats
        '.stat-input, ' +
        // Inputs de slots (max seulement)
        '.spell-slot-input[id$="-max"]'
    );
    const checksToLock = document.querySelectorAll(
        // Checkboxes de compétences (MAIS PAS les jets de sauvegarde)
        '.js-check, .maitrise-check, .expertise-check'
    );
    
    // --- 3. ÉVÉNEMENTS (EVENT LISTENERS) ---

    // A) Mise à jour auto des bonus et de l'initiative
    statInputs.forEach(input => {
        input.addEventListener('input', updateAllBonuses);
    });

    // B) Logique d'upload de portrait (Mise à jour pour Mode Jeu)
    portraitContainer.addEventListener('click', () => {
        if (!sheetContainer.classList.contains('view-mode')) {
            portraitUpload.click(); 
        }
    });
    portraitUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imgData = e.target.result;
                portraitImg.src = imgData; 
                portraitLabel.style.display = 'none'; 
                try {
                    localStorage.setItem('maFichePortrait', imgData);
                } catch (e) {
                    alert("Erreur : L'image est trop volumineuse pour être sauvegardée ! Réduisez sa taille.");
                }
            };
            reader.readAsDataURL(file);
        }
    });

    // C) Ajout d'une attaque
    addAttackBtn.addEventListener('click', () => {
        createItemRow(newAttackName.value, newAttackBonus.value, newAttackDmg.value, attackList);
        newAttackName.value = ''; newAttackBonus.value = ''; newAttackDmg.value = '';
    });

    // D) Ajout d'un sort
    addSpellBtn.addEventListener('click', () => {
        createItemRow(newSpellName.value, newSpellBonus.value, newSpellDmg.value, spellList);
        newSpellName.value = ''; newSpellBonus.value = ''; newSpellDmg.value = '';
    });

    // E) Sauvegarde des données
    saveButton.addEventListener('click', () => {
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
            inventory: inventoryNotes.value, // Inventaire
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

        localStorage.setItem('maFichePersonnage', JSON.stringify(character));
        alert('Personnage sauvegardé !');
    });

    // F) Chargement des données
    loadButton.addEventListener('click', () => {
        const savedData = localStorage.getItem('maFichePersonnage');
        if (!savedData) {
            updateAllBonuses(); 
            // alert('Aucune sauvegarde trouvée.'); // Commenté pour être moins bruyant
            return;
        }

        const character = JSON.parse(savedData);

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
        
        // Charger l'image
        const savedImg = localStorage.getItem('maFichePortrait');
        if (savedImg) {
            portraitImg.src = savedImg;
            portraitLabel.style.display = 'none';
        } else {
            portraitImg.src = '';
            portraitLabel.style.display = 'block';
        }
        
        updateAllBonuses();
        // alert('Personnage chargé !'); // Commenté pour être moins bruyant
    });

    // G) NOUVEAU : Logique du "Mode Jeu" (Verrouillage)
    viewToggleButton.addEventListener('click', () => {
        sheetContainer.classList.toggle('view-mode');
        const isViewMode = sheetContainer.classList.contains('view-mode');
        
        if (isViewMode) {
            // --- On passe en MODE VUE ---
            viewToggleButton.textContent = '🔓 Déverrouiller (Mode Édition)';
            
            // Verrouille les champs texte/numériques fixes
            fieldsToLock.forEach(field => {
                field.readOnly = true;
            });
            
            // Verrouille les checkboxes de stats/compétences
            checksToLock.forEach(check => {
            });
            
            // LES CHAMPS SUIVANTS RESTENT ÉDITABLES :
            // - #pv-current
            // - #char-notes
            // - #inventory-notes
            // - input[id^="death-"]
            // - .spell-slot-input[id$="-current"]
            
        } else {
            // --- On passe en MODE ÉDITION ---
            viewToggleButton.textContent = '🔒 Verrouiller (Mode Jeu)';
            
            // Déverrouille les champs
            fieldsToLock.forEach(field => {
                field.readOnly = false;
            });
            
            // Déverrouille les checkboxes
            checksToLock.forEach(check => {
            });

            // (L'initiative reste non-éditable car elle est calculée)
            initiative.readOnly = true;
        }
    });

    // --- 4. DÉMARRAGE INITIAL ---
    loadButton.click(); // Charger auto au démarrage
});