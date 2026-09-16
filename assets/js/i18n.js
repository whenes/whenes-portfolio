// Interface strings the scripts generate. Page content is translated in the HTML itself;
// this covers only labels that exist nowhere in the markup. Language comes from <html lang>.

const UI_STRINGS = {
  en: {
    themeToLight: 'Switch to light theme',
    themeToDark: 'Switch to dark theme',
    copied: 'Copied to clipboard',
    copyBlocked: 'Copy blocked by the browser. Select the text instead.',
    timeline: 'Career timeline',
    stack: 'Stack',
    via: 'via',
    keysHint: 'Use the arrow keys on the graph to move between jobs',
    previous: 'Previous',
    next: 'Next',
    duration: (years, months) => [years && `${years} yr`, months && `${months} mo`].filter(Boolean).join(' '),
  },
  pt: {
    themeToLight: 'Mudar para o tema claro',
    themeToDark: 'Mudar para o tema escuro',
    copied: 'Copiado para a área de transferência',
    copyBlocked: 'O navegador bloqueou a cópia. Selecione o texto.',
    timeline: 'Linha do tempo da carreira',
    stack: 'Stack',
    via: 'via',
    keysHint: 'Use as setas do teclado no gráfico para trocar de emprego',
    previous: 'Anterior',
    next: 'Próximo',
    duration: (years, months) => [
      years && `${years} ${years === 1 ? 'ano' : 'anos'}`,
      months && `${months} ${months === 1 ? 'mês' : 'meses'}`,
    ].filter(Boolean).join(' e '),
  },
};

window.i18n = UI_STRINGS[document.documentElement.lang.toLowerCase().startsWith('pt') ? 'pt' : 'en'];
