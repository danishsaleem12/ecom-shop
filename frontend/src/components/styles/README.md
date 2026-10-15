# components/styles

Plain CSS for the components and pages. Each file here (and each `<route>.css` next to a page) used to be a
`<style jsx global>` block inside the component's `.js` file; the rules are unchanged.

## Why a few `<style jsx global>` blocks are still in some components

About 30 class names (`.aur-cursor*`, `.col-cursor*`, `.aur-line`, `.aur-magnet`, `.aur-dust`, `.aur-title`,
`.aur-text`, `.aur-eyebrow`, `.aur-roll*`, `.aur-btn`, `@keyframes colFade`, ...) are defined **differently in
different sections** (for example a white cursor ring on photo sections and a dark one on light sections).
With styled-jsx the winner is decided by render order, which is predictable. With separate CSS files it is decided
by the order the browser loads the files, which can change from one page navigation to the next. So those rules
were left in the small `<style jsx global>` blocks that remain, and everything else moved out.

To get rid of the remaining blocks, give each section its own class prefix for those names (or scope them
under the section's root class) and move them into the CSS file as well.
