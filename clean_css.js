const fs = require('fs');

let css = fs.readFileSync('app/globals.css', 'utf8');

const varsToRemove = [
  '--card-foreground',
  '--popover-foreground',
  '--primary-foreground',
  '--primary-border',
  '--secondary-foreground',
  '--secondary-border',
  '--accent-foreground',
  '--destructive-foreground',
  '--pill-bg',
  '--pill-border',
  '--brand',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
  '--sidebar-main',
  '--sidebar-sec',
  '--color-card-foreground',
  '--color-popover-foreground',
  '--color-primary-foreground',
  '--color-secondary-foreground',
  '--color-accent-foreground',
  '--color-destructive-foreground',
  '--color-brand',
  '--color-chart-1',
  '--color-chart-2',
  '--color-chart-3',
  '--color-chart-4',
  '--color-chart-5',
  '--color-sidebar-foreground',
  '--color-sidebar-primary-foreground',
  '--color-sidebar-accent-foreground',
  '--color-sidebar-border',
  '--color-sidebar-ring'
];

varsToRemove.forEach(v => {
  const regex = new RegExp('^\\s*' + v + ':.+;\\r?\\n?', 'gm');
  css = css.replace(regex, '');
});

css = css.replace(/var\(--font-dm-sans\),\s*/g, '');
css = css.replace(/var\(--font-syne\),\s*/g, '');
css = css.replace(/"DM Sans",\s*/g, '');
css = css.replace(/"Syne",\s*/g, '');

fs.writeFileSync('app/globals.css', css);
console.log('Cleaned globals.css');
