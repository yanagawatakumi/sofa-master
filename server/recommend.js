function getBudgetMax(budgetValue) {
    const map = {
        under_50000: 50000,
        '50000_100000': 100000,
        '100000_200000': 200000,
        '200000_300000': 300000,
        over_300000: null,
    };
    return map[budgetValue] ?? null;
}

function getSpaceMax(spaceValue) {
    const map = {
        under_150: 150,
        '150_200': 200,
        '200_250': 250,
        over_250: null,
        unknown: null,
    };
    return map[spaceValue] ?? null;
}

function getRequiredCapacity(capacityValue) {
    const map = {
        '1': 1,
        '2': 2,
        '3': 3,
        '4': 4,
    };
    return map[capacityValue] ?? null;
}

function normalizeArray(value) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null) return [];
    return [value];
}

function hardFilter(sofas, answers) {
    const budgetMax = getBudgetMax(answers.budget);
    const requiredCapacity = getRequiredCapacity(answers.capacity);
    const spaceMax = getSpaceMax(answers.space);
    const material = answers.material;

    return sofas.filter(sofa => {
        if (budgetMax !== null && sofa.price > budgetMax) return false;

        if (requiredCapacity !== null && sofa.capacity < requiredCapacity) return false;

        if (spaceMax !== null && sofa.size && sofa.size.width && sofa.size.width > spaceMax + 10) return false;

        if (material && material !== 'any' && sofa.material !== material) return false;

        return true;
    });
}

function scoreSofa(sofa, answers) {
    let score = 0;

    const styles = normalizeArray(answers.style).filter(s => s !== 'any');
    const colors = normalizeArray(answers.color).filter(c => c !== 'any');
    const lifestyle = normalizeArray(answers.lifestyle).filter(l => l !== 'none');

    // スタイル一致 (30点)
    if (styles.length === 0) {
        score += 15;
    } else {
        const styleMatches = styles.filter(s => sofa.styles.includes(s)).length;
        score += Math.round((styleMatches / styles.length) * 30);
    }

    // カラー一致 (20点)
    if (colors.length === 0) {
        score += 10;
    } else {
        const sofaColorGroups = (sofa.colors || []).map(c => c.color_group);
        const colorMatches = colors.filter(c => sofaColorGroups.includes(c)).length;
        score += Math.round((colorMatches / colors.length) * 20);
    }

    // 予算フィット (20点)
    const budgetMax = getBudgetMax(answers.budget);
    if (budgetMax === null) {
        score += 20;
    } else {
        const ratio = sofa.price / budgetMax;
        if (ratio >= 0.6 && ratio <= 0.9) score += 20;
        else if (ratio > 0.9 && ratio <= 1) score += 12;
        else if (ratio >= 0.4 && ratio < 0.6) score += 10;
        else if (ratio < 0.4) score += 6;
    }

    // ライフスタイル (20点)
    if (lifestyle.length === 0) {
        score += 10;
    } else {
        const featureMap = {
            kids: ['kids_friendly'],
            pets: ['pet_friendly'],
            sleep: ['sofa_bed'],
            storage: ['storage'],
            reclining: ['reclining'],
        };
        const sofaSignals = new Set([...(sofa.features || []), ...(sofa.tags || [])]);
        const desiredSignals = lifestyle.flatMap(l => featureMap[l] || []);
        const hit = desiredSignals.filter(s => sofaSignals.has(s)).length;
        score += Math.round((hit / desiredSignals.length) * 20);
    }

    // 人数フィット (10点)
    const requiredCapacity = getRequiredCapacity(answers.capacity);
    if (requiredCapacity === null) {
        score += 5;
    } else if (sofa.capacity === requiredCapacity) {
        score += 10;
    } else if (sofa.capacity === requiredCapacity + 1) {
        score += 7;
    } else if (sofa.capacity === requiredCapacity + 2) {
        score += 4;
    }

    return score;
}

function recommend(sofas, answers) {
    const filtered = hardFilter(sofas, answers);
    const scored = filtered.map(sofa => ({
        ...sofa,
        matchScore: scoreSofa(sofa, answers),
    }));
    scored.sort((a, b) => b.matchScore - a.matchScore);
    return { results: scored.slice(0, 5), relaxed: false };
}

function recommendWithRelaxation(sofas, answers) {
    let result = recommend(sofas, answers);
    if (result.results.length >= 3) return result;

    // 1) スペース制約を緩和
    const relaxedSpace = { ...answers, space: 'unknown' };
    result = recommend(sofas, relaxedSpace);
    if (result.results.length >= 3) {
        return { ...result, relaxed: true, message: '近い条件の商品も表示しています（スペース条件を緩和）' };
    }

    // 2) 素材制約を緩和
    const relaxedMaterial = { ...relaxedSpace, material: 'any' };
    result = recommend(sofas, relaxedMaterial);
    return { ...result, relaxed: true, message: '近い条件の商品も表示しています' };
}

module.exports = {
    recommendWithRelaxation,
    hardFilter,
    scoreSofa,
};
