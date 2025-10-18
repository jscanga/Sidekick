export const getWhiteboardColor = (colorValue: string): string => {
  if (!colorValue) return 'from-blue-600/90 to-cyan-500/90 border-blue-500/80';
  
  console.log('Processing color:', colorValue);
  
  // Simple replacement approach - replace /30 with /90 and /60 with /80
  const processed = colorValue
    .replace(/\/30/g, '/90')
    .replace(/\/60/g, '/80');
  
  console.log('Processed color:', processed);
  
  return processed;
};


export const colorOptions = [
    { 
      value: 'from-blue-600/30 to-cyan-500/30 border-blue-500/60', 
      name: 'Blue Sky', 
      preview: 'bg-gradient-to-r from-blue-600 to-cyan-500',
      solid: 'bg-blue-500'
    },
    { 
      value: 'from-emerald-600/30 to-green-500/30 border-emerald-500/60', 
      name: 'Emerald', 
      preview: 'bg-gradient-to-r from-emerald-600 to-green-500',
      solid: 'bg-emerald-500'
    },
    { 
      value: 'from-purple-600/30 to-pink-500/30 border-purple-500/60', 
      name: 'Berry', 
      preview: 'bg-gradient-to-r from-purple-600 to-pink-500',
      solid: 'bg-purple-500'
    },
    { 
      value: 'from-amber-500/30 to-yellow-400/30 border-yellow-500/60', 
      name: 'Sunset', 
      preview: 'bg-gradient-to-r from-amber-500 to-yellow-400',
      solid: 'bg-amber-500'
    },
    { 
      value: 'from-rose-600/30 to-red-500/30 border-rose-500/60', 
      name: 'Crimson', 
      preview: 'bg-gradient-to-r from-rose-600 to-red-500',
      solid: 'bg-rose-500'
    },
    { 
      value: 'from-fuchsia-600/30 to-pink-500/30 border-fuchsia-500/60', 
      name: 'Fuchsia', 
      preview: 'bg-gradient-to-r from-fuchsia-600 to-pink-500',
      solid: 'bg-fuchsia-500' 
    },
    { 
      value: 'from-indigo-600/30 to-purple-500/30 border-indigo-500/60', 
      name: 'Royal', 
      preview: 'bg-gradient-to-r from-indigo-600 to-purple-500',
      solid: 'bg-indigo-500'
    },
    { 
      value: 'from-teal-600/30 to-cyan-500/30 border-teal-500/60', 
      name: 'Ocean', 
      preview: 'bg-gradient-to-r from-teal-600 to-cyan-500',
      solid: 'bg-teal-500'
    },
    { 
      value: 'from-orange-600/30 to-amber-500/30 border-orange-500/60', 
      name: 'Sunrise', 
      preview: 'bg-gradient-to-r from-orange-600 to-amber-500',
      solid: 'bg-orange-500'
    },
    { 
      value: 'from-cyan-600/30 to-blue-500/30 border-cyan-500/60', 
      name: 'Azure', 
      preview: 'bg-gradient-to-r from-cyan-600 to-blue-500',
      solid: 'bg-cyan-500' 
    },
    { 
      value: 'from-violet-600/30 to-purple-500/30 border-violet-500/60', 
      name: 'Violet', 
      preview: 'bg-gradient-to-r from-violet-600 to-purple-500',
      solid: 'bg-purple-500'
    },
    { 
      value: 'from-lime-600/30 to-green-500/30 border-lime-500/60', 
      name: 'Lime', 
      preview: 'bg-gradient-to-r from-lime-600 to-green-500',
      solid: 'bg-lime-500' 
    },
    { 
      value: 'from-sky-600/30 to-blue-500/30 border-sky-500/60', 
      name: 'Sky', 
      preview: 'bg-gradient-to-r from-sky-600 to-blue-500',
      solid: 'bg-cyan-500'
    }
  ] as const;

  export type ColorOption = typeof colorOptions[number];
  export type ColorValue = ColorOption['value'];
