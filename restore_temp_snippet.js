
// Generate Sorted Random Milestones (Chaos Theory)
// Rule: First 50 clicks -> Exactly 1 upgrade
function generateMilestones(count, maxVal) {
    const milestones = new Set();

    // 1. First Milestone: Random between 3 and 50 (Chaos Theory Restored)
    const firstOne = Math.floor(Math.random() * (50 - 3)) + 3;
    milestones.add(firstOne);

    // 2. Remaining Milestones: Random between 51 and maxVal
    while (milestones.size < count) {
        const num = Math.floor(Math.random() * (maxVal - 51)) + 51;
        milestones.add(num);
    }

    return Array.from(milestones).sort((a, b) => a - b);
}

// Generate 15 milestones up to 1000
const currentMilestones = generateMilestones(15, 1000);
