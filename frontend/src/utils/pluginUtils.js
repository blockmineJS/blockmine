export const calculatePluginPopularity = (plugin, allPlugins = []) => {
  const downloads = plugin.downloads || 0;
  const daysOld = Math.floor((Date.now() - new Date(plugin.createdAt || Date.now())) / (1000 * 60 * 60 * 24));
  const downloadsPerDay = daysOld > 0 ? downloads / daysOld : downloads;
  
  if (allPlugins.length > 0) {
    const allDownloads = allPlugins.map(p => p.downloads || 0);
    const avgDownloads = allDownloads.reduce((a, b) => a + b, 0) / allDownloads.length;
    const maxDownloads = Math.max(...allDownloads);
    
    const downloadScore = downloads / (maxDownloads || 1);
    const aboveAverageScore = downloads > avgDownloads * 1.5 ? 1 : 0;
    const velocityScore = downloadsPerDay > 10 ? 1 : downloadsPerDay / 10;
    
    const popularityScore = (downloadScore * 0.4 + aboveAverageScore * 0.3 + velocityScore * 0.3);
    
    return {
      isPopular: popularityScore > 0.6,
      isTrending: velocityScore > 0.8,
      isNew: daysOld < 30 && downloads > 50,
      score: popularityScore,
      downloads,
      downloadsPerDay: Math.round(downloadsPerDay)
    };
  }
  
  return {
    isPopular: downloads > 500,
    isTrending: downloadsPerDay > 20,
    isNew: daysOld < 30 && downloads > 50,
    score: downloads / 1000,
    downloads,
    downloadsPerDay: Math.round(downloadsPerDay)
  };
};

export const getPopularityBadge = (popularity) => {
  if (popularity.isTrending) {
    return { text: 'В тренде', color: 'from-purple-500 to-pink-500', icon: 'TrendingUp' };
  }
  if (popularity.isNew && popularity.downloads > 100) {
    return { text: 'Новинка', color: 'from-green-500 to-emerald-500', icon: 'Sparkles' };
  }
  if (popularity.isPopular) {
    return { text: 'Популярный', color: 'from-orange-500 to-red-500', icon: 'Fire' };
  }
  return null;
};