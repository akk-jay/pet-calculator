/* ============================================================
   PetToolKit 宠小算 — 宠物档案系统 (pet-manager.js)
   使用 localStorage 存储，纯前端，数据不离开用户设备
   ============================================================ */

const PetManager = (() => {
  const STORAGE_KEY_PETS = 'pettoolkit_pets';
  const STORAGE_KEY_ACTIVE = 'pettoolkit_active_pet_id';

  // --- Storage ---
  function loadPets() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PETS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function savePets(pets) {
    try {
      localStorage.setItem(STORAGE_KEY_PETS, JSON.stringify(pets));
      return true;
    } catch (e) {
      return false;
    }
  }

  function getActivePetId() {
    try {
      return localStorage.getItem(STORAGE_KEY_ACTIVE) || null;
    } catch (e) {
      return null;
    }
  }

  function setActivePetId(id) {
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, id);
    } catch (e) { /* ignore */ }
  }

  // --- Check localStorage availability ---
  function isStorageAvailable() {
    try {
      const test = '__ls_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  // --- CRUD ---
  function createPet(data) {
    const pet = {
      id: 'pet_' + Date.now(),
      name: data.name || '',
      type: data.type || 'dog',       // 'dog' | 'cat'
      breed: data.breed || '',
      birthday: data.birthday || '',  // 'YYYY-MM'
      weight: data.weight || '',      // kg (stored as string to allow empty)
      neutered: data.neutered || false,
    };
    const pets = loadPets();
    pets.push(pet);
    savePets(pets);
    setActivePetId(pet.id);
    return pet;
  }

  function updatePet(id, data) {
    const pets = loadPets();
    const idx = pets.findIndex(p => p.id === id);
    if (idx === -1) return null;
    pets[idx] = { ...pets[idx], ...data };
    savePets(pets);
    return pets[idx];
  }

  function deletePet(id) {
    const pets = loadPets();
    const filtered = pets.filter(p => p.id !== id);
    if (filtered.length === pets.length) return false;
    savePets(filtered);
    const activeId = getActivePetId();
    if (activeId === id) {
      setActivePetId(filtered.length > 0 ? filtered[0].id : null);
    }
    return true;
  }

  function getPet(id) {
    const pets = loadPets();
    return pets.find(p => p.id === id) || null;
  }

  function getAllPets() {
    return loadPets();
  }

  function getActivePet() {
    const id = getActivePetId();
    if (!id) {
      const pets = loadPets();
      return pets.length > 0 ? pets[0] : null;
    }
    return getPet(id) || (loadPets().length > 0 ? loadPets()[0] : null);
  }

  function switchPet(id) {
    setActivePetId(id);
  }

  // --- Derived helpers ---
  function getAgeYears(pet) {
    if (!pet.birthday) return null;
    const [y, m] = pet.birthday.split('-').map(Number);
    if (!y) return null;
    const birthDate = new Date(y, (m || 1) - 1, 1);
    const now = new Date();
    const years = (now - birthDate) / (365.25 * 24 * 60 * 60 * 1000);
    return Math.max(0, years);
  }

  function getAgeMonths(pet) {
    const years = getAgeYears(pet);
    if (years === null) return null;
    return years * 12;
  }

  function isPuppyOrKitten(pet) {
    const months = getAgeMonths(pet);
    if (months === null) return false;
    return months < 12;
  }

  function isJuvenile(pet) {
    const months = getAgeMonths(pet);
    if (months === null) return false;
    return months < 6;
  }

  function isSenior(pet) {
    const years = getAgeYears(pet);
    if (years === null) return false;
    return years >= 7;
  }

  function getWeightNum(pet) {
    if (!pet.weight || pet.weight === '') return null;
    const w = parseFloat(pet.weight);
    return isNaN(w) || w <= 0 ? null : w;
  }

  return {
    isStorageAvailable,
    createPet,
    updatePet,
    deletePet,
    getPet,
    getAllPets,
    getActivePet,
    switchPet,
    getAgeYears,
    getAgeMonths,
    isPuppyOrKitten,
    isJuvenile,
    isSenior,
    getWeightNum,
  };
})();
