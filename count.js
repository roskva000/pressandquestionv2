const fs = require('fs');
const content = fs.readFileSync('script.js', 'utf8');

// Extract narrativePaths object
const match = content.match(/narrativePaths\s*=\s*\{([\s\S]*?)\n\};/);
if (match) {
    const paths = match[1];

    // Count sentences in each path
    const curiosity = paths.match(/curiosity:\s*\[([\s\S]*?)\],\s*\/\/ YOL B/);
    const compulsion = paths.match(/compulsion:\s*\[([\s\S]*?)\],\s*\/\/ YOL C/);
    const existence = paths.match(/existence:\s*\[([\s\S]*?)\],\s*\/\/ YOL D/);
    const purpose = paths.match(/purpose:\s*\[([\s\S]*?)\],\s*\/\/ YOL E/);
    const time = paths.match(/time:\s*\[([\s\S]*?)\],\s*\/\/ YOL F/);
    const acceptance = paths.match(/acceptance:\s*\[([\s\S]*?)\],\s*\}/);

    const countQuotes = (str) => str ? (str[1].match(/"[^"]+"/g) || []).length : 0;

    const counts = {
        curiosity: countQuotes(curiosity),
        compulsion: countQuotes(compulsion),
        existence: countQuotes(existence),
        purpose: countQuotes(purpose),
        time: countQuotes(time),
        acceptance: countQuotes(acceptance)
    };

    console.log('Sentence counts per path:');
    Object.entries(counts).forEach(([key, val]) => console.log(`  ${key}: ${val}`));
    console.log('Total narrative sentences:', Object.values(counts).reduce((a, b) => a + b, 0));
}
