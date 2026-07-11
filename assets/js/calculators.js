/* ============================================================
   PetToolKit 宠小算 — 计算器核心逻辑 (calculators.js)
   所有计算在浏览器本地完成，不上传任何数据
   ============================================================ */

const Calculators = (() => {

  // ==========================================
  // 工具 1：人宠年龄换算
  // ==========================================
  function ageToHuman(type, ageYears, sizeCategory) {
    if (ageYears === null || ageYears === undefined || ageYears < 0) return null;

    let humanAge;
    let formula;

    if (type === 'dog') {
      // UC San Diego 2020, Cell Systems
      const baseAge = 16 * Math.log(ageYears) + 31;
      // Size adjustment: large dogs age faster, small dogs slower
      let sizeModifier = 0;
      if (sizeCategory === 'small') sizeModifier = -2;
      else if (sizeCategory === 'large') sizeModifier = 2;
      humanAge = Math.max(0, baseAge + sizeModifier);
      formula = '16 × ln(' + ageYears.toFixed(1) + ') + 31' + (sizeModifier !== 0 ? ' + (' + sizeModifier + ')' : '');
    } else {
      // Cat: AAHA/AAFP
      if (ageYears < 1) {
        humanAge = 15 * ageYears;
        formula = '15 × ' + ageYears.toFixed(1);
      } else if (ageYears < 2) {
        humanAge = 15 + 9 * (ageYears - 1);
        formula = '15 + 9 × (' + ageYears.toFixed(1) + ' - 1)';
      } else {
        humanAge = 24 + 4 * (ageYears - 2);
        formula = '24 + 4 × (' + ageYears.toFixed(1) + ' - 2)';
      }
    }

    // Life stage
    let stage, stageIcon, stageAdvice;
    if (type === 'dog') {
      if (humanAge < 15) { stage = '幼年期'; stageIcon = '🐾'; stageAdvice = '正在快速成长，需要充足的营养和社交训练。'; }
      else if (humanAge < 24) { stage = '青少年期'; stageIcon = '🦴'; stageAdvice = '精力旺盛，多运动多训练，注意行为引导。'; }
      else if (humanAge < 50) { stage = '壮年期'; stageIcon = '💪'; stageAdvice = '处于精力最充沛的阶段，保持规律运动和均衡饮食。'; }
      else if (humanAge < 65) { stage = '中年期'; stageIcon = '🧘'; stageAdvice = '注意体重管理，开始关注关节健康和年度体检。'; }
      else { stage = '老年期'; stageIcon = '🧓'; stageAdvice = '需要更频繁的健康检查，调整饮食和运动强度。'; }
    } else {
      if (humanAge < 15) { stage = '幼年期'; stageIcon = '🐾'; stageAdvice = '正在快速成长，需要充足的营养和社交训练。'; }
      else if (humanAge < 24) { stage = '青少年期'; stageIcon = '🐱'; stageAdvice = '活力满满，提供足够的玩具和攀爬空间。'; }
      else if (humanAge < 44) { stage = '壮年期'; stageIcon = '💪'; stageAdvice = '维持理想体重，定期体检和口腔护理。'; }
      else if (humanAge < 60) { stage = '中年期'; stageIcon = '🧘'; stageAdvice = '关注肾脏健康和牙齿状况，适当减少热量摄入。'; }
      else { stage = '老年期'; stageIcon = '🧓'; stageAdvice = '需要更频繁的健康检查，注意关节和慢性病管理。'; }
    }

    const oldRule = ageYears * 7;

    return {
      humanAge: Math.round(humanAge * 10) / 10,
      stage, stageIcon, stageAdvice, formula,
      oldRule: Math.round(oldRule),
      type,
    };
  }

  // ==========================================
  // 工具 2：喂食量计算器
  // ==========================================
  function calcFeeding(type, weightKg, bcs, activity, neutered, lifeStage, foodKcalPer100g) {
    if (!weightKg || weightKg <= 0) return null;
    if (!foodKcalPer100g || foodKcalPer100g <= 0) return null;

    // RER = 70 * weight^0.75
    const rer = 70 * Math.pow(weightKg, 0.75);

    // Life stage factor (K1)
    const stageFactors = {
      dog: {
        neuteredAdult: 1.6, intactAdult: 1.8,
        inactive: 1.2, weightLoss: 1.0,
        puppyUnder4m: 3.0, puppy4to12m: 2.0,
        senior: 1.4, gestation: 2.0, lactation: 4.5,
      },
      cat: {
        neuteredAdult: 1.3, intactAdult: 1.5,
        inactive: 1.0, weightLoss: 0.8,
        kittenUnder4m: 2.5, kitten4to12m: 2.0,
        senior: 1.2, gestation: 1.8, lactation: 4.0,
      },
    };

    const sf = stageFactors[type] || stageFactors['dog'];
    let k1;
    switch (lifeStage) {
      case 'puppy_under4': k1 = sf.puppyUnder4m; break;
      case 'puppy_4to12': k1 = sf.puppy4to12m; break;
      case 'senior': k1 = sf.senior; break;
      case 'gestation': k1 = sf.gestation; break;
      case 'lactation': k1 = sf.lactation; break;
      case 'weightLoss': k1 = sf.weightLoss; break;
      case 'inactive': k1 = sf.inactive; break;
      default:
        k1 = neutered ? sf.neuteredAdult : sf.intactAdult;
    }

    // Activity modifier (K2)
    const activityMod = { low: 0.8, medium: 1.0, high: 1.2 };
    const k2 = activityMod[activity] || 1.0;

    // BCS modifier: per point deviation from 5, ±10%
    const bcsMod = 1 + (bcs - 5) * 0.1;

    const mer = rer * k1 * k2 * bcsMod;

    // Daily feeding amount in grams
    const dryFoodGrams = (mer / foodKcalPer100g) * 100;
    const wetFoodKcalPer100g = 114; // typical wet food ~114 kcal/100g
    const wetFoodGrams = (mer / wetFoodKcalPer100g) * 100;

    // Water intake: ~50ml per kg
    const waterMl = weightKg * 50;

    // Meals per day
    let mealsPerDay;
    if (lifeStage === 'puppy_under4' || lifeStage === 'kitten_under4') mealsPerDay = 3;
    else if (lifeStage === 'senior') mealsPerDay = 2;
    else mealsPerDay = 2;

    return {
      rer: Math.round(rer),
      mer: Math.round(mer),
      dryFoodGrams: Math.round(dryFoodGrams),
      wetFoodGrams: Math.round(wetFoodGrams),
      waterMl: Math.round(waterMl),
      mealsPerDay,
      foodKcalPer100g,
      k1, k2, bcsMod,
      weightKg,
    };
  }

  // ==========================================
  // 工具 3：宠物预产期推算
  // ==========================================
  function calcPregnancy(type, matingDateStr) {
    if (!matingDateStr) return null;

    const matingDate = new Date(matingDateStr + 'T00:00:00');
    if (isNaN(matingDate.getTime())) return null;

    const gestationDays = type === 'dog' ? 63 : 65;
    const dueDate = new Date(matingDate);
    dueDate.setDate(dueDate.getDate() + gestationDays);

    const rangeStart = new Date(dueDate);
    rangeStart.setDate(rangeStart.getDate() - 2);
    const rangeEnd = new Date(dueDate);
    rangeEnd.setDate(rangeEnd.getDate() + 2);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysSinceMating = Math.floor((today - matingDate) / (24 * 60 * 60 * 1000));
    const daysUntilDue = Math.floor((dueDate - today) / (24 * 60 * 60 * 1000));

    // Milestones
    const milestones = [
      { day: 0, label: '配种日', icon: '🐾', status: 'done' },
      { day: 7, label: '第7-10天：胚胎着床', icon: '🔬', status: daysSinceMating >= 7 ? 'done' : 'pending' },
      { day: 25, label: '第25-30天：B超可确认怀孕', icon: '🩻', status: daysSinceMating >= 25 ? 'done' : 'pending' },
      { day: 45, label: '第45天：X光可见胎儿骨骼', icon: '🦴', status: daysSinceMating >= 45 ? 'done' : 'pending' },
      { day: 58, label: '第58天：准备产房，减少应激', icon: '🏠', status: daysSinceMating >= 58 ? 'done' : daysSinceMating >= 50 ? 'warning' : 'pending' },
      { day: gestationDays, label: '第' + gestationDays + '天：预产期！', icon: '🎯', status: daysSinceMating >= gestationDays ? 'done' : 'pending' },
    ];

    const isOverdue = daysSinceMating > gestationDays + 5;
    const isPastWindow = daysSinceMating > gestationDays + 2;

    return {
      gestationDays,
      matingDate,
      dueDate,
      rangeStart,
      rangeEnd,
      daysSinceMating,
      daysUntilDue,
      milestones,
      isOverdue,
      isPastWindow,
      type,
    };
  }

  // ==========================================
  // 工具 4：驱虫周期计算器
  // ==========================================
  function calcDeworming(type, ageMonths, environment, rawFood, lastInternalDate, lastExternalDate) {
    const isJuvenile = ageMonths !== null && ageMonths < 6;

    // Determine frequencies
    let internalFreqMonths, externalFreqMonths;

    if (isJuvenile) {
      internalFreqMonths = 0.5; // every 2 weeks
      externalFreqMonths = 1;
    } else if (rawFood) {
      internalFreqMonths = 3;
      externalFreqMonths = 1;
    } else if (environment === 'indoor') {
      internalFreqMonths = 6;
      externalFreqMonths = 3;
    } else if (environment === 'mixed') {
      internalFreqMonths = 3;
      externalFreqMonths = 1;
    } else {
      // outdoor
      internalFreqMonths = 3;
      externalFreqMonths = 1;
    }

    // Calculate next dates
    function calcNextDate(lastDateStr, freqMonths) {
      const startDate = lastDateStr ? new Date(lastDateStr + 'T00:00:00') : new Date();
      if (isNaN(startDate.getTime())) return null;
      const freqDays = Math.round(freqMonths * 30.44);
      const nextDate = new Date(startDate);
      nextDate.setDate(nextDate.getDate() + freqDays);
      return nextDate;
    }

    const nextInternal = calcNextDate(lastInternalDate, internalFreqMonths);
    const nextExternal = calcNextDate(lastExternalDate, externalFreqMonths);

    // Generate 12-month schedule
    function generateSchedule(lastDateStr, freqMonths, label) {
      const schedule = [];
      const startDate = lastDateStr ? new Date(lastDateStr + 'T00:00:00') : new Date();
      if (isNaN(startDate.getTime())) return schedule;

      const freqDays = Math.round(freqMonths * 30.44);
      let cursor = new Date(startDate);
      cursor.setDate(cursor.getDate() + freqDays);

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 12);

      while (cursor <= endDate) {
        schedule.push({
          date: new Date(cursor),
          label: label,
        });
        cursor.setDate(cursor.getDate() + freqDays);
      }
      return schedule;
    }

    const internalSchedule = generateSchedule(lastInternalDate, internalFreqMonths, '体内');
    const externalSchedule = generateSchedule(lastExternalDate, externalFreqMonths, '体外');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const internalOverdue = nextInternal && nextInternal < today;
    const externalOverdue = nextExternal && nextExternal < today;
    const lastInternalTooOld = lastInternalDate && (today - new Date(lastInternalDate)) / (365.25*24*60*60*1000) > 2;

    return {
      internalFreqMonths,
      externalFreqMonths,
      nextInternal,
      nextExternal,
      internalSchedule,
      externalSchedule,
      internalOverdue,
      externalOverdue,
      lastInternalTooOld,
      isJuvenile,
      lastInternalFilled: !!lastInternalDate,
      lastExternalFilled: !!lastExternalDate,
    };
  }

  // ==========================================
  // 工具 5：疫苗时间表查询
  // ==========================================
  function calcVaccine(type, birthDateStr, environment, region, vaccinatedList) {
    if (!birthDateStr) return null;

    const [by, bm] = birthDateStr.split('-').map(Number);
    if (!by) return null;
    const birthDate = new Date(by, (bm || 1) - 1, 1);
    const today = new Date();
    const ageWeeks = Math.max(0, Math.floor((today - birthDate) / (7 * 24 * 60 * 60 * 1000)));

    // Core vaccines
    const coreVaccines = type === 'dog' ? [
      { id: 'cdv', name: '犬瘟热 (CDV)', category: 'core', firstDoseWeeks: 6, intervalWeeks: 3, finalDoseWeeks: 16, booster: '3年' },
      { id: 'cpv', name: '细小病毒 (CPV-2)', category: 'core', firstDoseWeeks: 6, intervalWeeks: 3, finalDoseWeeks: 16, booster: '3年' },
      { id: 'cav', name: '腺病毒 (CAV-2)', category: 'core', firstDoseWeeks: 6, intervalWeeks: 3, finalDoseWeeks: 16, booster: '3年' },
      { id: 'rabies', name: '狂犬病', category: 'core', firstDoseWeeks: 12, intervalWeeks: 0, finalDoseWeeks: 16, booster: region === 'china' ? '每年' : '1-3年' },
      { id: 'lepto', name: '钩端螺旋体', category: 'noncore', firstDoseWeeks: 12, intervalWeeks: 4, finalDoseWeeks: 16, booster: '每年', condition: environment !== 'indoor' },
      { id: 'bb', name: '犬窝咳 (Bb)', category: 'noncore', firstDoseWeeks: 6, intervalWeeks: 3, finalDoseWeeks: 16, booster: '每年', condition: environment === 'outdoor' },
    ] : [
      { id: 'fpv', name: '猫瘟 (FPV)', category: 'core', firstDoseWeeks: 6, intervalWeeks: 4, finalDoseWeeks: 16, booster: '3年' },
      { id: 'fhv', name: '疱疹病毒 (FHV-1)', category: 'core', firstDoseWeeks: 6, intervalWeeks: 4, finalDoseWeeks: 16, booster: '3年' },
      { id: 'fcv', name: '杯状病毒 (FCV)', category: 'core', firstDoseWeeks: 6, intervalWeeks: 4, finalDoseWeeks: 16, booster: '3年' },
      { id: 'rabies', name: '狂犬病', category: 'core', firstDoseWeeks: 12, intervalWeeks: 0, finalDoseWeeks: 16, booster: region === 'china' ? '每年' : '1-3年' },
      { id: 'felv', name: '猫白血病 (FeLV)', category: 'noncore', firstDoseWeeks: 8, intervalWeeks: 4, finalDoseWeeks: 16, booster: '每年', condition: environment !== 'indoor' },
    ];

    const vaccinated = vaccinatedList || [];

    // Calculate schedule for each vaccine
    const results = coreVaccines.map(v => {
      const isCore = v.category === 'core';
      const isRecommended = isCore || v.condition;
      const isVaccinated = vaccinated.includes(v.id);

      // Calculate dates
      const firstDoseDate = new Date(birthDate);
      firstDoseDate.setDate(firstDoseDate.getDate() + v.firstDoseWeeks * 7);

      // Last puppy dose
      const lastPuppyDoseDate = new Date(birthDate);
      lastPuppyDoseDate.setDate(lastPuppyDoseDate.getDate() + v.finalDoseWeeks * 7);

      // If pet is adult, calculate next booster
      let lastDoseDate = null;
      let nextDoseDate = null;
      let status = 'pending';

      if (isVaccinated && ageWeeks >= v.firstDoseWeeks) {
        // Assume last dose was at finalDoseWeeks (or 1 year after if adult)
        if (ageWeeks < v.finalDoseWeeks + 4) {
          lastDoseDate = lastPuppyDoseDate;
        } else {
          lastDoseDate = isCore ? lastPuppyDoseDate : lastPuppyDoseDate;
        }
        status = 'done';

        // Calculate next booster
        const boosterYears = v.booster === '3年' ? 3 : 1;
        nextDoseDate = new Date(lastDoseDate);
        nextDoseDate.setFullYear(nextDoseDate.getFullYear() + boosterYears);

        if (nextDoseDate < today) {
          status = 'overdue';
        } else if ((nextDoseDate - today) / (24*60*60*1000) < 90) {
          status = 'soon';
        }
      }

      return {
        ...v,
        isRecommended,
        isVaccinated,
        status,
        firstDoseDate: firstDoseDate,
        lastPuppyDoseDate: lastPuppyDoseDate,
        lastDoseDate,
        nextDoseDate,
        ageWeeks,
      };
    });

    // Find the most urgent upcoming/overdue vaccine
    const urgentVaccine = results
      .filter(v => v.status === 'overdue' || v.status === 'soon')
      .sort((a, b) => (a.nextDoseDate || new Date(2099, 0)) - (b.nextDoseDate || new Date(2099, 0)))[0] || null;

    const allDone = results.filter(v => v.isRecommended).every(v => v.status === 'done');
    const birthDateKnown = true;

    return {
      results,
      urgentVaccine,
      allDone,
      birthDateKnown,
      ageWeeks,
      type,
      environment,
      region,
      birthDate: birthDateStr,
    };
  }

  // ==========================================
  // Helpers
  // ==========================================
  function formatDate(date) {
    if (!date) return '—';
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '年' + m + '月' + day + '日';
  }

  function formatDateShort(date) {
    if (!date) return '—';
    const d = new Date(date);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function daysUntil(date) {
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.floor((target - today) / (24 * 60 * 60 * 1000));
  }

  function daysSince(date) {
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.floor((today - target) / (24 * 60 * 60 * 1000));
  }

  return {
    ageToHuman,
    calcFeeding,
    calcPregnancy,
    calcDeworming,
    calcVaccine,
    formatDate,
    formatDateShort,
    daysUntil,
    daysSince,
  };
})();
