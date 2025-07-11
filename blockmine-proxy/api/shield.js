
const STATS_SERVER_URL = 'http://185.65.200.184:3000/api/shields/online';

export default async function handler(request, response) {
  try {
    const statsResponse = await fetch(STATS_SERVER_URL, {
        cache: 'no-cache', 
    });
    
    if (!statsResponse.ok) {
      throw new Error(`сервер ответил с ошибкой: ${statsResponse.status}`);
    }
    
    const data = await statsResponse.json();

    response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.setHeader('Pragma', 'no-cache');
    response.setHeader('Expires', '0');
    
    response.setHeader('Access-Control-Allow-Origin', '*');
    
    return response.status(200).json(data);

  } catch (error) {
    console.error(error);
    return response.status(200).json({
      schemaVersion: 1,
      label: 'bots online',
      message: 'error',
      color: 'red',
    });
  }
}